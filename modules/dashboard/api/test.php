<?php
// Standalone test file - place in modules/dashboard/api/test.php
// Access via browser: http://your-site/e-purch/modules/dashboard/api/test.php

session_start();
header('Content-Type: application/json');
require_once '../../../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Test 1: Count all invoices
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM invoice");
    $total = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Test 2: Get status breakdown
    $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM invoice GROUP BY status");
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Test 3: Check supplier table
    $stmt = $pdo->query("SELECT supplier_id, supplier_name FROM supplier LIMIT 5");
    $suppliers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Test 4: Try JOIN query
    $stmt = $pdo->query("
        SELECT s.supplier_name, SUM(i.amount) as total_amount
        FROM invoice i
        JOIN supplier s ON i.supplier_id = s.supplier_id
        GROUP BY s.supplier_id, s.supplier_name
    ");
    $amounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'total_invoices' => $total,
        'status_breakdown' => $statuses,
        'suppliers' => $suppliers,
        'amount_by_supplier' => $amounts
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}