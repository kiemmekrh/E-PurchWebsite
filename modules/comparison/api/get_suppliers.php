<?php
// File: modules/comparison/api/get_suppliers.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("SELECT supplier_id, supplier_name FROM Supplier ORDER BY supplier_name");
    $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $suppliers]);
} catch (PDOException $e) {
    error_log('get_suppliers error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>