<?php
// File: modules/master/index.php (Master Data Management)
session_start();
require_once '../../auth/check_session.php';
checkAuth(['admin']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Master Data | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
        /* Status badges */
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-active {
            background: #d4edda;
            color: #155724;
        }
        .status-inactive {
            background: #f8d7da;
            color: #721c24;
        }

        /* Action buttons in table */
        .action-btn {
            padding: 4px 10px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            margin-right: 4px;
            transition: opacity 0.2s;
        }
        .action-btn:hover {
            opacity: 0.8;
        }
        .btn-edit {
            background: #4a90e2;
            color: white;
        }
        .btn-delete {
            background: #dc3545;
            color: white;
        }

        /* Modal styles */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        .modal-overlay.active {
            display: flex;
        }
        .modal {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modal-header {
            padding: 20px 25px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-title {
            font-size: 18px;
            font-weight: 700;
            color: #333;
        }
        .modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            line-height: 1;
        }
        .modal-close:hover {
            color: #333;
        }
        .modal-body {
            padding: 25px;
        }
        .modal-footer {
            padding: 15px 25px 25px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        /* Form styles */
        .form-group {
            margin-bottom: 18px;
        }
        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #555;
            margin-bottom: 6px;
        }
        .form-input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
        }
        .form-input:focus {
            outline: none;
            border-color: #4a90e2;
            box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }
        .form-row {
            display: flex;
            gap: 15px;
        }
        .form-row .form-group {
            flex: 1;
        }
        .form-textarea {
            resize: vertical;
            min-height: 80px;
        }

        /* Toast notification */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 9999;
            transform: translateX(120%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .toast.show {
            transform: translateX(0);
        }
        .toast-success {
            background: #28a745;
        }
        .toast-error {
            background: #dc3545;
        }

        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #888;
        }

        /* Pending reset badge on tab */
        .reset-badge {
            display: inline-block;
            min-width: 18px;
            padding: 1px 6px;
            border-radius: 10px;
            background: #dc3545;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            margin-left: 4px;
        }
        .btn-reset {
            background: #f0ad4e;
            color: white;
        }

        /* Loading spinner */
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #fff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-left: 8px;
            vertical-align: middle;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Master Data Management</h1>
                <p class="welcome-text">Manage users, suppliers, and system logs</p>
            </div>
        </div>

        <div class="master-tabs">
            <button class="tab-btn active" onclick="switchTab('users')">👥 Users</button>
            <button class="tab-btn" onclick="switchTab('suppliers')">🏢 Suppliers</button>
            <button class="tab-btn" onclick="switchTab('resets')">🔑 Reset Requests <span id="resetBadge" class="reset-badge" style="display:none;">0</span></button>
            <button class="tab-btn" onclick="switchTab('logs')">📋 Activity Logs</button>
        </div>

        <!-- ========== USERS TAB ========== -->
        <div id="tab-users" class="tab-content active">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="showUserForm()">+ Add User</button>
                <input type="text" class="filter-input" placeholder="Search users..." id="searchUser" oninput="filterUsers()">
            </div>
            <div class="data-table-container">
                <table class="data-table" id="usersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>NAME</th>
                            <th>EMAIL</th>
                            <th>ROLE</th>
                            <th>STATUS</th>
                            <th>CREATED</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <tr><td colspan="7" class="empty-state">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ========== SUPPLIERS TAB ========== -->
        <div id="tab-suppliers" class="tab-content">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="showSupplierForm()">+ Add Supplier</button>
                <input type="text" class="filter-input" placeholder="Search suppliers..." id="searchSupplier" oninput="filterSuppliers()">
            </div>
            <div class="data-table-container">
                <table class="data-table" id="suppliersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>SUPPLIER NAME</th>
                            <th>EMAIL</th>
                            <th>CONTACT INFO</th>
                            <th>STATUS</th>
                            <th>CREATED</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTableBody">
                        <tr><td colspan="7" class="empty-state">Loading suppliers...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ========== RESET REQUESTS TAB ========== -->
        <div id="tab-resets" class="tab-content">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="loadResetRequests()">Refresh</button>
                <span style="color:#888; font-size:13px; align-self:center;">Users who have forgotten their passwords should submit a request here. Reset the password and then notify the user of the new one.</span>
            </div>
            <div class="data-table-container">
                <table class="data-table" id="resetsTable">
                    <thead>
                        <tr>
                            <th>NAME</th>
                            <th>USERNAME</th>
                            <th>TYPE</th>
                            <th>REQUESTED</th>
                            <th>STATUS</th>
                            <th>HANDLED BY</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="resetsTableBody">
                        <tr><td colspan="7" class="empty-state">Loading requests...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ========== LOGS TAB ========== -->
        <div id="tab-logs" class="tab-content">
            <div class="filters-bar">
                <select class="filter-select" id="filterLogAction" onchange="loadLogs()">
                    <option value="all">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="ZMM039_UPLOAD">ZMM039 Upload</option>
                    <option value="INVOICE_SUBMIT">Invoice Submit</option>
                    <option value="INVOICE_VALIDATE">Invoice Validate</option>
                </select>
                <input type="date" class="filter-input" id="filterLogDate" onchange="loadLogs()">
                <button class="btn btn-primary btn-small" onclick="loadLogs()">Refresh</button>
            </div>
            <div class="data-table-container">
                <table class="data-table" id="logsTable">
                    <thead>
                        <tr>
                            <th>TIMESTAMP</th>
                            <th>USER</th>
                            <th>ACTION</th>
                            <th>DETAILS</th>
                            <th>IP ADDRESS</th>
                        </tr>
                    </thead>
                    <tbody id="logsTableBody">
                        <tr><td colspan="5" class="empty-state">Loading logs...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- ========== USER MODAL ========== -->
    <div id="userModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title" id="userModalTitle">Add User</h3>
                <button class="modal-close" onclick="hideUserModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="userForm">
                    <input type="hidden" id="userId">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" id="userName" class="form-input" required placeholder="Enter full name">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="userEmail" class="form-input" required placeholder="Enter email address">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Role *</label>
                            <select id="userRole" class="form-input" required>
                                <option value="purchasing_staff">Purchasing Staff</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select id="userStatus" class="form-input">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" id="passwordGroup">
                        <label>Password <span id="passwordLabel">*</span></label>
                        <input type="password" id="userPassword" class="form-input" placeholder="Min 6 characters">
                        <small style="color: #888; font-size: 12px;" id="passwordHint">Leave blank to keep current password when editing</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideUserModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveUser()" id="saveUserBtn">Save User</button>
            </div>
        </div>
    </div>

    <!-- ========== SUPPLIER MODAL ========== -->
    <div id="supplierModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title" id="supplierModalTitle">Add Supplier</h3>
                <button class="modal-close" onclick="hideSupplierModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="supplierForm">
                    <input type="hidden" id="supplierId">
                    <div class="form-group">
                        <label>Supplier Name *</label>
                        <input type="text" id="supplierName" class="form-input" required placeholder="Enter supplier name">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="supplierEmail" class="form-input" required placeholder="Enter supplier email">
                    </div>
                    <div class="form-group">
                        <label>Contact Info</label>
                        <input type="text" id="supplierContact" class="form-input" placeholder="Phone, address, etc.">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Status</label>
                            <select id="supplierStatus" class="form-input">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" id="supplierPasswordGroup">
                        <label>Password <span id="supplierPasswordLabel">*</span></label>
                        <input type="password" id="supplierPassword" class="form-input" placeholder="Min 6 characters">
                        <small style="color: #888; font-size: 12px;" id="supplierPasswordHint">Leave blank to keep current password when editing</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideSupplierModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveSupplier()" id="saveSupplierBtn">Save Supplier</button>
            </div>
        </div>
    </div>

    <!-- ========== RESET PASSWORD MODAL ========== -->
    <div id="resetModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Reset Password</h3>
                <button class="modal-close" onclick="hideResetModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="resetForm">
                    <input type="hidden" id="resetRequestId">
                    <div class="form-group">
                        <label>Account</label>
                        <input type="text" id="resetAccountInfo" class="form-input" readonly style="background:#f5f5f5;">
                    </div>
                    <div class="form-group">
                        <label>New Password *</label>
                        <input type="text" id="resetNewPassword" class="form-input" required placeholder="Min 6 characters" minlength="6">
                        <small style="color: #888; font-size: 12px;">Intentionally displayed (not hidden) so it can be easily copied and sent to users.</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideResetModal()">Cancel</button>
                <button class="btn btn-primary" onclick="submitResetRequest()" id="submitResetBtn">Reset Password</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>

    <script>
        // ==================== GLOBAL ====================
        let currentTab = 'users';
        let allUsers = [];
        let allSuppliers = [];

        document.addEventListener('DOMContentLoaded', () => {
            loadUsers();
            refreshResetBadge();
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
            
            // Update tab buttons
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            
            // Load data
            if (tab === 'users') loadUsers();
            else if (tab === 'suppliers') loadSuppliers();
            else if (tab === 'resets') loadResetRequests();
            else if (tab === 'logs') loadLogs();
        }

        // ==================== USERS CRUD ====================
        function loadUsers() {
            fetch('api/get_users.php')
                .then(r => r.json())
                .then(data => {
                    allUsers = data.data || [];
                    renderUsers(allUsers);
                })
                .catch(err => {
                    console.error('Failed to load users:', err);
                    document.getElementById('usersTableBody').innerHTML = 
                        '<tr><td colspan="7" class="empty-state">Failed to load users</td></tr>';
                });
        }

        function renderUsers(users) {
            const tbody = document.getElementById('usersTableBody');
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users found</td></tr>';
                return;
            }
            
            tbody.innerHTML = users.map(u => `
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
        }

        function filterUsers() {
            const query = document.getElementById('searchUser').value.toLowerCase();
            const filtered = allUsers.filter(u => 
                u.name.toLowerCase().includes(query) || 
                u.email.toLowerCase().includes(query) ||
                u.role.toLowerCase().includes(query)
            );
            renderUsers(filtered);
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
            if (!confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone!`)) {
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
                    showToast('User deleted successfully!');
                    loadUsers();
                } else {
                    showToast(res.error || 'Failed to delete user', 'error');
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
                    renderSuppliers(allSuppliers);
                })
                .catch(err => {
                    console.error('Failed to load suppliers:', err);
                    document.getElementById('suppliersTableBody').innerHTML = 
                        '<tr><td colspan="7" class="empty-state">Failed to load suppliers</td></tr>';
                });
        }

        function renderSuppliers(suppliers) {
            const tbody = document.getElementById('suppliersTableBody');
            if (suppliers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No suppliers found</td></tr>';
                return;
            }
            
            tbody.innerHTML = suppliers.map(s => `
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
        }

        function filterSuppliers() {
            const query = document.getElementById('searchSupplier').value.toLowerCase();
            const filtered = allSuppliers.filter(s => 
                s.supplier_name.toLowerCase().includes(query) || 
                s.email.toLowerCase().includes(query)
            );
            renderSuppliers(filtered);
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
            if (!confirm(`Are you sure you want to delete supplier "${supplierName}"?\n\nThis action cannot be undone!`)) {
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
                    showToast('Supplier deleted successfully!');
                    loadSuppliers();
                } else {
                    showToast(res.error || 'Failed to delete supplier', 'error');
                }
            })
            .catch(err => {
                showToast('Network error: ' + err.message, 'error');
            });
        }

        // ==================== RESET REQUESTS ====================
        let allResetRequests = [];

        function updateResetBadge(count) {
            const badge = document.getElementById('resetBadge');
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Ambil jumlah pending saja (untuk badge di tab) tanpa pindah tab.
        function refreshResetBadge() {
            fetch('api/get_reset_requests.php')
                .then(r => r.json())
                .then(data => updateResetBadge(data.pending_count || 0))
                .catch(() => {});
        }

        function loadResetRequests() {
            fetch('api/get_reset_requests.php')
                .then(r => r.json())
                .then(data => {
                    allResetRequests = data.data || [];
                    updateResetBadge(data.pending_count || 0);
                    renderResetRequests(allResetRequests);
                })
                .catch(err => {
                    console.error('Failed to load reset requests:', err);
                    document.getElementById('resetsTableBody').innerHTML =
                        '<tr><td colspan="7" class="empty-state">Failed to load requests</td></tr>';
                });
        }

        function renderResetRequests(requests) {
            const tbody = document.getElementById('resetsTableBody');
            if (requests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No reset requests</td></tr>';
                return;
            }

            tbody.innerHTML = requests.map(r => {
                const isPending = r.status === 'pending';
                const statusClass = isPending ? 'status-inactive' : 'status-active';
                const statusLabel = r.status.charAt(0).toUpperCase() + r.status.slice(1);
                const typeLabel = r.account_type === 'user' ? 'Staff/Admin' : 'Supplier';
                const action = isPending
                    ? `<button class="action-btn btn-reset" onclick="openResetModal(${r.request_id})">Reset</button>`
                    : `<button class="action-btn btn-delete" onclick="deleteResetRequest(${r.request_id})">Delete</button>`;
                return `
                    <tr>
                        <td>${escapeHtml(r.account_name || '-')}</td>
                        <td>${escapeHtml(r.identifier)}</td>
                        <td>${typeLabel}</td>
                        <td>${formatDateTime(r.requested_at)}</td>
                        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                        <td>${escapeHtml(r.handled_by_name || '-')}</td>
                        <td>${action}</td>
                    </tr>
                `;
            }).join('');
        }

        function openResetModal(requestId) {
            const req = allResetRequests.find(r => r.request_id == requestId);
            if (!req) return;
            document.getElementById('resetForm').reset();
            document.getElementById('resetRequestId').value = req.request_id;
            const typeLabel = req.account_type === 'user' ? 'Staff/Admin' : 'Supplier';
            document.getElementById('resetAccountInfo').value = `${req.account_name || ''} (${req.identifier}) — ${typeLabel}`;
            document.getElementById('resetModal').classList.add('active');
        }

        function hideResetModal() {
            document.getElementById('resetModal').classList.remove('active');
        }

        function submitResetRequest() {
            const requestId = document.getElementById('resetRequestId').value;
            const newPassword = document.getElementById('resetNewPassword').value;

            if (newPassword.length < 6) {
                showToast('Password minimal 6 karakter!', 'error');
                return;
            }

            const btn = document.getElementById('submitResetBtn');
            btn.disabled = true;

            fetch('api/process_reset_request.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, new_password: newPassword })
            })
            .then(r => r.json())
            .then(res => {
                btn.disabled = false;
                if (res.success) {
                    showToast("The password has been successfully reset! Don't forget to send the new password to the user.");
                    hideResetModal();
                    loadResetRequests();
                } else {
                    showToast(res.error || 'Gagal mereset password', 'error');
                }
            })
            .catch(err => {
                btn.disabled = false;
                showToast('Network error: ' + err.message, 'error');
            });
        }

        function deleteResetRequest(requestId) {
            if (!confirm('Delete the history of this reset request?')) return;
            fetch('api/delete_reset_request.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId })
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast('The history has been successfully deleted');
                    loadResetRequests();
                } else {
                    showToast(res.error || 'Failed to delete history', 'error');
                }
            })
            .catch(err => showToast('Network error: ' + err.message, 'error'));
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
                    const tbody = document.getElementById('logsTableBody');
                    const logs = data.data || [];
                    
                    if (logs.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No logs found</td></tr>';
                        return;
                    }
                    
                    tbody.innerHTML = logs.map(log => `
                        <tr>
                            <td>${formatDateTime(log.created_at)}</td>
                            <td>${escapeHtml(log.user_name || 'System')}</td>
                            <td><span class="status-badge">${log.action}</span></td>
                            <td>${escapeHtml(log.details || '-')}</td>
                            <td>${log.ip_address || '-'}</td>
                        </tr>
                    `).join('');
                })
                .catch(err => {
                    console.error('Failed to load logs:', err);
                    document.getElementById('logsTableBody').innerHTML = 
                        '<tr><td colspan="5" class="empty-state">Failed to load logs</td></tr>';
                });
        }

        // ==================== UTILITIES ====================
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatRole(role) {
            return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    </script>
</body>
</html>