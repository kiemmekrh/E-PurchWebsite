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
        /* Scroll horizontal untuk tabel */
        .data-table-container {
            overflow-x: auto;
            max-width: 100%;
        }

        .data-table {
            min-width: 1400px; /* Atur sesuai kebutuhan */
            width: max-content;
        }

        /* Atau kalau mau lebih smooth */
        .historical-table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
        }
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
                    <p class="welcome-text">Generate supplier comparison table</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary btn-small" onclick="showCreateComparison()">
                        + Create Comparison Table
                    </button>
                    <button class="btn btn-new btn-small" onclick="showCreateNewComparison()">
                        + Create New Comparison Table
                    </button>
                    <button class="btn btn-success btn-small" onclick="exportSelectedToExcel()">
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
                <div class="historical-table-wrapper"> 
                <table class="data-table" id="comparisonTable">
                <thead>
                    <tr>
                        <th class="checkbox-col"><input type="checkbox" id="selectAllHistory" onchange="toggleSelectAllHistory()"></th>
                        <th>COMPARISON ID</th>
                        <th>PR NUMBER</th>      <!-- TAMBAH -->
                        <th>PO NUMBER</th>      <!-- PO Awarded -->
                        <th>PO DATE</th>
                        <th>DATE</th>
                        <th>MATERIAL</th>
                        <th>QTY</th>
                        <th>PRICE</th>
                        <th>AMOUNT</th>
                        <th>SUPPLIER</th>
                        <th>DELIVERY DATE</th>
                        <th>ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="comparisonTableBody"></tbody>
            </table>
            </div>
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
</body>
</html>