<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$invoiceId = isset($_GET['id']) ? intval($_GET['id']) : 0;

if (!$invoiceId) {
    echo json_encode(['success' => false, 'error' => 'Invalid invoice ID']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            i.invoice_id,
            i.invoice_number,
            i.invoice_date,
            i.amount,
            i.po_number,
            i.file_path,
            i.status,
            i.validation_notes,
            i.supplier_id,
            s.supplier_name
        FROM invoice i
        LEFT JOIN supplier s ON i.supplier_id = s.supplier_id
        WHERE i.invoice_id = ?
    ");
    
    $stmt->execute([$invoiceId]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$invoice) {
        echo json_encode(['success' => false, 'error' => 'Invoice not found']);
        exit;
    }
    
    echo json_encode(['success' => true, 'data' => $invoice]);
    
} catch (PDOException $e) {
    error_log("Invoice detail error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error']);
}
?>