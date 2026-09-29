<?php
// File: modules/comparison/api/get_group.php
// Kembalikan satu grup comparison + semua baris PR-nya + kandidat plan.
// Kalau tanpa ?id= -> daftar semua grup (untuk listing).
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $groupId = intval($_GET['id'] ?? 0);

    // Mode listing: semua grup + ringkasan.
    if ($groupId <= 0) {
        $sql = "
            SELECT g.group_id, g.title, g.status, g.created_at,
                   u.name AS created_by_name,
                   COUNT(ct.comparison_id) AS pr_count,
                   SUM(ct.awarded_supplier_name IS NOT NULL AND ct.awarded_supplier_name <> '') AS awarded_count
            FROM Comparison_Group g
            LEFT JOIN Comparison_Table ct ON ct.comparison_group_id = g.group_id
            LEFT JOIN User u ON g.created_by = u.user_id
            GROUP BY g.group_id
            ORDER BY g.created_at DESC
        ";
        $groups = $pdo->query($sql)->fetchAll();
        echo json_encode(['success' => true, 'groups' => $groups]);
        exit;
    }

    // Mode detail.
    $g = $pdo->prepare("
        SELECT g.*, u.name AS created_by_name
        FROM Comparison_Group g
        LEFT JOIN User u ON g.created_by = u.user_id
        WHERE g.group_id = ?
    ");
    $g->execute([$groupId]);
    $group = $g->fetch();
    if (!$group) {
        echo json_encode(['success' => false, 'error' => 'Group tidak ditemukan']);
        exit;
    }

    $rowsStmt = $pdo->prepare("
        SELECT ct.*, pr.delivery_date AS pr_delivery_date
        FROM Comparison_Table ct
        LEFT JOIN Purchase_Requisition pr ON ct.pr_id = pr.pr_id
        WHERE ct.comparison_group_id = ?
        ORDER BY ct.comparison_id ASC
    ");
    $rowsStmt->execute([$groupId]);
    $rows = $rowsStmt->fetchAll();

    // Ambil plan candidates untuk semua baris sekaligus.
    $planStmt = $pdo->prepare("
        SELECT * FROM Comparison_Plan_Row
        WHERE comparison_id = ?
        ORDER BY (plan_price_idr > 0) DESC, plan_price_idr ASC, plan_row_id ASC
    ");
    foreach ($rows as &$row) {
        $planStmt->execute([$row['comparison_id']]);
        $row['plans'] = $planStmt->fetchAll();
    }
    unset($row);

    echo json_encode(['success' => true, 'group' => $group, 'rows' => $rows]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
