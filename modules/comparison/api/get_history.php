<?php
// File: modules/comparison/api/get_history.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$stmt = $pdo->query("
    SELECT ct.*, u.name as creator_name, 
           COUNT(DISTINCT cd.supplier_id) as supplier_count,
           MIN(cd.last_price) as best_price
    FROM Comparison_Table ct
    JOIN User u ON ct.created_by = u.user_id
    LEFT JOIN Comparison_Detail cd ON ct.comparison_id = cd.comparison_id
    GROUP BY ct.comparison_id
    ORDER BY ct.comparison_date DESC
");

echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
?>