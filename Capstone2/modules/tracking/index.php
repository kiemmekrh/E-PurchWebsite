<?php
// File: modules/tracking/index.php (PO-GR Tracking Module)
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>PO & GR Tracking | E-Purch</title>
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
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
        }
        .tracking-tab.active {
            background: var(--primary-yellow);
            color: var(--text-dark);
        }
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--border-gray);
        }
        .timeline-item {
            position: relative;
            padding-bottom: 25px;
        }
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -24px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--success-green);
            border: 2px solid white;
        }
        .timeline-item.pending::before {
            background: var(--warning-orange);
        }
        .gr-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-top: 10px;
        }
        .sync-history {
            margin-top: 30px;
        }
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
                <button class="btn btn-success btn-small" onclick="exportTracking()">
                    Export Report
                </button>
            </div>
        </div>

        <div class="tracking-tabs">
            <button class="tracking-tab active" onclick="switchTab('overview')">Overview</button>
            <button class="tracking-tab" onclick="switchTab('pending')">Pending GR</button>
            <button class="tracking-tab" onclick="switchTab('completed')">Completed</button>
            <button class="tracking-tab" onclick="switchTab('history')">Sync History</button>
        </div>

        <!-- Overview Tab -->
        <div id="tab-overview" class="tab-panel active">
            <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
                <div class="stat-card">
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
                    <div class="filters-bar" style="margin: 0;">
                        <input type="text" class="filter-input" placeholder="Search PO..." id="searchTracking">
                        <select class="filter-select" id="filterTrackingStatus">
                            <option value="all">All Status</option>
                            <option value="Open">Open</option>
                            <option value="Partial">Partial</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>
                <table class="data-table" id="trackingTable">
                    <thead>
                        <tr>
                            <th>PO NUMBER</th>
                            <th>ITEM</th>
                            <th>DESCRIPTION</th>
                            <th>ORDERED</th>
                            <th>RECEIVED</th>
                            <th>BALANCE</th>
                            <th>GR DETAILS</th>
                            <th>STATUS</th>
                            <th>LAST UPDATE</th>
                        </tr>
                    </thead>
                    <tbody id="trackingTableBody">
                        <!-- Loaded via AJAX -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pending GR Tab -->
        <div id="tab-pending" class="tab-panel" style="display: none;">
            <div class="data-table-container">
                <table class="data-table" id="pendingTable">
                    <thead>
                        <tr>
                            <th>PO NUMBER</th>
                            <th>DESCRIPTION</th>
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

        <!-- Completed Tab -->
        <div id="tab-completed" class="tab-panel" style="display: none;">
            <div class="data-table-container">
                <table class="data-table" id="completedTable">
                    <thead>
                        <tr>
                            <th>PO NUMBER</th>
                            <th>DESCRIPTION</th>
                            <th>TOTAL QTY</th>
                            <th>GR COUNT</th>
                            <th>COMPLETED DATE</th>
                            <th>DAYS TO COMPLETE</th>
                        </tr>
                    </thead>
                    <tbody id="completedTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- Sync History Tab -->
        <div id="tab-history" class="tab-panel" style="display: none;">
            <div class="sync-history data-table-container">
                <table class="data-table" id="syncHistoryTable">
                    <thead>
                        <tr>
                            <th>TIMESTAMP</th>
                            <th>USER</th>
                            <th>FILENAME</th>
                            <th>RECORDS PROCESSED</th>
                            <th>STATUS</th>
                        </tr>
                    </thead>
                    <tbody id="syncHistoryBody"></tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- PO Detail Modal -->
    <div id="poDetailModal" class="modal-overlay">
        <div class="modal modal-large">
            <div class="modal-header">
                <h3 class="modal-title">PO Details: <span id="detailPONumber"></span></h3>
                <button class="modal-close" onclick="hideDetailModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="timeline" id="poTimeline">
                    <!-- Dynamic timeline -->
                </div>
            </div>
        </div>
    </div>

    <!-- Upload Modal -->
    <div id="uploadModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Upload ZMM039 File</h3>
                <button class="modal-close" onclick="hideUploadModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-area" id="dropZone">
                    <div class="upload-icon">☁️</div>
                    <div class="upload-text">Drag & drop ZMM039 Excel file</div>
                    <div class="upload-hint">or click to browse</div>
                    <input type="file" id="zmm039File" accept=".xlsx,.xls" style="display: none;">
                </div>
                <div class="upload-requirements">
                    <strong>Required columns:</strong> PO Number, PO Item, PO Date, Ordered Quantity, 
                    GR Number, GR Date, GR Quantity, Material Group, Description
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideUploadModal()">Cancel</button>
                <button class="btn btn-primary" onclick="uploadZMM039()" id="uploadBtn">Upload & Process</button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/tracking.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            loadTrackingData();
            initUploadHandlers();
        });
    </script>
</body>
</html>