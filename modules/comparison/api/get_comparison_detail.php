<?php
// File: modules/comparison/api/get_comparison_detail.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$id = $_GET['id'] ?? 0;
if (!$id) {
    echo json_encode(['success' => false, 'error' => 'ID required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            ct.*,
            u.name as creator_name
        FROM Comparison_Table ct
        JOIN User u ON ct.created_by = u.user_id
        WHERE ct.comparison_id = ?
    ");
    $stmt->execute([$id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($data) {
        // Fallback untuk kolom yang mungkin tidak ada
        $data['material'] = $data['description'] ?? $data['material_group'] ?? '';
        $data['last_supplier'] = $data['last_supplier_name'] ?? '';
        $data['plan_supplier'] = $data['plan_supplier_name'] ?? '';
        $data['awarded_supplier'] = $data['awarded_supplier_name'] ?? '';
        $data['po_date'] = $data['awarded_po_date'] ?? '';
        $data['delivery_date'] = $data['awarded_deliv_date'] ?? '';
        
        echo json_encode(['success' => true, 'data' => $data]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Not found']);
    }
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>