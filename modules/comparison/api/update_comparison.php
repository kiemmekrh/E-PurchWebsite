<?php
// File: modules/comparison/api/update_comparison.php
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'admin', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

function toDate($value) {
    return (empty($value) || $value === '0000-00-00') ? null : $value;
}

function toNumber($value) {
    if (empty($value) || $value === '') return 0;
    $clean = str_replace('.', '', $value);
    $clean = str_replace(',', '.', $clean);
    return floatval($clean);
}

function clampGapPercent($value) {
    if (empty($value) || $value === '') return 0;
    $num = floatval($value);
    return max(-999.99, min(999.99, $num));
}

// Cek status saat ini dari database
$currentStatus = 'draft';
if (isset($data['comparison_id'])) {
    $checkStmt = $pdo->prepare("SELECT status FROM Comparison_Table WHERE comparison_id = ?");
    $checkStmt->execute([$data['comparison_id']]);
    $currentStatus = $checkStmt->fetchColumn() ?: 'draft';
}

$status = $data['status'] ?? $currentStatus;

try {
    $pdo->beginTransaction();

    // 1. UPDATE Comparison_Table (parent only - tanpa plan fields)
    $stmt = $pdo->prepare("
        UPDATE Comparison_Table SET
            pr_number = :pr_number,
            material_code = :material_code,
            material_group = :material_group,
            description = :description,
            uom = :uom,
            qty_pr = :qty_pr,
            
            last_qty = :last_qty,
            last_po_number = :last_po_number,
            last_po_date = :last_po_date,
            last_currency = :last_currency,
            last_price_foreign = :last_price_foreign,
            last_kurs_date = :last_kurs_date,
            last_kurs_idr = :last_kurs_idr,
            last_price_idr = :last_price_idr,
            last_price_tiba_nu = :last_price_tiba_nu,
            last_amount = :last_amount,
            last_supplier_id = :last_supplier_id,
            last_supplier_name = :last_supplier_name,
            
            awarded_po_date = :awarded_po_date,
            awarded_deliv_date = :awarded_deliv_date,
            awarded_po_number = :awarded_po_number,
            awarded_supplier_id = :awarded_supplier_id,
            awarded_supplier_name = :awarded_supplier_name,
            awarded_amount = :awarded_amount,
            awarded_keterangan = :awarded_keterangan,
            
            status = :status,
            updated_at = NOW()
        WHERE comparison_id = :comparison_id
    ");

    $stmt->execute([
        ':comparison_id' => $data['comparison_id'],
        ':pr_number' => $data['pr_number'] ?? '',
        ':material_code' => $data['material_code'] ?? '',
        ':material_group' => $data['material_group'] ?? $data['description'] ?? '',
        ':description' => $data['description'] ?? '',
        ':uom' => $data['uom'] ?? 'KG',
        ':qty_pr' => toNumber($data['qty_pr'] ?? 0),
        
        ':last_qty' => toNumber($data['last_qty'] ?? 0),
        ':last_po_number' => $data['last_po_number'] ?? '',
        ':last_po_date' => toDate($data['last_po_date'] ?? null),
        ':last_currency' => $data['last_currency'] ?? null,
        ':last_price_foreign' => toNumber($data['last_price_foreign'] ?? 0),
        ':last_kurs_date' => toDate($data['last_kurs_date'] ?? null),
        ':last_kurs_idr' => toNumber($data['last_kurs_idr'] ?? 0),
        ':last_price_idr' => toNumber($data['last_price_idr'] ?? 0),
        ':last_price_tiba_nu' => toNumber($data['last_price_tiba_nu'] ?? 0),
        ':last_amount' => toNumber($data['last_amount'] ?? 0),
        ':last_supplier_id' => null,
        ':last_supplier_name' => $data['last_supplier'] ?? '',
        
        ':awarded_po_date' => toDate($data['awarded_po_date'] ?? null),
        ':awarded_deliv_date' => toDate($data['awarded_deliv_date'] ?? null),
        ':awarded_po_number' => $data['awarded_po_number'] ?? '',
        ':awarded_supplier_id' => null,
        ':awarded_supplier_name' => $data['awarded_supplier'] ?? '',
        ':awarded_amount' => toNumber($data['awarded_amount'] ?? 0),
        ':awarded_keterangan' => $data['awarded_keterangan'] ?? '',
        
        ':status' => $status
    ]);

    // 2. DELETE old plan rows
    $pdo->prepare("DELETE FROM Comparison_Plan_Row WHERE comparison_id = ?")
        ->execute([$data['comparison_id']]);

    // 3. INSERT new plan rows
    if (!empty($data['plan_rows']) && is_array($data['plan_rows'])) {
        $planStmt = $pdo->prepare("
            INSERT INTO Comparison_Plan_Row (
                comparison_id, plan_qty, plan_currency, plan_price_foreign,
                plan_kurs_date, plan_kurs_idr, plan_price_idr, plan_price_tiba_nu,
                plan_amount, plan_supplier_id, plan_supplier_name,
                gap_price, gap_percent, is_awarded
            ) VALUES (
                :comparison_id, :plan_qty, :plan_currency, :plan_price_foreign,
                :plan_kurs_date, :plan_kurs_idr, :plan_price_idr, :plan_price_tiba_nu,
                :plan_amount, :plan_supplier_id, :plan_supplier_name,
                :gap_price, :gap_percent, :is_awarded
            )
        ");

        $awardedPlanRow = intval($data['awarded_plan_row'] ?? 0);

        foreach ($data['plan_rows'] as $index => $row) {
            $rowNum = $index + 1;
            $isAwarded = ($rowNum === $awardedPlanRow) ? 1 : 0;

            $planStmt->execute([
                ':comparison_id' => $data['comparison_id'],
                ':plan_qty' => toNumber($row['plan_qty'] ?? 0),
                ':plan_currency' => $row['plan_currency'] ?? null,
                ':plan_price_foreign' => toNumber($row['plan_price_foreign'] ?? 0),
                ':plan_kurs_date' => toDate($row['plan_kurs_date'] ?? null),
                ':plan_kurs_idr' => toNumber($row['plan_kurs_idr'] ?? 0),
                ':plan_price_idr' => toNumber($row['plan_price_idr'] ?? 0),
                ':plan_price_tiba_nu' => toNumber($row['plan_price_tiba_nu'] ?? 0),
                ':plan_amount' => toNumber($row['plan_amount'] ?? 0),
                ':plan_supplier_id' => null,
                ':plan_supplier_name' => $row['plan_supplier'] ?? '',
                ':gap_price' => toNumber($row['gap_price'] ?? 0),
                ':gap_percent' => clampGapPercent($row['gap_percent'] ?? 0),
                ':is_awarded' => $isAwarded
            ]);
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'status' => $status,
        'message' => 'Updated successfully'
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>