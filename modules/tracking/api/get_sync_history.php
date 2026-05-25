<?php
// File: modules/tracking/api/get_sync_history.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $stmt = $pdo->prepare("
        SELECT
            al.log_id,
            al.created_at,
            al.details,
            u.name AS user_name
        FROM Activity_Log al
        LEFT JOIN User u ON al.user_id = u.user_id
        WHERE al.action = 'ZMM039_UPLOAD'
        ORDER BY al.created_at DESC
        LIMIT 50
    ");
    $stmt->execute();
    $logs = $stmt->fetchAll();

    // Parse JSON details to extract filename and records_processed
    foreach ($logs as &$log) {
        $details = json_decode($log['details'], true);
        if ($details) {
            $log['filename']          = $details['filename']    ?? '-';
            $log['records_processed'] = $details['processed']   ?? '-';
            $log['gr_inserted']       = $details['gr_inserted'] ?? '-';
            $log['gr_skipped']        = $details['gr_skipped']  ?? '-';
        } else {
            // Fallback for old plain-text log format
            $log['filename']          = '-';
            $log['records_processed'] = $log['details'];
            $log['gr_inserted']       = '-';
            $log['gr_skipped']        = '-';
        }
        unset($log['details']);
    }

    echo json_encode([
        'success' => true,
        'data'    => $logs,
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>