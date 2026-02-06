/**
 * Supervisor Global Variable Manager v2.6
 * DEBUG MODE ENABLED
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
      
      textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 13px;
        box-sizing: border-box;
        background: #fdfdfd;
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
        white-space: pre-wrap;
      }
      .debug-log {
        background: #1e293b;
        color: #34d399;
        font-family: monospace;
        padding: 10px;
        font-size: 11px;
        border-radius: 4px;
        margin-bottom: 10px;
        max-height: 150px;
        overflow-y: auto;
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

    <div id="debugArea" class="debug-log" style="display:none;"></div>
    <div id="statusArea"></div>
    <div id="loader" style="text-align:center; padding: 20px; display:none;">Loading Global Variables...</div>
    <div id="container" class="grid"></div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.variables = [];
      this.activeToken = '';
      this.debugEnabled = true;
    }

    static get observedAttributes() { return ['token', 'org-id', 'data-center']; }

    log(msg, data = '') {
      if (!this.debugEnabled) return;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[GVM-DEBUG] ${timestamp}: ${msg}`, data);
      const debugArea = this.shadowRoot.getElementById('debugArea');
      debugArea.style.display = 'block';
      debugArea.innerHTML += `<div>[${timestamp}] ${msg} ${data ? JSON.stringify(data) : ''}</div>`;
      debugArea.scrollTop = debugArea.scrollHeight;
    }

    attributeChangedCallback(name, oldVal, newVal) { 
      this.log(`Attribute changed: ${name}`, { old: oldVal, new: newVal });
      const mode = this.shadowRoot.querySelector('input[name="authMode"]:checked')?.value;
      if (mode === 'auto') this.startSession(); 
    }

    connectedCallback() {
      this.log('Component connected to DOM');
      this.setupEventListeners();
      this.startSession();
    }

    setupEventListeners() {
      const radios = this.shadowRoot.querySelectorAll('input[name="authMode"]');
      const manualContainer = this.shadowRoot.getElementById('manualTokenContainer');
      
      radios.forEach(r => {
        r.addEventListener('change', (e) => {
          this.log(`Auth mode changed to: ${e.target.value}`);
          manualContainer.style.display = e.target.value === 'manual' ? 'block' : 'none';
          if (e.target.value === 'auto') this.startSession();
        });
      });

      this.shadowRoot.getElementById('applyManualToken').addEventListener('click', () => {
        const input = this.shadowRoot.getElementById('manualTokenInput').value.trim();
        this.log('Manual token applied', input ? 'Token length: ' + input.length : 'Empty input');
        this.activeToken = input;
        if (this.activeToken) this.loadVariables();
      });
    }

    startSession() {
      this.activeToken = this.getAttribute('token');
      this.orgId = this.getAttribute('org-id');
      this.dc = this.getAttribute('data-center') || 'us1';
      this.log('Starting session with attributes', { orgId: this.orgId, dc: this.dc, hasToken: !!this.activeToken });
      
      if (this.activeToken && this.orgId) {
        this.loadVariables();
      } else {
        this.showStatus('Waiting for Desktop attributes (token/org-id)...', 'info');
      }
    }

    getApiUrl() { return `https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}`; }

    showStatus(msg, type) {
      const statusArea = this.shadowRoot.getElementById('statusArea');
      if (type === 'error') {
        let displayMsg = msg;
        if (typeof msg === 'object') {
          try {
            displayMsg = JSON.stringify(msg, null, 2);
          } catch (e) {
            displayMsg = 'Unknown Error Object';
          }
        }
        this.log('Showing Error Status', displayMsg);
        statusArea.innerHTML = `<div class="error-box"><strong>Error Encountered:</strong><br>${displayMsg}</div>`;
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

      const url = `${this.getApiUrl()}/v2/cad-variable?page=0&pageSize=100`;
      this.log(`Fetching variables from: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          headers: { 
            'Authorization': `Bearer ${this.activeToken}`,
            'Accept': 'application/json'
          }
        });
        
        this.log(`Response received. Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           this.log('Error data from API:', errData);
           throw new Error(JSON.stringify(errData) || `HTTP Error ${response.status}`);
        }
        
        const result = await response.json();
        this.variables = (result.data || []).filter(v => v.active !== false);
        this.log(`Successfully parsed ${this.variables.length} active variables.`);
        
        loader.style.display = 'none';
        this.render();
      } catch (err) {
        loader.style.display = 'none';
        this.log('Fetch exception caught', err.toString());
        
        if (err.message.includes('Failed to fetch')) {
          this.showStatus('Failed to Fetch: This is likely a CORS block. Ensure the API allows requests from your current domain.', 'error');
        } else {
          this.showStatus(err.message, 'error');
        }
      }
    }

    async updateVariable(id, newValue, btn) {
      this.log(`Attempting update for variable ${id} with value: ${newValue}`);
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

        this.log(`Update response status: ${res.status}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(JSON.stringify(errData));
        }

        btn.textContent = '✓ Saved';
        setTimeout(() => { btn.textContent = 'Update Value'; }, 2000);
      } catch (err) {
        this.log('Update exception', err.toString());
        btn.textContent = 'Retry?';
        this.showStatus(err.message, 'error');
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
