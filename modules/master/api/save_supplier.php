<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

try {
    $supplierId = $data['supplier_id'] ?? null;
    $name = trim($data['supplier_name'] ?? '');
    $email = trim($data['email'] ?? '');
    $contact = trim($data['contact_info'] ?? '');
    $status = $data['status'] ?? 'active';
    $password = $data['password'] ?? '';

    if (empty($name) || empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Supplier name and email are required']);
        exit;
    }

    if ($supplierId) {
        // UPDATE
        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE Supplier SET supplier_name=?, email=?, contact_info=?, status=?, password=?, updated_at=NOW() WHERE supplier_id=?");
            $stmt->execute([$name, $email, $contact, $status, $hashedPassword, $supplierId]);
        } else {
            $stmt = $pdo->prepare("UPDATE Supplier SET supplier_name=?, email=?, contact_info=?, status=?, updated_at=NOW() WHERE supplier_id=?");
            $stmt->execute([$name, $email, $contact, $status, $supplierId]);
        }
    } else {
        // INSERT
        if (empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Password is required for new suppliers']);
            exit;
        }
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("INSERT INTO Supplier (supplier_name, email, password, contact_info, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([$name, $email, $hashedPassword, $contact, $status]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>