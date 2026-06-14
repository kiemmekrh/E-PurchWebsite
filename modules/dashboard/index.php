<?php
// File: modules/dashboard/index.php
session_start();
require_once '../../auth/check_session.php';
checkAuth(['admin', 'purchasing_staff', 'manager']);
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
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        /* ── Vendor filter bar ── */
        .dash-filter-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            background: white;
            border-radius: 12px;
            padding: 14px 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.07);
            margin-bottom: 24px;
        }
        .dash-filter-bar label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-dark);
            white-space: nowrap;
        }
        .dash-filter-bar select {
            flex: 1;
            max-width: 320px;
            border: 1.5px solid var(--border-gray);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 13px;
            color: var(--text-dark);
            background: #fafafa;
            cursor: pointer;
            outline: none;
            transition: border-color 0.2s;
        }
        .dash-filter-bar select:focus { border-color: var(--primary-yellow); }
        .dash-filter-btn {
            padding: 8px 20px;
            background: var(--primary-yellow);
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .dash-filter-btn:hover { opacity: 0.85; }
        .dash-filter-clear {
            padding: 8px 16px;
            background: #f0f0f0;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .dash-filter-clear:hover { background: #e0e0e0; }
        .vendor-badge {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffc107;
            border-radius: 20px;
            padding: 4px 12px;
            font-size: 12px;
            font-weight: 600;
            display: none;
            align-items: center;
            gap: 6px;
        }
        .vendor-badge.visible { display: inline-flex; }
        .vendor-badge span { cursor: pointer; font-size: 14px; }

        /* ── Chart cards ── */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 28px;
        }
        .chart-card {
            background: white;
            border-radius: 14px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        .chart-card.full-width { grid-column: 1 / -1; }
        .chart-card.half-width { grid-column: span 1; }
        .chart-card h3 {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-dark);
            margin: 0 0 6px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .chart-subtitle {
            font-size: 12px;
            color: #888;
            margin: 0 0 18px 0;
        }
        .chart-card canvas { max-height: 300px; }
        .chart-meta {
            display: flex;
            gap: 18px;
            margin-top: 14px;
            flex-wrap: wrap;
        }
        .chart-meta-item {
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 13px;
            color: #555;
        }
        .chart-meta-dot {
            width: 11px;
            height: 11px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        /* ── Section title ── */
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-dark);
            margin: 32px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--primary-yellow);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* ── Loading state ── */
        .chart-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #aaa;
            font-size: 14px;
        }

        /* ── Invoice stat cards ── */
        .invoice-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }
        .invoice-stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-top: 4px solid;
            text-align: center;
        }
        .invoice-stat-card.approved { border-top-color: var(--success-green); }
        .invoice-stat-card.pending { border-top-color: var(--warning-orange); }
        .invoice-stat-card.rejected { border-top-color: var(--danger-red); }
        .invoice-stat-card.total-inv { border-top-color: var(--info-blue); }
        .invoice-stat-label {
            font-size: 14px;
            color: var(--text-gray);
            margin-bottom: 8px;
        }
        .invoice-stat-value {
            font-size: 28px;
            font-weight: bold;
            color: var(--text-dark);
        }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title">Dashboard</h1>
                <p class="welcome-text">Welcome, <?php echo htmlspecialchars($_SESSION['name']); ?>!</p>
            </div>
        </div>

        <!-- ── VENDOR FILTER BAR ── -->
        <div class="dash-filter-bar">
            <label>🏭 Filter by Vendor:</label>
            <select id="vendorFilterSelect">
                <option value="all">— All Vendors —</option>
            </select>
            <button class="dash-filter-btn" onclick="applyVendorFilter()">Apply</button>
            <button class="dash-filter-clear" onclick="clearVendorFilter()">Clear</button>
            <div class="vendor-badge" id="vendorBadge">
                Viewing: <strong id="vendorBadgeName"></strong>
                <span onclick="clearVendorFilter()">✕</span>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- ═══ SECTION: PURCHASE ORDER DASHBOARD ═══ -->
        <!-- ═══════════════════════════════════════════════ -->
        <div class="section-title">📦 Purchase Order Overview</div>

        <!-- ── PO STAT CARDS ── -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-label">Total PO Items</div>
                <div class="stat-value" id="totalPO">–</div>
            </div>
            <div class="stat-card open">
                <div class="stat-label">Awaiting GR (Open)</div>
                <div class="stat-value" id="openPO">–</div>
            </div>
            <div class="stat-card partial">
                <div class="stat-label">Partial GR</div>
                <div class="stat-value" id="partialPO">–</div>
            </div>
            <div class="stat-card closed">
                <div class="stat-label">Fully Received</div>
                <div class="stat-value" id="completedPO">–</div>
            </div>
        </div>

        <!-- ── PO CHARTS ── -->
        <div class="dashboard-grid">
            <!-- Donut: PO Status Breakdown -->
            <div class="chart-card">
                <h3>📊 PO Status Breakdown</h3>
                <p class="chart-subtitle">Distribution of all PO items by fulfillment status</p>
                <canvas id="chartPOStatus"></canvas>
                <div class="chart-meta">
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#f4c542;"></div> Open
                    </div>
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#4e9af1;"></div> Partial
                    </div>
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#28a745;"></div> Completed
                    </div>
                </div>
            </div>

            <!-- Stacked Bar: PO Status per Supplier -->
            <div class="chart-card full-width">
                <h3>🏭 PO Volume by Supplier</h3>
                <p class="chart-subtitle">Total unique POs per vendor, broken down by status (Open / Partial / Completed) — scroll horizontally to see all vendors</p>
                <div id="supplierStackedWrap" style="overflow-x:auto; overflow-y:hidden; width:100%;">
                    <canvas id="chartSupplierStacked" style="height:380px;"></canvas>
                </div>
            </div>
        </div>

        <!-- ═══════════════════════════════════════════════ -->
        <!-- ═══ SECTION: INVOICE DASHBOARD ═══ -->
        <!-- ═══════════════════════════════════════════════ -->
        <div class="section-title">🧾 Invoice Document Control Overview</div>

        <!-- ── INVOICE STAT CARDS ── -->
        <div class="invoice-stats-grid">
            <div class="invoice-stat-card total-inv">
                <div class="invoice-stat-label">Total Invoices</div>
                <div class="invoice-stat-value" id="totalInvoices">–</div>
            </div>
            <div class="invoice-stat-card approved">
                <div class="invoice-stat-label">Approved</div>
                <div class="invoice-stat-value" id="approvedInvoices">–</div>
            </div>
            <div class="invoice-stat-card pending">
                <div class="invoice-stat-label">Pending</div>
                <div class="invoice-stat-value" id="pendingInvoices">–</div>
            </div>
            <div class="invoice-stat-card rejected">
                <div class="invoice-stat-label">Rejected</div>
                <div class="invoice-stat-value" id="rejectedInvoices">–</div>
            </div>
        </div>

        <!-- ── INVOICE CHARTS ── -->
        <div class="dashboard-grid">
            <!-- Pie Chart: Invoice Status Distribution -->
            <div class="chart-card">
                <h3>📊 Invoice Status Distribution</h3>
                <p class="chart-subtitle">Breakdown of invoices by validation status</p>
                <canvas id="chartInvoiceStatus"></canvas>
                <div class="chart-meta">
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#28a745;"></div> Approved
                    </div>
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#ffc107;"></div> Pending
                    </div>
                    <div class="chart-meta-item">
                        <div class="chart-meta-dot" style="background:#dc3545;"></div> Rejected
                    </div>
                </div>
            </div>

            <!-- Bar Chart: Total Invoice Amount per Supplier -->
            <div class="chart-card">
                <h3>💰 Total Invoice Amount by Supplier</h3>
                <p class="chart-subtitle">Sum of all invoice amounts grouped by supplier</p>
                <div id="invoiceAmountWrap" style="overflow-x:auto; overflow-y:hidden; width:100%;">
                    <canvas id="chartInvoiceAmount" style="height:300px;"></canvas>
                </div>
            </div>

            <!-- Bar Chart: Invoice Count per Supplier -->
            <div class="chart-card full-width">
                <h3>📋 Invoice Count by Supplier</h3>
                <p class="chart-subtitle">Number of invoices submitted per supplier</p>
                <div id="invoiceCountWrap" style="overflow-x:auto; overflow-y:hidden; width:100%;">
                    <canvas id="chartInvoiceCount" style="height:320px;"></canvas>
                </div>
            </div>
        </div>
    </main>

    <script src="../../assets/js/dashboard.js"></script>
</body>
</html>