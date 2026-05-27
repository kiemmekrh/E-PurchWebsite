<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Hanya tampilkan supplier yang belum di-soft-delete
    $stmt = $pdo->query("
        SELECT supplier_id, supplier_name, email, contact_info, status, created_at 
        FROM Supplier 
        WHERE is_deleted = 0 
        ORDER BY supplier_id DESC
    ");
    $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $suppliers]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>