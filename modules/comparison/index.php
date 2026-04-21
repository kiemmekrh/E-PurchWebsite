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
    <style>
        .create-view { display: none; }
        .create-view.active { display: block; }
        .history-view { display: block; }
        .history-view.hidden { display: none; }
        
        .filter-section {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            align-items: flex-end;
        }
        .filter-group { flex: 1; }
        .filter-group label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #555;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .filter-group input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        .btn-filter {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            height: fit-content;
        }
        .btn-filter:hover { background: #218838; }
        
        .btn-create-inline {
            background: #4a90e2;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            margin-bottom: 15px;
        }
        
        .table-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            font-size: 13px;
            color: #666;
        }
        .pagination {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .pagination select {
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 13px;
        }
        .pagination button {
            padding: 4px 10px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        .pagination button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .note-text {
            font-size: 12px;
            color: #888;
            margin-top: 8px;
            font-style: italic;
        }
        .checkbox-col {
            width: 30px;
            text-align: center;
        }
        .data-table th {
            background: #f5f5f5;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            color: #555;
            padding: 12px;
        }
        .data-table td {
            padding: 12px;
            font-size: 13px;
            border-bottom: 1px solid #f0f0f0;
        }
        .data-table tbody tr:hover { background: #f8f9fa; }
        
        .back-btn {
            background: none;
            border: 1px solid #ddd;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 15px;
            font-size: 13px;
        }
        .back-btn:hover { background: #f5f5f5; }

        /* ========== COMPARISON SPREADSHEET STYLES ========== */
        .comparison-spreadsheet-container {
            overflow-x: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
        }
        
        .comparison-spreadsheet {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        
        .comparison-spreadsheet th,
        .comparison-spreadsheet td {
            border: 1px solid #bbb;
            padding: 3px;
            text-align: center;
            min-width: 70px;
        }
        
        .section-header th {
            background: #e0e0e0;
            font-weight: 700;
            font-size: 12px;
            padding: 6px;
        }
        
        .sub-header th {
            background: #f5f5f5;
            font-size: 10px;
            font-weight: 600;
            padding: 4px;
        }
        
        /* Section Headers */
        .header-last-order { background: #e8e8e8 !important; color: #333; }
        .header-plan { background: #e3f2fd !important; color: #1565c0; }
        .header-gap { background: #ffcc80 !important; color: #e65100; }
        .header-awarded { background: #fff59d !important; color: #f57f17; }
        
        /* Column Backgrounds */
        .col-header { background: #fafafa; }
        .col-last-order { background: #f5f5f5; }
        .col-plan { background: #e8f4fd; }
        .col-gap { background: #ffe0b2; }
        .col-awarded { background: #fff9c4; }
        
        /* Input Styles */
        .input-header,
        .input-last-order,
        .input-plan,
        .input-gap,
        .input-awarded {
            width: 100%;
            border: 1px solid #ccc;
            padding: 3px 4px;
            font-size: 11px;
            text-align: center;
            outline: none;
            box-sizing: border-box;
        }
        
        /* Header inputs - WHITE */
        .input-header {
            background: white;
        }
        .input-header:focus {
            border-color: #4a90e2;
            box-shadow: 0 0 0 1px rgba(74, 144, 226, 0.3);
        }
        
        /* Last Order inputs - WHITE (editable) */
        .input-last-order {
            background: white;
        }
        .input-last-order:focus {
            border-color: #666;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
        }
        
        /* Plan Order inputs - WHITE (editable) */
        .input-plan {
            background: white;
        }
        .input-plan:focus {
            border-color: #1565c0;
            box-shadow: 0 0 0 1px rgba(21, 101, 192, 0.3);
        }
        
        /* GAP inputs - GRAY (readonly/auto) */
        .input-gap {
            background: #e0e0e0;
            cursor: not-allowed;
            border: 1px solid #bbb;
            color: #555;
        }
        
        /* Awarded inputs - YELLOW TINT (editable) */
        .input-awarded {
            background: #fffde7;
            border: 1px solid #fbc02d;
        }
        .input-awarded:focus {
            border-color: #f57f17;
            box-shadow: 0 0 0 1px rgba(245, 127, 23, 0.3);
        }
        
        /* Price IDR - Auto (gray when foreign exists, white when empty) */
        .input-last-order[data-auto="true"],
        .input-plan[data-auto="true"] {
            background: #e8e8e8 !important;
            cursor: default;
        }
        
        .btn-warning {
            background: #ffeb3b;
            color: #333;
            border: 1px solid #fdd835;
        }
        .btn-warning:hover { background: #fdd835; }
        
        .btn-large {
            padding: 10px 28px;
            font-size: 14px;
        }
        
        .data-row:hover td { background: #f0f7ff; }
        
        .notes {
            margin-top: 15px;
            font-size: 11px;
            color: #666;
        }
        .notes p { margin: 2px 0; }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        
        <!-- ========== VIEW 1: Comparison Table History (Default) ========== -->
        <div class="history-view" id="historyView">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Comparison Table History</h1>
                    <p class="welcome-text">Generate supplier comparison based on historical purchase data</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary btn-small" onclick="showCreateComparison()">
                        + Create Comparison Table
                    </button>
                    <button class="btn btn-new btn-small" onclick="showCreateNewComparison()">
                        + Create New Comparison Table
                    </button>
                    <button class="btn btn-success btn-small" onclick="exportTable('comparisonTable')">
                        Export to Excel
                    </button>
                </div>
            </div>

            <!-- Create Comparison Form (Hidden by default) -->
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

            <!-- History Results -->
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
        </div>

        <!-- ========== VIEW 2: Create Comparison Table ========== -->
        <div class="create-view" id="createView">
            <button class="back-btn" onclick="backToHistory()">← Back to History</button>
            
            <div class="page-header" style="margin-bottom: 20px;">
                <div>
                    <h1 class="page-title">Create Comparison Table</h1>
                    <p class="welcome-text">Select materials and suppliers to compare</p>
                </div>
            </div>

            <div class="filter-section">
                <div class="filter-group">
                    <label>Material Name / Code</label>
                    <input type="text" id="createMaterialSearch" placeholder="Input Material Name/Code" autocomplete="off">
                    <div class="autocomplete-list" id="createMaterialSuggestions"></div>
                </div>
                <div class="filter-group">
                    <label>Supplier Name / Code</label>
                    <input type="text" id="createSupplierSearch" placeholder="Input Supplier Name/Code" autocomplete="off">
                    <div class="autocomplete-list" id="createSupplierSuggestions"></div>
                </div>
                <button class="btn-filter" onclick="filterCreateTable()">Filter</button>
            </div>

            <div class="data-table-container">
                <button class="btn-create-inline" onclick="createComparisonFromSelection()">
                    + Create Comparison Table
                </button>
                
                <table class="data-table" id="poDataTable">
                    <thead>
                        <tr>
                            <th class="checkbox-col"><input type="checkbox" id="selectAllPO" onchange="toggleSelectAll()"></th>
                            <th>#</th>
                            <th>PO</th>
                            <th>DESCRIPTION</th>
                            <th>PO DATE</th>
                            <th>DELIV. DATE</th>
                            <th>SUPPLIER</th>
                            <th>QTY</th>
                            <th>PRICE</th>
                            <th>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody id="poDataTableBody"><!-- Loaded via AJAX --></tbody>
                </table>
                
                <div class="table-footer">
                    <span id="showingInfo">1-10 of 0</span>
                    <div class="pagination">
                        <span>Rows per page: 
                            <select id="rowsPerPage" onchange="changeRowsPerPage()">
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                        </span>
                        <span id="pageInfo">1 / 1</span>
                        <button onclick="prevPage()" id="btnPrev" disabled>&lt;</button>
                        <button onclick="nextPage()" id="btnNext" disabled>&gt;</button>
                    </div>
                </div>
            </div>
            <p class="note-text">* based on history</p>
        </div>

        <!-- ========== VIEW 3: Create New Comparison Table (Spreadsheet) ========== -->
        <div class="create-view" id="newComparisonView">
            <button class="back-btn" onclick="backToHistory()">← Back to History</button>
            
            <div class="page-header" style="margin-bottom: 20px;">
                <div>
                    <h1 class="page-title">Create New Comparison Table</h1>
                    <p class="welcome-text">Fill in all columns. Gap will be calculated automatically.</p>
                </div>
            </div>

            <!-- Filter Section -->
            <div class="filter-section">
                <div class="filter-group">
                    <label>Material Name / Code</label>
                    <input type="text" id="newMaterialSearch" placeholder="Search material..." autocomplete="off">
                    <div class="autocomplete-list" id="newMaterialSuggestions"></div>
                </div>
                <div class="filter-group">
                    <label>Supplier (Optional)</label>
                    <input type="text" id="newSupplierSearch" placeholder="Search supplier..." autocomplete="off">
                    <div class="autocomplete-list" id="newSupplierSuggestions"></div>
                </div>
                <button class="btn-filter" onclick="loadNewComparisonData()">Load Data</button>
            </div>

            <!-- Comparison Spreadsheet -->
            <div class="comparison-spreadsheet-container">
                
                <!-- ===== LAST ORDER SECTION ===== -->
                <table class="comparison-spreadsheet" id="newComparisonTable">
                    <thead>
                        <tr class="section-header">
                            <th rowspan="2">No</th>
                            <th rowspan="2">PR</th>
                            <th rowspan="2">Material<br>Code</th>
                            <th rowspan="2">Description</th>
                            <th rowspan="2">UOM</th>
                            <th rowspan="2">Qty<br>PR</th>
                            <th colspan="10" class="header-last-order">LAST ORDER</th>
                        </tr>
                        <tr class="sub-header">
                            <th class="col-last-order">QTY</th>
                            <th class="col-last-order">No PO</th>
                            <th class="col-last-order">Tgl PO</th>
                            <th class="col-last-order">Price<br>(CNY/USD/SGD)</th>
                            <th class="col-last-order">Tgl<br>Kurs</th>
                            <th class="col-last-order">Nilai Kurs<br>(IDR)</th>
                            <th class="col-last-order">Price<br>(IDR)</th>
                            <th class="col-last-order">Price TIBA<br>DI NU (IDR)</th>
                            <th class="col-last-order">Amount<br>(IDR)</th>
                            <th class="col-last-order">Supplier</th>
                        </tr>
                    </thead>
                    <tbody id="newComparisonBody">
                        <tr class="data-row" data-row="1">
                            <!-- Header columns - WHITE (editable) -->
                            <td class="col-header">1</td>
                            <td class="col-header"><input type="text" class="input-header" data-field="pr_number" placeholder="PR..."></td>
                            <td class="col-header"><input type="text" class="input-header" data-field="material_code" placeholder="Code..."></td>
                            <td class="col-header"><input type="text" class="input-header" data-field="description" placeholder="Desc..."></td>
                            <td class="col-header"><input type="text" class="input-header" data-field="uom" value="KG" style="width:40px;"></td>
                            <td class="col-header"><input type="number" class="input-header" data-field="qty_pr" value="5" style="width:50px;"></td>
                            
                            <!-- Last Order - ALL WHITE (editable) -->
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_qty" onchange="calculateLastAmount(1)"></td>
                            <td class="col-last-order"><input type="text" class="input-last-order" data-field="last_po_number"></td>
                            <td class="col-last-order"><input type="date" class="input-last-order" data-field="last_po_date"></td>
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_price_foreign" onchange="calculateLastPriceIDR(1)"></td>
                            <td class="col-last-order"><input type="date" class="input-last-order" data-field="last_kurs_date"></td>
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_kurs_idr" onchange="calculateLastPriceIDR(1)"></td>
                            <!-- Price IDR: Auto jika foreign ada, manual jika kosong -->
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_price_idr" onchange="manualOverrideLastPriceIDR(1)"></td>
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_price_tiba_nu" onchange="calculateLastAmount(1)"></td>
                            <td class="col-last-order"><input type="number" class="input-last-order" data-field="last_amount" readonly tabindex="-1"></td>
                            <td class="col-last-order"><input type="text" class="input-last-order" data-field="last_supplier" list="supplierList"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- ===== PLAN ORDER SECTION ===== -->
                <table class="comparison-spreadsheet" style="margin-top: 0; border-top: none;">
                    <thead>
                        <tr class="section-header">
                            <th colspan="8" class="header-plan">PLAN ORDER</th>
                        </tr>
                        <tr class="sub-header">
                            <th class="col-plan">QTY</th>
                            <th class="col-plan">Price<br>(CNY/USD/SGD)</th>
                            <th class="col-plan">Tgl<br>Kurs</th>
                            <th class="col-plan">Nilai Kurs<br>(IDR)</th>
                            <th class="col-plan">Price<br>(IDR)</th>
                            <th class="col-plan">TIBA DI NU<br>(IDR)</th>
                            <th class="col-plan">Amount<br>(IDR)</th>
                            <th class="col-plan">Supplier</th>
                        </tr>
                    </thead>
                    <tbody id="planOrderBody">
                        <tr class="data-row" data-row="1">
                            <!-- Plan Order - ALL WHITE (editable) -->
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_qty" onchange="calculatePlanAmount(1)"></td>
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_price_foreign" onchange="calculatePlanPriceIDR(1)"></td>
                            <td class="col-plan"><input type="date" class="input-plan" data-field="plan_kurs_date"></td>
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_kurs_idr" onchange="calculatePlanPriceIDR(1)"></td>
                            <!-- Price IDR: Auto jika foreign ada, manual jika kosong -->
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_price_idr" onchange="manualOverridePlanPriceIDR(1)"></td>
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_price_tiba_nu" onchange="calculatePlanAmount(1)"></td>
                            <td class="col-plan"><input type="number" class="input-plan" data-field="plan_amount" readonly tabindex="-1"></td>
                            <td class="col-plan"><input type="text" class="input-plan" data-field="plan_supplier" list="supplierList"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- ===== GAP SECTION (AUTO - READONLY) ===== -->
                <table class="comparison-spreadsheet" style="margin-top: 0; border-top: none;">
                    <thead>
                        <tr class="section-header">
                            <th colspan="2" class="header-gap">GAP (Auto-calculated)</th>
                        </tr>
                        <tr class="sub-header">
                            <th class="col-gap">Price<br>(IDR)</th>
                            <th class="col-gap">%</th>
                        </tr>
                    </thead>
                    <tbody id="gapBody">
                        <tr class="data-row" data-row="1">
                            <!-- GAP - GRAY (readonly, auto-calculated) -->
                            <td class="col-gap"><input type="number" class="input-gap" data-field="gap_price" readonly tabindex="-1"></td>
                            <td class="col-gap"><input type="number" class="input-gap" data-field="gap_percent" readonly tabindex="-1"></td>
                        </tr>
                    </tbody>
                </table>

                <!-- ===== AWARDED SECTION ===== -->
                <table class="comparison-spreadsheet" style="margin-top: 0; border-top: none;">
                    <thead>
                        <tr class="section-header">
                            <th colspan="6" class="header-awarded">AWARDED (Final Selection)</th>
                        </tr>
                        <tr class="sub-header">
                            <th class="col-awarded">Tgl PO</th>
                            <th class="col-awarded">Deliv.<br>Schedule</th>
                            <th class="col-awarded">No PO</th>
                            <th class="col-awarded">Supplier</th>
                            <th class="col-awarded">Amount<br>(IDR)</th>
                            <th class="col-awarded">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody id="awardedBody">
                        <tr class="data-row" data-row="1">
                            <!-- AWARDED - YELLOW TINT (editable) -->
                            <td class="col-awarded"><input type="date" class="input-awarded" data-field="awarded_po_date"></td>
                            <td class="col-awarded"><input type="date" class="input-awarded" data-field="awarded_deliv_date"></td>
                            <td class="col-awarded"><input type="text" class="input-awarded" data-field="awarded_po_number"></td>
                            <td class="col-awarded"><input type="text" class="input-awarded" data-field="awarded_supplier" list="supplierList"></td>
                            <td class="col-awarded"><input type="number" class="input-awarded" data-field="awarded_amount"></td>
                            <td class="col-awarded"><input type="text" class="input-awarded" data-field="awarded_keterangan"></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Supplier Datalist -->
            <datalist id="supplierList"></datalist>

            <!-- Action Buttons -->
            <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn btn-secondary btn-large" onclick="backToHistory()">Cancel</button>
                <button class="btn btn-warning btn-large" onclick="saveAsDraft()">Save as Draft</button>
                <button class="btn btn-primary btn-large" onclick="saveComparison()">Save</button>
            </div>

            <div class="notes">
                <p>* Gray columns (GAP) will be generated automatically from Last Order and Plan Order data</p>
                <p>* Price (IDR) auto-calculated if Price (CNY/USD/SGD) is filled. Clear foreign price to input IDR manually.</p>
            </div>
        </div>

        <!-- Modal -->
        <div id="detailModal" class="modal-overlay">
            <div class="modal modal-large">
                <div class="modal-header">
                    <h3 class="modal-title">Comparison Details</h3>
                    <button class="modal-close" onclick="hideDetailModal()">&times;</button>
                </div>
                <div class="modal-body" id="detailContent"></div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="exportComparisonDetail()">Export to Excel</button>
                    <button class="btn btn-secondary" onclick="hideDetailModal()">Close</button>
                </div>
            </div>
        </div>
    </main>

    <script src="../../assets/js/comparison.js"></script>
    <script>
        // ==================== GLOBAL VARIABLES ====================
        let currentPage = 1;
        let rowsPerPage = 10;
        let totalRows = 0;
        let poData = [];
        let selectedPOs = new Set();

        document.addEventListener('DOMContentLoaded', function() {
            loadComparisonHistory();
            loadSupplierOptions();
            initMaterialAutocomplete();
            initCreateViewAutocomplete();
        });

        // ==================== VIEW NAVIGATION ====================
        function showCreateComparison() {
            document.getElementById('historyView').classList.add('hidden');
            document.getElementById('createView').classList.add('active');
            loadPODData();
        }

        function showCreateNewComparison() {
            document.getElementById('historyView').classList.add('hidden');
            document.getElementById('newComparisonView').classList.add('active');
            initNewComparisonAutocomplete();
            loadSupplierList();
        }

        function backToHistory() {
            document.getElementById('historyView').classList.remove('hidden');
            document.getElementById('createView').classList.remove('active');
            document.getElementById('newComparisonView').classList.remove('active');
            selectedPOs.clear();
        }

        function hideCreateComparison() {
            document.getElementById('createForm').style.display = 'none';
        }

        // ==================== CREATE COMPARISON (VIEW 2) ====================
        function loadPODData(material = '', supplier = '') {
            fetch(`api/get_po_data.php?material=${encodeURIComponent(material)}&supplier=${encodeURIComponent(supplier)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        poData = data.data || [];
                        totalRows = poData.length;
                        currentPage = 1;
                        renderPOTable();
                        updatePagination();
                    }
                })
                .catch(err => console.error('Error loading PO data:', err));
        }

        function filterCreateTable() {
            const material = document.getElementById('createMaterialSearch').value;
            const supplier = document.getElementById('createSupplierSearch').value;
            loadPODData(material, supplier);
        }

        function renderPOTable() {
            const tbody = document.getElementById('poDataTableBody');
            const start = (currentPage - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            const pageData = poData.slice(start, end);

            tbody.innerHTML = pageData.map((row, index) => `
                <tr>
                    <td class="checkbox-col">
                        <input type="checkbox" ${selectedPOs.has(row.po_id) ? 'checked' : ''} 
                               onchange="togglePOSelection(${row.po_id})">
                    </td>
                    <td>${start + index + 1}</td>
                    <td>${row.po_number || '-'}</td>
                    <td>${row.description || '-'}</td>
                    <td>${formatDate(row.po_date)}</td>
                    <td>${formatDate(row.delivery_date)}</td>
                    <td>${row.supplier_name || '-'}</td>
                    <td>${row.ordered_quantity || 0} ${row.unit || 'PCS'}</td>
                    <td>${formatCurrency(row.unit_price)}</td>
                    <td>${formatCurrency(row.total_amount)}</td>
                </tr>
            `).join('');

            const showingEnd = Math.min(end, totalRows);
            document.getElementById('showingInfo').textContent = 
                totalRows > 0 ? `${start + 1}-${showingEnd} of ${totalRows}` : '0-0 of 0';
        }

        function updatePagination() {
            const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
            document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
            document.getElementById('btnPrev').disabled = currentPage <= 1;
            document.getElementById('btnNext').disabled = currentPage >= totalPages;
        }

        function changeRowsPerPage() {
            rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
            currentPage = 1;
            renderPOTable();
            updatePagination();
        }

        function prevPage() {
            if (currentPage > 1) {
                currentPage--;
                renderPOTable();
                updatePagination();
            }
        }

        function nextPage() {
            const totalPages = Math.ceil(totalRows / rowsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPOTable();
                updatePagination();
            }
        }

        function toggleSelectAll() {
            const checkAll = document.getElementById('selectAllPO').checked;
            const start = (currentPage - 1) * rowsPerPage;
            const end = start + rowsPerPage;
            for (let i = start; i < Math.min(end, poData.length); i++) {
                if (checkAll) selectedPOs.add(poData[i].po_id);
                else selectedPOs.delete(poData[i].po_id);
            }
            renderPOTable();
        }

        function togglePOSelection(poId) {
            if (selectedPOs.has(poId)) selectedPOs.delete(poId);
            else selectedPOs.add(poId);
        }

        function createComparisonFromSelection() {
            if (selectedPOs.size === 0) {
                alert('Please select at least one PO');
                return;
            }
            const selectedData = poData.filter(po => selectedPOs.has(po.po_id));
            const materials = [...new Set(selectedData.map(po => po.material_group || po.description))];
            if (materials.length > 1) {
                alert('Please select POs with the same material');
                return;
            }
            const formData = new FormData();
            formData.append('material', materials[0]);
            formData.append('po_ids', JSON.stringify([...selectedPOs]));
            
            fetch('api/generate.php', { method: 'POST', body: formData })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(`Comparison created! ID: ${data.comparison_id}`);
                        backToHistory();
                        loadComparisonHistory();
                    } else {
                        alert('Error: ' + data.error);
                    }
                })
                .catch(err => console.error('Error:', err));
        }

        // ==================== CREATE NEW COMPARISON (VIEW 3 - SPREADSHEET) ====================
        
        // Load supplier list for datalist
        function loadSupplierList() {
            fetch('api/get_suppliers.php')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const datalist = document.getElementById('supplierList');
                        datalist.innerHTML = data.data.map(s => 
                            `<option value="${s.supplier_name}">${s.supplier_code} - ${s.supplier_name}</option>`
                        ).join('');
                    }
                })
                .catch(err => console.error('Error loading suppliers:', err));
        }

        // Load historical data (optional - untuk default value)
        function loadNewComparisonData() {
            const material = document.getElementById('newMaterialSearch').value;
            const supplier = document.getElementById('newSupplierSearch').value;
            
            if (!material) {
                alert('Please enter material name or code');
                return;
            }
            
            fetch(`api/get_last_order.php?material=${encodeURIComponent(material)}&supplier=${encodeURIComponent(supplier)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        populateLastOrderDefaults(data.data);
                    } else {
                        alert('No historical data found. You can fill manually.');
                    }
                })
                .catch(err => console.error('Error:', err));
        }

        // Populate default values from history (user BISA EDIT semua)
        function populateLastOrderDefaults(historyData) {
            setFieldValue(1, 'last_qty', historyData.last_qty || '');
            setFieldValue(1, 'last_po_number', historyData.last_po_number || '');
            setFieldValue(1, 'last_po_date', formatDateForInput(historyData.last_po_date));
            setFieldValue(1, 'last_price_foreign', historyData.last_price_foreign || '');
            setFieldValue(1, 'last_kurs_date', formatDateForInput(historyData.last_kurs_date));
            setFieldValue(1, 'last_kurs_idr', historyData.last_kurs_idr || '');
            
            // Trigger calculation - akan set auto=true jika foreign ada
            calculateLastPriceIDR(1);
            
            setFieldValue(1, 'last_price_tiba_nu', historyData.last_price_tiba_nu || '');
            setFieldValue(1, 'last_supplier', historyData.supplier_name || '');
            
            calculateLastAmount(1);
            
            // Fill header info
            setFieldValue(1, 'material_code', historyData.material_group || '');
            setFieldValue(1, 'description', historyData.description || '');
            setFieldValue(1, 'uom', historyData.uom || 'KG');
        }

        // ==================== CALCULATION FUNCTIONS ====================
        
        // Calculate Last Order Price IDR
        // Jika Price Foreign diisi → auto calculate (Foreign × Kurs)
        // Jika Price Foreign kosong → biarkan manual input
        function calculateLastPriceIDR(rowNum) {
            const foreign = getFieldValue(rowNum, 'last_price_foreign');
            const kurs = getFieldValue(rowNum, 'last_kurs_idr');
            const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="last_price_idr"]`);
            
            if (foreign > 0) {
                // Foreign diisi → auto calculate
                const idr = foreign * (kurs > 0 ? kurs : 1);
                priceIdrInput.value = idr.toFixed(2);
                priceIdrInput.dataset.auto = "true"; // tandai sebagai auto
            } else {
                // Foreign kosong → enable manual input, jangan overwrite
                priceIdrInput.dataset.auto = "false";
            }
            
            calculateLastAmount(rowNum);
            calculateGap(rowNum);
        }

        // Jika user edit Price IDR manual saat Foreign sudah ada
        function manualOverrideLastPriceIDR(rowNum) {
            const foreign = getFieldValue(rowNum, 'last_price_foreign');
            const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="last_price_idr"]`);
            
            if (foreign > 0) {
                // Foreign ada → kembalikan ke auto
                const kurs = getFieldValue(rowNum, 'last_kurs_idr');
                const idr = foreign * (kurs > 0 ? kurs : 1);
                priceIdrInput.value = idr.toFixed(2);
                alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear Foreign Price to input manually.');
            }
            // Jika foreign kosong, biarkan manual input
            
            calculateGap(rowNum);
        }

        // Calculate Last Order Amount (auto: Qty × TIBA NU)
        function calculateLastAmount(rowNum) {
            const qty = getFieldValue(rowNum, 'last_qty');
            const tibaNu = getFieldValue(rowNum, 'last_price_tiba_nu');
            const amount = qty * tibaNu;
            setFieldValue(rowNum, 'last_amount', amount.toFixed(2));
        }

        // Calculate Plan Order Price IDR
        // Jika Price Foreign diisi → auto calculate (Foreign × Kurs)
        // Jika Price Foreign kosong → biarkan manual input
        function calculatePlanPriceIDR(rowNum) {
            const foreign = getFieldValue(rowNum, 'plan_price_foreign');
            const kurs = getFieldValue(rowNum, 'plan_kurs_idr');
            const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_idr"]`);
            
            if (foreign > 0) {
                // Foreign diisi → auto calculate
                const idr = foreign * (kurs > 0 ? kurs : 1);
                priceIdrInput.value = idr.toFixed(2);
                priceIdrInput.dataset.auto = "true";
            } else {
                // Foreign kosong → enable manual input
                priceIdrInput.dataset.auto = "false";
            }
            
            calculatePlanAmount(rowNum);
            calculateGap(rowNum);
        }

        // Jika user edit Price IDR manual saat Foreign sudah ada
        function manualOverridePlanPriceIDR(rowNum) {
            const foreign = getFieldValue(rowNum, 'plan_price_foreign');
            const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_idr"]`);
            
            if (foreign > 0) {
                // Foreign ada → kembalikan ke auto
                const kurs = getFieldValue(rowNum, 'plan_kurs_idr');
                const idr = foreign * (kurs > 0 ? kurs : 1);
                priceIdrInput.value = idr.toFixed(2);
                alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear Foreign Price to input manually.');
            }
            // Jika foreign kosong, biarkan manual input
            
            calculateGap(rowNum);
        }

        // Calculate Plan Order Amount (auto: Qty × TIBA NU)
        function calculatePlanAmount(rowNum) {
            const qty = getFieldValue(rowNum, 'plan_qty');
            const tibaNu = getFieldValue(rowNum, 'plan_price_tiba_nu');
            const amount = qty * tibaNu;
            setFieldValue(rowNum, 'plan_amount', amount.toFixed(2));
        }

        // Calculate GAP (auto: Plan - Last Order)
        function calculateGap(rowNum) {
            const lastPrice = getFieldValue(rowNum, 'last_price_idr');
            const planPrice = getFieldValue(rowNum, 'plan_price_idr');
            
            const gapPrice = planPrice - lastPrice;
            const gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100) : 0;
            
            setFieldValue(rowNum, 'gap_price', gapPrice.toFixed(2));
            setFieldValue(rowNum, 'gap_percent', gapPercent.toFixed(2));
        }

        // ==================== HELPER FUNCTIONS ====================
        
        function setFieldValue(rowNum, fieldName, value) {
            const inputs = document.querySelectorAll(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
            inputs.forEach(input => { if (input) input.value = value; });
        }

        function getFieldValue(rowNum, fieldName) {
            const input = document.querySelector(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
            return input ? parseFloat(input.value) || 0 : 0;
        }

        function formatDate(dateStr) {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        function formatCurrency(amount) {
            if (!amount) return '0';
            return new Intl.NumberFormat('id-ID').format(amount);
        }

        function formatDateForInput(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toISOString().split('T')[0];
        }

        // ==================== SAVE FUNCTIONS ====================
        
        function saveAsDraft() {
            saveComparisonData('draft');
        }

        function saveComparison() {
            saveComparisonData('final');
        }

        function saveComparisonData(status) {
            const payload = collectFormData();
            payload.status = status;
            
            fetch('api/save_comparison.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(`Comparison saved as ${status}! ID: ${data.comparison_id}`);
                    backToHistory();
                    loadComparisonHistory();
                } else {
                    alert('Error: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(err => console.error('Error saving:', err));
        }

        function collectFormData() {
            return {
                pr_number: document.querySelector('[data-field="pr_number"]').value,
                material_code: document.querySelector('[data-field="material_code"]').value,
                description: document.querySelector('[data-field="description"]').value,
                uom: document.querySelector('[data-field="uom"]').value,
                qty_pr: getFieldValue(1, 'qty_pr'),
                
                // Last Order
                last_qty: getFieldValue(1, 'last_qty'),
                last_po_number: document.querySelector('[data-field="last_po_number"]').value,
                last_po_date: document.querySelector('[data-field="last_po_date"]').value,
                last_price_foreign: getFieldValue(1, 'last_price_foreign'),
                last_kurs_date: document.querySelector('[data-field="last_kurs_date"]').value,
                last_kurs_idr: getFieldValue(1, 'last_kurs_idr'),
                last_price_idr: getFieldValue(1, 'last_price_idr'),
                last_price_tiba_nu: getFieldValue(1, 'last_price_tiba_nu'),
                last_amount: getFieldValue(1, 'last_amount'),
                last_supplier: document.querySelector('[data-field="last_supplier"]').value,
                
                // Plan Order
                plan_qty: getFieldValue(1, 'plan_qty'),
                plan_price_foreign: getFieldValue(1, 'plan_price_foreign'),
                plan_kurs_date: document.querySelector('[data-field="plan_kurs_date"]').value,
                plan_kurs_idr: getFieldValue(1, 'plan_kurs_idr'),
                plan_price_idr: getFieldValue(1, 'plan_price_idr'),
                plan_price_tiba_nu: getFieldValue(1, 'plan_price_tiba_nu'),
                plan_amount: getFieldValue(1, 'plan_amount'),
                plan_supplier: document.querySelector('[data-field="plan_supplier"]').value,
                
                // Gap
                gap_price: getFieldValue(1, 'gap_price'),
                gap_percent: getFieldValue(1, 'gap_percent'),
                
                // Awarded
                awarded_po_date: document.querySelector('[data-field="awarded_po_date"]').value,
                awarded_deliv_date: document.querySelector('[data-field="awarded_deliv_date"]').value,
                awarded_po_number: document.querySelector('[data-field="awarded_po_number"]').value,
                awarded_supplier: document.querySelector('[data-field="awarded_supplier"]').value,
                awarded_amount: getFieldValue(1, 'awarded_amount'),
                awarded_keterangan: document.querySelector('[data-field="awarded_keterangan"]').value
            };
        }

        // ==================== AUTOCOMPLETE ====================
        
        function initCreateViewAutocomplete() {
            const materialInput = document.getElementById('createMaterialSearch');
            const supplierInput = document.getElementById('createSupplierSearch');
            
            materialInput.addEventListener('input', debounce(function() {
                if (this.value.length < 2) return;
                fetch(`api/autocomplete.php?type=material&q=${encodeURIComponent(this.value)}`)
                    .then(res => res.json())
                    .then(data => {
                        const list = document.getElementById('createMaterialSuggestions');
                        list.innerHTML = data.map(item => `
                            <div onclick="selectCreateMaterial('${item.value}')">${item.label}</div>
                        `).join('');
                        list.style.display = 'block';
                    });
            }, 300));

            supplierInput.addEventListener('input', debounce(function() {
                if (this.value.length < 2) return;
                fetch(`api/autocomplete.php?type=supplier&q=${encodeURIComponent(this.value)}`)
                    .then(res => res.json())
                    .then(data => {
                        const list = document.getElementById('createSupplierSuggestions');
                        list.innerHTML = data.map(item => `
                            <div onclick="selectCreateSupplier('${item.value}')">${item.label}</div>
                        `).join('');
                        list.style.display = 'block';
                    });
            }, 300));

            document.addEventListener('click', function(e) {
                if (!e.target.closest('.filter-group')) {
                    document.getElementById('createMaterialSuggestions').style.display = 'none';
                    document.getElementById('createSupplierSuggestions').style.display = 'none';
                }
            });
        }

        function initNewComparisonAutocomplete() {
            const materialInput = document.getElementById('newMaterialSearch');
            const supplierInput = document.getElementById('newSupplierSearch');
            
            materialInput.addEventListener('input', debounce(function() {
                if (this.value.length < 2) return;
                fetch(`api/autocomplete.php?type=material&q=${encodeURIComponent(this.value)}`)
                    .then(res => res.json())
                    .then(data => {
                        const list = document.getElementById('newMaterialSuggestions');
                        list.innerHTML = data.map(item => `
                            <div onclick="selectNewMaterial('${item.value}')">${item.label}</div>
                        `).join('');
                        list.style.display = 'block';
                    });
            }, 300));

            supplierInput.addEventListener('input', debounce(function() {
                if (this.value.length < 2) return;
                fetch(`api/autocomplete.php?type=supplier&q=${encodeURIComponent(this.value)}`)
                    .then(res => res.json())
                    .then(data => {
                        const list = document.getElementById('newSupplierSuggestions');
                        list.innerHTML = data.map(item => `
                            <div onclick="selectNewSupplier('${item.value}')">${item.label}</div>
                        `).join('');
                        list.style.display = 'block';
                    });
            }, 300));
        }

        function selectCreateMaterial(value) {
            document.getElementById('createMaterialSearch').value = value;
            document.getElementById('createMaterialSuggestions').style.display = 'none';
        }

        function selectCreateSupplier(value) {
            document.getElementById('createSupplierSearch').value = value;
            document.getElementById('createSupplierSuggestions').style.display = 'none';
        }

        function selectNewMaterial(value) {
            document.getElementById('newMaterialSearch').value = value;
            document.getElementById('newMaterialSuggestions').style.display = 'none';
        }

        function selectNewSupplier(value) {
            document.getElementById('newSupplierSearch').value = value;
            document.getElementById('newSupplierSuggestions').style.display = 'none';
        }

        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

                // Helper: Get value with empty string handling
                function getFieldValueSafe(rowNum, fieldName) {
            const input = document.querySelector(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
            if (!input) return '';
            const val = input.value.trim();
            return val === '' ? null : val;
        }

        function collectFormData() {
            return {
                pr_number: document.querySelector('[data-field="pr_number"]').value,
                material_code: document.querySelector('[data-field="material_code"]').value,
                description: document.querySelector('[data-field="description"]').value,
                uom: document.querySelector('[data-field="uom"]').value,
                qty_pr: getFieldValue(1, 'qty_pr'),
                
                // Last Order - use getFieldValueSafe for dates
                last_qty: getFieldValue(1, 'last_qty'),
                last_po_number: document.querySelector('[data-field="last_po_number"]').value,
                last_po_date: getFieldValueSafe(1, 'last_po_date'),
                last_price_foreign: getFieldValue(1, 'last_price_foreign'),
                last_kurs_date: getFieldValueSafe(1, 'last_kurs_date'),
                last_kurs_idr: getFieldValue(1, 'last_kurs_idr'),
                last_price_idr: getFieldValue(1, 'last_price_idr'),
                last_price_tiba_nu: getFieldValue(1, 'last_price_tiba_nu'),
                last_amount: getFieldValue(1, 'last_amount'),
                last_supplier: document.querySelector('[data-field="last_supplier"]').value,
                
                // Plan Order
                plan_qty: getFieldValue(1, 'plan_qty'),
                plan_price_foreign: getFieldValue(1, 'plan_price_foreign'),
                plan_kurs_date: getFieldValueSafe(1, 'plan_kurs_date'),
                plan_kurs_idr: getFieldValue(1, 'plan_kurs_idr'),
                plan_price_idr: getFieldValue(1, 'plan_price_idr'),
                plan_price_tiba_nu: getFieldValue(1, 'plan_price_tiba_nu'),
                plan_amount: getFieldValue(1, 'plan_amount'),
                plan_supplier: document.querySelector('[data-field="plan_supplier"]').value,
                
                // Gap
                gap_price: getFieldValue(1, 'gap_price'),
                gap_percent: getFieldValue(1, 'gap_percent'),
                
                // Awarded
                awarded_po_date: getFieldValueSafe(1, 'awarded_po_date'),
                awarded_deliv_date: getFieldValueSafe(1, 'awarded_deliv_date'),
                awarded_po_number: document.querySelector('[data-field="awarded_po_number"]').value,
                awarded_supplier: document.querySelector('[data-field="awarded_supplier"]').value,
                awarded_amount: getFieldValue(1, 'awarded_amount'),
                awarded_keterangan: document.querySelector('[data-field="awarded_keterangan"]').value
            };
        }
    </script>
</body>
</html>