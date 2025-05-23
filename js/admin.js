/**
 * 🏊‍♀️ Modern Poolparty Admin Dashboard
 * ES6+ Class-based architecture with modern JavaScript patterns
 */

class PoolpartyAdmin {
    constructor() {
        this.config = {
            authDomain: 'https://jpCore.logge.top',
            baseURL: 'https://jpCore.logge.top/api/'
        };
        
        this.state = {
            data: { account: [], registration: [], item: [], volunteer: [], music: [] },
            loading: new Set(),
            currentTab: 'account',
            sortState: {
                account: { column: null, direction: 'asc' },
                registration: { column: null, direction: 'asc' },
                item: { column: null, direction: 'asc' },
                volunteer: { column: null, direction: 'asc' },
                music: { column: null, direction: 'asc' }
            }
        };
        
        // Data mapping for API endpoints
        this.dataMapping = {
            account: { endpoint: 'admin/poolparty/account', key: 'account' },
            registration: { endpoint: 'admin/poolparty/registration', key: 'registration' },
            item: { endpoint: 'admin/poolparty/item', key: 'item' },
            volunteer: { endpoint: 'admin/poolparty/volunteer', key: 'volunteer' }
        };
        
        // Column mapping for sorting
        this.columnMapping = {
            account: ['id', 'name', 'email', 'verifiedMail', 'roles', 'lastActivity'],
            registration: ['id', 'name', 'people', 'lastActivity'],
            item: ['id', 'itemName', 'accountName', 'lastActivity'],
            volunteer: ['id', 'name', 'duration', 'lastActivity'],
            music: ['id', 'name', 'music']
        };
        
        this.token = localStorage.getItem('token');
        this.init();
    }

    // 🚀 Initialize the application
    async init() {
        if (!this.token) {
            alert('No token present. Please login first.');
            window.location.href = './login.html';
            return;
        }

        console.log('🔧 Initializing Poolparty Admin Dashboard...');
        
        // Set initial loading states
        this.setLoading('music', true); // Music will be processed from registrations
        
        this.setupEventListeners();
        await this.loadAllData();
        
        console.log('🎉 Poolparty Admin Dashboard initialized!');
    }

