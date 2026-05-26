<?php
// File: modules/comparison/api/save_comparison.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

// ============================================
// AUTO STATUS PROMOTION - DRAFT TO FINAL
// ============================================

/**
 * Cek apakah semua required fields sudah terisi
 * untuk auto-promote dari DRAFT ke FINAL
 */
function isAllFieldsFilled($data) {
    $required = [
        'pr_number', 'material_code', 'description', 'uom', 'qty_pr',
        'plan_qty', 'plan_price_idr', 'plan_price_tiba_nu', 'plan_amount', 'plan_supplier',
        'awarded_po_date', 'awarded_deliv_date', 'awarded_po_number', 'awarded_supplier', 'awarded_amount'
    ];
    
    foreach ($required as $field) {
        $value = $data[$field] ?? null;
        if (empty($value) || $value === '' || $value === '0' || $value === '0,00') {
            return false;
        }
    }
    return true;
}

// Ambil status dari request, default 'draft'
$status = $data['status'] ?? 'draft';
$autoPromoted = false;

// Auto-promote: jika status draft tapi semua field terisi, jadikan final
if ($status === 'draft' && isAllFieldsFilled($data)) {
    $status = 'final';
    $autoPromoted = true;
}

// ============================================
// END AUTO STATUS PROMOTION
// ============================================

function toDate($value) {
    if (empty($value) || $value === '' || $value === '0000-00-00') {
        return null;
    }
    return $value;
}

function toNumber($value) {
    if (empty($value) || $value === '') {
        return 0;
    }
    return floatval($value);
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO Comparison_Table (
            comparison_date, created_by, pr_number, material_code, material_group, 
            description, uom, qty_pr, plan_quantity,
            last_qty, last_po_number, last_po_date, last_price_foreign, 
            last_kurs_date, last_kurs_idr, last_price_idr, last_price_tiba_nu, 
            last_amount, last_supplier_id, last_supplier_name,
            plan_qty, plan_price_foreign, plan_kurs_date, plan_kurs_idr,
            plan_price_idr, plan_price_tiba_nu, plan_amount, plan_supplier_id, plan_supplier_name,
            gap_price, gap_percent,
            awarded_po_date, awarded_deliv_date, awarded_po_number,
            awarded_supplier_id, awarded_supplier_name,
            awarded_amount, awarded_keterangan,
            status
        ) VALUES (
            CURDATE(), :created_by, :pr_number, :material_code, :material_group, 
            :description, :uom, :qty_pr, :plan_quantity,
            :last_qty, :last_po_number, :last_po_date, :last_price_foreign, 
            :last_kurs_date, :last_kurs_idr, :last_price_idr, :last_price_tiba_nu, 
            :last_amount, :last_supplier_id, :last_supplier_name,
            :plan_qty, :plan_price_foreign, :plan_kurs_date, :plan_kurs_idr,
            :plan_price_idr, :plan_price_tiba_nu, :plan_amount, :plan_supplier_id, :plan_supplier_name,
            :gap_price, :gap_percent,
            :awarded_po_date, :awarded_deliv_date, :awarded_po_number,
            :awarded_supplier_id, :awarded_supplier_name,
            :awarded_amount, :awarded_keterangan,
            :status
        )
    ");

    $stmt->execute([
        ':created_by' => $_SESSION['user_id'],
        ':pr_number' => $data['pr_number'] ?? '',
        ':material_code' => $data['material_code'] ?? '',
        ':material_group' => $data['material_group'] ?? $data['description'] ?? '',
        ':description' => $data['description'] ?? '',
        ':uom' => $data['uom'] ?? 'KG',
        ':qty_pr' => toNumber($data['qty_pr'] ?? 0),
        ':plan_quantity' => toNumber($data['plan_qty'] ?? 0),
        
        ':last_qty' => toNumber($data['last_qty'] ?? 0),
        ':last_po_number' => $data['last_po_number'] ?? '',
        ':last_po_date' => toDate($data['last_po_date'] ?? null),
        ':last_price_foreign' => toNumber($data['last_price_foreign'] ?? 0),
        ':last_kurs_date' => toDate($data['last_kurs_date'] ?? null),
        ':last_kurs_idr' => toNumber($data['last_kurs_idr'] ?? 0),
        ':last_price_idr' => toNumber($data['last_price_idr'] ?? 0),
        ':last_price_tiba_nu' => toNumber($data['last_price_tiba_nu'] ?? 0),
        ':last_amount' => toNumber($data['last_amount'] ?? 0),
        ':last_supplier_id' => null,
        ':last_supplier_name' => $data['last_supplier'] ?? '',
        
        ':plan_qty' => toNumber($data['plan_qty'] ?? 0),
        ':plan_price_foreign' => toNumber($data['plan_price_foreign'] ?? 0),
        ':plan_kurs_date' => toDate($data['plan_kurs_date'] ?? null),
        ':plan_kurs_idr' => toNumber($data['plan_kurs_idr'] ?? 0),
        ':plan_price_idr' => toNumber($data['plan_price_idr'] ?? 0),
        ':plan_price_tiba_nu' => toNumber($data['plan_price_tiba_nu'] ?? 0),
        ':plan_amount' => toNumber($data['plan_amount'] ?? 0),
        ':plan_supplier_id' => null,
        ':plan_supplier_name' => $data['plan_supplier'] ?? '',
        
        ':gap_price' => toNumber($data['gap_price'] ?? 0),
        ':gap_percent' => toNumber($data['gap_percent'] ?? 0),
        
        ':awarded_po_date' => toDate($data['awarded_po_date'] ?? null),
        ':awarded_deliv_date' => toDate($data['awarded_deliv_date'] ?? null),
        ':awarded_po_number' => $data['awarded_po_number'] ?? '',
        ':awarded_supplier_id' => null,
        ':awarded_supplier_name' => $data['awarded_supplier'] ?? '',
        ':awarded_amount' => toNumber($data['awarded_amount'] ?? 0),
        ':awarded_keterangan' => $data['awarded_keterangan'] ?? '',
        
        ':status' => $status  // <-- Sudah di-update dengan auto-promote
    ]);

    $comparisonId = $pdo->lastInsertId();
    $pdo->commit();

    // Response dengan info auto-promote
    $response = [
        'success' => true,
        'comparison_id' => $comparisonId,
        'status' => $status,
        'message' => 'Comparison saved successfully'
    ];

    if ($autoPromoted) {
        $response['message'] = 'Auto-promoted to FINAL status! All required fields were filled.';
        $response['auto_promoted'] = true;
    }

    echo json_encode($response);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>