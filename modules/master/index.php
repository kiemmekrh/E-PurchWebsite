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
                /* Pagination */
                .pagination-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            border-radius: 0 0 8px 8px;
            margin-top: -1px;
        }
        .pagination-info {
            color: #666;
            font-size: 13px;
        }
        .pagination-info strong {
            color: #333;
        }
        .pagination-pages {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .pagination-btn {
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            color: #555;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            min-width: 36px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
        }
        .pagination-btn:hover:not(:disabled) {
            background: #e9ecef;
            border-color: #adb5bd;
        }
        .pagination-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .pagination-btn.active {
            background: #4a90e2;
            border-color: #4a90e2;
            color: white;
            font-weight: 600;
        }
        .pagination-ellipsis {
            padding: 0 6px;
            color: #888;
            font-size: 13px;
        }
        .pagination-select {
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            outline: none;
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

    <!-- Toast Notification -->
    <div id="toast" class="toast"></div>
    <script src="../../assets/js/master.js"></script>
</body>
</html>