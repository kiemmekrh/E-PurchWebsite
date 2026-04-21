<?php
// File: modules/dashboard/api/get_po_data.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
$search = isset($_GET['search']) ? $_GET['search'] : '';
$status = isset($_GET['status']) ? $_GET['status'] : 'all';
$dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : '';
$dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : '';

$offset = ($page - 1) * $limit;

// Build query
$where = ["1=1"];
$params = [];

if ($search) {
    $where[] = "(po.po_number LIKE ? OR po.description LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}

if ($status !== 'all') {
    $where[] = "po.status = ?";
    $params[] = $status;
}

if ($dateFrom) {
    $where[] = "po.po_date >= ?";
    $params[] = $dateFrom;
}

if ($dateTo) {
    $where[] = "po.po_date <= ?";
    $params[] = $dateTo;
}

$whereClause = implode(' AND ', $where);

// Get total count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM Purchase_Order po WHERE $whereClause");
$countStmt->execute($params);
$totalRows = $countStmt->fetchColumn();
$totalPages = ceil($totalRows / $limit);

// Get data
$sql = "SELECT po.*, 
        COALESCE(SUM(gr.gr_quantity), 0) as received_qty,
        GROUP_CONCAT(DISTINCT gr.gr_number ORDER BY gr.gr_date SEPARATOR ', ') as gr_numbers,
        MAX(gr.gr_date) as last_gr_date
        FROM Purchase_Order po
        LEFT JOIN Goods_Receipt gr ON po.po_number = gr.po_number AND po.po_item = gr.po_item
        WHERE $whereClause
        GROUP BY po.po_number, po.po_item
        ORDER BY po.po_date DESC
        LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = $stmt->fetchAll();

// Calculate status based on quantities
foreach ($data as &$row) {
    $ordered = floatval($row['ordered_quantity']);
    $received = floatval($row['received_qty']);
    
    if ($received == 0) {
        $row['calculated_status'] = 'Open';
    } elseif ($received >= $ordered) {
        $row['calculated_status'] = 'Completed';
    } else {
        $row['calculated_status'] = 'Partial';
    }
    
    // Update status in database if changed
    if ($row['calculated_status'] !== $row['status']) {
        $updateStmt = $pdo->prepare("UPDATE Purchase_Order SET status = ? WHERE po_number = ? AND po_item = ?");
        $updateStmt->execute([$row['calculated_status'], $row['po_number'], $row['po_item']]);
        $row['status'] = $row['calculated_status'];
    }
}

echo json_encode([
    'success' => true,
    'data' => $data,
    'pagination' => [
        'current_page' => $page,
        'total_pages' => $totalPages,
        'total_rows' => $totalRows,
        'per_page' => $limit
    ],
    'stats' => [
        'total' => $pdo->query("SELECT COUNT(*) FROM Purchase_Order")->fetchColumn(),
        'open' => $pdo->query("SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Open'")->fetchColumn(),
        'partial' => $pdo->query("SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Partial'")->fetchColumn(),
        'completed' => $pdo->query("SELECT COUNT(*) FROM Purchase_Order WHERE status = 'Completed'")->fetchColumn()
    ]
]);
?>