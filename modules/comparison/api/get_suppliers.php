<?php
// File: modules/comparison/api/get_suppliers.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$stmt = $pdo->query("SELECT supplier_id, supplier_code, supplier_name FROM Supplier ORDER BY supplier_name");
$suppliers = $stmt->fetchAll();

echo json_encode(['success' => true, 'data' => $suppliers]);
?>