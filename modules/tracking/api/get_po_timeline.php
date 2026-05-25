<?php
// File: modules/tracking/api/get_po_timeline.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$poNumber = trim($_GET['po_number'] ?? '');
$poItem   = trim($_GET['po_item']   ?? '');

if (!$poNumber) {
    echo json_encode(['success' => false, 'error' => 'PO Number is required']);
    exit;
}

// ── PO info + supplier name ───────────────────────────────────────────────────
$poStmt = $pdo->prepare("
    SELECT po.*, s.supplier_name,
           DATEDIFF(CURDATE(), po.po_date) AS days_pending
    FROM Purchase_Order po
    LEFT JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE po.po_number = ? AND po.po_item = ?
    LIMIT 1
");
$poStmt->execute([$poNumber, $poItem]);
$po = $poStmt->fetch();

if (!$po) {
    echo json_encode(['success' => false, 'error' => 'PO not found']);
    exit;
}

// ── GR history for this PO ────────────────────────────────────────────────────
$grStmt = $pdo->prepare("
    SELECT gr_number, gr_date, gr_quantity
    FROM Goods_Receipt
    WHERE po_number = ? AND po_item = ?
    ORDER BY gr_date ASC
");
$grStmt->execute([$poNumber, $poItem]);
$grHistory = $grStmt->fetchAll();

echo json_encode([
    'success'    => true,
    'po'         => $po,
    'gr_history' => $grHistory,
]);
?>