<?php
// File: modules/dashboard/index.php
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard | E-Purch</title>
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard</h1>
                <p class="welcome-text">Welcome, <?php echo htmlspecialchars($_SESSION['name']); ?>!</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-warning btn-small" onclick="showUploadModal()">
                    ☁️ Upload ZMM039
                </button>
            </div>
        </div>

        <!-- Statistics Cards -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-label">Total PO</div>
                <div class="stat-value" id="totalPO">0</div>
            </div>
            <div class="stat-card open">
                <div class="stat-label">Open</div>
                <div class="stat-value" id="openPO">0</div>
            </div>
            <div class="stat-card partial">
                <div class="stat-label">Partial</div>
                <div class="stat-value" id="partialPO">0</div>
            </div>
            <div class="stat-card closed">
                <div class="stat-label">Completed</div>
                <div class="stat-value" id="completedPO">0</div>
            </div>
        </div>

        <!-- Filters -->
        <div class="filters-bar">
            <input type="text" class="filter-input" placeholder="🔍 Search PO Number" id="searchPO">
            <select class="filter-select" id="filterStatus">
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Partial">Partial</option>
                <option value="Completed">Completed</option>
            </select>
            <input type="date" class="filter-input" id="filterDateFrom" placeholder="From">
            <input type="date" class="filter-input" id="filterDateTo" placeholder="To">
            <button class="btn btn-primary btn-small" onclick="loadDashboardData()">Apply Filter</button>
            <button class="btn btn-secondary btn-small" onclick="resetFilters()">Reset</button>
        </div>

        <!-- PO Table -->
        <div class="data-table-container">
            <div class="table-header">
                <h3 class="table-title">Purchase Order Monitoring</h3>
                <button class="btn btn-success btn-small" onclick="exportTable('poTable')">Export to Excel</button>
            </div>
            <table class="data-table" id="poTable">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAll"></th>
                        <th>PO NUMBER ↕</th>
                        <th>PO ITEM</th>
                        <th>DESCRIPTION</th>
                        <th>PO DATE ↕</th>
                        <th>ORDERED QTY</th>
                        <th>RECEIVED QTY</th>
                        <th>GR NUMBER</th>
                        <th>GR DATE</th>
                        <th>STATUS ↕</th>
                    </tr>
                </thead>
                <tbody id="poTableBody">
                    <!-- Loaded via AJAX -->
                </tbody>
            </table>
            <div class="table-footer">
                <div class="pagination">
                    <button onclick="changePage(-1)">← Previous</button>
                    <span id="pageInfo">Page 1 of 1</span>
                    <button onclick="changePage(1)">Next →</button>
                </div>
                <div class="rows-per-page">
                    <select onchange="changeRowsPerPage(this.value)">
                        <option value="10">10 rows</option>
                        <option value="25">25 rows</option>
                        <option value="50">50 rows</option>
                    </select>
                </div>
            </div>
        </div>
    </main>

    <!-- Upload Modal -->
    <div id="uploadModal" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">Upload ZMM039 Excel File</h3>
                <button class="modal-close" onclick="hideUploadModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="upload-area" id="dropZone">
                    <div class="upload-icon">☁️</div>
                    <div class="upload-text">Drag & drop file here</div>
                    <div class="upload-hint">or click to browse</div>
                    <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" style="display: none;">
                </div>
                <div class="file-list" id="fileList"></div>
                <div class="upload-requirements">
                    <strong>Required columns:</strong> PO Number, PO Item, PO Date, Ordered Quantity, GR Number, GR Date, GR Quantity, Material Group, Description
                </div>
                <div class="upload-progress" id="uploadProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <span id="progressText">0%</span>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="hideUploadModal()">Cancel</button>
                <button class="btn btn-primary" onclick="processUpload()" id="uploadBtn" disabled>Upload & Process</button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/dashboard.js"></script>
    <script>
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboardData();
            initUploadHandlers();
        });
    </script>
</body>
</html>