/**
 * Supervisor Global Variable Manager v2.5
 * Fixes: CORS "Failed to fetch" and [object Object] error parsing.
 */

(function() {
  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      :host {
        display: block;
        font-family: 'Inter', Helvetica, Arial, sans-serif;
        padding: 16px;
        background: #f8fafc;
        height: 100%;
        overflow-y: auto;
      }
      .auth-panel {
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
        font-size: 13px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .name { font-weight: 700; color: #049fd9; font-size: 14px; }
      .type-tag { font-size: 10px; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
      
      textarea, input[type="text"] {
        width: 100%;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 13px;
        box-sizing: border-box;
      }
      .btn {
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 6px;
        border: none;
        font-weight: 600;
        font-size: 12px;
        margin-top: 8px;
      }
      .btn-save { background: #10b981; color: white; }
      .btn-primary { background: #049fd9; color: white; }
      
      .error-box { 
        background: #fee2e2; 
        color: #b91c1c; 
        padding: 12px; 
        border-radius: 8px; 
        border: 1px solid #f87171;
        margin-bottom: 15px;
        font-size: 13px;
        word-break: break-all;
      }
    </style>
    
    <div class="auth-panel">
      <strong>Authentication Mode</strong>
      <div style="margin-top: 8px; display: flex; gap: 15px; align-items: center;">
        <label><input type="radio" name="authMode" value="auto" checked> System Token</label>
        <label><input type="radio" name="authMode" value="manual"> Manual Token</label>
      </div>
      <div id="manualTokenContainer" style="display: none; margin-top: 10px;">
        <input type="text" id="manualTokenInput" placeholder="Paste Bearer Token...">
        <button class="btn btn-primary" id="applyManualToken">Connect</button>
      </div>
    </div>

    <div id="statusArea"></div>
    <div id="loader" style="text-align:center; padding: 20px; display:none;">Loading...</div>
    <div id="container" class="grid"></div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.variables = [];
      this.activeToken = '';
    }

    static get observedAttributes() { return ['token', 'org-id', 'data-center']; }

    attributeChangedCallback() { 
      const mode = this.shadowRoot.querySelector('input[name="authMode"]:checked')?.value;
      if (mode === 'auto') this.startSession(); 
    }

    connectedCallback() {
      this.setupEventListeners();
      this.startSession();
    }

    setupEventListeners() {
      const radios = this.shadowRoot.querySelectorAll('input[name="authMode"]');
      const manualContainer = this.shadowRoot.getElementById('manualTokenContainer');
      
      radios.forEach(r => {
        r.addEventListener('change', (e) => {
          manualContainer.style.display = e.target.value === 'manual' ? 'block' : 'none';
          if (e.target.value === 'auto') this.startSession();
        });
      });

      this.shadowRoot.getElementById('applyManualToken').addEventListener('click', () => {
        this.activeToken = this.shadowRoot.getElementById('manualTokenInput').value.trim();
        if (this.activeToken) this.loadVariables();
      });
    }

    startSession() {
      this.activeToken = this.getAttribute('token');
      this.orgId = this.getAttribute('org-id');
      this.dc = this.getAttribute('data-center') || 'us1';
      if (this.activeToken && this.orgId) this.loadVariables();
    }

    getApiUrl() { return `https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}`; }

    showStatus(msg, type) {
      const statusArea = this.shadowRoot.getElementById('statusArea');
      if (type === 'error') {
        // If msg is an object, stringify it so it doesn't show as [object Object]
        const cleanMsg = typeof msg === 'object' ? JSON.stringify(msg) : msg;
        statusArea.innerHTML = `<div class="error-box"><strong>API Error:</strong> ${cleanMsg}</div>`;
      } else {
        statusArea.innerHTML = `<div style="padding:10px; font-style:italic; color:#64748b;">${msg}</div>`;
      }
    }

    async loadVariables() {
      const loader = this.shadowRoot.getElementById('loader');
      const container = this.shadowRoot.getElementById('container');
      this.shadowRoot.getElementById('statusArea').innerHTML = '';
      loader.style.display = 'block';
      container.innerHTML = '';

      try {
        const response = await fetch(`${this.getApiUrl()}/v2/cad-variable?page=0&pageSize=100`, {
          method: 'GET',
          mode: 'cors',
          headers: { 
            'Authorization': `Bearer ${this.activeToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData?.error?.message || errData?.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        this.variables = (result.data || []).filter(v => v.active !== false);
        loader.style.display = 'none';
        this.render();
      } catch (err) {
        loader.style.display = 'none';
        this.showStatus(err.message === 'Failed to fetch' ? 'Failed to fetch (Check CORS or Internet)' : err.message, 'error');
      }
    }

    async updateVariable(id, newValue, btn) {
      btn.textContent = 'Saving...';
      const variable = this.variables.find(v => v.id === id);
      const payload = { ...variable, defaultValue: newValue };

      try {
        const res = await fetch(`${this.getApiUrl()}/cad-variable/${id}`, {
          method: 'PUT',
          mode: 'cors',
          headers: {
            'Authorization': `Bearer ${this.activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        btn.textContent = '✓ Saved';
        setTimeout(() => { btn.textContent = 'Update Value'; }, 2000);
      } catch (err) {
        btn.textContent = 'Retry?';
        this.showStatus(`Update failed: ${err.message}`, 'error');
      }
    }

    render() {
      const container = this.shadowRoot.getElementById('container');
      container.innerHTML = '';
      this.variables.forEach(v => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="header"><span class="name">${v.name}</span><span class="type-tag">${v.variableType}</span></div>
          <textarea id="input-${v.id}" rows="2">${v.defaultValue || ''}</textarea>
          <button class="btn btn-save" id="btn-${v.id}">Update Value</button>
        `;
        container.appendChild(card);
        card.querySelector(`#btn-${v.id}`).addEventListener('click', () => {
          this.updateVariable(v.id, card.querySelector(`#input-${v.id}`).value, card.querySelector(`#btn-${v.id}`));
        });
      });
    }
  }

  if (!customElements.get('global-variable-manager')) {
    customElements.define('global-variable-manager', GlobalVariableManager);
  }
})();
