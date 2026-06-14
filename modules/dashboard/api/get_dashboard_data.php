<?php
// File: modules/dashboard/api/get_dashboard_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$vendorFilter = trim($_GET['vendor'] ?? '');

// Build WHERE for vendor filter
$vendorWhere  = '1=1';
$vendorParams = [];
if ($vendorFilter !== '' && $vendorFilter !== 'all') {
    $vendorWhere    = 's.supplier_name = ?';
    $vendorParams[] = $vendorFilter;
}

// ── 1. Stats (filtered by vendor) ───────────────────────────────────────────
$statsRow = $pdo->prepare("
    SELECT
        COUNT(*)                        AS total,
        SUM(po.status = 'Open')         AS open,
        SUM(po.status = 'Partial')      AS partial,
        SUM(po.status = 'Completed')    AS completed
    FROM Purchase_Order po
    LEFT JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE $vendorWhere
");
$statsRow->execute($vendorParams);
$stats = $statsRow->fetch(PDO::FETCH_ASSOC);

// ── 2. Stacked bar: per supplier — count DISTINCT po_number per status ────────
// One PO can have many items (po_item rows); we want to count unique POs, not items.
$supStackStmt = $pdo->prepare("
    SELECT
        s.supplier_name,
        SUM(CASE WHEN po.status = 'Open'      THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN po.status = 'Partial'   THEN 1 ELSE 0 END) AS partial_count,
        SUM(CASE WHEN po.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        COUNT(DISTINCT po.po_number)                              AS total_count
    FROM (
        SELECT po_number, supplier_id,
               MAX(status) AS status
        FROM Purchase_Order
        GROUP BY po_number, supplier_id
    ) po
    LEFT JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE $vendorWhere
    GROUP BY s.supplier_id, s.supplier_name
    ORDER BY total_count DESC
");
$supStackStmt->execute($vendorParams);
$supplierStacks = $supStackStmt->fetchAll(PDO::FETCH_ASSOC);

// ── 3. Vendor list for filter dropdown (always full, unfiltered) ──────────────
$vendorListStmt = $pdo->query("
    SELECT DISTINCT s.supplier_name
    FROM Supplier s
    JOIN Purchase_Order po ON po.supplier_id = s.supplier_id
    WHERE s.supplier_name IS NOT NULL AND s.supplier_name != ''
    ORDER BY s.supplier_name
");
$vendorList = $vendorListStmt->fetchAll(PDO::FETCH_COLUMN);

echo json_encode([
    'success'        => true,
    'stats'          => [
        'total'     => (int)($stats['total']     ?? 0),
        'open'      => (int)($stats['open']      ?? 0),
        'partial'   => (int)($stats['partial']   ?? 0),
        'completed' => (int)($stats['completed'] ?? 0),
    ],
    'supplier_stacks' => $supplierStacks,
    'vendor_list'     => $vendorList,
]);
?>