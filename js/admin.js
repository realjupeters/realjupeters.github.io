/**
 * 🏊‍♀️ Modern Poolparty Admin Dashboard
 * ES6+ Class-based architecture with modern JavaScript patterns
 */

import { getCurrentUser, isAdmin } from './api/session.js';
import * as adminApi from './api/admin.js';

// Adapters: the new backend returns field names that differ from what the rendering
// code below expects. Rather than rewriting 500+ lines of UI code, we normalize the
// payloads into the legacy shape on fetch.
const adapt = {
    account: (a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        verifiedMail: !!a.emailVerifiedAt,
        roles: Array.isArray(a.roles) ? a.roles.join(', ') : '',
        lastActivity: a.lastActivityAt,
    }),
    registration: (r) => ({
        id: r.id,
        accountId: r.accountId,
        name: r.accountName ?? '',
        people: r.peopleCount,
        music: r.music,
        lastActivity: r.updatedAt,
    }),
    item: (i) => ({
        id: i.id,
        itemName: i.itemName,
        accountName: i.accountName,
        accountId: i.accountId,
        lastActivity: i.updatedAt,
    }),
    volunteer: (v) => ({
        id: v.id,
        accountId: v.accountId,
        name: v.accountName ?? '',
        duration: v.duration,
        lastActivity: v.updatedAt,
    }),
};

class PoolpartyAdmin {
    constructor() {
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

        // Column mapping for sorting (unchanged — keyed on legacy field names that adapt.* emits)
        this.columnMapping = {
            account: ['id', 'name', 'email', 'verifiedMail', 'roles', 'lastActivity'],
            registration: ['id', 'name', 'people', 'lastActivity'],
            item: ['id', 'itemName', 'accountName', 'lastActivity'],
            volunteer: ['id', 'name', 'duration', 'lastActivity'],
            music: ['id', 'name', 'music']
        };

        // Loader map: each section knows how to fetch + adapt its own data.
        this.loaders = {
            account: () => adminApi.listAccounts().then((rows) => rows.map(adapt.account)),
            registration: () => adminApi.listRegistrations().then((rows) => rows.map(adapt.registration)),
            item: () => adminApi.listItems().then((rows) => rows.map(adapt.item)),
            volunteer: () => adminApi.listVolunteers().then((rows) => rows.map(adapt.volunteer)),
        };

        this.init();
    }

    // 🚀 Initialize the application
    async init() {
        const user = await getCurrentUser().catch(() => null);
        if (!user) {
            alert('Bitte zuerst einloggen.');
            window.location.href = './login.html';
            return;
        }
        if (!isAdmin(user)) {
            alert('Kein Adminzugriff.');
            window.location.href = './';
            return;
        }

        console.log('🔧 Initializing Poolparty Admin Dashboard...');

        // Set initial loading states
        this.setLoading('music', true); // Music will be processed from registrations

        this.setupEventListeners();
        await this.loadAllData();

        console.log('🎉 Poolparty Admin Dashboard initialized!');
    }

    // ➕ Register User
    async registerUser() {
        const nameInput = document.getElementById('registerName');
        const emailInput = document.getElementById('registerEmail');
        const passwordInput = document.getElementById('registerPassword');
        const roleInput = document.getElementById('registerRole');

        const nameValue = nameInput.value.trim();
        const emailValue = emailInput.value.trim();
        const passwordValue = passwordInput.value.trim();
        const roleValue = roleInput.value.trim();

        // Basic validation
        if (!nameValue || !emailValue || !passwordValue) {
            this.showNotification('Name, Email, and Password are required.', 'error');
            return;
        }
        if (!emailValue.includes('@') || !emailValue.includes('.')) {
            this.showNotification('Please enter a valid email address.', 'error');
            return;
        }
        if (passwordValue.length < 8) {
            this.showNotification('Password must be at least 8 characters long.', 'error');
            return;
        }

        try {
            await adminApi.createAccount({
                name: nameValue,
                email: emailValue,
                password: passwordValue,
                roles: roleValue ? [roleValue] : ['user'],
            });
            this.showNotification('User registered successfully!', 'success');
            
            // Reset the form
            const registerForm = document.getElementById('registerUserForm');
            if (registerForm) {
                registerForm.reset();
            }

            // Switch to accounts tab
            const accountsTabRadio = document.getElementById('tab1');
            if (accountsTabRadio) {
                accountsTabRadio.checked = true;
                // Dispatch a change event to trigger tab switching logic
                const changeEvent = new Event('change', { bubbles: true });
                accountsTabRadio.dispatchEvent(changeEvent);
            }

            // Refresh all data, which will re-render tables including the new account
            await this.loadAllData();
            // The tab switching logic and loadAllData should handle re-rendering.
            // If needed, one could force it:
            // this.state.currentTab = 'account';
            // this.renderTable('account');

        } catch (error) {
            this.showNotification(error.message || 'Failed to register user.', 'error');
        }
    }

