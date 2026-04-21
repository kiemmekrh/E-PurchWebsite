<?php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

try {
    $status = $_GET['status'] ?? 'all';
    $search = $_GET['search'] ?? '';
    $supplier = $_GET['supplier'] ?? 'all';
    $dateFrom = $_GET['dateFrom'] ?? '';
    $dateTo = $_GET['dateTo'] ??'';

    $sql = "
        SELECT 
            i.invoice_id,
            i.invoice_number,
            i.invoice_date,
            i.amount,
            i.status,
            i.po_number,
            i.file_path,
            i.submitted_at,
            i.validation_notes,
            s.supplier_name,
            u.name as validated_by_name
        FROM Invoice i
        LEFT JOIN Supplier s ON i.supplier_id = s.supplier_id
        LEFT JOIN User u ON i.validated_by = u.user_id
        WHERE 1=1
    ";
    
    $params = [];
    
    if ($status !== 'all') {
        $sql .= " AND i.status = ?";
        $params[] = $status;
    }
    
    if ($search) {
        $sql .= " AND (i.invoice_number LIKE ? OR i.po_number LIKE ? OR s.supplier_name LIKE ?)";
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }
    
    if ($supplier !== 'all') {
        $sql .= " AND i.supplier_id = ?";
        $params[] = $supplier;
    }
    
    if ($dateFrom) {
        $sql .= " AND i.invoice_date >= ?";
        $params[] = $dateFrom;
    }
    
    if ($dateTo) {
        $sql .= " AND i.invoice_date <= ?";
        $params[] = $dateTo;
    }
    
    $sql .= " ORDER BY i.submitted_at DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Load suppliers for filter dropdown
    $suppliers = $pdo->query("SELECT supplier_id, supplier_name FROM Supplier ORDER BY supplier_name")->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true, 
        'data' => $invoices,
        'suppliers' => $suppliers
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>