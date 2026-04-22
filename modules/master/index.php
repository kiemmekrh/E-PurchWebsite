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
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Master Data Management</h1>
                <p class="welcome-text">Manage users, suppliers, and items</p>
            </div>
        </div>

        <div class="master-tabs">
            <button class="tab-btn active" onclick="switchTab('users')">Users</button>
            <button class="tab-btn" onclick="switchTab('suppliers')">Suppliers</button>
            <button class="tab-btn" onclick="switchTab('items')">Items</button>
            <button class="tab-btn" onclick="switchTab('logs')">Activity Logs</button>
        </div>

        <!-- Users Tab -->
        <div id="tab-users" class="tab-content active">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="showUserForm()">+ Add User</button>
                <input type="text" class="filter-input" placeholder="Search users..." id="searchUser">
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
                    <tbody id="usersTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Suppliers Tab -->
        <div id="tab-suppliers" class="tab-content">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="showSupplierForm()">+ Add Supplier</button>
                <input type="text" class="filter-input" placeholder="Search suppliers..." id="searchSupplier">
            </div>
            <div class="data-table-container">
                <table class="data-table" id="suppliersTable">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>SUPPLIER NAME</th>
                            <th>CONTACT INFO</th>
                            <th>STATUS</th>
                            <th>INVOICES</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Items Tab -->
        <div id="tab-items" class="tab-content">
            <div class="filters-bar">
                <button class="btn btn-primary btn-small" onclick="showItemForm()">+ Add Item</button>
                <input type="text" class="filter-input" placeholder="Search items..." id="searchItem">
            </div>
            <div class="data-table-container">
                <table class="data-table" id="itemsTable">
                    <thead>
                        <tr>
                            <th>CODE</th>
                            <th>DESCRIPTION</th>
                            <th>MATERIAL GROUP</th>
                            <th>LAST PO DATE</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody id="itemsTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Logs Tab -->
        <div id="tab-logs" class="tab-content">
            <div class="filters-bar">
                <select class="filter-select" id="filterLogAction">
                    <option value="all">All Actions</option>
                    <option value="LOGIN">Login</option>
                    <option value="ZMM039_UPLOAD">ZMM039 Upload</option>
                    <option value="INVOICE_SUBMIT">Invoice Submit</option>
                    <option value="INVOICE_VALIDATE">Invoice Validate</option>
                </select>
                <input type="date" class="filter-input" id="filterLogDate">
                <button class="btn btn-primary btn-small" onclick="loadLogs()">Filter</button>
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
                    <tbody id="logsTableBody"></tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- User Form Modal -->
    <div id="userModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 id="userModalTitle">Add User</h3>
                <button class="modal-close" onclick="hideUserModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="userForm">
                    <input type="hidden" id="userId">
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" id="userName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="userEmail" class="form-input" required>
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
                        <label>Password *</label>
                        <input type="password" id="userPassword" class="form-input">
                        <small style="color: var(--text-gray);">Leave blank to keep current password when editing</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideUserModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveUser()">Save</button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/master.js"></script>
    <script>
        let currentTab = 'users';
        document.addEventListener('DOMContentLoaded', () => {
            loadUsers();
        });
    </script>
</body>
</html>