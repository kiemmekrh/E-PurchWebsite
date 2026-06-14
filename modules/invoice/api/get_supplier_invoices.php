<?php
// File: modules/invoice/api/get_supplier_invoices.php
session_start();
require_once '../../../auth/check_session.php';
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    // Pastikan supplier_id dari session benar
    $supplierId = $_SESSION['user_id'] ?? null;
    $supplierRole = $_SESSION['role'] ?? null;
    
    // Debug log (hapus setelah fix)
    error_log("get_supplier_invoices.php - user_id: {$supplierId}, role: {$supplierRole}");
    
    // Validasi: hanya supplier boleh akses
    if ($supplierRole !== 'supplier' || empty($supplierId)) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized access']);
        exit;
    }

    // Query invoice milik supplier yang login + JOIN dengan user untuk validated_by_name
    $stmt = $pdo->prepare("
        SELECT 
            i.invoice_id,
            i.invoice_number,
            i.po_number,
            DATE_FORMAT(i.invoice_date, '%Y-%m-%d') as invoice_date,
            i.amount,
            i.status,
            i.validation_notes,
            i.validated_at,
            i.validated_by,
            u.name as validated_by_name,
            DATE_FORMAT(i.submitted_at, '%Y-%m-%d %H:%i') as submitted_at
        FROM invoice i
        LEFT JOIN user u ON i.validated_by = u.user_id
        WHERE i.supplier_id = ? 
        ORDER BY i.submitted_at DESC
        LIMIT 50
    ");
    $stmt->execute([$supplierId]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Debug log
    error_log("Found " . count($invoices) . " invoices for supplier {$supplierId}");
    
    echo json_encode([
        'success' => true, 
        'data' => $invoices,
        'supplier_id' => $supplierId,
        'count' => count($invoices)
    ]);
    
} catch (PDOException $e) {
    error_log("Get supplier invoices error: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Database error']);
}