    // 📡 API Methods
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: { Authorization: this.token, 'Content-Type': 'application/json' },
            ...options
        };

        try {
            console.log(`📡 API Call: ${endpoint}`);
            const response = await fetch(`${this.config.baseURL}${endpoint}`, defaultOptions);
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
            console.log(`✅ API Success: ${endpoint}`);
            return data;
        } catch (error) {
            console.error(`❌ API Error (${endpoint}):`, error);
            this.showNotification(`Error: ${error.message}`, 'error');
            throw error;
        }
    }

    // 📊 Data Loading
    async loadAllData() {
        console.log('📊 Loading all data...');
        const sections = Object.keys(this.dataMapping);

        const promises = sections.map(async (section) => {
            const { endpoint } = this.dataMapping[section];
            this.setLoading(section, true);
            
            try {
                console.log(`Loading ${section}...`);
                const data = await this.apiCall(endpoint);
                this.state.data[section] = Array.isArray(data) ? 
                    data.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)) : [];
                console.log(`✅ ${section} loaded: ${this.state.data[section].length} items`);
            } catch (error) {
                console.warn(`⚠️ Failed to load ${section}:`, error);
                this.state.data[section] = [];
            } finally {
                this.setLoading(section, false);
            }
        });

        await Promise.all(promises);
        
        // Process music data from registrations
        this.processMusic();
        
        // Update statistics
        this.updateStats();
        
        // Render all tables now that data is loaded
        this.renderAllTables();
        
        console.log('🎉 All data loaded successfully!');
    }

    processMusic() {
        // Debug: Log some sample registration data
        if (this.state.data.registration.length > 0) {
            console.log('📋 Sample registration data:', this.state.data.registration[0]);
            console.log('📋 Registrations with music:', this.state.data.registration.filter(reg => reg.music));
        }
        
        // Extract music requests from registrations
        this.state.data.music = this.state.data.registration
            .filter(reg => reg.music && reg.music.trim() !== '')
            .map(({ id, name, music }) => ({ id, name, music }));
        
        // Update registration header with total people count
        const totalPeople = this.state.data.registration.reduce((sum, reg) => sum + (reg.people || 0), 0);
        const header = document.querySelector('#content2 h3');
        if (header) header.textContent = `Registration Management (${totalPeople} People)`;
        
        // Hide music loading state
        this.setLoading('music', false);
        
        console.log(`🎵 Music data processed: ${this.state.data.music.length} items from ${this.state.data.registration.length} registrations`);
        
        // Debug: Log music data
        if (this.state.data.music.length > 0) {
            console.log('🎵 Sample music data:', this.state.data.music[0]);
        }
    }

    // 🎨 Rendering Methods
    renderAllTables() {
        console.log('🎨 Rendering all tables...');
        Object.keys(this.state.data).forEach(section => {
            this.renderTable(section);
            console.log(`✅ ${section} table rendered`);
        });
    }

    renderCurrentTab() {
        // Render the currently active tab
        this.renderTable(this.state.currentTab);
    }

    renderTable(section) {
        console.log(`🎯 Rendering table for section: ${section}`);
        
        const { data } = this.state;
        const tableData = data[section] || [];
        
        const searchTerm = document.getElementById(`${section}Search`)?.value?.toLowerCase() || '';
        const filterValue = document.getElementById(`${section}Filter`)?.value || '';
        
        // Apply filters first
        const filtered = this.filterData(tableData, searchTerm, filterValue);
        
        // Then apply sorting
        const sorted = this.getSortedData(filtered, section);
        
        // Render table body (show all entries, no pagination)
        const tableBody = document.getElementById(`${section}Table`);
        if (!tableBody) {
            console.warn(`⚠️ Table body not found for section: ${section}`);
            return;
        }
        
        tableBody.innerHTML = sorted.length ? 
            sorted.map(item => this.renderTableRow(section, item)).join('') :
            this.createEmptyState();
        
        // Add click handlers to table headers for sorting
        this.addSortHandlers(section);
        
        console.log(`✅ Successfully rendered ${sorted.length} rows for ${section}`);
    }

    renderTableRow(section, item) {
        const renderers = {
            account: (acc) => `
                <tr>
                    <td>${acc.id || ''}</td>
                    <td>${acc.name || ''}</td>
                    <td>${acc.email || ''}</td>
                    <td>${this.createStatusBadge(acc.verifiedMail)}</td>
                    <td>${acc.roles || ''}</td>
                    <td>${this.formatDate(acc.lastActivity)}</td>
                </tr>`,
            
            registration: (reg) => `
                <tr>
                    <td>${reg.id || ''}</td>
                    <td>${reg.name || ''}</td>
                    <td>${reg.people || ''}</td>
                    <td>${this.formatDate(reg.lastActivity)}</td>
                    <td>${this.createActionButtons('registration', reg)}</td>
                </tr>`,
            
            item: (item) => `
                <tr ${item.accountName ? 'style="background:#f8f9fa"' : ''}>
                    <td>${item.id || ''}</td>
                    <td>${item.itemName || ''}</td>
                    <td>${item.accountName || 'Unassigned'}</td>
                    <td>${this.formatDate(item.lastActivity)}</td>
                    <td>${this.createActionButtons('item', item)}</td>
                </tr>`,
            
            volunteer: (vol) => `
                <tr>
                    <td>${vol.id || ''}</td>
                    <td>${vol.name || ''}</td>
                    <td>${vol.duration || ''}</td>
                    <td>${this.formatDate(vol.lastActivity)}</td>
                    <td>${this.createActionButtons('volunteer', vol)}</td>
                </tr>`,
            
            music: (mus) => `
                <tr>
                    <td>${mus.id || ''}</td>
                    <td>${mus.name || ''}</td>
                    <td>${mus.music || ''}</td>
                </tr>`
        };

        return renderers[section]?.(item) || '';
    }

    // 🛠️ Utility Methods
    filterData(data, searchTerm, filterType) {
        let filtered = data;

        if (searchTerm) {
            filtered = filtered.filter(item =>
                Object.values(item).some(value =>
                    value?.toString().toLowerCase().includes(searchTerm)
                )
            );
        }

        const filters = {
            verified: data => data.filter(item => item.verifiedMail),
            unverified: data => data.filter(item => !item.verifiedMail),
            assigned: data => data.filter(item => item.accountName),
            unassigned: data => data.filter(item => !item.accountName)
        };

        return filterType && filters[filterType] ? filters[filterType](filtered) : filtered;
    }

    formatDate(timestamp) {
        return timestamp ? new Date(timestamp).toLocaleDateString('de-DE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        }) : '-';
    }

    createStatusBadge(verified) {
        return `<span class="status-badge ${verified ? 'status-verified' : 'status-unverified'}">
            ${verified ? 'Verified' : 'Unverified'}
        </span>`;
    }

    createActionButtons(type, item) {
        const deleteTypes = ['registration', 'item', 'volunteer'];
        if (!deleteTypes.includes(type)) return '';
        
        return `<button class="action-btn btn-danger" onclick="admin.showDeleteConfirm('${type}', ${item.id}, '${item.name}')">
            Delete
        </button>`;
    }

    createEmptyState() {
        return `<tr><td colspan="10" class="empty-state">
            <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div>No data found</div>
        </td></tr>`;
    }

    // 🔄 Sorting Methods
    sortTable(section, columnIndex) {
        const column = this.columnMapping[section][columnIndex];
        const currentSort = this.state.sortState[section];
        
        // Toggle direction if same column, otherwise set to ascending
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        console.log(`🔄 Sorting ${section} by ${column} (${currentSort.direction})`);
        
        // Re-render table with new sort
        this.renderTable(section);
        
        // Update sort indicators
        this.updateSortIndicators(section, columnIndex);
    }

    getSortedData(data, section) {
        const sortState = this.state.sortState[section];
        
        if (!sortState.column) {
            return data; // No sorting applied
        }
        
        return [...data].sort((a, b) => {
            let aVal = a[sortState.column];
            let bVal = b[sortState.column];
            
            // Handle special cases
            if (sortState.column === 'verified') {
                aVal = aVal ? 1 : 0;
                bVal = bVal ? 1 : 0;
            } else if (sortState.column === 'lastActivity') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            } else if (sortState.column === 'people' || sortState.column === 'id') {
                aVal = parseInt(aVal) || 0;
                bVal = parseInt(bVal) || 0;
            } else {
                // String comparison
                aVal = (aVal || '').toString().toLowerCase();
                bVal = (bVal || '').toString().toLowerCase();
            }
            
            // Compare values
            let result = 0;
            if (aVal < bVal) result = -1;
            else if (aVal > bVal) result = 1;
            
            // Apply direction
            return sortState.direction === 'desc' ? -result : result;
        });
    }

    updateSortIndicators(section, columnIndex) {
        // Find the table header
        const tableContainer = document.getElementById(`${section}TableContainer`);
        if (!tableContainer) return;
        
        const headers = tableContainer.querySelectorAll('th');
        
        // Clear all existing indicators
        headers.forEach(header => {
            const existing = header.querySelector('.sort-indicator');
            if (existing) existing.remove();
            header.style.cursor = 'pointer';
        });
        
        // Add indicator to current column
        if (headers[columnIndex]) {
            const indicator = document.createElement('span');
            indicator.className = 'sort-indicator';
            indicator.style.cssText = `
                margin-left: 4px;
                font-size: 0.8em;
                color: var(--primary-color);
                font-weight: bold;
            `;
            
            const direction = this.state.sortState[section].direction;
            indicator.textContent = direction === 'asc' ? '↑' : '↓';
            
            headers[columnIndex].appendChild(indicator);
        }
    }

    addSortHandlers(section) {
        const tableContainer = document.getElementById(`${section}TableContainer`);
        if (!tableContainer) return;
        
        const headers = tableContainer.querySelectorAll('th');
        headers.forEach((header, index) => {
            // Skip action columns (usually the last column)
            const columns = this.columnMapping[section];
            if (index < columns.length) {
                header.style.cursor = 'pointer';
                header.onclick = () => this.sortTable(section, index);
                
                // Add hover effect
                header.addEventListener('mouseenter', () => {
                    header.style.backgroundColor = 'var(--primary-alpha-10)';
                });
                header.addEventListener('mouseleave', () => {
                    header.style.backgroundColor = '';
                });
            }
        });
        
        // Update sort indicators for current state
        const currentSort = this.state.sortState[section];
        if (currentSort.column) {
            const columnIndex = this.columnMapping[section].indexOf(currentSort.column);
            if (columnIndex !== -1) {
                this.updateSortIndicators(section, columnIndex);
            }
        }
    }

    // 🗑️ Delete Operations
    showDeleteConfirm(type, id, name) {
        const confirmed = confirm(`Are you sure you want to delete ${type} "${name}"?`);
        if (confirmed) this.deleteItem(type, id);
    }

    async deleteItem(type, id) {
        const endpoints = {
            registration: `admin/poolparty/registration/${id}`,
            item: `admin/poolparty/item/${id}`,
            volunteer: `admin/poolparty/volunteer/${id}`
        };

        try {
            await this.apiCall(endpoints[type], { method: 'DELETE' });
            
            // Update local data
            this.state.data[type] = this.state.data[type].filter(item => item.id !== id);
            
            if (type === 'registration') {
                this.state.data.music = this.state.data.music.filter(item => item.id !== id);
                this.processMusic();
            }
            
            this.updateStats();
            this.renderTable(type);
            if (type === 'registration') this.renderTable('music');
            
            this.showNotification(`${type} deleted successfully`, 'success');
        } catch (error) {
            this.showNotification(`Failed to delete ${type}`, 'error');
        }
    }

    // 🗑️ Bulk Delete Operations
    async showBulkDeleteConfirm(type) {
        const count = this.state.data[type].length;
        
        if (count === 0) {
            this.showNotification(`No ${type}s to delete`, 'info');
            return;
        }

        // Enhanced confirmation dialog
        const message = `⚠️ DANGER: This will permanently delete ALL ${count} ${type}(s)!\n\n` +
                       `This action cannot be undone and will:\n` +
                       `• Remove all ${type} records\n` +
                       `• Clear related data\n` +
                       `• Update statistics\n\n` +
                       `Type "DELETE ALL" to confirm:`;
        
        const userInput = prompt(message);
        
        if (userInput === "DELETE ALL") {
            await this.bulkDeleteItems(type);
        } else if (userInput !== null) {
            this.showNotification('Bulk delete cancelled - incorrect confirmation text', 'info');
        }
    }

    async bulkDeleteItems(type) {
        const items = this.state.data[type];
        const totalCount = items.length;
        
        if (totalCount === 0) {
            this.showNotification(`No ${type}s to delete`, 'info');
            return;
        }

        console.log(`🗑️ Starting bulk delete of ${totalCount} ${type}(s)...`);
        
        // Show progress notification
        this.showNotification(`Deleting ${totalCount} ${type}(s)... Please wait.`, 'info');
        
        const endpoints = {
            registration: 'admin/poolparty/registration',
            volunteer: 'admin/poolparty/volunteer'
        };

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Delete items in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (item) => {
                try {
                    await this.apiCall(`${endpoints[type]}/${item.id}`, { method: 'DELETE' });
                    successCount++;
                    console.log(`✅ Deleted ${type} ${item.id}: ${item.name}`);
                } catch (error) {
                    errorCount++;
                    errors.push(`${item.name} (ID: ${item.id})`);
                    console.error(`❌ Failed to delete ${type} ${item.id}:`, error);
                }
            });

            await Promise.all(batchPromises);
            
            // Show progress
            const progress = Math.min(i + batchSize, items.length);
            console.log(`🔄 Progress: ${progress}/${totalCount} ${type}(s) processed`);
        }

        // Update local data
        this.state.data[type] = this.state.data[type].filter(item => 
            !items.some(deletedItem => deletedItem.id === item.id)
        );

        // If deleting registrations, also update music data
        if (type === 'registration') {
            this.processMusic();
            this.renderTable('music');
        }

        // Update UI
        this.updateStats();
        this.renderTable(type);

        // Show results
        if (errorCount === 0) {
            this.showNotification(`✅ Successfully deleted all ${successCount} ${type}(s)!`, 'success');
        } else {
            const message = `⚠️ Bulk delete completed with ${errorCount} errors:\n` +
                          `• Successful: ${successCount}\n` +
                          `• Failed: ${errorCount}\n\n` +
                          `Failed items: ${errors.join(', ')}`;
            
            this.showNotification(`Partially completed: ${successCount}/${totalCount} deleted`, 'warning');
            console.warn(message);
        }

        console.log(`🏁 Bulk delete completed: ${successCount} success, ${errorCount} errors`);
    }

    // ➕ Add Item
    async addItem() {
        const input = document.getElementById('addItemInput');
        const name = input.value.trim();
        
        if (name.length < 3 || name.length > 512) {
            this.showNotification('Item name must be 3-512 characters', 'error');
            return;
        }

        try {
            const result = await this.apiCall('admin/poolparty/item', {
                method: 'POST',
                body: JSON.stringify({ name })
            });

            input.value = '';
            await this.loadItems();
            this.showNotification('Item added successfully', 'success');
        } catch (error) {
            this.showNotification('Failed to add item', 'error');
        }
    }

    async loadItems() {
        this.setLoading('item', true);
        try {
            const data = await this.apiCall('admin/poolparty/item');
            this.state.data.item = Array.isArray(data) ? data.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0)) : [];
            this.renderTable('item');
            this.updateStats();
        } finally {
            this.setLoading('item', false);
        }
    }

    // 📊 Statistics
    updateStats() {
        const { account, registration, item, volunteer } = this.state.data;
        const totalPeople = registration.reduce((sum, reg) => sum + (reg.people || 0), 0);
        
        const stats = {
            totalAccounts: account.length,
            totalRegistrations: registration.length,
            totalPeople,
            totalItems: item.length,
            totalVolunteers: volunteer.length
        };

        Object.entries(stats).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) element.textContent = value;
        });
        
        console.log('📊 Stats updated:', stats);
    }

    // 🔄 Loading States
    setLoading(section, isLoading) {
        if (isLoading) {
            this.state.loading.add(section);
        } else {
            this.state.loading.delete(section);
        }
        
        const loadingEl = document.getElementById(`${section}Loading`);
        const containerEl = document.getElementById(`${section}TableContainer`);
        
        if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
        if (containerEl) containerEl.style.display = isLoading ? 'none' : 'table';
        
        console.log(`🔄 Loading state for ${section}: ${isLoading}`);
    }

    // 🔔 Notifications
    showNotification(message, type = 'info') {
        const colors = {
            success: { bg: '#d4edda', color: '#155724' },
            error: { bg: '#f8d7da', color: '#721c24' },
            info: { bg: '#d1ecf1', color: '#0c5460' },
            warning: { bg: '#fff3cd', color: '#856404' }
        };

        const notification = Object.assign(document.createElement('div'), {
            textContent: message,
            style: `
                position: fixed; top: 20px; right: 20px; padding: 12px 20px;
                background: ${colors[type].bg}; color: ${colors[type].color};
                border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                z-index: 1000; animation: slideIn 0.3s ease;
            `
        });

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // 🎧 Event Listeners
    setupEventListeners() {
        // Search inputs with debouncing
        ['account', 'registration', 'item', 'volunteer', 'music'].forEach(section => {
            const searchInput = document.getElementById(`${section}Search`);
            const filterSelect = document.getElementById(`${section}Filter`);
            
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce(() => {
                    this.renderTable(section);
                }, 300));
            }
            
            if (filterSelect) {
                filterSelect.addEventListener('change', () => {
                    this.renderTable(section);
                });
            }
        });

        // Tab switching
        document.querySelectorAll('input[name="tabs"]').forEach(tab => {
            tab.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const sections = ['account', 'registration', 'item', 'volunteer', 'music'];
                    const section = sections[parseInt(e.target.id.replace('tab', '')) - 1];
                    this.state.currentTab = section;
                    
                    console.log(`🔄 Switching to tab: ${section}`);
                    
                    // Re-render the selected table
                    setTimeout(() => {
                        this.renderTable(section);
                        console.log(`✅ ${section} tab rendered`);
                    }, 100);
                }
            });
        });

        // Add item functionality
        const addBtn = document.getElementById('addItem');
        const addInput = document.getElementById('addItemInput');
        
        if (addBtn) addBtn.addEventListener('click', () => this.addItem());
        if (addInput) {
            addInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addItem();
            });
        }

        // Bulk delete buttons
        const deleteAllRegistrationsBtn = document.getElementById('deleteAllRegistrations');
        const deleteAllVolunteersBtn = document.getElementById('deleteAllVolunteers');
        
        if (deleteAllRegistrationsBtn) {
            deleteAllRegistrationsBtn.addEventListener('click', () => {
                this.showBulkDeleteConfirm('registration');
            });
        }
        
        if (deleteAllVolunteersBtn) {
            deleteAllVolunteersBtn.addEventListener('click', () => {
                this.showBulkDeleteConfirm('volunteer');
            });
        }
    }

    // 🕰️ Debounce utility
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // 🎨 Theme management
    setThemeColor(color) {
        document.documentElement.style.setProperty('--primary-color', color);
        this.updatePrimaryContrast();
    }

    updatePrimaryContrast() {
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const temp = Object.assign(document.createElement('div'), { style: `color: ${primaryColor}` });
        
        document.body.appendChild(temp);
        const rgb = getComputedStyle(temp).color.match(/\d+/g);
        document.body.removeChild(temp);
        
        if (rgb) {
            const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
            document.documentElement.style.setProperty('--primary-contrast', luminance > 0.5 ? '#000000' : '#ffffff');
        }
    }
}

// 🚀 Initialize on DOM ready
let admin;
document.addEventListener('DOMContentLoaded', () => {
    admin = new PoolpartyAdmin();
    
    // Expose theme function globally
    window.setThemeColor = (color) => admin.setThemeColor(color);
    
    // Expose admin methods globally for HTML onclick handlers
    window.sortTable = (tableId, columnIndex) => {
        // Extract section from tableId (e.g., 'accountTable' -> 'account')
        const section = tableId.replace('Table', '');
        admin.sortTable(section, columnIndex);
    };
});

// 🎨 Theme examples (uncomment to test)
// setTimeout(() => admin?.setThemeColor('#FF6B6B'), 1000); // Coral Red
// setTimeout(() => admin?.setThemeColor('#4ECDC4'), 1000); // Teal
// setTimeout(() => admin?.setThemeColor('#45B7D1'), 1000); // Sky Blue 