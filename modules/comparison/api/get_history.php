<?php
// File: modules/comparison/api/get_history.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Ambil semua comparison dari parent table
    $stmt = $pdo->query("
        SELECT 
            ct.comparison_id,
            ct.comparison_date as table_created_date,
            ct.pr_number,
            ct.awarded_po_number as po_number,
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
            ct.source_mode as created_from,
            u.name as creator_name
        FROM Comparison_Table ct
        JOIN User u ON ct.created_by = u.user_id
        ORDER BY ct.comparison_date DESC, ct.comparison_id DESC
    ");

    $comparisons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Untuk setiap comparison, cek apakah ada plan rows di Comparison_Plan_Row
    // Kalau ada, override data plan dari parent dengan data dari child
    $result = [];
    foreach ($comparisons as $row) {
        $planStmt = $pdo->prepare("
            SELECT 
                plan_qty,
                plan_currency,
                plan_price_idr as price,
                plan_amount as amount,
                plan_supplier_name as plan_supplier,
                gap_price,
                gap_percent,
                is_awarded
            FROM Comparison_Plan_Row
            WHERE comparison_id = ?
            ORDER BY plan_row_id ASC
        ");
        $planStmt->execute([$row['comparison_id']]);
        $planRows = $planStmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($planRows)) {
            // Ada plan rows di child table
            // Ambil plan row yang is_awarded = 1, atau row pertama kalau tidak ada
            $displayPlan = null;
            foreach ($planRows as $pr) {
                if ($pr['is_awarded'] == 1) {
                    $displayPlan = $pr;
                    break;
                }
            }
            if (!$displayPlan) {
                $displayPlan = $planRows[0]; // Ambil row pertama
            }
            
            // Override data plan dari parent dengan data dari child
            $row['plan_qty'] = $displayPlan['plan_qty'];
            $row['price'] = $displayPlan['price'];
            $row['amount'] = $displayPlan['amount'];
            $row['plan_supplier'] = $displayPlan['plan_supplier'];
            $row['plan_count'] = count($planRows);
        } else {
            // Tidak ada plan rows di child, pakai data dari parent (backward compatible)
            $row['plan_count'] = 1;
        }
        
        $result[] = $row;
    }

    echo json_encode(['success' => true, 'data' => $result]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>