    // 📊 Data Loading
    async loadAllData() {
        console.log('📊 Loading all data...');
        const sections = Object.keys(this.loaders);

        const promises = sections.map(async (section) => {
            this.setLoading(section, true);
            try {
                console.log(`Loading ${section}...`);
                const data = await this.loaders[section]();
                this.state.data[section] = Array.isArray(data)
                    ? data.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
                    : [];
                console.log(`✅ ${section} loaded: ${this.state.data[section].length} items`);
            } catch (error) {
                console.warn(`⚠️ Failed to load ${section}:`, error);
                this.showNotification(`Error loading ${section}: ${error.message}`, 'error');
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
        if (section === 'register') {
            console.log(`🎯 Section is 'register', skipping table rendering.`);
            // Ensure loading states are handled if they were set for 'register'
            this.setLoading('register', false); 
            return;
        }
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
                    <td><button class="action-btn btn-danger" data-action="delete" data-type="account" data-id="${acc.id}" data-name="${this.escapeHtml(acc.name || '')}">Delete</button></td>
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
        
        return `<button class="action-btn btn-danger" data-action="delete" data-type="${type}" data-id="${item.id}" data-name="${this.escapeHtml(item.name || item.itemName || '')}">Delete</button>`;
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
                // Sort is handled by event delegation via data-action="sort"
                
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
        const deleteFns = {
            registration: adminApi.deleteRegistration,
            item: adminApi.deleteItem,
            volunteer: adminApi.deleteVolunteer,
            account: adminApi.deleteAccount,
        };

        try {
            await deleteFns[type](id);
            
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
        
        const deleteFns = {
            registration: adminApi.deleteRegistration,
            volunteer: adminApi.deleteVolunteer,
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
                    await deleteFns[type](item.id);
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
            await adminApi.createItem(name);
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
            const data = await this.loaders.item();
            this.state.data.item = Array.isArray(data)
                ? data.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0))
                : [];
            this.renderTable('item');
            this.updateStats();
        } finally {
            this.setLoading('item', false);
        }
    }

    // 📧 Email All Registered Users
    generateEmailAllRegistered() {
        console.log('📧 Generating email for all registered users...');
        
        // Get all registered users by matching registration names with account names
        const registeredNames = this.state.data.registration.map(reg => reg.name);
        const registeredAccounts = this.state.data.account.filter(acc => registeredNames.includes(acc.name));
        
        if (registeredAccounts.length === 0) {
            this.showNotification('No registered users found with email addresses.', 'warning');
            return;
        }
        
        // Extract email addresses
        const emailAddresses = registeredAccounts
            .map(acc => acc.email)
            .filter(email => email && email.trim() !== '')
            .filter((email, index, self) => self.indexOf(email) === index); // Remove duplicates
        
        if (emailAddresses.length === 0) {
            this.showNotification('No valid email addresses found for registered users.', 'warning');
            return;
        }
        
        // Create mailto link with BCC
        const subject = encodeURIComponent('Poolparty');
        const body = encodeURIComponent(`Hallo zusammen,

hier sind die neuesten Informationen zur Poolparty.

Viele Grüße
Das Poolparty Team`);
        
        const bccEmails = emailAddresses.join(',');
        const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${subject}&body=${body}`;
        
        // Open the mailto link
        window.location.href = mailtoLink;
        
        // Show success notification
        this.showNotification(`Email client opened with ${emailAddresses.length} recipients in BCC.`, 'success');
        
        console.log(`📧 Email generated for ${emailAddresses.length} registered users:`, emailAddresses);
    }

    // 📧 Email All Account Holders
    generateEmailAllAccounts() {
        console.log('📧 Generating email for all account holders...');
        
        // Get all account holders
        const allAccounts = this.state.data.account;
        
        if (allAccounts.length === 0) {
            this.showNotification('No accounts found.', 'warning');
            return;
        }
        
        // Extract email addresses
        const emailAddresses = allAccounts
            .map(acc => acc.email)
            .filter(email => email && email.trim() !== '')
            .filter((email, index, self) => self.indexOf(email) === index); // Remove duplicates
        
        if (emailAddresses.length === 0) {
            this.showNotification('No valid email addresses found for account holders.', 'warning');
            return;
        }
        
        // Create mailto link with BCC
        const subject = encodeURIComponent('Poolparty');
        const body = encodeURIComponent(`Hallo zusammen,

hier sind allgemeine Informationen zur Poolparty.

Viele Grüße
Das Poolparty Team`);
        
        const bccEmails = emailAddresses.join(',');
        const mailtoLink = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${subject}&body=${body}`;
        
        // Open the mailto link
        window.location.href = mailtoLink;
        
        // Show success notification
        this.showNotification(`Email client opened with ${emailAddresses.length} recipients in BCC.`, 'success');
        
        console.log(`📧 Email generated for ${emailAddresses.length} account holders:`, emailAddresses);
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
        // Global event delegation for data-action buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            if (action === 'delete') {
                const { type, id, name } = btn.dataset;
                this.showDeleteConfirm(type, Number(id), name);
            } else if (action === 'sort') {
                const section = btn.dataset.table.replace('Table', '');
                const column = Number(btn.dataset.column);
                this.sortTable(section, column);
            }
        });

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
                    const sections = ['account', 'registration', 'item', 'volunteer', 'music', 'register', 'mail'];
                    const tabIndex = parseInt(e.target.id.replace('tab', '')) - 1;

