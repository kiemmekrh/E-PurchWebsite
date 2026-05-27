// ==================== GLOBAL ====================
let currentTab = 'users';
let allUsers = [];
let allSuppliers = [];
let allLogs = [];

// Pagination variables
let currentUserPage = 1, userRowsPerPage = 10, totalUserPages = 1;
let currentSupplierPage = 1, supplierRowsPerPage = 10, totalSupplierPages = 1;
let currentLogPage = 1, logRowsPerPage = 10, totalLogPages = 1;

// Filtered data
let filteredUsers = [];
let filteredSuppliers = [];
let filteredLogs = [];

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadSuppliers();
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    if (tab === 'users') {
        currentUserPage = 1;
        renderUsersWithPagination(filteredUsers);
    } else if (tab === 'suppliers') {
        currentSupplierPage = 1;
        renderSuppliersWithPagination(filteredSuppliers);
    } else if (tab === 'logs') {
        currentLogPage = 1;
        renderLogsWithPagination(filteredLogs);
    }
}

// ==================== PAGINATION HELPERS ====================
function generatePageNumbers(current, total) {
    const pages = [];
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (current < total - 2) pages.push('...');
        pages.push(total);
    }
    return pages;
}

function buildPaginationHTML(containerId, currentPage, totalPages, totalItems, perPage, goToFn, changePerPageFn) {
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);
    const pageNumbers = generatePageNumbers(currentPage, totalPages);

    let pageButtons = '';
    pageNumbers.forEach(p => {
        if (p === '...') {
            pageButtons += `<span class="pagination-ellipsis">...</span>`;
        } else {
            const activeClass = p === currentPage ? 'active' : '';
            pageButtons += `<button class="pagination-btn ${activeClass}" onclick="${goToFn}(${p})">${p}</button>`;
        }
    });

    return `
        <div class="pagination-bar" id="${containerId}">
            <div class="pagination-info">
                Showing <strong>${startItem}-${endItem}</strong> of <strong>${totalItems}</strong> records
            </div>
            <div class="pagination-pages">
                <button class="pagination-btn" onclick="${goToFn}(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                ${pageButtons}
                <button class="pagination-btn" onclick="${goToFn}(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#666;font-size:13px;">Rows per page:</span>
                <select class="pagination-select" onchange="${changePerPageFn}(this.value)">
                    <option value="10" ${perPage == 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${perPage == 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${perPage == 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage == 100 ? 'selected' : ''}>100</option>
                </select>
            </div>
        </div>
    `;
}

function insertPagination(containerId, html, afterElementId) {
    let existing = document.getElementById(containerId);
    if (existing) existing.remove();
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const paginationBar = temp.firstElementChild;
    
    const afterElement = document.getElementById(afterElementId);
    if (afterElement && afterElement.parentNode) {
        afterElement.parentNode.insertBefore(paginationBar, afterElement.nextSibling);
    }
}

// ==================== USERS CRUD ====================
function loadUsers() {
    fetch('api/get_users.php')
        .then(r => r.json())
        .then(data => {
            allUsers = data.data || [];
            filteredUsers = [...allUsers];
            currentUserPage = 1;
            renderUsersWithPagination(filteredUsers);
        })
        .catch(err => {
            console.error('Failed to load users:', err);
            document.getElementById('usersTableBody').innerHTML = 
                '<tr><td colspan="7" class="empty-state">Failed to load users</td></tr>';
        });
}

function renderUsersWithPagination(users, page = 1, perPage = 10) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
        insertPagination('userPagination', buildPaginationHTML('userPagination', 1, 1, 0, 10, 'goToUserPage', 'changeUserRowsPerPage'), 'usersTable');
        return;
    }
    
    currentUserPage = page;
    userRowsPerPage = perPage;
    
    const totalItems = users.length;
    totalUserPages = Math.ceil(totalItems / perPage) || 1;
    
    if (page < 1) page = 1;
    if (page > totalUserPages) page = totalUserPages;
    currentUserPage = page;
    
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pageData = users.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(u => `
        <tr>
            <td>${u.user_id}</td>
            <td>${escapeHtml(u.name)}</td>
            <td>${escapeHtml(u.email)}</td>
            <td><span class="status-badge status-${u.status}">${formatRole(u.role)}</span></td>
            <td><span class="status-badge ${u.status === 'active' ? 'status-active' : 'status-inactive'}">${u.status}</span></td>
            <td>${formatDate(u.created_at)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editUser(${u.user_id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteUser(${u.user_id}, '${escapeHtml(u.name)}')">Delete</button>
            </td>
        </tr>
    `).join('');
    
    insertPagination('userPagination', buildPaginationHTML('userPagination', currentUserPage, totalUserPages, totalItems, userRowsPerPage, 'goToUserPage', 'changeUserRowsPerPage'), 'usersTable');
}

