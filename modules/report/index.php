<?php
// File: modules/report/index.php
session_start();
if (!isset($_SESSION['user_id']) || ($_SESSION['role'] !== 'manager' && $_SESSION['role'] !== 'admin')) {
    header('Location: ../../auth/login.php');
    exit;
}

require_once '../../config/database.php';

// Date range filter - default: all time (tanpa filter tanggal) supaya data lama tetap muncul
$dateFrom = $_GET['date_from'] ?? '';
$dateTo = $_GET['date_to'] ?? '';
$staffFilter = $_GET['staff_id'] ?? '';

// Helper: build date WHERE clause
function dateWhere($field, $dateFrom, $dateTo) {
    if ($dateFrom && $dateTo) {
        return " AND $field BETWEEN '$dateFrom' AND '$dateTo' ";
    } elseif ($dateFrom) {
        return " AND $field >= '$dateFrom' ";
    } elseif ($dateTo) {
        return " AND $field <= '$dateTo' ";
    }
    return '';
}

// ─── 1. COMPARISON TABLE STATISTICS ─────────────────────────────
$sqlComparison = "
    SELECT 
        u.user_id,
        u.name AS staff_name,
        COUNT(c.comparison_id) AS total_comparisons,
        MIN(c.comparison_date) AS first_created,
        MAX(c.comparison_date) AS last_created,
        AVG(c.plan_amount) AS avg_plan_amount,
        SUM(c.plan_amount) AS total_plan_amount
    FROM User u
    LEFT JOIN Comparison_Table c ON u.user_id = c.created_by 
        AND c.comparison_date BETWEEN ? AND ?
    WHERE u.role = 'purchasing_staff' AND u.status = 'active'
    " . ($staffFilter ? "AND u.user_id = ?" : "") . "
    GROUP BY u.user_id, u.name
    ORDER BY total_comparisons DESC
";

