<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$invoiceId = $data['invoice_id'] ?? 0;
$status = $data['status'] ?? '';
$notes = $data['notes'] ?? '';

if (!$invoiceId || !in_array($status, ['Approved', 'Rejected'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid request']);
    exit;
}

$stmt = $pdo->prepare("
    UPDATE Invoice 
    SET status = ?, validated_by = ?, validation_notes = ?, validated_at = NOW() 
    WHERE invoice_id = ?
");
$stmt->execute([$status, $_SESSION['user_id'], $notes, $invoiceId]);

// Log
$logStmt = $pdo->prepare("INSERT INTO Activity_Log (user_id, action, details) VALUES (?, 'INVOICE_VALIDATE', ?)");
$logStmt->execute([$_SESSION['user_id'], "Invoice #{$invoiceId} {$status}"]);

echo json_encode(['success' => true]);
?>