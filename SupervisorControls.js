/**
 * Supervisor Global Variable Manager v2.8
 * Added: Manual Overrides for Org-ID and DC to bypass $STORE resolution issues.
 */

(function() {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host { display: block; font-family: 'Inter', sans-serif; padding: 16px; background: #f8fafc; height: 100%; overflow-y: auto; }
      .auth-panel { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .name { font-weight: 700; color: #049fd9; font-size: 14px; }
      .type-tag { font-size: 10px; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
      textarea { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box; }
      .btn { cursor: pointer; padding: 6px 12px; border-radius: 6px; border: none; font-weight: 600; font-size: 12px; margin-top: 8px; }
      .btn-save { background: #10b981; color: white; }
      .btn-primary { background: #049fd9; color: white; }
      .error-box { background: #fee2e2; color: #b91c1c; padding: 15px; border-radius: 8px; border: 1px solid #f87171; margin-bottom: 15px; font-size: 13px; line-height: 1.5; }
      .config-row { display: flex; gap: 10px; margin-top: 10px; }
      .config-row input { flex: 1; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }
    </style>
    
    <div class="auth-panel">
      <strong>Connection Settings</strong>
      <div style="margin-top: 8px; display: flex; gap: 15px; align-items: center;">
        <label><input type="radio" name="authMode" value="auto" checked> System Mode</label>
        <label><input type="radio" name="authMode" value="manual"> Developer Mode</label>
      </div>
      
      <div id="manualConfig" style="display: none; margin-top: 10px; border-top: 1px solid #eee; pt: 10px;">
        <div class="config-row">
          <input type="text" id="manualTokenInput" placeholder="Bearer Token">
        </div>
        <div class="config-row">
          <input type="text" id="manualOrgInput" placeholder="Org ID (Numeric)">
          <input type="text" id="manualDcInput" placeholder="DC (e.g., us1)">
        </div>
        <button class="btn btn-primary" id="applyManual">Apply & Connect</button>
      </div>
    </div>

    <div id="statusArea"></div>
    <div id="loader" style="text-align:center; padding: 20px; display:none;">Communicating with Webex...</div>
    <div id="container" class="grid"></div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.activeToken = ''; this.orgId = ''; this.dc = 'us1';
    }

    static get observedAttributes() { return ['token', 'org-id', 'data-center']; }

    attributeChangedCallback() { this.startSession(); }
    connectedCallback() { this.setupEventListeners(); this.startSession(); }

    setupEventListeners() {
      const radios = this.shadowRoot.querySelectorAll('input[name="authMode"]');
      radios.forEach(r => r.addEventListener('change', (e) => {
        this.shadowRoot.getElementById('manualConfig').style.display = e.target.value === 'manual' ? 'block' : 'none';
        if (e.target.value === 'auto') this.startSession();
      }));

      this.shadowRoot.getElementById('applyManual').addEventListener('click', () => {
        this.activeToken = this.shadowRoot.getElementById('manualTokenInput').value.trim();
        this.orgId = this.shadowRoot.getElementById('manualOrgInput').value.trim();
        this.dc = this.shadowRoot.getElementById('manualDcInput').value.trim() || 'us1';
        if (this.activeToken && this.orgId) this.loadVariables();
      });
    }

    startSession() {
      if (this.shadowRoot.querySelector('input[name="authMode"]:checked')?.value !== 'auto') return;

      const t = this.getAttribute('token'), o = this.getAttribute('org-id'), d = this.getAttribute('data-center');
      this.activeToken = (t && !t.includes('$')) ? t : '';
      this.orgId = (o && !o.includes('$')) ? o : '';
      this.dc = (d && !d.includes('$')) ? d : 'us1';

      if (this.activeToken && this.orgId) this.loadVariables();
      else this.showStatus('Waiting for Webex Desktop to provide Org ID and Token...', 'info');
    }

    showStatus(msg, type) {
      const statusArea = this.shadowRoot.getElementById('statusArea');
      if (type === 'error') {
        const is403 = msg.includes('403');
        statusArea.innerHTML = `<div class="error-box">
          ${is403 ? '<strong>Permission Denied (403):</strong> Your Supervisor profile lacks "Global Variables" access in Control Hub.' : '<strong>Error:</strong> ' + msg}
        </div>`;
      } else { statusArea.innerHTML = `<div style="padding:10px; font-style:italic; color:#64748b;">${msg}</div>`; }
    }

    async loadVariables() {
      const loader = this.shadowRoot.getElementById('loader'), container = this.shadowRoot.getElementById('container');
      this.shadowRoot.getElementById('statusArea').innerHTML = '';
      loader.style.display = 'block'; container.innerHTML = '';

      try {
        const response = await fetch(`https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}/v2/cad-variable?page=0&pageSize=100`, {
          headers: { 'Authorization': `Bearer ${this.activeToken}`, 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(JSON.stringify(await response.json()));
        const result = await response.json();
        this.variables = (result.data || []).filter(v => v.active !== false);
        loader.style.display = 'none'; this.render();
      } catch (err) {
        loader.style.display = 'none'; this.showStatus(err.message, 'error');
      }
    }

    render() {
      const container = this.shadowRoot.getElementById('container');
      this.variables.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="header"><span class="name">${v.name}</span><span class="type-tag">${v.variableType}</span></div>
          <textarea id="input-${v.id}" rows="2">${v.defaultValue || ''}</textarea>
          <button class="btn btn-save" id="btn-${v.id}">Update Value</button>`;
        container.appendChild(card);
        card.querySelector(`#btn-${v.id}`).addEventListener('click', async (e) => {
          e.target.textContent = 'Saving...';
          try {
            const res = await fetch(`https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}/cad-variable/${v.id}`, {
              method: 'PUT', headers: { 'Authorization': `Bearer ${this.activeToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...v, defaultValue: card.querySelector(`#input-${v.id}`).value })
            });
            if (!res.ok) throw new Error();
            e.target.textContent = '✓ Saved'; setTimeout(() => e.target.textContent = 'Update Value', 2000);
          } catch { e.target.textContent = 'Retry?'; }
        });
      });
    }
  }
  if (!customElements.get('global-variable-manager')) customElements.define('global-variable-manager', GlobalVariableManager);
})();
