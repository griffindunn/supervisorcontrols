/**
 * Supervisor Global Variable Manager
 * Optimized for Webex Contact Center Desktop
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
        transition: transform 0.2s;
      }
      .card:hover { transform: translateY(-2px); }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .name { font-weight: 700; color: #049fd9; font-size: 14px; }
      .type-tag {
        font-size: 10px;
        background: #f1f5f9;
        padding: 2px 8px;
        border-radius: 10px;
        text-transform: uppercase;
      }
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
        transition: opacity 0.2s;
      }
      .btn-save { background: #10b981; color: white; margin-top: 8px; }
      .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
      
      /* Toggle Switch for Booleans */
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
      
      .status-msg { font-size: 12px; margin-top: 8px; text-align: center; }
      .error { color: #ef4444; }
      .success { color: #10b981; }
    </style>
    
    <div id="loader" style="text-align:center; padding: 20px;">Fetching Global Variables...</div>
    <div id="container" class="grid"></div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
      this.variables = [];
    }

    static get observedAttributes() {
      return ['token', 'org-id', 'data-center'];
    }

    attributeChangedCallback() {
      this.init();
    }

    async init() {
      this.token = this.getAttribute('token');
      this.orgId = this.getAttribute('org-id');
      this.dc = this.getAttribute('data-center') || 'us1';

      if (this.token && this.orgId) {
        await this.loadVariables();
      }
    }

    getApiUrl() {
      return `https://api.wxcc-${this.dc}.cisco.com/organization/${this.orgId}`;
    }

    async loadVariables() {
      try {
        const response = await fetch(`${this.getApiUrl()}/v2/cad-variable?page=0&pageSize=100`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        const result = await response.json();
        this.variables = result.data.filter(v => v.active !== false);
        this.render();
      } catch (err) {
        this.shadowRoot.getElementById('loader').innerHTML = `<span class="error">Failed to load variables.</span>`;
      }
    }

    async updateVariable(id, newValue, btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;

      const variable = this.variables.find(v => v.id === id);
      const payload = { ...variable, defaultValue: newValue };

      try {
        const res = await fetch(`${this.getApiUrl()}/cad-variable/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error();
        
        btn.textContent = '✓ Saved';
        setTimeout(() => {
          btn.textContent = 'Update Value';
          btn.disabled = false;
        }, 2000);
      } catch (err) {
        btn.textContent = 'Error';
        btn.style.background = '#ef4444';
        setTimeout(() => {
          btn.textContent = 'Update Value';
          btn.style.background = '#10b981';
          btn.disabled = false;
        }, 3000);
      }
    }

    render() {
      const container = this.shadowRoot.getElementById('container');
      const loader = this.shadowRoot.getElementById('loader');
      loader.style.display = 'none';
      container.innerHTML = '';

      this.variables.forEach(v => {
        const isBool = v.variableType?.toLowerCase() === 'boolean';
        const card = document.createElement('div');
        card.className = 'card';
        
        card.innerHTML = `
          <div class="header">
            <span class="name">${v.name}</span>
            <span class="type-tag">${v.variableType}</span>
          </div>
          <div class="content-${v.id}">
            ${isBool ? `
              <label class="switch">
                <input type="checkbox" id="input-${v.id}" ${v.defaultValue === 'true' ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
              <span id="label-${v.id}" style="margin-left:10px; font-weight:600;">${v.defaultValue === 'true' ? 'ON' : 'OFF'}</span>
            ` : `
              <textarea id="input-${v.id}" rows="3">${v.defaultValue || ''}</textarea>
            `}
          </div>
          <button class="btn btn-save" id="btn-${v.id}">Update Value</button>
        `;

        container.appendChild(card);

        // Add Event Listeners
        const input = card.querySelector(`#input-${v.id}`);
        const btn = card.querySelector(`#btn-${v.id}`);

        if (isBool) {
          input.addEventListener('change', (e) => {
            const val = e.target.checked ? 'true' : 'false';
            card.querySelector(`#label-${v.id}`).textContent = val.toUpperCase();
            this.updateVariable(v.id, val, btn);
          });
          // For booleans, the button is just a secondary manual trigger or status indicator
          btn.addEventListener('click', () => this.updateVariable(v.id, input.checked ? 'true' : 'false', btn));
        } else {
          btn.addEventListener('click', () => this.updateVariable(v.id, input.value, btn));
        }
      });
    }
  }

  if (!customElements.get('global-variable-manager')) {
    customElements.define('global-variable-manager', GlobalVariableManager);
  }
})();