function goToUserPage(page) {
    if (page < 1 || page > totalUserPages) return;
    currentUserPage = page;
    renderUsersWithPagination(filteredUsers, page, userRowsPerPage);
}

function changeUserRowsPerPage(value) {
    userRowsPerPage = parseInt(value);
    currentUserPage = 1;
    renderUsersWithPagination(filteredUsers, 1, userRowsPerPage);
}

function filterUsers() {
    const query = document.getElementById('searchUser').value.toLowerCase().trim();
    currentUserPage = 1;
    
    if (query === '') {
        filteredUsers = [...allUsers];
    } else {
        filteredUsers = allUsers.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.email.toLowerCase().includes(query) ||
            u.role.toLowerCase().includes(query)
        );
    }
    renderUsersWithPagination(filteredUsers);
}

function showUserForm() {
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModalTitle').textContent = 'Add User';
    document.getElementById('passwordLabel').textContent = '*';
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordHint').style.display = 'none';
    document.getElementById('userModal').classList.add('active');
}

function hideUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

function editUser(userId) {
    const user = allUsers.find(u => u.user_id == userId);
    if (!user) return;
    
    document.getElementById('userId').value = user.user_id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status;
    document.getElementById('userPassword').value = '';
    
    document.getElementById('userModalTitle').textContent = 'Edit User';
    document.getElementById('passwordLabel').textContent = '';
    document.getElementById('userPassword').required = false;
    document.getElementById('passwordHint').style.display = 'block';
    document.getElementById('userModal').classList.add('active');
}

function saveUser() {
    const userId = document.getElementById('userId').value;
    const isEdit = userId !== '';
    
    const data = {
        user_id: userId || null,
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        role: document.getElementById('userRole').value,
        status: document.getElementById('userStatus').value,
        password: document.getElementById('userPassword').value
    };
    
    if (!data.name || !data.email) {
        showToast('Name and email are required!', 'error');
        return;
    }
    
    if (!isEdit && !data.password) {
        showToast('Password is required for new users!', 'error');
        return;
    }
    
    const btn = document.getElementById('saveUserBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    
    fetch('api/save_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        
        if (res.success) {
            showToast(isEdit ? 'User updated successfully!' : 'User created successfully!');
            hideUserModal();
            loadUsers();
        } else {
            showToast(res.error || 'Failed to save user', 'error');
        }
    })
    .catch(err => {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        showToast('Network error: ' + err.message, 'error');
    });
}

function deleteUser(userId, userName) {
    if (!confirm(`Deactivate user "${userName}"?\n\nThis will mark the user as inactive. Records linked to this user will remain intact.`)) {
        return;
    }
    
    fetch('api/delete_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            showToast('User deactivated successfully!');
            loadUsers();  // Refresh list
        } else {
            showToast(res.error || 'Failed to deactivate user', 'error');
        }
    })
    .catch(err => {
        showToast('Network error: ' + err.message, 'error');
    });
}

// ==================== SUPPLIERS CRUD ====================
function loadSuppliers() {
    fetch('api/get_suppliers.php')
        .then(r => r.json())
        .then(data => {
            allSuppliers = data.data || [];
            filteredSuppliers = [...allSuppliers];  // <-- INISIALISASI filteredSuppliers
            currentSupplierPage = 1;
            renderSuppliersWithPagination(filteredSuppliers);
        })
        .catch(err => {
            console.error('Failed to load suppliers:', err);
            document.getElementById('suppliersTableBody').innerHTML = 
                '<tr><td colspan="7" class="empty-state">Failed to load suppliers</td></tr>';
        });
}

function renderSuppliersWithPagination(suppliers, page = 1, perPage = 10) {
    const tbody = document.getElementById('suppliersTableBody');
    
    if (!suppliers || suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No suppliers found</td></tr>';
        insertPagination('supplierPagination', buildPaginationHTML('supplierPagination', 1, 1, 0, 10, 'goToSupplierPage', 'changeSupplierRowsPerPage'), 'suppliersTable');
        return;
    }
    
    currentSupplierPage = page;
    supplierRowsPerPage = perPage;
    
    const totalItems = suppliers.length;
    totalSupplierPages = Math.ceil(totalItems / perPage) || 1;
    
    if (page < 1) page = 1;
    if (page > totalSupplierPages) page = totalSupplierPages;
    currentSupplierPage = page;
    
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pageData = suppliers.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(s => `
        <tr>
            <td>${s.supplier_id}</td>
            <td>${escapeHtml(s.supplier_name)}</td>
            <td>${escapeHtml(s.email)}</td>
            <td>${escapeHtml(s.contact_info || '-')}</td>
            <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-inactive'}">${s.status}</span></td>
            <td>${formatDate(s.created_at)}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editSupplier(${s.supplier_id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteSupplier(${s.supplier_id}, '${escapeHtml(s.supplier_name)}')">Delete</button>
            </td>
        </tr>
    `).join('');
    
    insertPagination('supplierPagination', buildPaginationHTML('supplierPagination', currentSupplierPage, totalSupplierPages, totalItems, supplierRowsPerPage, 'goToSupplierPage', 'changeSupplierRowsPerPage'), 'suppliersTable');
}

