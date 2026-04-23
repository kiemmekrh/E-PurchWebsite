<?php
// File: modules/comparison/api/get_po_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$material = $_GET['material'] ?? '';
$supplier = $_GET['supplier'] ?? '';

// Build query
$params = [];
$where = ["1=1"]; // Always true condition

if (!empty($material)) {
    $where[] = "(po.material_group LIKE ? OR po.description LIKE ?)";
    $params[] = "%$material%";
    $params[] = "%$material%";
}

if (!empty($supplier)) {
    $where[] = "(s.supplier_name)";
    $params[] = "%$supplier%";
    $params[] = "%$supplier%";
}

$whereClause = implode(' AND ', $where);

$sql = "
    SELECT 
        po.po_id,
        po.po_number,
        po.material_group,
        po.description,
        po.po_date,
        po.delivery_date,
        po.ordered_quantity,
        po.unit,
        po.unit_price,
        po.ordered_quantity * po.unit_price as total_amount,
        s.supplier_id,
        s.supplier_name
    FROM Purchase_Order po
    JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE $whereClause
    ORDER BY po.po_date DESC
    LIMIT 1000
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'data' => $data,
    'count' => count($data)
]);
?>