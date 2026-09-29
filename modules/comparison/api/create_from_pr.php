<?php
// File: modules/comparison/api/create_from_pr.php
// STAGE 2: Bikin SATU comparison table (grup) dari beberapa PR terpilih.
// Tiap PR -> satu baris Comparison_Table (draft) + kandidat supplier
// (Comparison_Plan_Row). Last Order auto: baseline dari PO terakhir,
// harga fallback dari historical comparison. Rekomendasi = termurah.
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$input   = json_decode(file_get_contents('php://input'), true) ?: [];
$prIds   = $input['pr_ids'] ?? [];
$title   = trim($input['title'] ?? '');

if (!is_array($prIds) || count($prIds) === 0) {
    echo json_encode(['success' => false, 'error' => 'Tidak ada PR yang dipilih']);
    exit;
}
$prIds = array_values(array_unique(array_map('intval', $prIds)));

/**
 * Cari "Last Order" terbaik untuk sebuah PR:
 *  - Baseline dari Purchase_Order terakhir (match description / material_group).
 *  - Harga (unit_price) sering kosong dari ZMM039, jadi fallback ke
 *    plan price historical comparison untuk material yang sama.
 * Mengembalikan array field last_* + daftar kandidat supplier.
 */
function findLastOrder(PDO $pdo, array $pr): array {
    $desc = trim((string)($pr['description'] ?? ''));
    $mg   = trim((string)($pr['material_group'] ?? ''));

    $out = [
        'last_po_number'   => null,
        'last_po_date'     => null,
        'last_qty'         => 0,
        'last_price_idr'   => 0,
        'last_supplier'    => null,
        'candidates'       => [], // [supplier_name => ['price'=>, 'po_number'=>, 'po_date'=>]]
    ];

    if ($desc === '' && $mg === '') return $out;

    // Kandidat supplier dari Purchase_Order untuk material ini.
    $sql = "
        SELECT s.supplier_name, po.unit_price, po.ordered_quantity,
               po.po_number, po.po_date
        FROM Purchase_Order po
        JOIN Supplier s ON po.supplier_id = s.supplier_id
        WHERE (:desc <> '' AND po.description LIKE :descLike)
           OR (:mg   <> '' AND po.material_group = :mg)
        ORDER BY po.po_date DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':desc'     => $desc,
        ':descLike' => '%' . $desc . '%',
        ':mg'       => $mg,
    ]);
    $rows = $stmt->fetchAll();

    $first = true;
    foreach ($rows as $r) {
        $sup = $r['supplier_name'];
        if ($first) {
            // Baris paling baru = baseline last order.
            $out['last_po_number'] = $r['po_number'];
            $out['last_po_date']   = $r['po_date'];
            $out['last_qty']       = (float)$r['ordered_quantity'];
            $out['last_price_idr'] = (float)($r['unit_price'] ?? 0);
            $out['last_supplier']  = $sup;
            $first = false;
        }
        // Simpan harga terbaru per supplier (baris pertama per supplier = terbaru).
        if ($sup && !isset($out['candidates'][$sup])) {
            $out['candidates'][$sup] = [
                'price'     => (float)($r['unit_price'] ?? 0),
                'po_number' => $r['po_number'],
                'po_date'   => $r['po_date'],
            ];
        }
    }

    // Fallback harga dari historical comparison kalau PO tidak punya harga.
    $needPrice = ($out['last_price_idr'] <= 0);
    $needCandidatePrice = false;
    foreach ($out['candidates'] as $c) { if ($c['price'] <= 0) { $needCandidatePrice = true; break; } }

    if (($needPrice || $needCandidatePrice || empty($out['candidates'])) && ($desc !== '' || $mg !== '')) {
        $hsql = "
            SELECT pr.plan_supplier_name AS supplier_name, pr.plan_price_idr AS price,
                   ct.last_po_number, ct.last_po_date, ct.updated_at
            FROM Comparison_Plan_Row pr
            JOIN Comparison_Table ct ON pr.comparison_id = ct.comparison_id
            WHERE pr.plan_price_idr > 0
              AND ( (:desc <> '' AND (ct.description LIKE :descLike OR ct.material_code = :desc))
                 OR (:mg   <> '' AND ct.material_group = :mg) )
            ORDER BY ct.updated_at DESC
            LIMIT 50
        ";
        $hstmt = $pdo->prepare($hsql);
        $hstmt->execute([':desc' => $desc, ':descLike' => '%' . $desc . '%', ':mg' => $mg]);
        $hist = $hstmt->fetchAll();

        foreach ($hist as $h) {
            $sup = $h['supplier_name'];
            if (!$sup) continue;
            if ($out['last_price_idr'] <= 0) {
                $out['last_price_idr'] = (float)$h['price'];
                if (!$out['last_supplier'])  $out['last_supplier']  = $sup;
                if (!$out['last_po_number']) $out['last_po_number'] = $h['last_po_number'];
                if (!$out['last_po_date'])   $out['last_po_date']   = $h['last_po_date'];
            }
            if (!isset($out['candidates'][$sup]) || $out['candidates'][$sup]['price'] <= 0) {
                $out['candidates'][$sup] = [
                    'price'     => (float)$h['price'],
                    'po_number' => $h['last_po_number'],
                    'po_date'   => $h['last_po_date'],
                ];
            }
        }
    }

    return $out;
}

