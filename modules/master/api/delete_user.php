<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $userId = $data['user_id'] ?? null;
    
    // Prevent deleting own account
    if ($userId == $_SESSION['user_id']) {
        echo json_encode(['success' => false, 'error' => 'Cannot delete your own account']);
        exit;
    }
    
    $stmt = $pdo->prepare("DELETE FROM User WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>