function goToSupplierPage(page) {
    if (page < 1 || page > totalSupplierPages) return;
    currentSupplierPage = page;
    renderSuppliersWithPagination(filteredSuppliers, page, supplierRowsPerPage);
}

function changeSupplierRowsPerPage(value) {
    supplierRowsPerPage = parseInt(value);
    currentSupplierPage = 1;
    renderSuppliersWithPagination(filteredSuppliers, 1, supplierRowsPerPage);
}

function filterSuppliers() {
    const query = document.getElementById('searchSupplier').value.toLowerCase().trim();
    currentSupplierPage = 1;
    
    if (query === '') {
        filteredSuppliers = [...allSuppliers];
    } else {
        filteredSuppliers = allSuppliers.filter(s => 
            s.supplier_name.toLowerCase().includes(query) || 
            s.email.toLowerCase().includes(query)
        );
    }
    renderSuppliersWithPagination(filteredSuppliers);
}

function showSupplierForm() {
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';
    document.getElementById('supplierModalTitle').textContent = 'Add Supplier';
    document.getElementById('supplierPasswordLabel').textContent = '*';
    document.getElementById('supplierPassword').required = true;
    document.getElementById('supplierPasswordHint').style.display = 'none';
    document.getElementById('supplierModal').classList.add('active');
}

function hideSupplierModal() {
    document.getElementById('supplierModal').classList.remove('active');
}

function editSupplier(supplierId) {
    const supplier = allSuppliers.find(s => s.supplier_id == supplierId);
    if (!supplier) return;
    
    document.getElementById('supplierId').value = supplier.supplier_id;
    document.getElementById('supplierName').value = supplier.supplier_name;
    document.getElementById('supplierEmail').value = supplier.email;
    document.getElementById('supplierContact').value = supplier.contact_info || '';
    document.getElementById('supplierStatus').value = supplier.status;
    document.getElementById('supplierPassword').value = '';
    
    document.getElementById('supplierModalTitle').textContent = 'Edit Supplier';
    document.getElementById('supplierPasswordLabel').textContent = '';
    document.getElementById('supplierPassword').required = false;
    document.getElementById('supplierPasswordHint').style.display = 'block';
    document.getElementById('supplierModal').classList.add('active');
}

function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    const isEdit = supplierId !== '';
    
    const data = {
        supplier_id: supplierId || null,
        supplier_name: document.getElementById('supplierName').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        contact_info: document.getElementById('supplierContact').value.trim(),
        status: document.getElementById('supplierStatus').value,
        password: document.getElementById('supplierPassword').value
    };
    
    if (!data.supplier_name || !data.email) {
        showToast('Supplier name and email are required!', 'error');
        return;
    }
    
    if (!isEdit && !data.password) {
        showToast('Password is required for new suppliers!', 'error');
        return;
    }
    
    const btn = document.getElementById('saveSupplierBtn');
    btn.classList.add('btn-loading');
    btn.disabled = true;
    
    fetch('api/save_supplier.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(res => {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        
        if (res.success) {
            showToast(isEdit ? 'Supplier updated successfully!' : 'Supplier created successfully!');
            hideSupplierModal();
            loadSuppliers();
        } else {
            showToast(res.error || 'Failed to save supplier', 'error');
        }
    })
    .catch(err => {
        btn.classList.remove('btn-loading');
        btn.disabled = false;
        showToast('Network error: ' + err.message, 'error');
    });
}

function deleteSupplier(supplierId, supplierName) {
    if (!confirm(`Deactivate supplier "${supplierName}"?\n\nThis will mark the supplier as inactive. Purchase orders linked to this supplier will remain intact.`)) {
        return;
    }
    
    fetch('api/delete_supplier.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: supplierId })
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            showToast('Supplier deactivated successfully!');
            loadSuppliers();  // Refresh list
        } else {
            showToast(res.error || 'Failed to deactivate supplier', 'error');
        }
    })
    .catch(err => {
        showToast('Network error: ' + err.message, 'error');
    });
}

