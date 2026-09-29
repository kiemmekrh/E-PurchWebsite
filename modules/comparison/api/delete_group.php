<?php
// File: modules/comparison/api/delete_group.php
// Hapus satu grup comparison + semua baris Comparison_Table-nya
// (Comparison_Plan_Row ikut terhapus via FK ON DELETE CASCADE).
// PR yang terkait dikembalikan ke status 'open'.
session_start();
require_once '../../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager', 'admin']);
require_once '../../../config/database.php';

header('Content-Type: application/json');

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$groupId = intval($in['group_id'] ?? 0);
if ($groupId <= 0) { echo json_encode(['success' => false, 'error' => 'group_id tidak valid']); exit; }

try {
    $pdo->beginTransaction();

    // Ambil PR terkait + statusnya.
    // - PR yang sudah 'awarded' (sudah dibuat/di-PO lewat comparison ini) -> HAPUS dari PR Intake.
    // - PR lainnya -> kembalikan ke 'open'.
    $prStmt = $pdo->prepare("
        SELECT DISTINCT ct.pr_id, pr.status
        FROM Comparison_Table ct
        JOIN Purchase_Requisition pr ON ct.pr_id = pr.pr_id
        WHERE ct.comparison_group_id = ?
    ");
    $prStmt->execute([$groupId]);
    $prs = $prStmt->fetchAll();

    $toDelete = [];
    $toReset  = [];
    foreach ($prs as $p) {
        if ($p['status'] === 'awarded') $toDelete[] = $p['pr_id'];
        else                             $toReset[]  = $p['pr_id'];
    }

    // Hapus baris comparison (plan rows cascade) & grup dulu.
    $pdo->prepare("DELETE FROM Comparison_Table WHERE comparison_group_id = ?")->execute([$groupId]);
    $pdo->prepare("DELETE FROM Comparison_Group WHERE group_id = ?")->execute([$groupId]);

    // PR awarded -> hapus dari PR Intake.
    if ($toDelete) {
        $ph = implode(',', array_fill(0, count($toDelete), '?'));
        $pdo->prepare("DELETE FROM Purchase_Requisition WHERE pr_id IN ($ph)")->execute($toDelete);
    }
    // PR lain -> reset ke 'open'.
    if ($toReset) {
        $ph = implode(',', array_fill(0, count($toReset), '?'));
        $pdo->prepare("UPDATE Purchase_Requisition SET status='open' WHERE pr_id IN ($ph)")->execute($toReset);
    }

    $pdo->commit();

    $pdo->prepare("INSERT INTO Activity_Log (user_id, action, details, created_at)
                   VALUES (?, 'COMPARISON_GROUP_DELETE', ?, NOW())")
        ->execute([$_SESSION['user_id'], json_encode([
            'group_id'   => $groupId,
            'pr_deleted' => count($toDelete),
            'pr_reset'   => count($toReset),
        ])]);

    echo json_encode(['success' => true, 'message' => 'Grup dihapus']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