                    if (tabIndex < sections.length) {
                        const section = sections[tabIndex];
                        this.state.currentTab = section;
                        console.log(`🔄 Switching to tab: ${section}`);

                        setTimeout(() => {
                            if (section === 'register') {
                                Object.keys(this.loaders).forEach(key => this.setLoading(key, false));
                                this.setLoading('music', false);
                            } else if (section === 'mail') {
                                // Lazy-init the mail tab the first time it's opened
                                if (!this._mailInited) {
                                    this._mailInited = true;
                                    this.initMailTab();
                                } else {
                                    this.refreshMailDrafts();
                                }
                            } else {
                                this.renderTable(section);
                                console.log(`✅ ${section} tab rendered`);
                            }
                        }, 100);
                    } else {
                        console.warn(`⚠️ Tab index ${tabIndex} out of bounds for sections array.`);
                    }
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

        // Email all registered button
        const emailAllRegisteredBtn = document.getElementById('emailAllRegistered');
        if (emailAllRegisteredBtn) {
            emailAllRegisteredBtn.addEventListener('click', () => {
                this.generateEmailAllRegistered();
            });
        }

        // Email all accounts button
        const emailAllAccountsBtn = document.getElementById('emailAllAccounts');
        if (emailAllAccountsBtn) {
            emailAllAccountsBtn.addEventListener('click', () => {
                this.generateEmailAllAccounts();
            });
        }

