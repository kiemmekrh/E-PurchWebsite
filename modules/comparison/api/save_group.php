<?php
// File: modules/comparison/api/save_group.php
// STAGE 2: Simpan grid Builder. Tiap PR (comparison_id) bisa punya BANYAK
// baris Plan Order (kandidat supplier). Ringkasan Comparison_Table diambil
// dari plan yang di-award (atau plan pertama). finalize -> PR 'awarded',
// grup 'final'.
//
// Body: { group_id, finalize, rows: [ {
//   comparison_id, last:{...}, awarded:{...}, awarded_index, is_awarded,
//   plans:[ {qty,currency,price_foreign,kurs_date,kurs_idr,price_idr,
//            tiba_nu,amount,supplier,is_awarded} ]
// } ] }
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$in       = json_decode(file_get_contents('php://input'), true) ?: [];
$groupId  = intval($in['group_id'] ?? 0);
$rows     = $in['rows'] ?? [];
$finalize = !empty($in['finalize']);

if ($groupId <= 0 || !is_array($rows) || count($rows) === 0) {
    echo json_encode(['success' => false, 'error' => 'Input tidak valid']);
    exit;
}

function d($v) { return (empty($v) || $v === '0000-00-00') ? null : $v; }
function n($v) { return floatval($v ?? 0); }
function clampPct($v) { return max(-999.99, min(999.99, floatval($v))); }

