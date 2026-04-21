<?php
// File: modules/comparison/api/get_last_order.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$material = $_GET['material'] ?? '';
$supplier = $_GET['supplier'] ?? '';

if (empty($material)) {
    echo json_encode(['success' => false, 'error' => 'Material required']);
    exit;
}

$params = ["%$material%", "%$material%"];
$where = "(po.material_group LIKE ? OR po.description LIKE ?)";

if (!empty($supplier)) {
    $where .= " AND (s.supplier_name LIKE ? OR s.supplier_code LIKE ?)";
    $params[] = "%$supplier%";
    $params[] = "%$supplier%";
}

// Get last order
$sql = "
    SELECT 
        po.po_number as last_po_number,
        po.po_date as last_po_date,
        po.ordered_quantity as last_qty,
        po.unit_price as last_price_foreign,
        po.currency,
        po.exchange_rate as last_kurs_idr,
        po.exchange_date as last_kurs_date,
        po.price_tiba_nu as last_price_tiba_nu,
        s.supplier_name,
        po.material_group,
        po.description,
        po.unit as uom
    FROM Purchase_Order po
    JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE $where
    ORDER BY po.po_date DESC
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$lastOrder = $stmt->fetch();

if (!$lastOrder) {
    echo json_encode(['success' => false, 'message' => 'No historical data found']);
    exit;
}

// Get all suppliers for this material
$supSql = "
    SELECT DISTINCT s.supplier_id, s.supplier_name, s.supplier_code
    FROM Purchase_Order po
    JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE po.material_group = ? OR po.description LIKE ?
    ORDER BY s.supplier_name
";
$supStmt = $pdo->prepare($supSql);
$supStmt->execute([$lastOrder['material_group'] ?? '', "%$material%"]);
$suppliers = $supStmt->fetchAll();

echo json_encode([
    'success' => true,
    'data' => array_merge($lastOrder, ['suppliers' => $suppliers])
]);
?>