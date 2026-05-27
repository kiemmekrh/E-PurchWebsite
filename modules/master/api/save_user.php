<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $userId = $data['user_id'] ?? null;
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $role = $data['role'] ?? 'purchasing_staff';
    $status = $data['status'] ?? 'active';
    $password = $data['password'] ?? '';

    if (empty($name) || empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Name and email are required']);
        exit;
    }

    if ($userId) {
        // UPDATE
        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE User SET name=?, email=?, role=?, status=?, password=?, updated_at=NOW() WHERE user_id=?");
            $stmt->execute([$name, $email, $role, $status, $hashedPassword, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE User SET name=?, email=?, role=?, status=?, updated_at=NOW() WHERE user_id=?");
            $stmt->execute([$name, $email, $role, $status, $userId]);
        }
    } else {
        // INSERT
        if (empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Password is required for new users']);
            exit;
        }
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO User (name, email, password, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$name, $email, $hashedPassword, $role, $status]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>