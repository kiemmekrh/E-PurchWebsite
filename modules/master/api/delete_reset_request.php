<?php
// File: modules/master/api/delete_reset_request.php
// Hapus histori permintaan reset password yang sudah selesai (status = done).
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $requestId = $data['request_id'] ?? null;

    if (empty($requestId)) {
        echo json_encode(['success' => false, 'error' => 'Request ID tidak ada']);
        exit;
    }

    // Hanya boleh menghapus permintaan yang sudah 'done' — cegah pending terhapus.
    $stmt = $pdo->prepare("DELETE FROM password_reset_requests WHERE request_id = ? AND status = 'done'");
    $stmt->execute([$requestId]);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['success' => false, 'error' => 'Hanya permintaan berstatus Done yang bisa dihapus']);
        exit;
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
