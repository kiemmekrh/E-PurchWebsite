<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $userId = $data['user_id'] ?? null;
    
    if (!$userId) {
        echo json_encode(['success' => false, 'error' => 'User ID required']);
        exit;
    }
    
    if ($userId == $_SESSION['user_id']) {
        echo json_encode(['success' => false, 'error' => 'Cannot delete your own account']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // 1. Delete from Activity_Log
    $stmt = $pdo->prepare("DELETE FROM Activity_Log WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    // 2. Set validated_by = NULL di Invoice (jangan hapus invoice-nya, cuma lepas link ke user)
    $stmt = $pdo->prepare("UPDATE Invoice SET validated_by = NULL WHERE validated_by = ?");
    $stmt->execute([$userId]);
    
    // 3. Set created_by = NULL di Comparison_Table (jangan hapus comparison-nya)
    $stmt = $pdo->prepare("UPDATE Comparison_Table SET created_by = NULL WHERE created_by = ?");
    $stmt->execute([$userId]);
    
    // 4. Delete from User
    $stmt = $pdo->prepare("DELETE FROM User WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => 'User deleted permanently']);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>