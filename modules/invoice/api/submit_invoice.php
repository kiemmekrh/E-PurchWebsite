<?php
// File: modules/invoice/api/submit_invoice.php (for suppliers)
session_start();
require_once '../../../auth/check_session.php';
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Validasi session
    $supplierId = $_SESSION['user_id'] ?? null;
    $supplierRole = $_SESSION['role'] ?? null;
    
    if ($supplierRole !== 'supplier' || empty($supplierId)) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized: Please login as supplier']);
        exit;
    }

    error_log("Invoice submit - Supplier ID: {$supplierId}, Name: " . ($_SESSION['name'] ?? 'unknown'));

    // Validasi file upload
    if (!isset($_FILES['invoice_file']) || $_FILES['invoice_file']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['invoice_file']['error'] ?? 'not set';
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File too large (exceeds server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large (exceeds form limit)',
            UPLOAD_ERR_PARTIAL => 'File upload was interrupted',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'No temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
        ];
        $errorMsg = $errorMessages[$errorCode] ?? 'File upload error: ' . $errorCode;
        echo json_encode(['success' => false, 'error' => $errorMsg]);
        exit;
    }

    $file = $_FILES['invoice_file'];

    // Validasi ekstensi file
    $allowedExts = ['pdf', 'xlsx', 'xls'];
    $fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if (!in_array($fileExt, $allowedExts)) {
        echo json_encode(['success' => false, 'error' => 'Invalid file type. Only PDF and Excel allowed.']);
        exit;
    }

    // Validasi required fields
    $invoiceNumber = trim($_POST['invoice_number'] ?? '');
    $poNumber = trim($_POST['po_number'] ?? '');
    $invoiceDate = $_POST['invoice_date'] ?? '';
    $amount = $_POST['amount'] ?? '';

    if (empty($invoiceNumber) || empty($poNumber) || empty($invoiceDate) || empty($amount)) {
        echo json_encode(['success' => false, 'error' => 'All required fields must be filled']);
        exit;
    }

    // Verify PO exists (optional - skip kalau table kosong)
    try {
        $poStmt = $pdo->prepare("SELECT po_number FROM Purchase_Order WHERE po_number = ? LIMIT 1");
        $poStmt->execute([$poNumber]);
        if (!$poStmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'PO Number not found in system']);
            exit;
        }
    } catch (PDOException $e) {
        error_log("PO validation skipped: " . $e->getMessage());
    }

    // Check for duplicate invoice (hanya untuk supplier ini)
    $dupStmt = $pdo->prepare("SELECT COUNT(*) FROM Invoice WHERE invoice_number = ? AND supplier_id = ?");
    $dupStmt->execute([$invoiceNumber, $supplierId]);
    if ($dupStmt->fetchColumn() > 0) {
        echo json_encode(['success' => false, 'error' => 'Invoice number already exists for your company']);
        exit;
    }

    // ============================================
    // FILE UPLOAD
    // ============================================
    
    $uploadDir = __DIR__ . '/../../../uploads/invoices/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            echo json_encode(['success' => false, 'error' => 'Failed to create upload directory']);
            exit;
        }
    }

    // Sanitasi nama file
    $originalName = pathinfo($file['name'], PATHINFO_FILENAME);
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $originalName);
    $safeName = preg_replace('/_+/', '_', $safeName);
    $safeName = trim($safeName, '_');
    if (empty($safeName)) $safeName = 'invoice';

    $fileName = uniqid() . '_' . $safeName . '.' . $fileExt;
    $uploadPath = $uploadDir . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        echo json_encode(['success' => false, 'error' => 'Failed to move uploaded file']);
        exit;
    }

    $dbPath = 'uploads/invoices/' . $fileName;

    // Insert invoice record dengan supplier_id yang benar
    $stmt = $pdo->prepare("
        INSERT INTO Invoice 
        (invoice_number, invoice_date, amount, supplier_id, po_number, file_path, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending', NOW())
    ");

    $stmt->execute([
        $invoiceNumber,
        $invoiceDate,
        $amount,
        $supplierId,  // ← Pastikan ini dari session, bukan POST
        $poNumber,
        $dbPath
    ]);

    $invoiceId = $pdo->lastInsertId();

    // Log activity
    try {
        $logStmt = $pdo->prepare("INSERT INTO Activity_Log (user_id, action, details, created_at) VALUES (?, 'INVOICE_SUBMIT', ?, NOW())");
        $logStmt->execute([$supplierId, "Invoice #{$invoiceNumber} submitted by supplier #{$supplierId}"]);
    } catch (PDOException $e) {
        error_log("Activity log failed: " . $e->getMessage());
    }

    echo json_encode([
        'success' => true,
        'invoice_id' => $invoiceId,
        'supplier_id' => $supplierId, // untuk debug
        'message' => 'Invoice submitted successfully'
    ]);

} catch (Exception $e) {
    error_log("Invoice submit error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>