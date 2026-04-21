<?php
// File: modules/comparison/index.php
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Supplier Comparison | E-Purch</title>
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Comparison Table History</h1>
                <p class="welcome-text">Generate supplier comparison based on historical purchase data</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary btn-small" onclick="showCreateComparison()">
                    + Create Comparison Table
                </button>
                <button class="btn btn-success btn-small" onclick="exportTable('comparisonTable')">
                    Export to Excel
                </button>
            </div>
        </div>

        <!-- Create Comparison Form -->
        <div class="comparison-form" id="createForm" style="display: none;">
            <h3>Create New Comparison</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Material Name / Code *</label>
                    <input type="text" id="materialSearch" class="form-input" placeholder="Search material..." autocomplete="off">
                    <div class="autocomplete-list" id="materialSuggestions"></div>
                </div>
                <div class="form-group">
                    <label>Supplier (Optional)</label>
                    <select id="supplierFilter" class="form-input">
                        <option value="">All Suppliers</option>
                        <!-- Loaded dynamically -->
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Comparison Date Range</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="date" id="dateFrom" class="form-input">
                        <input type="date" id="dateTo" class="form-input">
                    </div>
                </div>
                <div class="form-group">
                    <label>Plan Quantity</label>
                    <input type="number" id="planQty" class="form-input" placeholder="Enter planned quantity">
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn btn-primary btn-small" onclick="generateComparison()">
                    Generate Comparison
                </button>
                <button class="btn btn-secondary btn-small" onclick="hideCreateComparison()">
                    Cancel
                </button>
            </div>
        </div>

        <!-- Comparison Results -->
        <div class="data-table-container" id="resultsContainer">
            <div class="table-header">
                <h3 class="table-title">Historical Comparisons</h3>
                <div class="table-filters">
                    <input type="text" class="filter-input" placeholder="Search..." id="searchComparison">
                </div>
            </div>
            <table class="data-table" id="comparisonTable">
                <thead>
                    <tr>
                        <th>COMPARISON ID</th>
                        <th>DATE</th>
                        <th>MATERIAL</th>
                        <th>SUPPLIERS COMPARED</th>
                        <th>BEST PRICE</th>
                        <th>CREATED BY</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="comparisonTableBody">
                    <!-- Loaded via AJAX -->
                </tbody>
            </table>
        </div>

        <!-- Detailed Comparison View (Modal) -->
        <div id="detailModal" class="modal-overlay">
            <div class="modal modal-large">
                <div class="modal-header">
                    <h3 class="modal-title">Comparison Details</h3>
                    <button class="modal-close" onclick="hideDetailModal()">&times;</button>
                </div>
                <div class="modal-body" id="detailContent">
                    <!-- Dynamic content -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="exportComparisonDetail()">Export to Excel</button>
                    <button class="btn btn-secondary" onclick="hideDetailModal()">Close</button>
                </div>
            </div>
        </div>
    </main>

    <script src="../../assets/js/comparison.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            loadComparisonHistory();
            loadSupplierOptions();
            initMaterialAutocomplete();
        });
    </script>
</body>
</html>