try {
    $chk = $pdo->prepare("SELECT group_id FROM Comparison_Group WHERE group_id = ?");
    $chk->execute([$groupId]);
    if (!$chk->fetch()) { echo json_encode(['success' => false, 'error' => 'Group tidak ditemukan']); exit; }

    $upd = $pdo->prepare("
        UPDATE Comparison_Table SET
            last_qty = :lqty, last_po_number = :lpo, last_po_date = :lpodate,
            last_currency = :lcur, last_price_foreign = :lpf, last_kurs_date = :lkd,
            last_kurs_idr = :lki, last_price_idr = :lpi, last_price_tiba_nu = :ltiba,
            last_amount = :lamt, last_supplier_name = :lsup,
            plan_quantity = :pqty, plan_currency = :pcur, plan_price_foreign = :ppf,
            plan_kurs_date = :pkd, plan_kurs_idr = :pki, plan_price_idr = :ppi,
            plan_price_tiba_nu = :ptiba, plan_amount = :pamt, plan_supplier_name = :psup,
            gap_price = :gp, gap_percent = :gpct,
            awarded_po_date = :apo_date, awarded_deliv_date = :adeliv, awarded_po_number = :apono,
            awarded_supplier_name = :asup, awarded_amount = :aamt, awarded_keterangan = :aket,
            status = :status
        WHERE comparison_id = :cid AND comparison_group_id = :gid
    ");

    $delPlan = $pdo->prepare("DELETE FROM Comparison_Plan_Row WHERE comparison_id = ?");
    $insPlan = $pdo->prepare("
        INSERT INTO Comparison_Plan_Row (
            comparison_id, plan_qty, plan_currency, plan_price_foreign, plan_kurs_date,
            plan_kurs_idr, plan_price_idr, plan_price_tiba_nu, plan_amount,
            plan_supplier_name, gap_price, gap_percent, is_awarded
        ) VALUES (
            :cid, :qty, :cur, :pf, :kd, :ki, :pi, :tiba, :amt, :sup, :gp, :gpct, :awd
        )
    ");
    // Saat finalize + awarded, No PO dari section Awarded ikut ditulis ke PR
    // (COALESCE: kalau kosong, po_number PR tidak ditimpa).
    $prUpd = $pdo->prepare("UPDATE Purchase_Requisition SET status = :st, po_number = COALESCE(:po, po_number) WHERE pr_id = :id");
    $getPr = $pdo->prepare("SELECT pr_id FROM Comparison_Table WHERE comparison_id = ?");

    $pdo->beginTransaction();

    $saved = 0; $awardedCount = 0;
    foreach ($rows as $row) {
        $cid = intval($row['comparison_id'] ?? 0);
        if ($cid <= 0) continue;
        $last  = $row['last'] ?? [];
        $awd   = $row['awarded'] ?? [];
        $plans = is_array($row['plans'] ?? null) ? $row['plans'] : [];
        $isAwd = !empty($row['is_awarded']) ? 1 : 0;
        $awardedIndex = intval($row['awarded_index'] ?? -1);

        $lastPrice = n($last['price_idr'] ?? 0);

        // Plan ringkasan = plan yang di-award (atau plan pertama).
        $summary = null;
        if ($awardedIndex >= 0 && isset($plans[$awardedIndex])) $summary = $plans[$awardedIndex];
        elseif (count($plans)) $summary = $plans[0];
        $sPrice = $summary ? n($summary['price_idr'] ?? 0) : 0;
        $sQty   = $summary ? n($summary['qty'] ?? 0) : 0;
        $sGapPrice   = ($sPrice > 0 && $lastPrice > 0) ? ($sPrice - $lastPrice) : 0;
        $sGapPercent = ($lastPrice > 0) ? clampPct(($sGapPrice / $lastPrice) * 100) : 0;

        $rowStatus = ($finalize && $isAwd) ? 'final' : 'draft';

        $upd->execute([
            ':lqty' => n($last['qty'] ?? 0), ':lpo' => $last['po_number'] ?? '', ':lpodate' => d($last['po_date'] ?? null),
            ':lcur' => $last['currency'] ?? null, ':lpf' => n($last['price_foreign'] ?? 0), ':lkd' => d($last['kurs_date'] ?? null),
            ':lki' => n($last['kurs_idr'] ?? 0), ':lpi' => $lastPrice, ':ltiba' => n($last['tiba_nu'] ?? $lastPrice),
            ':lamt' => n($last['amount'] ?? 0), ':lsup' => $last['supplier'] ?? '',
            ':pqty' => $sQty, ':pcur' => $summary['currency'] ?? null, ':ppf' => n($summary['price_foreign'] ?? 0),
            ':pkd' => d($summary['kurs_date'] ?? null), ':pki' => n($summary['kurs_idr'] ?? 0), ':ppi' => $sPrice,
            ':ptiba' => n($summary['tiba_nu'] ?? $sPrice), ':pamt' => n($summary['amount'] ?? 0), ':psup' => $summary['supplier'] ?? '',
            ':gp' => $sGapPrice, ':gpct' => $sGapPercent,
            ':apo_date' => d($awd['po_date'] ?? null), ':adeliv' => d($awd['deliv_date'] ?? null), ':apono' => $awd['po_number'] ?? '',
            ':asup' => $awd['supplier'] ?? '', ':aamt' => n($awd['amount'] ?? 0), ':aket' => $awd['keterangan'] ?? '',
            ':status' => $rowStatus,
            ':cid' => $cid, ':gid' => $groupId,
        ]);

        // Ganti semua plan rows.
        $delPlan->execute([$cid]);
        foreach ($plans as $i => $p) {
            $price = n($p['price_idr'] ?? 0);
            $gapPrice   = ($price > 0 && $lastPrice > 0) ? ($price - $lastPrice) : 0;
            $gapPercent = ($lastPrice > 0) ? clampPct(($gapPrice / $lastPrice) * 100) : 0;
            $insPlan->execute([
                ':cid' => $cid, ':qty' => n($p['qty'] ?? 0), ':cur' => $p['currency'] ?? null,
                ':pf' => n($p['price_foreign'] ?? 0), ':kd' => d($p['kurs_date'] ?? null), ':ki' => n($p['kurs_idr'] ?? 0),
                ':pi' => $price, ':tiba' => n($p['tiba_nu'] ?? $price), ':amt' => n($p['amount'] ?? 0),
                ':sup' => $p['supplier'] ?? '', ':gp' => $gapPrice, ':gpct' => $gapPercent,
                ':awd' => !empty($p['is_awarded']) ? 1 : 0,
            ]);
        }

        // Status PR + No PO dari Awarded (hanya saat finalize + awarded).
        $getPr->execute([$cid]);
        $prId = $getPr->fetchColumn();
        if ($prId) {
            $awPo = trim((string)($awd['po_number'] ?? ''));
            $poForPr = ($finalize && $isAwd && $awPo !== '') ? $awPo : null;
            $prUpd->execute([
                ':st' => ($finalize && $isAwd) ? 'awarded' : 'in_comparison',
                ':po' => $poForPr,
                ':id' => $prId,
            ]);
        }

        if ($isAwd) $awardedCount++;
        $saved++;
    }

    $pdo->prepare("UPDATE Comparison_Group SET status = ? WHERE group_id = ?")
        ->execute([$finalize ? 'final' : 'draft', $groupId]);

    $pdo->commit();

    $pdo->prepare("
        INSERT INTO Activity_Log (user_id, action, details, created_at)
        VALUES (?, 'COMPARISON_SAVE', ?, NOW())
    ")->execute([$_SESSION['user_id'], json_encode([
        'group_id' => $groupId, 'rows' => $saved, 'awarded' => $awardedCount, 'finalize' => $finalize,
    ])]);

    echo json_encode([
        'success' => true, 'saved' => $saved, 'awarded' => $awardedCount,
        'message' => $finalize
            ? "Comparison difinalisasi. $awardedCount PR di-award, $saved baris disimpan."
            : "Draft disimpan ($saved baris, $awardedCount award).",
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
