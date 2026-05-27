<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $supplierId = $data['supplier_id'] ?? null;
    
    if (!$supplierId) {
        echo json_encode(['success' => false, 'error' => 'Supplier ID required']);
        exit;
    }
    
    // SOFT DELETE: set is_deleted = 1, jangan DELETE
    $stmt = $pdo->prepare("UPDATE Supplier SET is_deleted = 1, status = 'inactive' WHERE supplier_id = ?");
    $stmt->execute([$supplierId]);
    
    echo json_encode(['success' => true, 'message' => 'Supplier deactivated (soft delete)']);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>