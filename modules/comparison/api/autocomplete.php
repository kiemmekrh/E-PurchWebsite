<?php
// File: modules/comparison/api/autocomplete.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$type = $_GET['type'] ?? '';
$q = $_GET['q'] ?? '';

if (empty($q) || empty($type)) {
    echo json_encode([]);
    exit;
}

$results = [];

if ($type === 'material') {
    // Search materials from Purchase_Order
    $stmt = $pdo->prepare("
        SELECT DISTINCT material_group as value, 
               CONCAT(material_group, ' - ', description) as label
        FROM Purchase_Order
        WHERE material_group LIKE ? OR description LIKE ?
        LIMIT 10
    ");
    $stmt->execute(["%$q%", "%$q%"]);
    $results = $stmt->fetchAll();
    
} elseif ($type === 'supplier') {
    // Search suppliers
    $stmt = $pdo->prepare("
        SELECT supplier_id as value, 
               CONCAT(supplier_name) as label
        FROM Supplier
        WHERE supplier_name
        LIMIT 10
    ");
    $stmt->execute(["%$q%", "%$q%"]);
    $results = $stmt->fetchAll();
}

echo json_encode($results);
?>