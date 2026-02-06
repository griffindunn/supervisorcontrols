/**
 * Supervisor Global Variable Manager v2.4
 * Hardened Render Cycle: UI displays immediately even if API fails.
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
      
      .switch { position: relative; display: inline-block; width: 40px; height: 22px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #ccc; transition: .4s; border-radius: 34px;
      }
      .slider:before {
        position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px;
        background-color: white; transition: .4s; border-radius: 50%;
      }
      input:checked + .slider { background-color: #10b981; }
      input:checked + .slider:before { transform: translateX(18px); }
      
      .error-box { 
        background: #fee2e2; 
        color: #b91c1c; 
        padding: 12px; 
        border-radius: 8px; 
        border: 1px solid #f87171;
        margin-bottom: 15px;
        font-size: 13px;
      }
    </style>
    
    <div class="auth-panel">
      <strong>Authentication Mode</strong>
      <div style="margin-top: 8px; display: flex; gap: 15px; align-items: center;">
        <label><input type="radio" name="authMode" value="auto" checked> Use System Access Token</label>
        <label><input type="radio" name="authMode" value="manual"> Manual Bearer Token</label>
      </div>
      <div id="manualTokenContainer" style="display: none; margin-top: 10px;">
        <input type="text" id="manualTokenInput" placeholder="Paste Bearer Token (e.g. Personal Access Token)">
        <button class="btn btn-primary" id="applyManualToken">Connect with Token</button>
      </div>
    </div>

    <div id="statusArea"></div>
    <div id="loader" style="text-align:center; padding: 20px; display:none;">Loading Variables...</div>
    <div id="container" class="grid"></div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.variables = [];
      this.activeToken = '';
    }

    static get observedAttributes() {
      return ['token', 'org-id', 'data-center'];
    }

    attributeChangedCallback() {
      // Re-trigger load if attributes update while manual mode is OFF
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
          if (e.target.value === 'manual') {
            manualContainer.style.display = 'block';
          } else {
            manualContainer.style.display = 'none';
            this.startSession();
          }
        });
      });

      this.shadowRoot.getElementById('applyManualToken').addEventListener('click', () => {
        const token = this.shadowRoot.getElementById('manualTokenInput').value.trim();
        if (token) {
          this.activeToken = token;
          this.loadVariables();
        }
      });
    }

    startSession() {
      const mode = this.shadowRoot.querySelector('input[name="authMode"]:checked')?.value || 'auto';
      if (mode === 'auto') {
        this.activeToken = this.getAttribute('token');
      }
      this.orgId = this.getAttribute('org-id');
      this.dc = this.getAttribute('data-center') || 'us1';

      if (this.activeToken && this.orgId) {
        this.loadVariables();
      } else {
        this.showStatus('Waiting for credentials from Webex Desktop...', 'info');
      }
    }

    getApiUrl() {
      return `https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}`;
    }

    showStatus(msg, type) {
      const statusArea = this.shadowRoot.getElementById('statusArea');
      if (type === 'error') {
        statusArea.innerHTML = `<div class="error-box"><strong>Error:</strong> ${msg}</div>`;
      } else {
        statusArea.innerHTML = `<div style="padding:10px; font-style:italic; color:#64748b;">${msg}</div>`;
      }
    }

    async loadVariables() {
      const loader = this.shadowRoot.getElementById('loader');
      const container = this.shadowRoot.getElementById('container');
      const statusArea = this.shadowRoot.getElementById('statusArea');
      
      statusArea.innerHTML = '';
      loader.style.display = 'block';
      container.innerHTML = '';

      try {
        const response = await fetch(`${this.getApiUrl()}/v2/cad-variable?page=0&pageSize=100`, {
          headers: { 'Authorization': `Bearer ${this.activeToken}` }
        });
        
        if (!response.ok) {
           const errData = await response.json().catch(() => ({}));
           throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        this.variables = result.data.filter(v => v.active !== false);
        
        loader.style.display = 'none';
        if (this.variables.length === 0) {
          this.showStatus('No active global variables found for this tenant.', 'info');
        } else {
          this.render();
        }
      } catch (err) {
        loader.style.display = 'none';
        this.showStatus(err.message, 'error');
      }
    }

    async updateVariable(id, newValue, btn) {
      btn.textContent = 'Saving...';
      const variable = this.variables.find(v => v.id === id);
      const payload = { ...variable, defaultValue: newValue };

      try {
        const res = await fetch(`${this.getApiUrl()}/cad-variable/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();
        btn.textContent = '✓ Saved';
        setTimeout(() => { btn.textContent = 'Update Value'; }, 2000);
      } catch (err) {
        btn.textContent = 'Retry?';
        this.showStatus('Update failed. Check your token permissions.', 'error');
        setTimeout(() => { btn.textContent = 'Update Value'; }, 3000);
      }
    }

    render() {
      const container = this.shadowRoot.getElementById('container');
      container.innerHTML = '';

      this.variables.forEach(v => {
        const isBool = v.variableType?.toLowerCase() === 'boolean';
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="header"><span class="name">${v.name}</span><span class="type-tag">${v.variableType}</span></div>
          <div>
            ${isBool ? `
              <label class="switch"><input type="checkbox" id="input-${v.id}" ${v.defaultValue === 'true' ? 'checked' : ''}><span class="slider"></span></label>
              <span id="label-${v.id}" style="margin-left:10px; font-weight:600;">${v.defaultValue === 'true' ? 'ON' : 'OFF'}</span>
            ` : `<textarea id="input-${v.id}" rows="2">${v.defaultValue || ''}</textarea>`}
          </div>
          <button class="btn btn-save" id="btn-${v.id}">Update Value</button>
        `;
        container.appendChild(card);

        const input = card.querySelector(`#input-${v.id}`);
        const btn = card.querySelector(`#btn-${v.id}`);

        if (isBool) {
          input.addEventListener('change', (e) => {
            const val = e.target.checked ? 'true' : 'false';
            card.querySelector(`#label-${v.id}`).textContent = val.toUpperCase();
            this.updateVariable(v.id, val, btn);
          });
        }
        btn.addEventListener('click', () => {
          const val = isBool ? (input.checked ? 'true' : 'false') : input.value;
          this.updateVariable(v.id, val, btn);
        });
      });
    }
  }

  if (!customElements.get('global-variable-manager')) {
    customElements.define('global-variable-manager', GlobalVariableManager);
  }
})();
