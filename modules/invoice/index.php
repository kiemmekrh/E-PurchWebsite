<?php
// File: modules/invoice/index.php (Invoice Tracker for Staff)
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice Document Control | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
        /* Timestamp column styles */
        .timestamp-cell {
            font-size: 12px;
            color: #666;
        }
        .timestamp-cell .date-part {
            font-weight: 500;
            color: #333;
        }
        .timestamp-cell .time-part {
            color: #888;
            font-size: 11px;
        }
        .timestamp-cell .validated-by {
            color: var(--info-blue);
            font-weight: 500;
            font-size: 11px;
            margin-top: 2px;
        }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Invoice Document Control</h1>
                <p class="welcome-text">Manage and validate supplier invoices</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-success btn-small" onclick="exportTable('invoiceTable')">
                    Export to Excel
                </button>
            </div>
        </div>

        <div class="filters-bar">
            <input type="text" class="filter-input" placeholder="🔍 Search invoice number..." id="searchInvoice">
            <select class="filter-select" id="filterInvStatus">
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
            </select>
            <select class="filter-select" id="filterInvSupplier">
                <option value="all">All Suppliers</option>
                <!-- Loaded dynamically -->
            </select>
            <input type="date" class="filter-input" id="filterInvDateFrom">
            <input type="date" class="filter-input" id="filterInvDateTo">
            <button class="btn btn-primary btn-small" onclick="loadInvoices()">Apply</button>
        </div>

        <div class="data-table-container">
            <table class="data-table" id="invoiceTable">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAllInv"></th>
                        <th>NO INVOICE ↕</th>
                        <th>SUPPLIER NAME</th>
                        <th>PO NUMBER</th>
                        <th>INVOICE DATE ↕</th>
                        <th>AMOUNT</th>
                        <th>STATUS ↕</th>
                        <th>VALIDATED BY</th>
                        <th>VALIDATED AT</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="invoiceTableBody">
                    <!-- Loaded via AJAX -->
                </tbody>
            </table>
        </div>
    </main>

    <!-- Validation Modal -->
    <div id="validateModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Validate Invoice</h3>
                <button class="modal-close" onclick="hideValidateModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="invoiceDetail">
                    <!-- Dynamic content -->
                </div>
                <div class="form-group" style="margin-top: 20px;">
                    <label>Validation Notes</label>
                    <textarea id="validationNotes" class="form-input form-textarea" placeholder="Enter notes (optional)"></textarea>
                </div>
                <div id="previousValidationInfo" style="margin-top: 15px; display: none;">
                    <!-- Shows previous validation details if re-validating -->
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="rejectInvoice()">Reject</button>
                <button class="btn btn-success" onclick="approveInvoice()">Approve</button>
                <button class="btn btn-secondary" onclick="hideValidateModal()">Cancel</button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/invoice.js"></script>
    <script>
        let currentInvoiceId = null;
        document.addEventListener('DOMContentLoaded', loadInvoices);
    </script>
</body>
</html>