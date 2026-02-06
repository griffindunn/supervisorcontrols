/**
 * Supervisor Global Variable Manager v3.0
 * Feature: JWT Decoding to solve $STORE.agent.orgID resolution failure.
 */

(function() {
  const DEFAULT_ORG_ID = '686ea2c9-9b30-4e89-aa5d-6156959ad4aa';

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.renderBaseLayout();
      this.activeToken = ''; 
      this.orgId = ''; 
      this.dc = 'us1';
    }

    static get observedAttributes() { return ['token', 'org-id', 'data-center']; }

    attributeChangedCallback() { this.startSession(); }
    connectedCallback() { this.setupEventListeners(); this.startSession(); }

    // Logic to decode the JWT token and find the org_id inside
    decodeOrgFromToken(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        
        const payload = JSON.parse(jsonPayload);
        console.log("[GVM-DEBUG] Decoded Token Payload:", payload);
        return payload.org_id || payload.orgId || null;
      } catch (e) {
        console.error("[GVM-DEBUG] Failed to decode token:", e);
        return null;
      }
    }

    startSession() {
      if (this.shadowRoot.querySelector('input[name="authMode"]:checked')?.value !== 'auto') return;

      const t = this.getAttribute('token');
      const o = this.getAttribute('org-id');
      const d = this.getAttribute('data-center');
      
      this.activeToken = (t && !t.includes('$')) ? t : '';
      this.dc = (d && !d.includes('$')) ? d : 'us1';

      // 1. Try to use the passed Org ID
      // 2. If it's a $STORE string or missing, try to extract it from the token
      // 3. Fallback to hardcoded Default
      let resolvedOrg = (o && !o.includes('$') && o !== "") ? o : null;
      
      if (!resolvedOrg && this.activeToken) {
        console.log("[GVM-DEBUG] Attempting to extract Org ID from Token...");
        resolvedOrg = this.decodeOrgFromToken(this.activeToken);
      }

      this.orgId = resolvedOrg || DEFAULT_ORG_ID;
      this.shadowRoot.getElementById('activeOrgBadge').textContent = this.orgId;

      if (this.activeToken && this.orgId) {
        this.loadVariables();
      } else {
        this.showStatus('Waiting for Desktop token...', 'info');
      }
    }

    async loadVariables() {
      const loader = this.shadowRoot.getElementById('loader');
      const container = this.shadowRoot.getElementById('container');
      this.shadowRoot.getElementById('statusArea').innerHTML = '';
      loader.style.display = 'block';
      container.innerHTML = '';

      try {
        const url = `https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}/v2/cad-variable?page=0&pageSize=100`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${this.activeToken}`, 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(JSON.stringify(errData));
        }
        
        const result = await response.json();
        this.variables = (result.data || []).filter(v => v.active !== false);
        loader.style.display = 'none'; 
        this.renderVariables();
      } catch (err) {
        loader.style.display = 'none';
        this.showStatus(err.message, 'error');
      }
    }

    // UI RENDER METHODS
    renderBaseLayout() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; font-family: 'Inter', sans-serif; padding: 16px; background: #f8fafc; height: 100%; overflow-y: auto; }
          .auth-panel { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
          .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
          .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
          .name { font-weight: 700; color: #049fd9; font-size: 14px; }
          textarea { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
          .btn { cursor: pointer; padding: 6px 12px; border-radius: 6px; border: none; font-weight: 600; font-size: 12px; margin-top: 8px; background: #10b981; color: white; }
          .error-box { background: #fee2e2; color: #b91c1c; padding: 15px; border-radius: 8px; border: 1px solid #f87171; margin-bottom: 15px; font-size: 13px; }
          .badge { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
        </style>
        <div class="auth-panel">
          <strong>Auth Mode</strong>
          <input type="radio" name="authMode" value="auto" checked> System
          <input type="radio" name="authMode" value="manual"> Developer
          <div id="manualConfig" style="display:none; margin-top:10px;">
            <input type="text" id="manualTokenInput" placeholder="Token">
            <button class="btn" id="applyManual">Connect</button>
          </div>
          <div style="margin-top:10px; font-size:11px;">Active Org: <span id="activeOrgBadge" class="badge">None</span></div>
        </div>
        <div id="statusArea"></div>
        <div id="loader" style="text-align:center; display:none;">Communicating with Webex...</div>
        <div id="container" class="grid"></div>
      `;
    }

    showStatus(msg, type) {
      const statusArea = this.shadowRoot.getElementById('statusArea');
      if (type === 'error') {
        statusArea.innerHTML = `<div class="error-box"><strong>Error:</strong><br>${msg}</div>`;
      } else {
        statusArea.innerHTML = `<div style="padding:10px; font-style:italic;">${msg}</div>`;
      }
    }

    renderVariables() {
      const container = this.shadowRoot.getElementById('container');
      this.variables.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="header"><span class="name">${v.name}</span></div>
          <textarea id="input-${v.id}" rows="2">${v.defaultValue || ''}</textarea>
          <button class="btn" id="btn-${v.id}">Update</button>`;
        container.appendChild(card);
        card.querySelector(`#btn-${v.id}`).addEventListener('click', async (e) => {
          e.target.textContent = 'Saving...';
          try {
            await fetch(`https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}/cad-variable/${v.id}`, {
              method: 'PUT', headers: { 'Authorization': `Bearer ${this.activeToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...v, defaultValue: card.querySelector(`#input-${v.id}`).value })
            });
            e.target.textContent = '✓ Saved'; setTimeout(() => e.target.textContent = 'Update', 2000);
          } catch { e.target.textContent = 'Retry?'; }
        });
      });
    }

    setupEventListeners() {
      const radios = this.shadowRoot.querySelectorAll('input[name="authMode"]');
      radios.forEach(r => r.addEventListener('change', (e) => {
        this.shadowRoot.getElementById('manualConfig').style.display = e.target.value === 'manual' ? 'block' : 'none';
      }));
      this.shadowRoot.getElementById('applyManual').addEventListener('click', () => {
        this.activeToken = this.shadowRoot.getElementById('manualTokenInput').value.trim();
        this.loadVariables();
      });
    }
  }
  if (!customElements.get('global-variable-manager')) customElements.define('global-variable-manager', GlobalVariableManager);
})();
