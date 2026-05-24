<?php
// File: modules/dashboard/api/get_po_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$page     = max(1, intval($_GET['page']  ?? 1));
$limit    = max(1, intval($_GET['limit'] ?? 10));
$search   = trim($_GET['search']    ?? '');
$status   = trim($_GET['status']    ?? 'all');
$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo   = trim($_GET['date_to']   ?? '');
$offset   = ($page - 1) * $limit;

// ── Build WHERE clause ────────────────────────────────────────────────────────
$where  = ['1=1'];
$params = [];

if ($search) {
    $where[]  = '(po.po_number LIKE ? OR po.description LIKE ? OR s.supplier_name LIKE ?)';
    $params[] = "%$search%";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($status !== 'all') {
    $where[]  = 'po.status = ?';
    $params[] = $status;
}

if ($dateFrom) {
    $where[]  = 'po.po_date >= ?';
    $params[] = $dateFrom;
}

if ($dateTo) {
    $where[]  = 'po.po_date <= ?';
    $params[] = $dateTo;
}

$whereClause = implode(' AND ', $where);

// ── Total count ───────────────────────────────────────────────────────────────
$countSql  = "SELECT COUNT(*) FROM Purchase_Order po LEFT JOIN Supplier s ON po.supplier_id = s.supplier_id WHERE $whereClause";
$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$totalRows  = (int)$countStmt->fetchColumn();
$totalPages = max(1, (int)ceil($totalRows / $limit));

// ── Main data query ───────────────────────────────────────────────────────────
$sql = "
    SELECT
        po.po_number,
        po.po_item,
        po.description,
        po.material_group,
        po.po_date,
        po.ordered_quantity,
        po.status,
        s.supplier_name,
        COALESCE(SUM(gr.gr_quantity), 0)                                          AS received_qty,
        (po.ordered_quantity - COALESCE(SUM(gr.gr_quantity), 0))                  AS balance_qty,
        GROUP_CONCAT(DISTINCT gr.gr_number ORDER BY gr.gr_date SEPARATOR ', ')    AS gr_numbers,
        MAX(gr.gr_date)                                                            AS last_gr_date,
        COUNT(DISTINCT gr.gr_number)                                               AS gr_count
    FROM Purchase_Order po
    LEFT JOIN Supplier       s  ON po.supplier_id  = s.supplier_id
    LEFT JOIN Goods_Receipt  gr ON po.po_number    = gr.po_number
                                AND po.po_item     = gr.po_item
    WHERE $whereClause
    GROUP BY po.po_number, po.po_item
    ORDER BY po.po_date DESC
    LIMIT $limit OFFSET $offset
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

// ── Stats (always full table, ignoring current filters) ───────────────────────
$statsRow = $pdo->query("
    SELECT
        COUNT(*)                                             AS total,
        SUM(status = 'Open')                                AS open,
        SUM(status = 'Partial')                             AS partial,
        SUM(status = 'Completed')                           AS completed
    FROM Purchase_Order
")->fetch();

echo json_encode([
    'success' => true,
    'data'    => $data,
    'pagination' => [
        'current_page' => $page,
        'total_pages'  => $totalPages,
        'total_rows'   => $totalRows,
        'per_page'     => $limit,
    ],
    'stats' => [
        'total'     => (int)($statsRow['total']     ?? 0),
        'open'      => (int)($statsRow['open']      ?? 0),
        'partial'   => (int)($statsRow['partial']   ?? 0),
        'completed' => (int)($statsRow['completed'] ?? 0),
    ],
]);
?>