<?php
// File: modules/comparison/api/generate.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$material = $_POST['material'] ?? '';
$supplierId = $_POST['supplier_id'] ?? '';
$dateFrom = $_POST['date_from'] ?? '';
$dateTo = $_POST['date_to'] ?? '';
$planQty = $_POST['plan_qty'] ?? 0;

if (empty($material)) {
    echo json_encode(['success' => false, 'error' => 'Material is required']);
    exit;
}

// Build query for historical prices
$params = [$material, $material]; // For material_group and description
$where = "(po.material_group = ? OR po.description LIKE ?)";

if ($supplierId) {
    $where .= " AND s.supplier_id = ?";
    $params[] = $supplierId;
}

if ($dateFrom) {
    $where .= " AND po.po_date >= ?";
    $params[] = $dateFrom;
}

if ($dateTo) {
    $where .= " AND po.po_date <= ?";
    $params[] = $dateTo;
}

// Get historical purchase data per supplier
$sql = "
    SELECT s.supplier_id, s.supplier_name, 
           po.material_group, po.description,
           AVG(po.ordered_quantity) as avg_qty,
           AVG(po.unit_price) as avg_price,
           MAX(po.po_date) as last_order_date,
           (SELECT ordered_quantity FROM Purchase_Order 
            WHERE supplier_id = s.supplier_id 
            AND (material_group = ? OR description LIKE ?)
            ORDER BY po_date DESC LIMIT 1) as last_qty,
           (SELECT unit_price FROM Purchase_Order 
            WHERE supplier_id = s.supplier_id 
            AND (material_group = ? OR description LIKE ?)
            ORDER BY po_date DESC LIMIT 1) as last_price
    FROM Purchase_Order po
    JOIN Supplier s ON po.supplier_id = s.supplier_id
    WHERE $where
    GROUP BY s.supplier_id
    ORDER BY avg_price ASC
";

$params = array_merge([$material, "%$material%", $material, "%$material%"], $params);

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$suppliers = $stmt->fetchAll();

if (empty($suppliers)) {
    // No historical data - allow manual entry
    echo json_encode([
        'success' => true,
        'historical' => false,
        'message' => 'No historical data found. Please enter prices manually.'
    ]);
    exit;
}

// Calculate comparison metrics
$totalSuppliers = count($suppliers);
$avgPrice = array_sum(array_column($suppliers, 'avg_price')) / $totalSuppliers;
$bestPrice = min(array_column($suppliers, 'last_price'));

// Create comparison record
$pdo->beginTransaction();

$compStmt = $pdo->prepare("
    INSERT INTO Comparison_Table (comparison_date, created_by, material_group, description, plan_quantity)
    VALUES (NOW(), ?, ?, ?, ?)
");
$compStmt->execute([$_SESSION['user_id'], $suppliers[0]['material_group'], $suppliers[0]['description'], $planQty]);
$comparisonId = $pdo->lastInsertId();

// Insert details
$detailStmt = $pdo->prepare("
    INSERT INTO Comparison_Detail 
    (comparison_id, supplier_id, material_group, description, last_price, plan_price, average_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");

foreach ($suppliers as $sup) {
    $planPrice = $sup['last_price'] * 1.05; // 5% markup for planning
    $detailStmt->execute([
        $comparisonId,
        $sup['supplier_id'],
        $sup['material_group'],
        $sup['description'],
        $sup['last_price'],
        $planPrice,
        $avgPrice
    ]);
}

$pdo->commit();

echo json_encode([
    'success' => true,
    'comparison_id' => $comparisonId,
    'historical' => true,
    'suppliers' => $suppliers,
    'summary' => [
        'total_suppliers' => $totalSuppliers,
        'average_price' => $avgPrice,
        'best_price' => $bestPrice,
        'recommended_supplier' => $suppliers[0]['supplier_name']
    ]
]);
?>