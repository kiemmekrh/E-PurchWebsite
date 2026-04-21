<?php
// File: modules/dashboard/api/upload_zmm039.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

if (!isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];

if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Please upload Excel file (.xlsx or .xls)']);
    exit;
}

require_once '../../../vendor/autoload.php'; // PhpSpreadsheet

try {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($file['tmp_name']);
    $spreadsheet = $reader->load($file['tmp_name']);
    $worksheet = $spreadsheet->getActiveSheet();
    $rows = $worksheet->toArray();
    
    // Validate headers
    $headers = array_map('strtolower', array_map('trim', $rows[0]));
    $required = ['po number', 'po item', 'po date', 'ordered quantity', 'gr number', 'gr date', 'gr quantity'];
    
    foreach ($required as $req) {
        if (!in_array($req, $headers)) {
            echo json_encode(['success' => false, 'error' => "Missing required column: $req"]);
            exit;
        }
    }
    
    $pdo->beginTransaction();
    
    $processed = 0;
    $errors = [];
    
    for ($i = 1; $i < count($rows); $i++) {
        $row = $rows[$i];
        if (empty(array_filter($row))) continue; // Skip empty rows
        
        $data = array_combine($headers, $row);
        
        // Insert/Update Purchase Order
        $poStmt = $pdo->prepare("
            INSERT INTO Purchase_Order (po_number, po_item, po_date, ordered_quantity, status, material_group, description)
            VALUES (?, ?, ?, ?, 'Open', ?, ?)
            ON DUPLICATE KEY UPDATE
            ordered_quantity = VALUES(ordered_quantity),
            material_group = VALUES(material_group),
            description = VALUES(description)
        ");
        
        $poStmt->execute([
            $data['po number'],
            $data['po item'],
            date('Y-m-d', strtotime($data['po date'])),
            $data['ordered quantity'],
            $data['material group'] ?? '',
            $data['description'] ?? ''
        ]);
        
        // Insert Goods Receipt (check for duplicates)
        if (!empty($data['gr number'])) {
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM Goods_Receipt WHERE gr_number = ?");
            $checkStmt->execute([$data['gr number']]);
            
            if ($checkStmt->fetchColumn() == 0) {
                $grStmt = $pdo->prepare("
                    INSERT INTO Goods_Receipt (gr_number, gr_date, gr_quantity, po_number, po_item)
                    VALUES (?, ?, ?, ?, ?)
                ");
                
                $grStmt->execute([
                    $data['gr number'],
                    date('Y-m-d', strtotime($data['gr date'])),
                    $data['gr quantity'],
                    $data['po number'],
                    $data['po item']
                ]);
            }
        }
        
        $processed++;
        
        // Update PO status based on GR quantities
        $statusStmt = $pdo->prepare("
            UPDATE Purchase_Order po
            SET status = CASE
                WHEN (SELECT COALESCE(SUM(gr_quantity), 0) FROM Goods_Receipt WHERE po_number = po.po_number AND po_item = po.po_item) >= po.ordered_quantity THEN 'Completed'
                WHEN (SELECT COALESCE(SUM(gr_quantity), 0) FROM Goods_Receipt WHERE po_number = po.po_number AND po_item = po.po_item) > 0 THEN 'Partial'
                ELSE 'Open'
            END
            WHERE po_number = ? AND po_item = ?
        ");
        $statusStmt->execute([$data['po number'], $data['po item']]);
    }
    
    $pdo->commit();
    
    // Log activity
    $logStmt = $pdo->prepare("INSERT INTO Activity_Log (user_id, action, details, created_at) VALUES (?, 'ZMM039_UPLOAD', ?, NOW())");
    $logStmt->execute([$_SESSION['user_id'], "Processed $processed records from {$file['name']}"]);
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully processed $processed records",
        'processed' => $processed,
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>