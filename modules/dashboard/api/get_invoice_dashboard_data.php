<?php
// File: modules/dashboard/api/get_invoice_dashboard_data.php
// API endpoint to fetch invoice data for dashboard charts

session_start();
header('Content-Type: application/json');
require_once '../../../auth/check_session.php';

// Include database config - it creates $pdo variable directly
require_once '../../../config/database.php';

checkAuth(['admin', 'purchasing_staff', 'manager']);

try {
    // $pdo is already created by database.php
    if (!isset($pdo) || !$pdo) {
        throw new Exception('Database connection not available');
    }
    
    $vendorFilter = isset($_GET['vendor']) ? trim($_GET['vendor']) : 'all';

    // ─── 1. INVOICE STATUS COUNTS (for Pie Chart) ─────────────────────────────
    $statusSql = "
        SELECT 
            status,
            COUNT(*) as count
        FROM invoice
        WHERE 1=1
    ";
    $statusParams = [];

    if ($vendorFilter !== 'all' && $vendorFilter !== '') {
        $statusSql .= " AND supplier_id = (SELECT supplier_id FROM supplier WHERE supplier_name = :vendor)";
        $statusParams[':vendor'] = $vendorFilter;
    }

    $statusSql .= " GROUP BY status";

    $statusStmt = $pdo->prepare($statusSql);
    $statusStmt->execute($statusParams);
    $statusRows = $statusStmt->fetchAll();

    $invoiceStats = [
        'approved' => 0,
        'pending'  => 0,
        'rejected' => 0
    ];

    foreach ($statusRows as $row) {
        $status = strtolower($row['status']);
        if (isset($invoiceStats[$status])) {
            $invoiceStats[$status] = (int)$row['count'];
        }
    }

    // ─── 2. TOTAL INVOICE AMOUNT PER SUPPLIER (for Bar Chart) ─────────────────
    $amountSql = "
        SELECT 
            s.supplier_name,
            SUM(i.amount) as total_amount
        FROM invoice i
        JOIN supplier s ON i.supplier_id = s.supplier_id
        WHERE 1=1
    ";
    $amountParams = [];

    if ($vendorFilter !== 'all' && $vendorFilter !== '') {
        $amountSql .= " AND s.supplier_name = :vendor";
        $amountParams[':vendor'] = $vendorFilter;
    }

    $amountSql .= " GROUP BY s.supplier_id, s.supplier_name ORDER BY total_amount DESC";

    $amountStmt = $pdo->prepare($amountSql);
    $amountStmt->execute($amountParams);
    $supplierAmounts = $amountStmt->fetchAll();

    // ─── 3. INVOICE COUNT PER SUPPLIER (for Bar Chart) ────────────────────────
    $countSql = "
        SELECT 
            s.supplier_name,
            COUNT(*) as invoice_count
        FROM invoice i
        JOIN supplier s ON i.supplier_id = s.supplier_id
        WHERE 1=1
    ";
    $countParams = [];

    if ($vendorFilter !== 'all' && $vendorFilter !== '') {
        $countSql .= " AND s.supplier_name = :vendor";
        $countParams[':vendor'] = $vendorFilter;
    }

    $countSql .= " GROUP BY s.supplier_id, s.supplier_name ORDER BY invoice_count DESC";

    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($countParams);
    $supplierCounts = $countStmt->fetchAll();

    // ─── RESPONSE ─────────────────────────────────────────────────────────────
    echo json_encode([
        'success'         => true,
        'invoice_stats'   => $invoiceStats,
        'supplier_amounts' => $supplierAmounts,
        'supplier_counts'  => $supplierCounts
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}