try {
    // Ambil data PR terpilih.
    $ph = implode(',', array_fill(0, count($prIds), '?'));
    $stmt = $pdo->prepare("SELECT * FROM Purchase_Requisition WHERE pr_id IN ($ph)");
    $stmt->execute($prIds);
    $prs = $stmt->fetchAll();

    if (empty($prs)) {
        echo json_encode(['success' => false, 'error' => 'PR tidak ditemukan']);
        exit;
    }

    $pdo->beginTransaction();

    // 1. Buat grup.
    if ($title === '') {
        $title = 'Comparison ' . date('Y-m-d H:i') . ' (' . count($prs) . ' PR)';
    }
    $gstmt = $pdo->prepare("INSERT INTO Comparison_Group (title, created_by, status) VALUES (?, ?, 'draft')");
    $gstmt->execute([$title, $_SESSION['user_id']]);
    $groupId = $pdo->lastInsertId();

    // Prepared statements untuk tiap PR.
    $ctStmt = $pdo->prepare("
        INSERT INTO Comparison_Table (
            comparison_group_id, comparison_date, created_by,
            pr_number, pr_id, pr_item, material_code, material_group, description, uom, qty_pr,
            plan_quantity,
            last_qty, last_po_number, last_po_date, last_price_idr, last_price_tiba_nu,
            last_amount, last_supplier_name,
            awarded_deliv_date,
            recommended_supplier_name, status, source_mode
        ) VALUES (
            :gid, CURDATE(), :created_by,
            :pr_number, :pr_id, :pr_item, :material_code, :material_group, :description, :uom, :qty_pr,
            :plan_quantity,
            :last_qty, :last_po_number, :last_po_date, :last_price_idr, :last_price_tiba_nu,
            :last_amount, :last_supplier_name,
            :adeliv,
            :recommended, 'draft', 'pr'
        )
    ");

    $planStmt = $pdo->prepare("
        INSERT INTO Comparison_Plan_Row (
            comparison_id, plan_qty, plan_price_idr, plan_price_tiba_nu, plan_amount,
            plan_supplier_name, gap_price, gap_percent, is_awarded
        ) VALUES (
            :comparison_id, :plan_qty, :plan_price_idr, :plan_price_tiba_nu, :plan_amount,
            :plan_supplier_name, :gap_price, :gap_percent, 0
        )
    ");

    $prUpd = $pdo->prepare("UPDATE Purchase_Requisition SET status='in_comparison' WHERE pr_id = ?");

    $createdRows = 0;
    foreach ($prs as $pr) {
        $lo  = findLastOrder($pdo, $pr);
        $qty = (float)($pr['qty_pr'] ?? 0);
        $lastPrice = (float)$lo['last_price_idr'];

        // Tentukan rekomendasi = kandidat termurah (harga > 0).
        $recommended = null;
        $bestPrice = null;
        foreach ($lo['candidates'] as $sup => $c) {
            if ($c['price'] > 0 && ($bestPrice === null || $c['price'] < $bestPrice)) {
                $bestPrice = $c['price'];
                $recommended = $sup;
            }
        }

        $ctStmt->execute([
            ':gid'            => $groupId,
            ':created_by'     => $_SESSION['user_id'],
            ':pr_number'      => $pr['pr_number'],
            ':pr_id'          => $pr['pr_id'],
            ':pr_item'        => $pr['pr_item'],
            ':material_code'  => $pr['material_code'],
            ':material_group' => $pr['material_group'],
            ':description'    => $pr['description'],
            ':uom'            => $pr['uom'] ?: 'KG',
            ':qty_pr'         => $qty,
            ':plan_quantity'  => $qty,
            ':last_qty'       => $lo['last_qty'] ?: $qty,
            ':last_po_number' => $lo['last_po_number'],
            ':last_po_date'   => $lo['last_po_date'],
            ':last_price_idr' => $lastPrice,
            ':last_price_tiba_nu' => $lastPrice,
            ':last_amount'    => $lastPrice * ($lo['last_qty'] ?: $qty),
            ':last_supplier_name' => $lo['last_supplier'],
            ':adeliv'         => $pr['delivery_date'] ?: null,
            ':recommended'    => $recommended,
        ]);
        $comparisonId = $pdo->lastInsertId();

        // Plan Order dibiarkan KOSONG di awal: cukup 1 baris (qty dari PR).
        // Kandidat supplier & rekomendasi termurah hanya disimpan sebagai info
        // (recommended_supplier_name), bukan sebagai baris plan.
        $planStmt->execute([
            ':comparison_id'      => $comparisonId,
            ':plan_qty'           => $qty,
            ':plan_price_idr'     => 0,
            ':plan_price_tiba_nu' => 0,
            ':plan_amount'        => 0,
            ':plan_supplier_name' => null,
            ':gap_price'          => 0,
            ':gap_percent'        => 0,
        ]);

        $prUpd->execute([$pr['pr_id']]);
        $createdRows++;
    }

    $pdo->commit();

    // Log.
    $pdo->prepare("
        INSERT INTO Activity_Log (user_id, action, details, created_at)
        VALUES (?, 'COMPARISON_FROM_PR', ?, NOW())
    ")->execute([$_SESSION['user_id'], json_encode([
        'group_id' => $groupId, 'pr_count' => $createdRows,
    ])]);

    echo json_encode([
        'success'  => true,
        'group_id' => $groupId,
        'pr_count' => $createdRows,
        'message'  => "Comparison table dibuat dari $createdRows PR.",
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
