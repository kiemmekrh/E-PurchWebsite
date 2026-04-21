<?php
// File: modules/invoice/api/submit_invoice.php (for suppliers)
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['supplier']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

if (!isset($_FILES['invoice_file'])) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['invoice_file'];
$allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF and Excel allowed.']);
    exit;
}

// Verify PO exists
$poStmt = $pdo->prepare("SELECT * FROM Purchase_Order WHERE po_number = ?");
$poStmt->execute([$_POST['po_number'] ?? '']);
if (!$poStmt->fetch()) {
    echo json_encode(['success' => false, 'error' => 'PO Number not found in system']);
    exit;
}

// Check for duplicate invoice
$dupStmt = $pdo->prepare("SELECT COUNT(*) FROM Invoice WHERE invoice_number = ? AND supplier_id = ?");
$dupStmt->execute([$_POST['invoice_number'], $_SESSION['user_id']]);
if ($dupStmt->fetchColumn() > 0) {
    echo json_encode(['success' => false, 'error' => 'Invoice number already exists for your company']);
    exit;
}

// Upload file
$uploadDir = '../../../uploads/invoices/';
if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

$fileName = uniqid() . '_' . basename($file['name']);
$uploadPath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
    echo json_encode(['success' => false, 'error' => 'File upload failed']);
    exit;
}

// Insert invoice record
$stmt = $pdo->prepare("
    INSERT INTO Invoice 
    (invoice_number, invoice_date, amount, supplier_id, po_number, file_path, status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())
");

$stmt->execute([
    $_POST['invoice_number'],
    $_POST['invoice_date'],
    $_POST['amount'],
    $_SESSION['user_id'],
    $_POST['po_number'],
    $uploadPath
]);

$invoiceId = $pdo->lastInsertId();

// Log activity
$logStmt = $pdo->prepare("INSERT INTO Activity_Log (user_id, action, details) VALUES (?, 'INVOICE_SUBMIT', ?)");
$logStmt->execute([$_SESSION['user_id'], "Invoice #{$_POST['invoice_number']} submitted"]);

// TODO: Send email notification to purchasing staff

echo json_encode([
    'success' => true,
    'invoice_id' => $invoiceId,
    'message' => 'Invoice submitted successfully'
]);
?>