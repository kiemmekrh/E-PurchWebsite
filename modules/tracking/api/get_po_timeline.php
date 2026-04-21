<?php
// File: modules/tracking/api/get_po_timeline.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$poNumber = $_GET['po_number'] ?? '';
$poItem = $_GET['po_item'] ?? '';

if (!$poNumber) {
    echo json_encode(['success' => false, 'error' => 'PO Number required']);
    exit;
}

// Get PO info
$poStmt = $pdo->prepare("
    SELECT po.*, s.supplier_name 
    FROM Purchase_Order po
    LEFT JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE po.po_number = ? AND po.po_item = ?
");
$poStmt->execute([$poNumber, $poItem]);
$po = $poStmt->fetch();

// Get GR history
$grStmt = $pdo->prepare("
    SELECT * FROM Goods_Receipt 
    WHERE po_number = ? AND po_item = ?
    ORDER BY gr_date ASC
");
$grStmt->execute([$poNumber, $poItem]);
$grList = $grStmt->fetchAll();

echo json_encode([
    'success' => true,
    'po' => $po,
    'gr_history' => $grList
]);
?>