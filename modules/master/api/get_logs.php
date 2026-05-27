<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $action = $_GET['action'] ?? 'all';
    $date = $_GET['date'] ?? null;
    
    $sql = "SELECT * FROM Activity_Log WHERE 1=1";
    $params = [];
    
    if ($action !== 'all') {
        $sql .= " AND action = ?";
        $params[] = $action;
    }
    if ($date) {
        $sql .= " AND DATE(created_at) = ?";
        $params[] = $date;
    }
    
    $sql .= " ORDER BY created_at DESC LIMIT 100";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['success' => true, 'data' => $logs]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>