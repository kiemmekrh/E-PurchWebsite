<?php
// File: modules/tracking/api/get_tracking_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$status = trim($_GET['status'] ?? 'all');
$search = trim($_GET['search'] ?? '');

$where  = ['1=1'];
$params = [];

if ($status !== 'all') {
    $where[]  = 'po.status = ?';
    $params[] = $status;
}

if ($search) {
    $where[]  = '(po.po_number LIKE ? OR po.description LIKE ? OR s.supplier_name LIKE ?)';
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

$whereClause = implode(' AND ', $where);

$sql = "
    SELECT
        po.po_number,
        po.po_item,
        po.description,
        po.material_group,
        po.ordered_quantity,
        po.po_date,
        po.status,
        s.supplier_name,
        COALESCE(SUM(gr.gr_quantity), 0)    AS received_qty,
        (po.ordered_quantity - COALESCE(SUM(gr.gr_quantity), 0)) AS balance_qty,
        COUNT(DISTINCT gr.gr_number)         AS gr_count,
        GROUP_CONCAT(
            CONCAT(gr.gr_number, '|', gr.gr_date, '|', gr.gr_quantity)
            ORDER BY gr.gr_date
            SEPARATOR ';;'
        )                                    AS gr_details,
        MAX(gr.gr_date)                      AS last_gr_date,
        DATEDIFF(CURDATE(), po.po_date)      AS days_pending
    FROM Purchase_Order po
    LEFT JOIN Supplier      s  ON po.supplier_id = s.supplier_id
    LEFT JOIN Goods_Receipt gr ON po.po_number   = gr.po_number
                               AND po.po_item    = gr.po_item
    WHERE $whereClause
    GROUP BY po.po_number, po.po_item
    ORDER BY po.po_date DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

$stats = [
    'total'     => count($data),
    'open'      => count(array_filter($data, fn($r) => $r['status'] === 'Open')),
    'partial'   => count(array_filter($data, fn($r) => $r['status'] === 'Partial')),
    'completed' => count(array_filter($data, fn($r) => $r['status'] === 'Completed')),
];

echo json_encode([
    'success' => true,
    'data'    => $data,
    'stats'   => $stats,
]);
?>