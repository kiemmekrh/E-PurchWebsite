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
    
    $pdo->beginTransaction();
    
    // 1. Set supplier_id = NULL di Purchase_Order
    $stmt = $pdo->prepare("UPDATE Purchase_Order SET supplier_id = NULL WHERE supplier_id = ?");
    $stmt->execute([$supplierId]);
    
    // 2. Set supplier_id = NULL di Invoice (kalau ada FK)
    // $stmt = $pdo->prepare("UPDATE Invoice SET supplier_id = NULL WHERE supplier_id = ?");
    // $stmt->execute([$supplierId]);
    
    // 3. Set last_supplier_id = NULL di Comparison_Table (kalau ada FK)
    // $stmt = $pdo->prepare("UPDATE Comparison_Table SET last_supplier_id = NULL WHERE last_supplier_id = ?");
    // $stmt->execute([$supplierId]);
    
    // 4. Delete dari Supplier
    $stmt = $pdo->prepare("DELETE FROM Supplier WHERE supplier_id = ?");
    $stmt->execute([$supplierId]);
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'Supplier deleted permanently']);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>