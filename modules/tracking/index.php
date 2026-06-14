<?php
// File: modules/tracking/index.php
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager', 'admin']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PO & GR Tracking | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
        /* ── Tabs ── */
        .tracking-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tracking-tab {
            padding: 12px 24px;
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: 8px;
            font-weight: 500;
            color: var(--text-gray);
            transition: all 0.2s;
        }
        .tracking-tab.active { background: var(--primary-yellow); color: var(--text-dark); }
        .tracking-tab:hover:not(.active) { background: #f0f0f0; }

        /* ── Timeline ── */
        .timeline { position:relative; padding-left:30px; }
        .timeline::before {
            content:''; position:absolute; left:10px; top:0; bottom:0;
            width:2px; background:var(--border-gray);
        }
        .timeline-item { position:relative; padding-bottom:25px; line-height:1.6; }
        .timeline-item::before {
            content:''; position:absolute; left:-24px; top:6px;
            width:12px; height:12px; border-radius:50%;
            background:var(--success-green); border:2px solid white;
            box-shadow:0 0 0 2px var(--success-green);
        }
        .timeline-item.pending::before {
            background:var(--warning-orange);
            box-shadow:0 0 0 2px var(--warning-orange);
        }

        /* ── Sync badges ── */
        .badge-gr { display:inline-block; padding:2px 8px; border-radius:10px; font-size:12px; font-weight:500; }
        .badge-inserted { background:#d4edda; color:#155724; }
        .badge-skipped  { background:#fff3cd; color:#856404; }

        /* ── POINT 3: Enlarged search bar ── */
        .search-prominent {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            margin-bottom: 20px;
        }
        .search-prominent-icon { font-size: 20px; flex-shrink: 0; }
        .search-prominent input {
            flex: 1;
            border: none;
            outline: none;
            font-size: 15px;
            background: transparent;
            color: var(--text-dark);
        }
        .search-prominent input::placeholder { color: #aaa; }
        .search-prominent select {
            border: 1.5px solid var(--border-gray);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            color: var(--text-dark);
            background: #fafafa;
            cursor: pointer;
            outline: none;
        }
        .search-prominent select:focus { border-color: var(--primary-yellow); }

        /* ── POINT 2: Column filter headers ── */
        .th-filter {
            display: flex;
            flex-direction: column;
            gap: 5px;
            align-items: flex-start;
        }
        .th-filter > span {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
            white-space: nowrap;
        }

        /* Vendor / Status: dropdown as before */
        .th-filter select {
            font-size: 11px;
            padding: 3px 6px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: #fff;
            color: #555;
            cursor: pointer;
            width: 100%;
            max-width: 140px;
        }
        .th-filter select:focus { border-color: var(--primary-yellow); outline: none; }

        /* ── POINT 2: PO Number search-in-header ── */
        .po-filter-wrap { position: relative; }
        .po-filter-trigger {
            display: flex;
            align-items: center;
            gap: 5px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 3px 8px;
            font-size: 11px;
            color: #555;
            cursor: pointer;
            min-width: 110px;
            max-width: 140px;
            user-select: none;
            transition: border-color 0.2s;
        }
        .po-filter-trigger:hover, .po-filter-trigger.active { border-color: var(--primary-yellow); color: var(--text-dark); }
        .po-filter-trigger .trigger-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .po-filter-trigger .trigger-arrow { font-size: 9px; flex-shrink: 0; }

        .po-filter-dropdown {
            display: none;
            position: fixed;
            z-index: 99999;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.18);
            width: 250px;
            /* NO overflow:hidden — it was cutting the action buttons */
        }
        .po-filter-dropdown.open { display: flex; flex-direction: column; }

        .po-search-box {
            padding: 10px 10px 6px;
            border-bottom: 1px solid #f0f0f0;
            flex-shrink: 0;
        }
        .po-search-box input {
            width: 100%;
            border: 1.5px solid #ddd;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
        }
        .po-search-box input:focus { border-color: var(--primary-yellow); }

        .po-checkbox-list {
            max-height: 180px;
            overflow-y: auto;
            padding: 6px 0;
            flex-shrink: 1;
        }
        .po-checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px;
            cursor: pointer;
            font-size: 12px;
            color: #333;
            transition: background 0.15s;
        }
        .po-checkbox-item:hover { background: #f8f9fa; }
        .po-checkbox-item input[type="checkbox"] { cursor: pointer; accent-color: var(--primary-yellow); }

        .po-filter-actions {
            display: flex;
            gap: 6px;
            padding: 8px 10px;
            border-top: 1px solid #f0f0f0;
            background: #fff;
            flex-shrink: 0;      /* never compress — always fully visible */
            border-radius: 0 0 8px 8px;
        }
        .po-filter-actions button {
            flex: 1;
            padding: 7px 0;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 600;
        }
        .po-btn-apply  { background: var(--primary-yellow); color: var(--text-dark); }
        .po-btn-clear  { background: #f0f0f0; color: #555; }
        .po-btn-apply:hover { opacity: 0.85; }
        .po-btn-clear:hover { background: #e0e0e0; }

        /* ── POINT 4: Split export button ── */
        .split-btn-wrap {
            position: relative;
            display: inline-flex;
        }
        .split-btn-main {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px 0 0 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            white-space: nowrap;
        }
        .split-btn-main:hover { opacity: 0.88; }
        .split-btn-arrow {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px 10px;
            background: #218838;
            color: white;
            border: none;
            border-left: 1px solid rgba(255,255,255,0.3);
            border-radius: 0 8px 8px 0;
            cursor: pointer;
            font-size: 11px;
            transition: opacity 0.2s;
        }
        .split-btn-arrow:hover { opacity: 0.88; }
        .split-btn-menu {
            display: none;
            position: absolute;
            top: calc(100% + 4px);
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.13);
            z-index: 999;
            min-width: 160px;
            overflow: hidden;
        }
        .split-btn-menu.open { display: block; }
        .split-menu-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            font-size: 13px;
            color: #333;
            cursor: pointer;
            transition: background 0.15s;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
        }
        .split-menu-item:hover { background: #f5f5f5; }
        .split-menu-item + .split-menu-item { border-top: 1px solid #f0f0f0; }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">PO & GR Tracking</h1>
                <p class="welcome-text">Track Purchase Order fulfillment and Goods Receipt status</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-warning btn-small" onclick="showUploadModal()">
                    ☁️ Upload ZMM039
                </button>

                <!-- POINT 4: Split button Export -->
                <div class="split-btn-wrap" id="exportSplitWrap">
                    <button class="split-btn-main" onclick="exportTracking('csv')">
                        ⬇️ Export Report
                    </button>
                    <button class="split-btn-arrow" onclick="toggleExportMenu(event)" title="More export options">
                        ▾
                    </button>
                    <div class="split-btn-menu" id="exportMenu">
                        <button class="split-menu-item" onclick="exportTracking('csv')">
                            📄 Export as CSV
                        </button>
                        <button class="split-menu-item" onclick="exportTracking('pdf')">
                            🖨️ Export as PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tracking-tabs">
            <button class="tracking-tab active" onclick="switchTab('overview', this)">📊 Overview</button>
            <button class="tracking-tab"        onclick="switchTab('pending',  this)">⏳ Pending GR</button>
            <button class="tracking-tab"        onclick="switchTab('completed',this)">✅ Completed</button>
            <button class="tracking-tab"        onclick="switchTab('history',  this)">🕓 Sync History</button>
        </div>

        <!-- ── OVERVIEW TAB ── -->
        <div id="tab-overview" class="tab-panel">

            <!-- POINT 3: Large prominent search + filter bar -->
            <div class="search-prominent">
                <span class="search-prominent-icon">🔍</span>
                <input type="text" id="searchTracking"
                       placeholder="Search PO Number, Description, or Vendor..."
                       oninput="debounceTrackingSearch()">
                <select id="filterTrackingStatus" onchange="loadTrackingData()">
                    <option value="all">All Status</option>
                    <option value="Open">Open</option>
                    <option value="Partial">Partial</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>

            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-card total">
                    <div class="stat-label">Total PO Items</div>
                    <div class="stat-value" id="totalItems">0</div>
                </div>
                <div class="stat-card open">
                    <div class="stat-label">Awaiting GR</div>
                    <div class="stat-value" id="awaitingGR">0</div>
                </div>
                <div class="stat-card partial">
                    <div class="stat-label">Partial GR</div>
                    <div class="stat-value" id="partialGR">0</div>
                </div>
                <div class="stat-card closed">
                    <div class="stat-label">Fully Received</div>
                    <div class="stat-value" id="fullyReceived">0</div>
                </div>
            </div>

            <div class="data-table-container">
                <div class="table-header">
                    <h3 class="table-title">PO Fulfillment Status</h3>
                </div>

                <!-- POINT 2: Column filter headers (PO Number = search+checkbox; no GR Date) -->
                <table class="data-table" id="trackingTable">
                    <thead>
                        <tr>
                            <!-- PO NUMBER: search + multi-checkbox dropdown -->
                            <th>
                                <div class="th-filter">
                                    <span>PO NUMBER</span>
                                    <div class="po-filter-wrap" id="poFilterWrap">
                                        <div class="po-filter-trigger" id="poFilterTrigger"
                                             onclick="togglePOFilterDropdown()">
                                            <span class="trigger-text" id="poTriggerText">All</span>
                                            <span class="trigger-arrow">▾</span>
                                        </div>
                                        <div class="po-filter-dropdown" id="poFilterDropdown">
                                            <div class="po-search-box">
                                                <input type="text" id="poSearchInput"
                                                       placeholder="Type PO number..."
                                                       oninput="filterPOCheckboxList()"
                                                       onclick="event.stopPropagation()">
                                            </div>
                                            <div class="po-checkbox-list" id="poCheckboxList"></div>
                                            <div class="po-filter-actions">
                                                <button class="po-btn-apply" onclick="applyPOFilter()">Apply</button>
                                                <button class="po-btn-clear" onclick="clearPOFilter()">Clear</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </th>
                            <th>ITEM</th>
                            <th>DESCRIPTION</th>
                            <th>
                                <div class="th-filter">
                                    <span>VENDOR</span>
                                    <select id="colFilterVendor" onchange="renderTrackingTable()">
                                        <option value="">All</option>
                                    </select>
                                </div>
                            </th>
                            <th>ORDERED QTY</th>
                            <th>RECEIVED QTY</th>
                            <th>BALANCE</th>
                            <th>GR DETAILS</th>
                            <th>
                                <div class="th-filter">
                                    <span>STATUS</span>
                                    <select id="colFilterStatus" onchange="renderTrackingTable()">
                                        <option value="">All</option>
                                        <option value="Open">Open</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </th>
                            <th>LAST GR DATE</th>
                        </tr>
                    </thead>
                    <tbody id="trackingTableBody">
                        <tr>
                            <td colspan="10" style="text-align:center; padding:40px; color:#888;">
                                Loading data...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ── PENDING GR TAB ── -->
        <div id="tab-pending" class="tab-panel" style="display:none;">
            <div class="data-table-container">
                <div class="table-header">
                    <h3 class="table-title">⏳ Pending — Awaiting Goods Receipt</h3>
                    <div class="filters-bar" style="margin:0; flex-wrap:nowrap;">
                        <input type="text" class="filter-input" placeholder="🔍 Search PO / Description / Vendor"
                               id="searchPending" style="min-width:220px;">
                        <select class="filter-select" id="filterPendingDays">
                            <option value="all">All Days Pending</option>
                            <option value="overdue">Overdue (&gt;30 days)</option>
                            <option value="normal">On Track (≤30 days)</option>
                        </select>
                    </div>
                </div>
                <table class="data-table" id="pendingTable">
                    <thead>
                        <tr>
                            <th>PO NUMBER</th>
                            <th>DESCRIPTION</th>
                            <th>VENDOR</th>
                            <th>ORDERED QTY</th>
                            <th>RECEIVED QTY</th>
                            <th>REMAINING</th>
                            <th>PO DATE</th>
                            <th>DAYS PENDING</th>
                        </tr>
                    </thead>
                    <tbody id="pendingTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- ── COMPLETED TAB ── -->
        <div id="tab-completed" class="tab-panel" style="display:none;">
            <div class="data-table-container">
                <div class="table-header">
                    <h3 class="table-title">✅ Completed — Fully Received</h3>
                    <div class="filters-bar" style="margin:0; flex-wrap:nowrap;">
                        <input type="text" class="filter-input" placeholder="🔍 Search PO / Description / Vendor"
                               id="searchCompleted" style="min-width:220px;">
                        <select class="filter-select" id="filterCompletedSpeed">
                            <option value="all">All Completion Speed</option>
                            <option value="fast">Fast (&lt;30 days)</option>
                            <option value="slow">Slow (≥30 days)</option>
                        </select>
                    </div>
                </div>
                <table class="data-table" id="completedTable">
                    <thead>
                        <tr>
                            <th>PO NUMBER</th>
                            <th>DESCRIPTION</th>
                            <th>VENDOR</th>
                            <th>TOTAL QTY</th>
                            <th>GR COUNT</th>
                            <th>LAST GR DATE</th>
                            <th>DAYS TO COMPLETE</th>
                        </tr>
                    </thead>
                    <tbody id="completedTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- ── SYNC HISTORY TAB ── -->
        <div id="tab-history" class="tab-panel" style="display:none;">
            <div class="data-table-container">
                <div class="table-header">
                    <h3 class="table-title">🕓 ZMM039 Upload History</h3>
                    <div class="filters-bar" style="margin:0; flex-wrap:nowrap;">
                        <input type="text" class="filter-input" placeholder="🔍 Search filename / uploader"
                               id="searchHistory" style="min-width:220px;">
                    </div>
                </div>
                <table class="data-table" id="syncHistoryTable">
                    <thead>
                        <tr>
                            <th>TIMESTAMP</th>
                            <th>UPLOADED BY</th>
                            <th>FILENAME</th>
                            <th>PO PROCESSED</th>
                            <th>GR INSERTED</th>
                            <th>GR SKIPPED</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody id="syncHistoryBody"></tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- ── PO DETAIL MODAL ── -->
    <div id="poDetailModal" class="modal-overlay">
        <div class="modal modal-large">
            <div class="modal-header">
                <h3 class="modal-title">PO Details: <span id="detailPONumber"></span></h3>
                <button class="modal-close" onclick="hideDetailModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div id="poTimeline"></div>
            </div>
        </div>
    </div>

    <!-- ── UPLOAD MODAL ── -->
    <div id="uploadModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Upload ZMM039 File</h3>
                <button class="modal-close" onclick="hideUploadModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-area" id="dropZone">
                    <div class="upload-icon">☁️</div>
                    <div class="upload-text">Drag & drop ZMM039 Excel file here</div>
                    <div class="upload-hint">or click to browse from your computer</div>
                    <input type="file" id="zmm039File" accept=".xlsx,.xls" style="display:none;">
                </div>
                <div class="file-list" id="fileList"></div>
                <div class="upload-requirements">
                    <strong>Required columns from ZMM039:</strong>
                    PO No., PO Item, PO Date, PO Quantity, GR No., GR Date, GR Qty.,
                    Vendor Name, PO Description, Material Group
                </div>
                <div class="upload-progress" id="uploadProgress" style="display:none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <span id="progressText">0%</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideUploadModal()">Cancel</button>
                <button class="btn btn-primary" onclick="uploadZMM039()" id="uploadBtn" disabled>
                    Upload & Process
                </button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/tracking.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            loadTrackingData();
            initUploadHandlers();
            initFilterHandlers();

            // Close dropdowns when clicking outside
            document.addEventListener('click', function(e) {
                // Export split button menu
                const exportWrap = document.getElementById('exportSplitWrap');
                if (exportWrap && !exportWrap.contains(e.target)) {
                    document.getElementById('exportMenu')?.classList.remove('open');
                }
                // PO filter dropdown (portaled to body)
                const trigger  = document.getElementById('poFilterTrigger');
                const dropdown = document.getElementById('poFilterDropdown');
                if (trigger && dropdown) {
                    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.classList.remove('open');
                        trigger.classList.remove('active');
                    }
                }
            });
        });
    </script>
</body>
</html>