$stmt = $pdo->prepare($sqlComparison);
$params = [$dateFrom ?: '1900-01-01', $dateTo ?: '2099-12-31'];
if ($staffFilter) $params[] = $staffFilter;
$stmt->execute($params);
$comparisonStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 2. INVOICE VALIDATION STATISTICS ───────────────────────────
$sqlInvoice = "
    SELECT 
        u.user_id,
        u.name AS staff_name,
        COUNT(i.invoice_id) AS total_validated,
        SUM(CASE WHEN i.status = 'Approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN i.status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_count,
        SUM(CASE WHEN i.status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(i.amount) AS total_amount_validated,
        AVG(i.amount) AS avg_invoice_amount,
        MAX(i.validated_at) AS last_validated
    FROM User u
    LEFT JOIN Invoice i ON u.user_id = i.validated_by 
        AND i.validated_at BETWEEN ? AND ?
    WHERE u.role IN ('purchasing_staff', 'manager') AND u.status = 'active'
    " . ($staffFilter ? "AND u.user_id = ?" : "") . "
    GROUP BY u.user_id, u.name
    ORDER BY total_validated DESC
";

$stmt = $pdo->prepare($sqlInvoice);
$df = $dateFrom ? $dateFrom . ' 00:00:00' : '1900-01-01 00:00:00';
$dt = $dateTo ? $dateTo . ' 23:59:59' : '2099-12-31 23:59:59';
$params = [$df, $dt];
if ($staffFilter) $params[] = $staffFilter;
$stmt->execute($params);
$invoiceStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 3. ZMM039 UPLOAD STATISTICS ────────────────────────────────
$sqlZMM = "
    SELECT 
        u.user_id,
        u.name AS staff_name,
        COUNT(al.log_id) AS total_uploads,
        MAX(al.created_at) AS last_upload
    FROM User u
    LEFT JOIN Activity_Log al ON u.user_id = al.user_id 
        AND al.action LIKE '%ZMM039%'
        AND al.created_at BETWEEN ? AND ?
    WHERE u.role IN ('purchasing_staff', 'manager') AND u.status = 'active'
    " . ($staffFilter ? "AND u.user_id = ?" : "") . "
    GROUP BY u.user_id, u.name
    ORDER BY total_uploads DESC
";

$stmt = $pdo->prepare($sqlZMM);
$params = [$df, $dt];
if ($staffFilter) $params[] = $staffFilter;
$stmt->execute($params);
$zmmStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 4. DAILY ACTIVITY TREND ────────────────────────────────────
$sqlDailyTrend = "
    SELECT 
        DATE(c.comparison_date) AS activity_date,
        COUNT(c.comparison_id) AS comparison_count
    FROM Comparison_Table c
    WHERE c.comparison_date BETWEEN ? AND ?
    " . ($staffFilter ? "AND c.created_by = ?" : "") . "
    GROUP BY DATE(c.comparison_date)
    ORDER BY activity_date
";

$stmt = $pdo->prepare($sqlDailyTrend);
$params = [$dateFrom ?: '1900-01-01', $dateTo ?: '2099-12-31'];
if ($staffFilter) $params[] = $staffFilter;
$stmt->execute($params);
$dailyTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 5. TOP 5 SUPPLIERS (by PO terbanyak) ──────────────────────
$dateWherePO = dateWhere('po.po_date', $dateFrom, $dateTo);

$sqlTopSuppliers = "
    SELECT 
        s.supplier_name,
        COUNT(DISTINCT po.po_number) AS po_count
    FROM Purchase_Order po
    JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE po.supplier_id IS NOT NULL
    $dateWherePO
    GROUP BY s.supplier_id, s.supplier_name
    ORDER BY po_count DESC
    LIMIT 5
";

$stmt = $pdo->prepare($sqlTopSuppliers);
$stmt->execute();
$topSuppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 6. TOP 5 ITEMS (by total quantity terbanyak) ──────────────
$sqlTopItems = "
    SELECT 
        po.description AS item_name,
        COUNT(*) AS po_count,
        SUM(po.ordered_quantity) AS total_quantity
    FROM Purchase_Order po
    WHERE po.description IS NOT NULL AND po.description != ''
    $dateWherePO
    GROUP BY po.description
    ORDER BY total_quantity DESC
    LIMIT 5
";

$stmt = $pdo->prepare($sqlTopItems);
$stmt->execute();
$topItems = $stmt->fetchAll(PDO::FETCH_ASSOC);

// ─── 7. OVERALL SUMMARY ─────────────────────────────────────────
$df2 = $dateFrom ?: '1900-01-01';
$dt2 = $dateTo ?: '2099-12-31';

$sqlSummary = "
    SELECT 
        (SELECT COUNT(*) FROM Comparison_Table WHERE comparison_date BETWEEN ? AND ?) AS total_comparisons,
        (SELECT COUNT(*) FROM Invoice WHERE validated_at BETWEEN ? AND ?) AS total_invoices,
        (SELECT COUNT(*) FROM Activity_Log WHERE action LIKE '%ZMM039%' AND created_at BETWEEN ? AND ?) AS total_uploads,
        (SELECT COUNT(DISTINCT created_by) FROM Comparison_Table WHERE comparison_date BETWEEN ? AND ?) AS active_staff_comparison,
        (SELECT COUNT(DISTINCT validated_by) FROM Invoice WHERE validated_at BETWEEN ? AND ?) AS active_staff_invoice,
        (SELECT COUNT(DISTINCT user_id) FROM Activity_Log WHERE action LIKE '%ZMM039%' AND created_at BETWEEN ? AND ?) AS active_staff_upload
";

$stmt = $pdo->prepare($sqlSummary);
$stmt->execute([
    $df2, $dt2,
    $df, $dt,
    $df, $dt,
    $df2, $dt2,
    $df, $dt,
    $df, $dt
]);
$summary = $stmt->fetch(PDO::FETCH_ASSOC);

// Staff list for filter
$staffList = $pdo->query("SELECT user_id, name FROM User WHERE role IN ('purchasing_staff', 'manager') AND status = 'active' ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);

// Helper function
function formatNumber($num) {
    return $num ? number_format((float)$num, 0, ',', '.') : '0';
}

function formatCurrency($num) {
    return $num ? 'Rp ' . number_format((float)$num, 0, ',', '.') : 'Rp 0';
}

function formatQty($num) {
    return $num ? number_format((float)$num, 2, ',', '.') : '0';
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports - E-Purch</title>
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/report.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <style>
        .page-header-report {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }
        .page-header-left {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .page-header-left h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            color: #333;
        }
        .page-header-left p {
            margin: 0;
            font-size: 14px;
            color: #666;
        }
        .page-header-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .btn-export-pdf {
            background: #6c757d;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.2s;
        }
        .btn-export-pdf:hover {
            background: #5a6268;
        }
        .info-badge {
            display: inline-block;
            background: #e3f2fd;
            color: #1976d2;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
            font-weight: 500;
        }
        .chart-full-width {
            grid-column: 1 / -1;
        }
        .date-hint {
            font-size: 12px;
            color: #888;
            margin-top: 4px;
        }
        /* PDF content - hidden on website */
        .pdf-only {
            display: none !important;
        }
        /* PDF export styles */
        .pdf-summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .pdf-summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .pdf-summary-card.green {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        .pdf-summary-card.orange {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        .pdf-summary-card h3 {
            margin: 0;
            font-size: 32px;
            font-weight: 700;
        }
        .pdf-summary-card p {
            margin: 5px 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .pdf-summary-card small {
            font-size: 12px;
            opacity: 0.8;
        }
        .pdf-chart-img {
            width: 100%;
            max-height: 300px;
            margin: 20px 0;
        }
        .pdf-section-title {
            font-size: 20px;
            font-weight: 700;
            margin: 30px 0 15px;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 8px;
        }
        .pdf-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .pdf-table th {
            background: #f8f9fa;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            font-size: 12px;
        }
        .pdf-table td {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
            font-size: 12px;
        }
        .pdf-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        .pdf-header h1 {
            margin: 0;
            font-size: 24px;
            color: #333;
        }
        .pdf-header p {
            margin: 5px 0 0;
            color: #666;
            font-size: 14px;
        }
        .pdf-date-range {
            text-align: right;
            font-size: 12px;
            color: #888;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>

    <main class="main-content">
        <!-- Page Header -->
        <div class="page-header-report">
            <div class="page-header-left">
                <h1>📈 Staff Activity Reports</h1>
                <p>Monitor purchasing staff performance and activities</p>
            </div>
            <div class="page-header-right">
                <button class="btn-export-pdf" onclick="exportToPDF()">
                    <span>📄</span>
                    <span>Export PDF</span>
                </button>
            </div>
        </div>

        <!-- Filter Section -->
        <div class="filter-card">
            <form method="GET" class="filter-form">
                <div class="filter-group">
                    <label>Date From</label>
                    <input type="date" name="date_from" value="<?php echo $dateFrom; ?>">
                </div>
                <div class="filter-group">
                    <label>Date To</label>
                    <input type="date" name="date_to" value="<?php echo $dateTo; ?>">
                </div>
                <div class="filter-group">
                    <label>Staff</label>
                    <select name="staff_id">
                        <option value="">All Staff</option>
                        <?php foreach ($staffList as $staff): ?>
                        <option value="<?php echo $staff['user_id']; ?>" <?php echo $staffFilter == $staff['user_id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($staff['name']); ?>
                        </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Apply Filter</button>
                <a href="index.php" class="btn btn-secondary">Reset</a>
            </form>
            <p class="date-hint">💡 Leave date empty to show all historical data</p>
        </div>

        <!-- ==================== PDF ONLY CONTENT (hidden on website) ==================== -->
        <div id="pdfContent" class="pdf-only">

            <!-- PDF Header -->
            <div class="pdf-header">
                <h1>📈 Staff Activity Report</h1>
                <p>E-Purch - PT Niramas Utama (INACO)</p>
            </div>
            <div class="pdf-date-range">
                Period: <?php echo $dateFrom ? date('d M Y', strtotime($dateFrom)) : 'All Time'; ?> 
                - <?php echo $dateTo ? date('d M Y', strtotime($dateTo)) : 'All Time'; ?>
                <?php if ($staffFilter): ?>
                | Staff: <?php echo htmlspecialchars($staffList[array_search($staffFilter, array_column($staffList, 'user_id'))]['name'] ?? 'Selected'); ?>
                <?php endif; ?>
            </div>

            <!-- Summary Cards (PDF version) -->
            <div class="pdf-summary-grid">
                <div class="pdf-summary-card">
                    <h3><?php echo formatNumber($summary['total_comparisons']); ?></h3>
                    <p>Total Comparisons</p>
                    <small><?php echo $summary['active_staff_comparison']; ?> staff active</small>
                </div>
                <div class="pdf-summary-card green">
                    <h3><?php echo formatNumber($summary['total_invoices']); ?></h3>
                    <p>Total Invoices Validated</p>
                    <small><?php echo $summary['active_staff_invoice']; ?> staff active</small>
                </div>
                <div class="pdf-summary-card orange">
                    <h3><?php echo formatNumber($summary['total_uploads']); ?></h3>
                    <p>Total ZMM039 Uploads</p>
                    <small><?php echo $summary['active_staff_upload']; ?> staff active</small>
                </div>
            </div>

            <!-- Chart Image placeholder for PDF -->
            <div id="chartForPdf" style="text-align:center; margin: 20px 0;">
                <canvas id="comparisonChartPdf" style="max-height: 300px;"></canvas>
            </div>

            <!-- Daily Activity Trend -->
            <div class="pdf-section-title">📅 Daily Comparison Activity Trend</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Comparisons</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($dailyTrend as $row): ?>
                    <tr>
                        <td><?php echo date('d M Y', strtotime($row['activity_date'])); ?></td>
                        <td><?php echo formatNumber($row['comparison_count']); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($dailyTrend)): ?>
                    <tr><td colspan="2" style="text-align:center; padding:20px; color:#888;">No daily activity data</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Comparison Table Report -->
            <div class="pdf-section-title">📊 Comparison Table Activity</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Staff Name</th>
                        <th>Total Created</th>
                        <th>Total Amount</th>
                        <th>Avg Amount</th>
                        <th>First Activity</th>
                        <th>Last Activity</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($comparisonStats as $row): ?>
                    <tr>
                        <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                        <td><?php echo formatNumber($row['total_comparisons']); ?></td>
                        <td><?php echo formatCurrency($row['total_plan_amount']); ?></td>
                        <td><?php echo formatCurrency($row['avg_plan_amount']); ?></td>
                        <td><?php echo $row['first_created'] ? date('d M Y', strtotime($row['first_created'])) : '-'; ?></td>
                        <td><?php echo $row['last_created'] ? date('d M Y', strtotime($row['last_created'])) : '-'; ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <!-- Invoice Validation Report -->
            <div class="pdf-section-title">📄 Invoice Validation Activity</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Staff Name</th>
                        <th>Total Validated</th>
                        <th>Approved</th>
                        <th>Rejected</th>
                        <th>Pending</th>
                        <th>Total Amount</th>
                        <th>Last Activity</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($invoiceStats as $row): ?>
                    <tr>
                        <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                        <td><?php echo formatNumber($row['total_validated']); ?></td>
                        <td><?php echo formatNumber($row['approved_count']); ?></td>
                        <td><?php echo formatNumber($row['rejected_count']); ?></td>
                        <td><?php echo formatNumber($row['pending_count']); ?></td>
                        <td><?php echo formatCurrency($row['total_amount_validated']); ?></td>
                        <td><?php echo $row['last_validated'] ? date('d M Y H:i', strtotime($row['last_validated'])) : '-'; ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <!-- ZMM039 Upload Report -->
            <div class="pdf-section-title">📦 ZMM039 Upload Activity</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Staff Name</th>
                        <th>Total Uploads</th>
                        <th>Last Upload</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($zmmStats as $row): ?>
                    <tr>
                        <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                        <td><?php echo formatNumber($row['total_uploads']); ?></td>
                        <td><?php echo $row['last_upload'] ? date('d M Y H:i', strtotime($row['last_upload'])) : '-'; ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($zmmStats) || array_sum(array_column($zmmStats, 'total_uploads')) == 0): ?>
                    <tr>
                        <td colspan="3" style="text-align:center; padding:20px; color:#888;">
                            No ZMM039 upload data found.
                        </td>
                    </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Top 5 Suppliers (by PO terbanyak) -->
            <div class="pdf-section-title">🏆 Top 5 Suppliers by PO Count</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Supplier Name</th>
                        <th>Total PO</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $rank = 1; foreach ($topSuppliers as $row): ?>
                    <tr>
                        <td><strong>#<?php echo $rank++; ?></strong></td>
                        <td><?php echo htmlspecialchars($row['supplier_name']); ?></td>
                        <td><strong><?php echo formatNumber($row['po_count']); ?></strong></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($topSuppliers)): ?>
                    <tr><td colspan="3" style="text-align:center; padding:20px; color:#888;">No supplier data from PO history</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <!-- Top 5 Items (by total quantity terbanyak) -->
            <div class="pdf-section-title">📦 Top 5 Items by Quantity</div>
            <table class="pdf-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Item Description</th>
                        <th>Total Qty</th>
                        <th>Total PO</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $rank = 1; foreach ($topItems as $row): ?>
                    <tr>
                        <td><strong>#<?php echo $rank++; ?></strong></td>
                        <td><?php echo htmlspecialchars($row['item_name']); ?></td>
                        <td><strong><?php echo formatQty($row['total_quantity']); ?></strong></td>
                        <td><?php echo formatNumber($row['po_count']); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if (empty($topItems)): ?>
                    <tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No item data from PO history</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>

        </div>
        <!-- ==================== END PDF ONLY CONTENT ==================== -->

        <!-- ==================== WEBSITE UI CONTENT ==================== -->

        <!-- Summary Cards (UI) -->
        <div class="summary-grid">
            <div class="summary-card blue">
                <div class="summary-icon">📊</div>
                <div class="summary-info">
                    <h3><?php echo formatNumber($summary['total_comparisons']); ?></h3>
                    <p>Total Comparisons</p>
                    <small><?php echo $summary['active_staff_comparison']; ?> staff active</small>
                </div>
            </div>
            <div class="summary-card green">
                <div class="summary-icon">📄</div>
                <div class="summary-info">
                    <h3><?php echo formatNumber($summary['total_invoices']); ?></h3>
                    <p>Total Invoices Validated</p>
                    <small><?php echo $summary['active_staff_invoice']; ?> staff active</small>
                </div>
            </div>
            <div class="summary-card orange">
                <div class="summary-icon">📦</div>
                <div class="summary-info">
                    <h3><?php echo formatNumber($summary['total_uploads']); ?></h3>
                    <p>Total ZMM039 Uploads</p>
                    <small><?php echo $summary['active_staff_upload']; ?> staff active</small>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="chart-grid">
            <div class="chart-card chart-full-width">
                <h3>Comparison by Staff</h3>
                <canvas id="comparisonChart"></canvas>
            </div>
        </div>

        <!-- Daily Activity Trend -->
        <div class="report-section">
            <div class="section-header">
                <h2>📅 Daily Comparison Activity Trend</h2>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Total Comparisons</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($dailyTrend as $row): ?>
                        <tr>
                            <td><?php echo date('d M Y', strtotime($row['activity_date'])); ?></td>
                            <td><?php echo formatNumber($row['comparison_count']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty($dailyTrend)): ?>
                        <tr><td colspan="2" style="text-align:center; padding:20px; color:#888;">No daily activity data</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Comparison Table Report -->
        <div class="report-section">
            <div class="section-header">
                <h2>📊 Comparison Table Activity</h2>
            </div>
            <div class="table-responsive">
                <table id="comparisonTable" class="data-table">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Total Created</th>
                            <th>Total Amount</th>
                            <th>Avg Amount</th>
                            <th>First Activity</th>
                            <th>Last Activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($comparisonStats as $row): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                            <td><?php echo formatNumber($row['total_comparisons']); ?></td>
                            <td><?php echo formatCurrency($row['total_plan_amount']); ?></td>
                            <td><?php echo formatCurrency($row['avg_plan_amount']); ?></td>
                            <td><?php echo $row['first_created'] ? date('d M Y', strtotime($row['first_created'])) : '-'; ?></td>
                            <td><?php echo $row['last_created'] ? date('d M Y', strtotime($row['last_created'])) : '-'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Invoice Validation Report -->
        <div class="report-section">
            <div class="section-header">
                <h2>📄 Invoice Validation Activity</h2>
            </div>
            <div class="table-responsive">
                <table id="invoiceTable" class="data-table">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Total Validated</th>
                            <th>Approved</th>
                            <th>Rejected</th>
                            <th>Pending</th>
                            <th>Total Amount</th>
                            <th>Last Activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($invoiceStats as $row): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                            <td><?php echo formatNumber($row['total_validated']); ?></td>
                            <td><span class="badge badge-success"><?php echo formatNumber($row['approved_count']); ?></span></td>
                            <td><span class="badge badge-danger"><?php echo formatNumber($row['rejected_count']); ?></span></td>
                            <td><span class="badge badge-warning"><?php echo formatNumber($row['pending_count']); ?></span></td>
                            <td><?php echo formatCurrency($row['total_amount_validated']); ?></td>
                            <td><?php echo $row['last_validated'] ? date('d M Y H:i', strtotime($row['last_validated'])) : '-'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ZMM039 Upload Report -->
        <div class="report-section">
            <div class="section-header">
                <h2>📦 ZMM039 Upload Activity</h2>
            </div>
            <div class="table-responsive">
                <table id="zmmTable" class="data-table">
                    <thead>
                        <tr>
                            <th>Staff Name</th>
                            <th>Total Uploads</th>
                            <th>Last Upload</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($zmmStats as $row): ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($row['staff_name']); ?></strong></td>
                            <td><?php echo formatNumber($row['total_uploads']); ?></td>
                            <td><?php echo $row['last_upload'] ? date('d M Y H:i', strtotime($row['last_upload'])) : '-'; ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty($zmmStats) || array_sum(array_column($zmmStats, 'total_uploads')) == 0): ?>
                        <tr>
                            <td colspan="3" style="text-align:center; padding:20px; color:#888;">
                                No ZMM039 upload data found.
                            </td>
                        </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Top 5 Suppliers (by PO terbanyak) -->
        <div class="report-section">
            <div class="section-header">
                <h2>🏆 Top 5 Suppliers by PO Count</h2>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Supplier Name</th>
                            <th>Total PO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $rank = 1; foreach ($topSuppliers as $row): ?>
                        <tr>
                            <td><strong>#<?php echo $rank++; ?></strong></td>
                            <td><?php echo htmlspecialchars($row['supplier_name']); ?></td>
                            <td><strong><?php echo formatNumber($row['po_count']); ?></strong></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty($topSuppliers)): ?>
                        <tr><td colspan="3" style="text-align:center; padding:20px; color:#888;">No supplier data from PO history</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Top 5 Items (by total quantity terbanyak) -->
        <div class="report-section">
            <div class="section-header">
                <h2>📦 Top 5 Items by Quantity</h2>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Item Description</th>
                            <th>Total Qty</th>
                            <th>Total PO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $rank = 1; foreach ($topItems as $row): ?>
                        <tr>
                            <td><strong>#<?php echo $rank++; ?></strong></td>
                            <td><?php echo htmlspecialchars($row['item_name']); ?></td>
                            <td><strong><?php echo formatQty($row['total_quantity']); ?></strong></td>
                            <td><?php echo formatNumber($row['po_count']); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if (empty($topItems)): ?>
                        <tr><td colspan="4" style="text-align:center; padding:20px; color:#888;">No item data from PO history</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- ==================== END WEBSITE UI CONTENT ==================== -->

    </main>

    <script>
    // Chart.js - Single bar chart
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');
    const comparisonChart = new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: <?php echo json_encode(array_column($comparisonStats, 'staff_name')); ?>,
            datasets: [{
                label: 'Total Comparisons',
                data: <?php echo json_encode(array_column($comparisonStats, 'total_comparisons')); ?>,
                backgroundColor: '#007bff'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });

    // Export to PDF - clone content, temporarily show it, then hide again
    function exportToPDF() {
        const pdfContent = document.getElementById('pdfContent');

        // Temporarily show pdfContent for html2pdf capture
        pdfContent.classList.remove('pdf-only');

        const opt = {
            margin: [10, 10, 10, 10],
            filename: 'Staff_Activity_Report_<?php echo $dateFrom ?: 'all'; ?>_to_<?php echo $dateTo ?: 'all'; ?>.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(pdfContent).save().then(() => {
            // Hide pdfContent again after export
            pdfContent.classList.add('pdf-only');
        });
    }
    </script>
</body>
</html>