<?php
// File: modules/tracking/api/get_tracking_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$status = $_GET['status'] ?? 'all';

$sql = "
    SELECT 
        po.po_number,
        po.po_item,
        po.description,
        po.material_group,
        po.ordered_quantity,
        po.po_date,
        po.status,
        COALESCE(SUM(gr.gr_quantity), 0) as received_qty,
        (po.ordered_quantity - COALESCE(SUM(gr.gr_quantity), 0)) as balance_qty,
        COUNT(gr.gr_number) as gr_count,
        GROUP_CONCAT(
            CONCAT(gr.gr_number, '|', gr.gr_date, '|', gr.gr_quantity) 
            ORDER BY gr.gr_date 
            SEPARATOR ';;'
        ) as gr_details,
        MAX(gr.gr_date) as last_gr_date,
        DATEDIFF(CURDATE(), po.po_date) as days_pending
    FROM Purchase_Order po
    LEFT JOIN Goods_Receipt gr ON po.po_number = gr.po_number AND po.po_item = gr.po_item
";

if ($status !== 'all') {
    $sql .= " WHERE po.status = ?";
}

$sql .= " GROUP BY po.po_number, po.po_item ORDER BY po.po_date DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($status !== 'all' ? [$status] : []);
$data = $stmt->fetchAll();

// Calculate stats
$stats = [
    'total' => count($data),
    'open' => count(array_filter($data, fn($r) => $r['status'] === 'Open')),
    'partial' => count(array_filter($data, fn($r) => $r['status'] === 'Partial')),
    'completed' => count(array_filter($data, fn($r) => $r['status'] === 'Completed'))
];

echo json_encode([
    'success' => true,
    'data' => $data,
    'stats' => $stats
]);
?>