// ==================== LOGS ====================
function loadLogs() {
    const action = document.getElementById('filterLogAction').value;
    const date = document.getElementById('filterLogDate').value;
    
    const params = new URLSearchParams();
    if (action !== 'all') params.append('action', action);
    if (date) params.append('date', date);
    
    fetch('api/get_logs.php?' + params.toString())
        .then(r => r.json())
        .then(data => {
            allLogs = data.data || [];
            filteredLogs = [...allLogs];
            currentLogPage = 1;
            renderLogsWithPagination(filteredLogs);
        })
        .catch(err => {
            console.error('Failed to load logs:', err);
            document.getElementById('logsTableBody').innerHTML = 
                '<tr><td colspan="5" class="empty-state">Failed to load logs</td></tr>';
        });
}

function renderLogsWithPagination(logs, page = 1, perPage = 10) {
    const tbody = document.getElementById('logsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No logs found</td></tr>';
        insertPagination('logPagination', buildPaginationHTML('logPagination', 1, 1, 0, 10, 'goToLogPage', 'changeLogRowsPerPage'), 'logsTable');
        return;
    }
    
    currentLogPage = page;
    logRowsPerPage = perPage;
    
    const totalItems = logs.length;
    totalLogPages = Math.ceil(totalItems / perPage) || 1;
    
    if (page < 1) page = 1;
    if (page > totalLogPages) page = totalLogPages;
    currentLogPage = page;
    
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pageData = logs.slice(startIndex, endIndex);
    
    tbody.innerHTML = pageData.map(log => `
        <tr>
            <td>${formatDateTime(log.created_at)}</td>
            <td>${escapeHtml(log.user_name || 'System')}</td>
            <td><span class="status-badge">${log.action}</span></td>
            <td>${escapeHtml(log.details || '-')}</td>
            <td>${log.ip_address || '-'}</td>
        </tr>
    `).join('');
    
    insertPagination('logPagination', buildPaginationHTML('logPagination', currentLogPage, totalLogPages, totalItems, logRowsPerPage, 'goToLogPage', 'changeLogRowsPerPage'), 'logsTable');
}

function goToLogPage(page) {
    if (page < 1 || page > totalLogPages) return;
    currentLogPage = page;
    renderLogsWithPagination(filteredLogs, page, logRowsPerPage);
}

function changeLogRowsPerPage(value) {
    logRowsPerPage = parseInt(value);
    currentLogPage = 1;
    renderLogsWithPagination(filteredLogs, 1, logRowsPerPage);
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRole(role) {
    return role.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', { 
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(o => o.classList.remove('active'));
    }
});
function loadSuppliers() {
    console.log('=== loadSuppliers() called ===');
    
    fetch('api/get_suppliers.php')
        .then(r => {
            console.log('Response status:', r.status);
            return r.json();
        })
        .then(data => {
            console.log('Raw data:', data);
            console.log('data.data:', data.data);
            console.log('data.success:', data.success);
            
            allSuppliers = data.data || [];
            filteredSuppliers = [...allSuppliers];
            currentSupplierPage = 1;
            
            console.log('allSuppliers count:', allSuppliers.length);
            console.log('filteredSuppliers count:', filteredSuppliers.length);
            
            renderSuppliersWithPagination(filteredSuppliers);
        })
        .catch(err => {
            console.error('ERROR in loadSuppliers:', err);
            document.getElementById('suppliersTableBody').innerHTML = 
                '<tr><td colspan="7" class="empty-state">Failed to load suppliers: ' + err.message + '</td></tr>';
        });
}

function filterSuppliers() {
    const query = document.getElementById('searchSupplier').value.toLowerCase().trim();
    
    console.log('=== filterSuppliers() called ===');
    console.log('Search query:', query);
    console.log('allSuppliers count:', allSuppliers.length);
    console.log('allSuppliers:', allSuppliers);
    
    currentSupplierPage = 1;
    
    if (query === '') {
        filteredSuppliers = [...allSuppliers];
    } else {
        filteredSuppliers = allSuppliers.filter(s => {
            const matchName = s.supplier_name && s.supplier_name.toLowerCase().includes(query);
            const matchEmail = s.email && s.email.toLowerCase().includes(query);
            console.log('Checking:', s.supplier_name, '| name match:', matchName, '| email match:', matchEmail);
            return matchName || matchEmail;
        });
    }
    
    console.log('filteredSuppliers count:', filteredSuppliers.length);
    renderSuppliersWithPagination(filteredSuppliers);
}