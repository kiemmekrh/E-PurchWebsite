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

// Validasi ekstensi file (lebih aman dari MIME type yang bisa di-bypass)
$allowedExts = ['pdf', 'xlsx', 'xls'];
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($fileExt, $allowedExts)) {
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

// ============================================
// PERBAIKAN: Sanitasi nama file + Path URL
// ============================================

// 1. Path fisik untuk menyimpan file di server
$uploadDir = __DIR__ . '/../../../uploads/invoices/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// 2. Sanitasi nama file: hapus karakter berbahaya untuk URL
$originalName = pathinfo($file['name'], PATHINFO_FILENAME);
$safeName = preg_replace('/[#%&*(){}[\]\\\/<>?|"\':;@+=!`~$]/', '_', $originalName);
$safeName = preg_replace('/\s+/', '_', $safeName);
$safeName = preg_replace('/_+/', '_', $safeName);
$safeName = trim($safeName, '_');

// 3. Generate nama file unik
$fileName = uniqid() . '_' . $safeName . '.' . $fileExt;
$uploadPath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
    echo json_encode(['success' => false, 'error' => 'File upload failed']);
    exit;
}

// 4. Simpan URL path (bukan path sistem file!) ke database
//    Ini yang menyebabkan beda Mac vs Windows sebelumnya
$dbPath = 'uploads/invoices/' . $fileName;

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
    $dbPath  // ← sekarang menyimpan 'uploads/invoices/xxx.pdf'
]);

$invoiceId = $pdo->lastInsertId();

// Log activity
$logStmt = $pdo->prepare("INSERT INTO activity_log (user_id, action, details) VALUES (?, 'INVOICE_SUBMIT', ?)");
$logStmt->execute([$_SESSION['user_id'], "Invoice #{$_POST['invoice_number']} submitted"]);

echo json_encode([
    'success' => true,
    'invoice_id' => $invoiceId,
    'message' => 'Invoice submitted successfully'
]);
?>