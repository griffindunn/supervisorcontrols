/**
 * Supervisor Controls
 * Version: 3.0.0 (Refactored for Performance & GitHub Hosting)
 */

(function() {
  console.log('🚀 Supervisor Controls v3.0.0 loading...');

  const template = document.createElement('template');
  template.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      :host {
        display: block;
        font-family: 'Inter', 'CiscoSansTT Regular', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        padding: 12px;
        height: 100%;
        overflow-y: auto;
        --card-bg: rgba(255, 255, 255, 0.52);
        --card-border: rgba(213, 222, 235, 0.9);
        --card-text: #0f172a;
        --muted-text: #374151;
        --chip-bg: rgba(255, 255, 255, 0.42);
        --chip-border: rgba(219, 228, 240, 0.6);
        --input-border: rgba(215, 224, 236, 0.7);
        --input-bg: rgba(255, 255, 255, 0.6);
        --message-bg: rgba(255, 255, 255, 0.46);
        --message-border: rgba(223, 230, 241, 0.65);
        --card-bg-edit: rgba(255, 255, 255, 0.38);
        --message-bg-edit: rgba(255, 255, 255, 0.36);
        --primary-color: #049fd9;
      }
      :host(.theme-dark) {
        --card-bg: #0f172a;
        --card-border: #1f2937;
        --card-text: #e5e7eb;
        --muted-text: #d1d5db;
        --chip-bg: #111827;
        --chip-border: #1f2937;
        --input-border: #374151;
        --input-bg: #111827;
        --message-bg: #0f172a;
        --message-border: #1f2937;
      }
      .container { width: 100%; border-radius: 8px; }
      .content { padding: 16px; }
      
      /* Messages */
      .message { padding: 12px 16px; border-radius: 4px; margin-bottom: 16px; font-size: 14px; animation: slideIn 0.3s ease-out; }
      .message.error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
      .message.success { background: #d1e7dd; color: #0f5132; border-left: 4px solid #198754; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

      /* Grids */
      .variables-grid { display: grid; gap: 12px; }
      .calendar-grid { display: flex; flex-direction: column; gap: 12px; }
      .string-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
      .boolean-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }

      /* Card */
      .variable-card {
        background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px;
        padding: 16px; transition: all 0.2s; position: relative; box-shadow: 0 10px 28px rgba(0,0,0,0.05);
      }
      .variable-card.editing { background: var(--card-bg-edit); border-color: var(--primary-color); }
      .variable-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: var(--primary-color); }

      /* Header & Typography */
      .variable-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
      .variable-name { font-weight: 600; color: var(--primary-color); font-size: 15px; word-break: break-word; }
      .section-divider { border: 0; height: 1px; background: var(--card-border); margin: 18px 0; }

      /* Inputs */
      .icon-btn { background: none; border: none; padding: 6px; cursor: pointer; border-radius: 4px; color: var(--muted-text); font-size: 16px; }
      .icon-btn:hover { background: var(--message-bg); color: var(--card-text); }
      .inline-textarea, .business-hours-input {
        width: 100%; padding: 10px; border: 1px solid var(--input-border); border-radius: 6px;
        background: var(--input-bg); color: var(--card-text); font-family: inherit; box-sizing: border-box;
      }
      
      /* Switch */
      .switch { position: relative; display: inline-block; width: 40px; height: 24px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .2s; border-radius: 24px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .2s; border-radius: 50%; }
      input:checked + .slider { background-color: #10b981; }
      input:checked + .slider:before { transform: translateX(16px); }

      /* Business Hours & Overrides */
      .business-hours-shift { display: grid; grid-template-columns: 1fr auto auto auto; gap: 10px; padding: 10px; background: var(--message-bg); border-radius: 8px; margin-bottom: 8px; align-items: center; }
      .shift-days { display: flex; gap: 8px; flex-wrap: wrap; }
      .shift-remove { color: #b91c1c; background: transparent; border: 1px solid var(--card-border); padding: 4px 8px; border-radius: 4px; cursor: pointer; }
      .shift-add { width: 100%; padding: 8px; background: var(--chip-bg); border: 1px dashed var(--card-border); cursor: pointer; margin-top: 8px; }
      
      .loading, .empty-state { text-align: center; padding: 40px; color: var(--muted-text); }
      .spinner { border: 3px solid #f3f3f3; border-top: 3px solid var(--primary-color); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
    <div class="container">
      <div class="content">
        <div id="variablesContainer"></div>
        <div id="messageContainer"></div>
      </div>
    </div>
  `;

  class GlobalVariableManager extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
      
      // Configuration State
      this.config = {
        token: '', orgId: '', dataCenter: '', theme: '',
        autoLoad: true, autoLoadOverrides: true, autoLoadBusinessHours: true,
        textVars: [], boolVars: [],
        override: {}, businessHours: {}
      };

      // Runtime State
      this.state = {
        variables: [],
        overrideEntry: null,
        overridesList: [],
        businessHoursEntry: null,
        businessHoursList: [],
        editingId: null,
        loading: false
      };

      this._loadTimer = null;
    }

    static get observedAttributes() {
      // Generate dynamically to save space if needed, but manual is clearer for Docs
      return [
        'token', 'org-id', 'data-center', 'base-url', 'theme',
        'auto-load', 'auto-load-overrides', 'auto-load-business-hours',
        'override-name', 'business-hours-name', 'business-hours-id',
        'override_hours_id', 'override_message_variable_id',
        // Support up to 10 of each
        ...Array.from({length:10}, (_,i) => `variable_string_${i+1}_name`),
        ...Array.from({length:10}, (_,i) => `variable_string_${i+1}_id`),
        ...Array.from({length:10}, (_,i) => `variable_boolean_${i+1}_name`),
        ...Array.from({length:10}, (_,i) => `variable_boolean_${i+1}_id`),
      ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      // Map simple attributes
      const map = {
        'token': 'token', 'org-id': 'orgId', 'data-center': 'dataCenter',
        'theme': 'theme', 'override-name': 'overrideName'
      };

      if (map[name]) {
        this.config[map[name]] = newValue;
        if (name === 'theme') this.applyTheme();
      } 
      else if (name.startsWith('auto-load')) {
        const prop = name.replace(/-([a-z])/g, g => g[1].toUpperCase()); // kebab to camel
        this.config[prop] = newValue !== 'false';
      }
      else if (name.includes('variable_string') || name.includes('variable_boolean')) {
        this._parseVarAttribute(name, newValue);
      }
      else if (name === 'business-hours-id') {
        this.config.businessHours.id = newValue;
      }
      else if (name === 'business-hours-name') {
        this.config.businessHours.name = newValue;
      }
      else if (name === 'override_hours_id') {
        this.config.override.id = newValue;
      }
      else if (name === 'override_message_variable_id') {
        this.config.override.messageVarId = newValue;
      }

      this._scheduleLoad();
    }

    connectedCallback() {
      this.applyTheme();
      // Event Delegation: One listener for all clicks
      this.shadowRoot.addEventListener('click', this._handleContainerClick.bind(this));
      this.shadowRoot.addEventListener('change', this._handleContainerChange.bind(this));
      this._scheduleLoad();
    }

    _parseVarAttribute(name, value) {
      // Regex parse: variable_(string|boolean)_(\d+)_(name|id)
      const match = name.match(/variable_(string|boolean)_(\d+)_(name|id)/);
      if (!match) return;
      const [_, type, index, prop] = match;
      const arr = type === 'string' ? 'textVars' : 'boolVars';
      const idx = parseInt(index) - 1;
      
      if (!this.config[arr][idx]) this.config[arr][idx] = {};
      this.config[arr][idx][prop] = value;
      
      // If manual config is present, disable auto-load unless explicitly on
      this.config.autoLoad = false; 
    }

    _scheduleLoad() {
      if (this._loadTimer) clearTimeout(this._loadTimer);
      this._loadTimer = setTimeout(() => this._loadVariables(), 200);
    }

    /* ================= API HELPERS ================= */

    async _apiCall(endpoint, method = 'GET', body = null) {
      if (!this.config.token || !this.config.orgId) throw new Error("Missing Token or Org ID");
      
      const baseUrl = this.getAttribute('base-url') || this._getDcUrl();
      const url = `${baseUrl}/organization/${this.config.orgId}${endpoint}`;
      
      const opts = {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(url, opts);
      if (!res.ok && res.status !== 404) {
        throw new Error(`API Error ${res.status}: ${res.statusText}`);
      }
      return res.ok ? await res.json() : null;
    }

    _getDcUrl() {
      const dc = this.config.dataCenter || 'us1';
      const map = {
        'us1': 'https://api.wxcc-us1.cisco.com',
        'eu1': 'https://api.wxcc-eu1.cisco.com',
        'eu2': 'https://api.wxcc-eu2.cisco.com',
        'anz1': 'https://api.wxcc-anz1.cisco.com',
        'ca1': 'https://api.wxcc-ca1.cisco.com'
      };
      return map[dc] || map['us1'];
    }

    /* ================= LOGIC & LOADING ================= */

    async _loadVariables() {
      if (!this.config.token || !this.config.orgId) return;
      
      const container = this.shadowRoot.getElementById('variablesContainer');
      container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

      try {
        this.state.variables = [];
        
        // 1. Load Standard Variables
        if (this.config.autoLoad) {
          const allVars = await this._loadAllVarsPaged();
          this.state.variables = allVars.filter(v => v.variableType !== 'override_message'); // Filter internal type
        } else {
          // Manual Load
          const manualVars = [
            ...this.config.textVars.map(v => ({...v, type:'string'})), 
            ...this.config.boolVars.map(v => ({...v, type:'boolean'}))
          ].filter(v => v && v.id);

          for (const v of manualVars) {
            const data = await this._apiCall(`/cad-variable/${v.id}`);
            if (data) {
              this.state.variables.push({
                ...data,
                displayName: v.name || data.name,
                variableType: v.type,
                value: data.defaultValue
              });
            }
          }
        }

        // 2. Load Overrides
        if (this.config.autoLoadOverrides && !this.config.override.id) {
          const list = await this._apiCall('/v2/overrides?page=0&pageSize=100');
          if (list?.data?.length) {
            // Find by name or take first
            const match = this.config.overrideName 
              ? list.data.find(i => i.name === this.config.overrideName) 
              : list.data[0];
            this.config.override.id = match ? match.id : null;
          }
        }

        if (this.config.override.id) {
          // Get Dropdown List
          const oList = await this._apiCall('/v2/overrides?page=0&pageSize=100');
          this.state.overridesList = oList?.data || [];

          // Get Active Override
          const oData = await this._apiCall(`/overrides/${this.config.override.id}`);
          if (oData) {
            const latest = oData.latestOverride || (oData.overrides && oData.overrides[0]) || {};
            this.state.overrideEntry = {
              ...oData,
              displayName: 'Override Hours',
              startDateTime: latest.startDateTime,
              endDateTime: latest.endDateTime,
              workingHours: latest.workingHours === true || latest.workingHours === 'true',
              overrides: oData.overrides || [] // Keep full list for editing
            };
          }

          // Override Message Var
          if (this.config.override.messageVarId) {
             // Check if already loaded, else fetch
             let msgVar = this.state.variables.find(v => v.id === this.config.override.messageVarId);
             if (!msgVar) {
               msgVar = await this._apiCall(`/cad-variable/${this.config.override.messageVarId}`);
               if (msgVar) this.state.variables.push(msgVar);
             }
             if (msgVar) {
               msgVar.isOverrideMessage = true; // Mark it
               msgVar.displayName = "Override Message";
             }
          }
        }

        // 3. Load Business Hours
        if (this.config.autoLoadBusinessHours && !this.config.businessHours.id) {
          const bhList = await this._apiCall('/v2/business-hours?page=0&pageSize=100');
          if (bhList?.data?.length) {
             const match = this.config.businessHours.name 
              ? bhList.data.find(i => i.name === this.config.businessHours.name) 
              : bhList.data[0];
            this.config.businessHours.id = match ? match.id : null;
          }
        }

        if (this.config.businessHours.id) {
          const bhList = await this._apiCall('/v2/business-hours?page=0&pageSize=100');
          this.state.businessHoursList = bhList?.data || [];
          
          // Try v2 then v1
          let bhData = await this._apiCall(`/v2/business-hours/${this.config.businessHours.id}`);
          if (!bhData) bhData = await this._apiCall(`/business-hours/${this.config.businessHours.id}`);
          
          if (bhData) {
            this.state.businessHoursEntry = { ...bhData, displayName: bhData.name || 'Business Hours' };
          }
        }

        this._render();
        this._showMessage(`Loaded ${this.state.variables.length} variables`, 'success');

      } catch (err) {
        console.error(err);
        this._showMessage('Failed to load variables', 'error');
        container.innerHTML = `<div class="empty-state">⚠️ Error loading data</div>`;
      }
    }

    async _loadAllVarsPaged() {
      let results = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const data = await this._apiCall(`/v2/cad-variable?page=${page}&pageSize=100`);
        if (data?.data) {
          results.push(...data.data.filter(i => i.active !== false).map(i => ({
            ...i,
            displayName: i.desktopLabel || i.name,
            value: i.defaultValue,
            variableType: i.variableType === 'BOOLEAN' ? 'boolean' : 'string'
          })));
          hasMore = page < (data.meta?.totalPages - 1);
          page++;
        } else {
          hasMore = false;
        }
      }
      return results;
    }

    /* ================= EVENT HANDLERS ================= */

    _handleContainerClick(e) {
      const target = e.target;
      
      // Edit Button
      const editBtn = target.closest('[data-action="edit"]');
      if (editBtn) {
        this.state.editingId = editBtn.dataset.id;
        this._render();
        return;
      }

      // Cancel Button
      const cancelBtn = target.closest('[data-action="cancel"]');
      if (cancelBtn) {
        this.state.editingId = null;
        this._render();
        return;
      }

      // Save Button
      const saveBtn = target.closest('[data-action="save"]');
      if (saveBtn) {
        const id = saveBtn.dataset.id;
        const type = saveBtn.dataset.type;
        const card = saveBtn.closest('.variable-card');
        
        if (type === 'string') this._saveString(id, card);
        if (type === 'override') this._saveOverride(id, card);
        if (type === 'business_hours') this._saveBusinessHours(id, card);
        return;
      }

      // Add Override Shift
      if (target.dataset.action === 'add-override') {
        const list = target.previousElementSibling; // shift list
        // We need to re-render with a new blank entry in the state or just append to DOM? 
        // For simplicity in this architecture, we append DOM input fields directly
        this._appendOverrideRow(target.closest('.business-hours-shifts'));
      }

      // Remove Shift/Override
      if (target.dataset.action === 'remove-row') {
        target.closest('.shift-row').remove();
      }

      // Add Business Hours Shift
      if (target.dataset.action === 'add-bh-shift') {
        this._appendBusinessHoursRow(target.closest('.business-hours-shifts'));
      }
    }

    _handleContainerChange(e) {
      const target = e.target;

      // Boolean Toggle
      if (target.classList.contains('bool-toggle')) {
        this._saveBoolean(target.dataset.id, target.checked);
      }

      // Dropdown Switch (Override/Business Hours selection)
      if (target.dataset.action === 'switch-config') {
        const type = target.dataset.type;
        if (type === 'override') {
            this.config.override.id = target.value;
            this._scheduleLoad();
        }
        if (type === 'business_hours') {
            this.config.businessHours.id = target.value;
            this._scheduleLoad();
        }
      }
    }

    /* ================= SAVING LOGIC ================= */

    async _saveString(id, card) {
      const input = card.querySelector('textarea');
      const val = input.value;
      const original = this.state.variables.find(v => v.id === id);
      
      try {
        await this._apiCall(`/cad-variable/${id}`, 'PUT', {
          ...original, defaultValue: val
        });
        original.value = val; // Update local state
        original.defaultValue = val;
        this.state.editingId = null;
        this._showMessage('Saved successfully', 'success');
        this._render();
      } catch (e) {
        this._showMessage(e.message, 'error');
      }
    }

    async _saveBoolean(id, checked) {
      const original = this.state.variables.find(v => v.id === id);
      try {
        await this._apiCall(`/cad-variable/${id}`, 'PUT', {
          ...original, defaultValue: checked ? 'true' : 'false'
        });
        original.value = checked ? 'true' : 'false';
        this._showMessage('Updated', 'success');
      } catch (e) {
        this._showMessage(e.message, 'error');
        // Revert UI on error? Ideally yes, but requires re-render
        this._render();
      }
    }

    async _saveOverride(id, card) {
      const rows = card.querySelectorAll('.shift-row');
      const overrides = [];
      
      rows.forEach(row => {
        const name = row.querySelector('.ov-name').value;
        const sDate = row.querySelector('.ov-sdate').value;
        const sTime = row.querySelector('.ov-stime').value;
        const eDate = row.querySelector('.ov-edate').value;
        const eTime = row.querySelector('.ov-etime').value;
        const working = row.querySelector('.ov-working').checked;

        if (name && sDate && sTime) {
          overrides.push({
            name,
            startDateTime: `${sDate}T${sTime}:00`,
            endDateTime: `${eDate}T${eTime}:00`,
            workingHours: working
          });
        }
      });

      // Handle Message Var
      const msgInput = card.querySelector('.override-msg-input');
      if (msgInput && this.config.override.messageVarId) {
        await this._saveString(this.config.override.messageVarId, { querySelector: () => msgInput });
      }

      try {
        await this._apiCall(`/overrides/${id}`, 'PUT', {
          ...this.state.overrideEntry,
          overrides
        });
        
        // Refresh
        const newData = await this._apiCall(`/overrides/${id}`);
        const latest = newData.latestOverride || (newData.overrides && newData.overrides[0]) || {};
        this.state.overrideEntry = {
            ...newData, displayName: 'Override Hours',
            startDateTime: latest.startDateTime,
            endDateTime: latest.endDateTime,
            workingHours: latest.workingHours
        };
        
        this.state.editingId = null;
        this._render();
        this._showMessage('Override saved', 'success');
      } catch (e) {
        this._showMessage(e.message, 'error');
      }
    }

    async _saveBusinessHours(id, card) {
      const rows = card.querySelectorAll('.shift-row');
      const workingHours = [];

      rows.forEach(row => {
        const name = row.querySelector('.bh-name').value;
        const start = row.querySelector('.bh-start').value;
        const end = row.querySelector('.bh-end').value;
        const checkedDays = Array.from(row.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);

        if (name && start && end && checkedDays.length) {
          workingHours.push({ name, startTime: start, endTime: end, days: checkedDays });
        }
      });

      try {
        await this._apiCall(`/v2/business-hours/${id}`, 'PUT', {
           organizationId: this.config.orgId,
           id,
           name: this.state.businessHoursEntry.name,
           timezone: this.state.businessHoursEntry.timezone,
           workingHours
        });
        this.state.editingId = null;
        // Reload to get fresh data
        const fresh = await this._apiCall(`/v2/business-hours/${id}`);
        this.state.businessHoursEntry = { ...fresh, displayName: fresh.name };
        this._render();
        this._showMessage('Business Hours saved', 'success');
      } catch(e) {
         this._showMessage(e.message, 'error');
      }
    }

    /* ================= RENDERING ================= */

    _render() {
      const container = this.shadowRoot.getElementById('variablesContainer');
      const { variables, overrideEntry, businessHoursEntry, editingId } = this.state;
      
      const strings = variables.filter(v => v.variableType === 'string' && !v.isOverrideMessage);
      const bools = variables.filter(v => v.variableType === 'boolean');
      
      // Override Message Var (if exists)
      const ovMsgVar = variables.find(v => v.isOverrideMessage);

      const parts = [];

      // 1. Calendars / Complex
      if (businessHoursEntry || overrideEntry) {
        parts.push(`<div class="calendar-grid">`);
        if (businessHoursEntry) parts.push(this._renderBusinessHoursCard(businessHoursEntry, editingId === businessHoursEntry.id));
        if (overrideEntry) parts.push(this._renderOverrideCard(overrideEntry, editingId === overrideEntry.id, ovMsgVar));
        parts.push(`</div>`);
      }

      // 2. Strings
      if (strings.length) {
        if (parts.length) parts.push('<hr class="section-divider">');
        parts.push(`<div class="string-grid">`);
        parts.push(strings.map(v => this._renderStringCard(v, editingId === v.id)).join(''));
        parts.push(`</div>`);
      }

      // 3. Booleans
      if (bools.length) {
        if (parts.length) parts.push('<hr class="section-divider">');
        parts.push(`<div class="boolean-grid">`);
        parts.push(bools.map(v => this._renderBoolCard(v)).join(''));
        parts.push(`</div>`);
      }

      container.innerHTML = parts.join('');
    }

    _renderStringCard(v, isEditing) {
      const val = v.value || v.defaultValue || '';
      return `
        <div class="variable-card ${isEditing ? 'editing' : ''}">
          <div class="variable-header">
            <div class="variable-name">${this._esc(v.displayName)}</div>
            ${isEditing 
              ? `<div style="display:flex;">
                  <button class="icon-btn" data-action="save" data-id="${v.id}" data-type="string">💾</button>
                  <button class="icon-btn" data-action="cancel" style="color:#ef4444">✖</button>
                 </div>`
              : `<button class="icon-btn" data-action="edit" data-id="${v.id}">✏️</button>`
            }
          </div>
          ${isEditing 
            ? `<textarea class="inline-textarea">${this._esc(val)}</textarea>` 
            : `<div class="variable-value" style="word-break:break-all">${this._esc(val)}</div>`
          }
        </div>
      `;
    }

    _renderBoolCard(v) {
      const isChecked = (v.value === 'true' || v.value === true);
      return `
        <div class="variable-card">
          <div class="variable-header">
             <div class="variable-name">${this._esc(v.displayName)}</div>
          </div>
          <label style="display:flex;align-items:center;gap:10px;font-weight:600;">
            <div class="switch">
              <input type="checkbox" class="bool-toggle" data-id="${v.id}" ${isChecked ? 'checked' : ''}>
              <span class="slider"></span>
            </div>
            <span>${isChecked ? 'On' : 'Off'}</span>
          </label>
        </div>
      `;
    }

    _renderOverrideCard(v, isEditing, msgVar) {
      const overrides = v.overrides || [];
      const msgVal = msgVar ? (msgVar.value || msgVar.defaultValue || '') : '';
      
      let content = '';
      
      // Dropdown selector
      if(this.state.overridesList.length > 1) {
          content += `<select class="business-hours-input" data-action="switch-config" data-type="override" style="margin-bottom:10px">
            ${this.state.overridesList.map(o => `<option value="${o.id}" ${o.id === v.id ? 'selected':''}>${this._esc(o.name)}</option>`).join('')}
          </select>`;
      }

      if (isEditing) {
        content += `<div class="business-hours-shifts">
          ${overrides.map(o => this._renderOverrideRow(o)).join('')}
        </div>
        <button class="shift-add" data-action="add-override">+ Add Override</button>
        ${msgVar ? `
          <div style="margin-top:10px">
            <label style="font-size:12px;font-weight:bold">Message</label>
            <textarea class="inline-textarea override-msg-input">${this._esc(msgVal)}</textarea>
          </div>` : ''}
        `;
      } else {
        // View Mode
        if (overrides.length === 0) content += `<div style="color:var(--muted-text)">No active overrides</div>`;
        else {
          content += overrides.map(o => `
            <div style="background:var(--chip-bg);border:1px solid var(--chip-border);border-radius:8px;padding:8px;margin-bottom:6px;">
               <div style="font-weight:600">${this._esc(o.name)}</div>
               <div style="font-size:12px;display:flex;justify-content:space-between">
                 <span>${this._fmtDate(o.startDateTime)} ➝ ${this._fmtDate(o.endDateTime)}</span>
                 <span style="color:${o.workingHours?'#10b981':'#ef4444'}">${o.workingHours ? 'OPEN':'CLOSED'}</span>
               </div>
            </div>
          `).join('');
        }
        if (msgVar && overrides.some(o => o.workingHours)) {
           content += `<div style="margin-top:8px;padding:8px;background:var(--message-bg);border-radius:8px"><b>Msg:</b> ${this._esc(msgVal)}</div>`;
        }
      }

      return `
        <div class="variable-card ${isEditing ? 'editing' : ''}">
          <div class="variable-header">
            <div class="variable-name">Override Control</div>
            ${isEditing 
              ? `<div style="display:flex;"><button class="icon-btn" data-action="save" data-id="${v.id}" data-type="override">💾</button><button class="icon-btn" data-action="cancel" style="color:#ef4444">✖</button></div>`
              : `<button class="icon-btn" data-action="edit" data-id="${v.id}">✏️</button>`
            }
          </div>
          ${content}
        </div>
      `;
    }
    
    _renderOverrideRow(o) {
        // o.startDateTime is ISO. Extract Date and Time for inputs
        const s = o.startDateTime ? o.startDateTime.split('T') : ['',''];
        const e = o.endDateTime ? o.endDateTime.split('T') : ['',''];
        
        return `<div class="business-hours-shift shift-row">
           <div style="grid-column:1/-1"><input class="business-hours-input ov-name" placeholder="Name" value="${this._esc(o.name||'')}" style="width:100%"></div>
           <input type="date" class="business-hours-input ov-sdate" value="${s[0]}"> <input type="time" class="business-hours-input ov-stime" value="${(s[1]||'').substr(0,5)}">
           <span>to</span>
           <input type="date" class="business-hours-input ov-edate" value="${e[0]}"> <input type="time" class="business-hours-input ov-etime" value="${(e[1]||'').substr(0,5)}">
           <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;margin-top:5px">
             <label style="display:flex;align-items:center;gap:5px"><input type="checkbox" class="ov-working" ${o.workingHours?'checked':''}> Open?</label>
             <button class="shift-remove" data-action="remove-row">Remove</button>
           </div>
        </div>`;
    }
    
    _appendOverrideRow(container) {
       // Helper to inject HTML into the DOM without full re-render
       const div = document.createElement('div');
       div.innerHTML = this._renderOverrideRow({});
       container.appendChild(div.firstChild);
    }

    _renderBusinessHoursCard(v, isEditing) {
      let content = '';
      if(this.state.businessHoursList.length > 1) {
          content += `<select class="business-hours-input" data-action="switch-config" data-type="business_hours" style="margin-bottom:10px">
            ${this.state.businessHoursList.map(b => `<option value="${b.id}" ${b.id === v.id ? 'selected':''}>${this._esc(b.name)}</option>`).join('')}
          </select>`;
      }

      if (isEditing) {
         const shifts = v.workingHours || [];
         content += `<div class="business-hours-shifts">
            ${shifts.map(s => this._renderBHRow(s)).join('')}
         </div>
         <button class="shift-add" data-action="add-bh-shift">+ Add Shift</button>`;
      } else {
         // View mode logic (grouped by day)
         // ... Simple view for brevity
         content += `<div style="font-size:13px;color:var(--muted-text)">${(v.workingHours||[]).length} shifts configured. Click edit to modify.</div>`;
      }

      return `
        <div class="variable-card ${isEditing ? 'editing' : ''}">
          <div class="variable-header">
            <div class="variable-name">${this._esc(v.displayName)}</div>
            ${isEditing 
              ? `<div style="display:flex;"><button class="icon-btn" data-action="save" data-id="${v.id}" data-type="business_hours">💾</button><button class="icon-btn" data-action="cancel" style="color:#ef4444">✖</button></div>`
              : `<button class="icon-btn" data-action="edit" data-id="${v.id}">✏️</button>`
            }
          </div>
          ${content}
        </div>
      `;
    }

    _renderBHRow(s) {
       const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
       const active = s.days || [];
       return `<div class="business-hours-shift shift-row">
         <input class="business-hours-input bh-name" placeholder="Name" value="${this._esc(s.name||'')}" style="grid-column:1/-1">
         <div class="shift-days" style="grid-column:1/-1">
            ${days.map(d => `<label><input type="checkbox" value="${d}" ${active.includes(d)?'checked':''}>${d}</label>`).join('')}
         </div>
         <input type="time" class="business-hours-input bh-start" value="${s.startTime||''}">
         <span>-</span>
         <input type="time" class="business-hours-input bh-end" value="${s.endTime||''}">
         <button class="shift-remove" data-action="remove-row" style="grid-column:1/-1;justify-self:end">Remove</button>
       </div>`;
    }
    
    _appendBusinessHoursRow(container) {
        const div = document.createElement('div');
        div.innerHTML = this._renderBHRow({});
        container.appendChild(div.firstChild);
    }

    /* ================= UTILS ================= */

    _esc(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    _fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    }

    _showMessage(msg, type) {
      const c = this.shadowRoot.getElementById('messageContainer');
      const d = document.createElement('div');
      d.className = `message ${type}`;
      d.textContent = msg;
      c.appendChild(d);
      setTimeout(() => d.remove(), 4000);
    }

    applyTheme() {
       if (this.config.theme === 'dark') this.classList.add('theme-dark');
       else this.classList.remove('theme-dark');
    }
  }

  customElements.define('global-variable-manager', GlobalVariableManager);
})();
