<?php
// File: modules/comparison/api/confirm_award.php
// STAGE 2: Staff review & CONFIRM (award). Untuk tiap baris PR di grup,
// tetapkan supplier terpilih (default = rekomendasi termurah). Menandai
// plan row is_awarded, mengisi awarded_* di Comparison_Table, set PR
// status='awarded', dan grup status='final'.
//
// Body JSON:
// { group_id, awards: [ { comparison_id, supplier_name, awarded_po_date?,
//   awarded_deliv_date?, awarded_po_number?, keterangan? } ], finalize: bool }
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$input    = json_decode(file_get_contents('php://input'), true) ?: [];
$groupId  = intval($input['group_id'] ?? 0);
$awards   = $input['awards'] ?? [];
$finalize = !empty($input['finalize']);

if ($groupId <= 0 || !is_array($awards)) {
    echo json_encode(['success' => false, 'error' => 'Input tidak valid']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Pastikan grup ada.
    $chk = $pdo->prepare("SELECT group_id FROM Comparison_Group WHERE group_id = ?");
    $chk->execute([$groupId]);
    if (!$chk->fetch()) {
        echo json_encode(['success' => false, 'error' => 'Group tidak ditemukan']);
        exit;
    }

    $findPlan = $pdo->prepare("
        SELECT * FROM Comparison_Plan_Row
        WHERE comparison_id = :cid AND plan_supplier_name = :sup
        ORDER BY plan_row_id ASC LIMIT 1
    ");
    $clearAward = $pdo->prepare("UPDATE Comparison_Plan_Row SET is_awarded = 0 WHERE comparison_id = ?");
    $setAward   = $pdo->prepare("UPDATE Comparison_Plan_Row SET is_awarded = 1 WHERE plan_row_id = ?");

    $updCt = $pdo->prepare("
        UPDATE Comparison_Table SET
            awarded_supplier_name = :sup,
            awarded_amount        = :amount,
            awarded_po_date       = :po_date,
            awarded_deliv_date    = :deliv_date,
            awarded_po_number     = :po_number,
            awarded_keterangan    = :ket,
            plan_supplier_name    = :sup,
            plan_price_idr        = :price,
            plan_amount           = :amount,
            gap_price             = :gap_price,
            gap_percent           = :gap_percent,
            status                = :status
        WHERE comparison_id = :cid AND comparison_group_id = :gid
    ");

    $awarded = 0;
    foreach ($awards as $a) {
        $cid = intval($a['comparison_id'] ?? 0);
        $sup = trim((string)($a['supplier_name'] ?? ''));
        if ($cid <= 0 || $sup === '') continue;

        // Ambil harga plan untuk supplier terpilih.
        $findPlan->execute([':cid' => $cid, ':sup' => $sup]);
        $plan = $findPlan->fetch();

        // Ambil last_price untuk hitung gap.
        $ctRow = $pdo->prepare("SELECT qty_pr, last_price_idr, pr_id FROM Comparison_Table WHERE comparison_id = ?");
        $ctRow->execute([$cid]);
        $ct = $ctRow->fetch();
        if (!$ct) continue;

        $qty       = (float)$ct['qty_pr'];
        $lastPrice = (float)$ct['last_price_idr'];
        $price     = $plan ? (float)$plan['plan_price_idr'] : 0;
        $amount    = $plan ? (float)$plan['plan_amount'] : ($qty * $price);
        $gapPrice   = ($price > 0 && $lastPrice > 0) ? ($price - $lastPrice) : 0;
        $gapPercent = ($lastPrice > 0) ? max(-999.99, min(999.99, ($gapPrice / $lastPrice) * 100)) : 0;

        // Tandai plan row awarded.
        $clearAward->execute([$cid]);
        if ($plan) $setAward->execute([$plan['plan_row_id']]);

        $updCt->execute([
            ':sup'        => $sup,
            ':amount'     => $amount,
            ':po_date'    => !empty($a['awarded_po_date']) ? $a['awarded_po_date'] : null,
            ':deliv_date' => !empty($a['awarded_deliv_date']) ? $a['awarded_deliv_date'] : null,
            ':po_number'  => $a['awarded_po_number'] ?? null,
            ':ket'        => $a['keterangan'] ?? null,
            ':price'      => $price,
            ':gap_price'  => $gapPrice,
            ':gap_percent'=> $gapPercent,
            ':status'     => $finalize ? 'final' : 'draft',
            ':cid'        => $cid,
            ':gid'        => $groupId,
        ]);

        // Set PR status awarded.
        if (!empty($ct['pr_id'])) {
            $pdo->prepare("UPDATE Purchase_Requisition SET status='awarded' WHERE pr_id = ?")
                ->execute([$ct['pr_id']]);
        }
        $awarded++;
    }

    // Update status grup.
    $pdo->prepare("UPDATE Comparison_Group SET status = ? WHERE group_id = ?")
        ->execute([$finalize ? 'final' : 'draft', $groupId]);

    $pdo->commit();

    $pdo->prepare("
        INSERT INTO Activity_Log (user_id, action, details, created_at)
        VALUES (?, 'COMPARISON_AWARD', ?, NOW())
    ")->execute([$_SESSION['user_id'], json_encode([
        'group_id' => $groupId, 'awarded' => $awarded, 'finalize' => $finalize,
    ])]);

    echo json_encode([
        'success'  => true,
        'awarded'  => $awarded,
        'finalize' => $finalize,
        'message'  => $finalize ? "Comparison difinalisasi. $awarded PR di-award." : "Draft award disimpan ($awarded PR).",
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