        // User Registration form
        const registerUserForm = document.getElementById('registerUserForm');
        if (registerUserForm) {
            registerUserForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.registerUser();
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

    // ===== Mail Drafts tab =====
    async initMailTab() {
        console.log('📧 Initializing Mail Drafts tab...');
        this.mailState = {
            drafts: [],
            currentId: null,
            mode: 'visual',
            quill: null,
            lastSavedHtml: '',
            lastSavedSubject: '',
            lastSavedName: '',
            suppressChange: false,
        };

        // Build Quill once. It lives inside #mailQuillHost; the HTML source textarea
        // lives next to it and is shown/hidden by the mode buttons.
        const host = document.getElementById('mailQuillHost');
        if (!host) return;

        if (typeof window.Quill !== 'function') {
            console.warn('Quill not loaded');
            this.mailState.quill = null;
        } else {
            const q = new window.Quill(host, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ color: [] }, { background: [] }],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ align: [] }],
                        ['link', 'image'],
                        ['blockquote', 'code-block'],
                        ['clean'],
                    ],
                },
                placeholder: 'Schreib deine Mail...',
            });

            // Quill → live preview on every change (unless we're programmatically loading)
            q.on('text-change', () => {
                if (this.mailState.suppressChange) return;
                this.refreshMailPreview();
            });
            this.mailState.quill = q;
        }

        // Wire editor-mode buttons
        document.querySelectorAll('.mail-mode-btn').forEach((btn) => {
            btn.addEventListener('click', () => this.switchMailMode(btn.dataset.mailMode));
        });

        // HTML source textarea → preview on input
        const src = document.getElementById('mailHtmlSource');
        if (src) {
            src.addEventListener('input', () => {
                if (this.mailState.suppressChange) return;
                this.refreshMailPreview();
            });
        }

        // Action buttons
        document.getElementById('mailNewBtn')?.addEventListener('click', () => this.newMailDraft());
        document.getElementById('mailSaveBtn')?.addEventListener('click', () => this.saveCurrentMailDraft());
        document.getElementById('mailTestBtn')?.addEventListener('click', () => this.sendCurrentMailTest());
        document.getElementById('mailSendAllBtn')?.addEventListener('click', () => this.sendCurrentMailAll());
        document.getElementById('mailDeleteBtn')?.addEventListener('click', () => this.deleteCurrentMailDraft());
        document.getElementById('mailPreviewRefresh')?.addEventListener('click', () => this.refreshMailPreview());

        // Subject/name inputs → live preview (subject doesn't affect the iframe but we
        // refresh anyway so the user sees unsaved changes reflected).
        ['mailNameInput', 'mailSubjectInput'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', () => {
                // no preview needed, just mark dirty
                this.markMailDirty();
            });
        });

        await this.refreshMailDrafts();
    }

    async refreshMailDrafts() {
        try {
            const drafts = await adminApi.listMailDrafts();
            this.mailState.drafts = drafts;
            this.renderMailDraftList();

            // If nothing selected, auto-select the first draft so the user lands in the editor.
            if (drafts.length > 0 && this.mailState.currentId == null) {
                this.selectMailDraft(drafts[0].id);
            } else if (drafts.length === 0) {
                this.showMailEditor(false);
                document.getElementById('mailDraftHint').textContent = 'Noch keine Entwürfe. Klicke "Neu" um einen anzulegen.';
            }
        } catch (err) {
            this.showNotification(`Fehler beim Laden der Drafts: ${err.message}`, 'error');
        }
    }

    renderMailDraftList() {
        const list = document.getElementById('mailDraftList');
        const hint = document.getElementById('mailDraftHint');
        if (!list) return;
        list.innerHTML = '';
        for (const d of this.mailState.drafts) {
            const li = document.createElement('li');
            li.dataset.draftId = String(d.id);
            if (d.id === this.mailState.currentId) li.classList.add('active');
            const sentMeta = d.lastSentAt
                ? `zuletzt gesendet ${new Date(d.lastSentAt).toLocaleDateString('de-DE')} (${d.lastSentTo ?? '?'} Empfänger)`
                : `aktualisiert ${new Date(d.updatedAt).toLocaleDateString('de-DE')}`;
            li.innerHTML = `<div>${this.escapeHtml(d.name)}</div><span class="mail-draft-meta">${sentMeta}</span>`;
            li.addEventListener('click', () => this.selectMailDraft(d.id));
            list.appendChild(li);
        }
        if (hint) hint.textContent = `${this.mailState.drafts.length} Entwürfe`;
    }

    async selectMailDraft(id) {
        try {
            const draft = await adminApi.getMailDraft(id);
            this.mailState.currentId = draft.id;
            this.mailState.lastSavedHtml = draft.html;
            this.mailState.lastSavedSubject = draft.subject;
            this.mailState.lastSavedName = draft.name;

            document.getElementById('mailNameInput').value = draft.name;
            document.getElementById('mailSubjectInput').value = draft.subject;
            document.getElementById('mailHtmlSource').value = draft.html;

            this.mailState.suppressChange = true;
            if (this.mailState.quill) {
                // Quill doesn't fully load an email HTML document - we feed it the inner body html
                const bodyHtml = this.extractBodyHtml(draft.html);
                this.mailState.quill.root.innerHTML = bodyHtml;
            }
            this.mailState.suppressChange = false;

            this.renderMailDraftList();
            this.showMailEditor(true);
            this.refreshMailPreview();
            this.setMailStatus('');
            this.setMailSendInfo('');
        } catch (err) {
            this.showNotification(`Fehler beim Laden: ${err.message}`, 'error');
        }
    }

    /** Quill works with body-level HTML. If the draft is a full <!DOCTYPE> document,
     * pull out <body>...</body> for editing and re-wrap on save. */
    extractBodyHtml(html) {
        const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        return match ? match[1] : html;
    }

    /** Collect the current HTML from whichever editor mode is active. In visual mode,
     * we merge the Quill body content into the source textarea's current shell so that
     * round-trip edits (source → visual → source) preserve the user's source changes. */
    collectCurrentHtml() {
        const src = document.getElementById('mailHtmlSource');
        if (this.mailState.mode === 'source') {
            return src.value;
        }
        if (!this.mailState.quill) {
            return src.value;
        }
        const bodyContent = this.mailState.quill.root.innerHTML;
        const shell = src.value || this.mailState.lastSavedHtml || '';
        if (/<body[^>]*>[\s\S]*<\/body>/i.test(shell)) {
            return shell.replace(/(<body[^>]*>)[\s\S]*(<\/body>)/i, `$1${bodyContent}$2`);
        }
        return bodyContent;
    }

    switchMailMode(mode) {
        this.mailState.mode = mode;
        const visualBtn = document.querySelector('.mail-mode-btn[data-mail-mode="visual"]');
        const sourceBtn = document.querySelector('.mail-mode-btn[data-mail-mode="source"]');
        const host = document.getElementById('mailQuillHost');
        const src = document.getElementById('mailHtmlSource');

        if (mode === 'visual') {
            visualBtn?.classList.add('active');
            sourceBtn?.classList.remove('active');
            host.hidden = false;
            src.hidden = true;
            // pull HTML source back into Quill
            this.mailState.suppressChange = true;
            if (this.mailState.quill) {
                const bodyHtml = this.extractBodyHtml(src.value);
                this.mailState.quill.root.innerHTML = bodyHtml;
            }
            this.mailState.suppressChange = false;
        } else {
            sourceBtn?.classList.add('active');
            visualBtn?.classList.remove('active');
            host.hidden = true;
            src.hidden = false;
            // pull Quill content back into source (merged with shell)
            src.value = this.collectCurrentHtml();
        }
        this.refreshMailPreview();
    }

    refreshMailPreview() {
        const frame = document.getElementById('mailPreviewFrame');
        if (!frame) return;
        const html = this.collectCurrentHtml();
        frame.srcdoc = html;
    }

    markMailDirty() {
        this.setMailStatus('⚠️ Ungespeicherte Änderungen');
    }

    setMailStatus(text) {
        const el = document.getElementById('mailEditorStatus');
        if (el) el.textContent = text;
    }

    setMailSendInfo(text, kind = '') {
        const el = document.getElementById('mailSendInfo');
        if (!el) return;
        el.textContent = text;
        el.className = 'mail-sendinfo' + (kind ? ` ${kind}` : '');
    }

    showMailEditor(show) {
        document.getElementById('mailEditorPane').hidden = !show;
        document.getElementById('mailEmptyPane').hidden = show;
    }

    newMailDraft() {
        const name = prompt('Name für den neuen Entwurf:', 'Neuer Entwurf');
        if (!name) return;
        const subject = prompt('Betreff der E-Mail:', '🏊 Poolparty 2026');
        if (!subject) return;
        const emptyHtml = '<!DOCTYPE html><html><body><p>Hier schreiben...</p></body></html>';
        adminApi
            .createMailDraft({ name, subject, html: emptyHtml })
            .then(async (draft) => {
                await this.refreshMailDrafts();
                this.selectMailDraft(draft.id);
                this.showNotification('Entwurf angelegt', 'success');
            })
            .catch((err) => this.showNotification(err.message, 'error'));
    }

    async saveCurrentMailDraft() {
        if (this.mailState.currentId == null) return;
        const name = document.getElementById('mailNameInput').value.trim();
        const subject = document.getElementById('mailSubjectInput').value.trim();
        const html = this.collectCurrentHtml();

        if (!name || !subject || !html) {
            this.showNotification('Name, Betreff und HTML sind Pflicht', 'error');
            return;
        }

        try {
            const updated = await adminApi.updateMailDraft(this.mailState.currentId, { name, subject, html });
            this.mailState.lastSavedHtml = updated.html;
            this.mailState.lastSavedSubject = updated.subject;
            this.mailState.lastSavedName = updated.name;
            // Also keep the visible source textarea in sync
            document.getElementById('mailHtmlSource').value = updated.html;
            this.setMailStatus('✅ Gespeichert');
            this.showNotification('Draft gespeichert', 'success');
            await this.refreshMailDrafts();
        } catch (err) {
            this.showNotification(`Fehler beim Speichern: ${err.message}`, 'error');
        }
    }

    async sendCurrentMailTest() {
        if (this.mailState.currentId == null) return;
        if (!confirm('Test-Mail an dich selbst senden?')) return;
        this.setMailSendInfo('Wird gesendet…');
        try {
            const result = await adminApi.sendMailDraftTest(this.mailState.currentId);
            this.setMailSendInfo(`✅ Test-Mail verschickt an ${result.recipients.join(', ')}`, 'success');
        } catch (err) {
            this.setMailSendInfo(`❌ ${err.message}`, 'error');
        }
    }

    async sendCurrentMailAll() {
        if (this.mailState.currentId == null) return;
        const count = this.state.data.account?.length ?? '?';
        if (!confirm(`⚠️ Diese Mail wird an ALLE ${count} Accounts gesendet. Sicher?`)) return;
        if (!confirm(`Absolut sicher? Tippe die Zahl ${count} um zu bestätigen.`)) return;
        this.setMailSendInfo('Sende an alle Empfänger…');
        try {
            const result = await adminApi.sendMailDraftAll(this.mailState.currentId);
            const msg = `✅ ${result.sent} gesendet, ${result.failed} fehlgeschlagen`;
            this.setMailSendInfo(msg + (result.failed ? ` — Fehler: ${result.errors?.map((e) => e.email).join(', ') ?? ''}` : ''), result.failed ? 'error' : 'success');
            await this.refreshMailDrafts();
        } catch (err) {
            this.setMailSendInfo(`❌ ${err.message}`, 'error');
        }
    }

    async deleteCurrentMailDraft() {
        if (this.mailState.currentId == null) return;
        if (!confirm('Entwurf wirklich löschen? Kann nicht rückgängig gemacht werden.')) return;
        try {
            await adminApi.deleteMailDraft(this.mailState.currentId);
            this.mailState.currentId = null;
            this.showNotification('Entwurf gelöscht', 'success');
            await this.refreshMailDrafts();
            if (this.mailState.drafts.length === 0) this.showMailEditor(false);
        } catch (err) {
            this.showNotification(err.message, 'error');
        }
    }

    escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }
}
// 🚀 Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new PoolpartyAdmin();
});
