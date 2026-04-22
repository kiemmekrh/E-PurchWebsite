<?php
session_start();

require_once __DIR__ . '/../../../config/database.php';
require_once __DIR__ . '/../../../auth/check_session.php';

checkAuth(['purchasing_staff', 'admin', 'manager']);

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['id'])) {
    echo json_encode(['success' => false, 'error' => 'No ID']);
    exit;
}

$id = intval($data['id']);

try {
    // START TRANSACTION (PDO version)
    $pdo->beginTransaction();

    // OPTIONAL: kalau ada tabel detail
    $stmt1 = $pdo->prepare("DELETE FROM Comparison_Detail WHERE comparison_id = ?");
    $stmt1->execute([$id]);

    // DELETE MAIN
    $stmt2 = $pdo->prepare("DELETE FROM Comparison_Table WHERE comparison_id = ?");
    $stmt2->execute([$id]);

    $pdo->commit();

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}