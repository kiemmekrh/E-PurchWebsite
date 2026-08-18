<?php
// File: modules/master/api/get_reset_requests.php
// Daftar permintaan reset password untuk admin (pending diutamakan).
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Pending di atas, lalu yang sudah diproses (histori singkat).
    $stmt = $pdo->query("
        SELECT
            r.request_id,
            r.identifier,
            r.account_type,
            r.account_id,
            r.account_name,
            r.status,
            r.requested_at,
            r.handled_at,
            u.name AS handled_by_name
        FROM password_reset_requests r
        LEFT JOIN User u ON r.handled_by = u.user_id
        ORDER BY (r.status = 'pending') DESC, r.requested_at DESC
        LIMIT 200
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $pendingCount = 0;
    foreach ($rows as $row) {
        if ($row['status'] === 'pending') $pendingCount++;
    }

    echo json_encode([
        'success'       => true,
        'data'          => $rows,
        'pending_count' => $pendingCount,
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
