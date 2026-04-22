<?php
// File: modules/comparison/api/get_history.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->query("
        SELECT 
            ct.comparison_id,
            ct.comparison_date as table_created_date,
            ct.pr_number,                    -- ← PR Number (terpisah)
            ct.awarded_po_number as po_number,  -- ← PO Number (dari awarded)
            ct.awarded_po_date as po_date,
            ct.awarded_deliv_date as delivery_date,
            ct.material_code,
            ct.material_group,
            ct.description as material,
            ct.qty_pr as qty,
            ct.plan_qty,
            ct.plan_price_idr as price,
            ct.plan_amount as amount,
            ct.plan_supplier_name as plan_supplier,
            ct.status,
            ct.created_by,
            u.name as creator_name
        FROM Comparison_Table ct
        JOIN User u ON ct.created_by = u.user_id
        ORDER BY ct.comparison_date DESC, ct.comparison_id DESC
    ");

    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $data]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>