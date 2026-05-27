<?php
// File: modules/dashboard/index.php
session_start();
require_once '../../auth/check_session.php';

// Admin & Purchasing Staff boleh akses dashboard
// Manager juga boleh (jika ada di masa depan)
checkAuth(['admin', 'purchasing_staff', 'manager']);

// Jika supplier coba akses, redirect ke invoice submit
if (isSupplier()) {
    header('Location: /e-purch/modules/invoice/submit.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
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
                <?php if (isPurchasingStaff() || isManager()): ?>
                <button class="btn btn-warning btn-small" onclick="showUploadModal()">
                    ☁️ Upload ZMM039
                </button>
                <?php endif; ?>
                <button class="btn btn-success btn-small" onclick="exportTable('poTable')">
                    ⬇️ Export
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
            <input type="text"  class="filter-input"  placeholder="🔍 Search PO / Description / Vendor" id="searchPO">
            <select class="filter-select" id="filterStatus">
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Partial">Partial</option>
                <option value="Completed">Completed</option>
            </select>
            <input type="date" class="filter-input" id="filterDateFrom" title="PO Date From">
            <input type="date" class="filter-input" id="filterDateTo"   title="PO Date To">
            <button class="btn btn-primary   btn-small" onclick="loadDashboardData()">Apply</button>
            <button class="btn btn-secondary btn-small" onclick="resetFilters()">Reset</button>
        </div>

        <!-- PO Table -->
        <div class="data-table-container">
            <div class="table-header">
                <h3 class="table-title">Purchase Order Monitoring</h3>
            </div>
            <table class="data-table" id="poTable">
                <thead>
                    <tr>
                        <th><input type="checkbox" id="selectAll"></th>
                        <th>PO NUMBER ↕</th>
                        <th>PO ITEM</th>
                        <th>DESCRIPTION</th>
                        <th>VENDOR / SUPPLIER</th>
                        <th>PO DATE ↕</th>
                        <th>ORDERED QTY</th>
                        <th>RECEIVED QTY</th>
                        <th>BALANCE</th>
                        <th>GR NUMBER(S)</th>
                        <th>LAST GR DATE</th>
                        <th>STATUS ↕</th>
                    </tr>
                </thead>
                <tbody id="poTableBody">
                    <tr>
                        <td colspan="12" style="text-align:center; padding:40px; color:#888;">
                            Loading data...
                        </td>
                    </tr>
                </tbody>
            </table>
            <div class="table-footer">
                <div class="pagination">
                    <button onclick="changePage(-1)">← Previous</button>
                    <span id="pageInfo" data-total-pages="1">Page 1 of 1 (0 records)</span>
                    <button onclick="changePage(1)">Next →</button>
                </div>
                <div class="rows-per-page">
                    Rows per page:
                    <select onchange="changeRowsPerPage(this.value)">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
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
                    <div class="upload-hint">or click to browse from your computer</div>
                    <input type="file" id="fileInput" accept=".xlsx,.xls" style="display:none;">
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
                <button class="btn btn-primary" onclick="processUpload()" id="uploadBtn" disabled>
                    Upload & Process
                </button>
            </div>
        </div>
    </div>

    <script src="../../assets/js/dashboard.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            loadDashboardData();
            initUploadHandlers();

            // Live search on Enter or after 600ms idle
            let debounce;
            document.getElementById('searchPO').addEventListener('input', function () {
                clearTimeout(debounce);
                debounce = setTimeout(() => { currentPage = 1; loadDashboardData(); }, 600);
            });
            document.getElementById('filterStatus').addEventListener('change', function () {
                currentPage = 1; loadDashboardData();
            });
        });
    </script>
</body>
</html>