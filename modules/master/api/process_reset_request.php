<?php
// File: modules/master/api/process_reset_request.php
// Admin mereset password akun terkait sebuah permintaan, lalu menandainya selesai.
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $requestId   = $data['request_id'] ?? null;
    $newPassword = $data['new_password'] ?? '';

    if (empty($requestId)) {
        echo json_encode(['success' => false, 'error' => 'Request ID tidak ada']);
        exit;
    }
    if (strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'error' => 'Password minimal 6 karakter']);
        exit;
    }

    // Ambil permintaan yang masih pending.
    $stmt = $pdo->prepare("SELECT * FROM password_reset_requests WHERE request_id = ? LIMIT 1");
    $stmt->execute([$requestId]);
    $req = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$req) {
        echo json_encode(['success' => false, 'error' => 'Permintaan tidak ditemukan']);
        exit;
    }
    if ($req['status'] !== 'pending') {
        echo json_encode(['success' => false, 'error' => 'Permintaan ini sudah diproses']);
        exit;
    }

    $hashed = password_hash($newPassword, PASSWORD_BCRYPT);

    // Update password di tabel yang sesuai. Cocokkan lewat account_id, fallback ke email.
    if ($req['account_type'] === 'user') {
        if (!empty($req['account_id'])) {
            $upd = $pdo->prepare("UPDATE User SET password = ? WHERE user_id = ?");
            $upd->execute([$hashed, $req['account_id']]);
        } else {
            $upd = $pdo->prepare("UPDATE User SET password = ? WHERE email = ?");
            $upd->execute([$hashed, $req['identifier']]);
        }
    } else { // supplier
        if (!empty($req['account_id'])) {
            $upd = $pdo->prepare("UPDATE Supplier SET password = ? WHERE supplier_id = ?");
            $upd->execute([$hashed, $req['account_id']]);
        } else {
            $upd = $pdo->prepare("UPDATE Supplier SET password = ? WHERE email = ?");
            $upd->execute([$hashed, $req['identifier']]);
        }
    }

    if ($upd->rowCount() === 0) {
        echo json_encode(['success' => false, 'error' => 'Akun tidak ditemukan (mungkin sudah dihapus)']);
        exit;
    }

    // Tandai permintaan selesai.
    $done = $pdo->prepare("
        UPDATE password_reset_requests
        SET status = 'done', handled_by = ?, handled_at = NOW()
        WHERE request_id = ?
    ");
    $done->execute([$_SESSION['user_id'], $requestId]);

    // Catat ke Activity_Log.
    $log = $pdo->prepare("
        INSERT INTO Activity_Log (user_id, action, details, created_at)
        VALUES (?, 'PASSWORD_RESET', ?, NOW())
    ");
    $log->execute([
        $_SESSION['user_id'],
        "Reset password {$req['account_type']} '{$req['identifier']}' (request #{$requestId})"
    ]);

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
