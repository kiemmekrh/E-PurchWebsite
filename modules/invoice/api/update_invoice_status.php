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

$validatedBy = $_SESSION['user_id'];
$validatedAt = date('Y-m-d H:i:s'); // Current timestamp

$stmt = $pdo->prepare("
    UPDATE invoice 
    SET status = ?, validated_by = ?, validation_notes = ?, validated_at = ? 
    WHERE invoice_id = ?
");
$stmt->execute([$status, $validatedBy, $notes, $validatedAt, $invoiceId]);

// Get validated_by name for response
$userStmt = $pdo->prepare("SELECT name FROM user WHERE user_id = ?");
$userStmt->execute([$validatedBy]);
$user = $userStmt->fetch(PDO::FETCH_ASSOC);
$validatedByName = $user ? $user['name'] : 'Staff';

// Log
$logStmt = $pdo->prepare("INSERT INTO activity_log (user_id, action, details) VALUES (?, 'INVOICE_VALIDATE', ?)");
$logStmt->execute([$validatedBy, "Invoice #{$invoiceId} {$status}"]);

echo json_encode([
    'success' => true,
    'message' => "Invoice {$status} successfully",
    'validated_at' => $validatedAt,
    'validated_by_name' => $validatedByName,
    'status' => $status,
    'validation_notes' => $notes
]);