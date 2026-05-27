<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Hanya tampilkan user yang belum di-soft-delete
    $stmt = $pdo->query("
        SELECT user_id, name, email, role, status, created_at 
        FROM User 
        WHERE is_deleted = 0 
        ORDER BY user_id DESC
    ");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $users]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>