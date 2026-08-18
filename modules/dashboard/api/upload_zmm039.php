<?php
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
$ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['xlsx', 'xls'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid file type. Please upload .xlsx or .xls']);
    exit;
}

require_once '../../../vendor/autoload.php';

try {
    // ReadDataOnly=false supaya tanggal jadi DateTime object, bukan float serial
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($file['tmp_name']);
    $reader->setReadDataOnly(false);
    $spreadsheet = $reader->load($file['tmp_name']);
    $worksheet   = $spreadsheet->getActiveSheet();
    $highestRow  = $worksheet->getHighestDataRow();

    if ($highestRow < 2) {
        echo json_encode(['success' => false, 'error' => 'File is empty or has no data rows']);
        exit;
    }

    // Baca header row 1, simpan sebagai map: nama_header → column_letter
    // Pakai column letter (A,B,...,CJ) bukan index angka
    // sehingga tidak terpengaruh kolom hidden/filtered sama sekali
    $headerMap = [];
    foreach ($worksheet->getRowIterator(1, 1) as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $headerName = strtolower(trim((string)$cell->getValue()));
            if ($headerName === '') continue;
            $colLetter = $cell->getColumn();
            if (!isset($headerMap[$headerName])) {
                $headerMap[$headerName] = $colLetter;
            } else {
                // Duplikat header: simpan sebagai array
                if (!is_array($headerMap[$headerName])) {
                    $headerMap[$headerName] = [$headerMap[$headerName]];
                }
                $headerMap[$headerName][] = $colLetter;
            }
        }
    }

    // Cari column letter dari daftar alias (ambil kemunculan pertama)
    function zmm_resolveCol(array $map, array $aliases): ?string {
        foreach ($aliases as $alias) {
            if (isset($map[$alias])) {
                $v = $map[$alias];
                return is_array($v) ? $v[0] : $v;
            }
        }
        return null;
    }

    // Cari column letter kemunculan ke-N dari sebuah header (0-based).
    // Dipakai untuk kolom "GR No." yang muncul 2x di ZMM039:
    //   kemunculan ke-0 = nomor dokumen GR, kemunculan ke-1 = nomor item GR.
    function zmm_resolveColNth(array $map, array $aliases, int $n): ?string {
        foreach ($aliases as $alias) {
            if (isset($map[$alias])) {
                $arr = is_array($map[$alias]) ? $map[$alias] : [$map[$alias]];
                if (isset($arr[$n])) return $arr[$n];
            }
        }
        return null;
    }

    // Map semua kolom yang dibutuhkan ke column letter
    $cols = [
        'vendor'      => zmm_resolveCol($headerMap, ['vendor']),
        'vendor_name' => zmm_resolveCol($headerMap, ['vendor name']),
        'po_number'   => zmm_resolveCol($headerMap, ['po no.', 'po no', 'po number']),
        'po_item'     => zmm_resolveCol($headerMap, ['po item']),
        'po_date'     => zmm_resolveCol($headerMap, ['po date']),
        'po_qty'      => zmm_resolveCol($headerMap, ['po quantity', 'po qty', 'po qty.']),
        'description' => zmm_resolveCol($headerMap, ['po description', 'description']),
        'mat_group'   => zmm_resolveCol($headerMap, ['material group']),
        'gr_date'     => zmm_resolveCol($headerMap, ['gr date']),
        'gr_number'   => zmm_resolveCol($headerMap, ['gr no.', 'gr no', 'gr number']),
        // GR item = kolom "GR No." KEDUA (nomor item di dalam satu dokumen GR).
        // Satu gr_number bisa punya beberapa item (mis. penerimaan dicicil), jadi
        // kolom ini yang membedakan tiap baris GR dan mencegah baris ke-skip.
        'gr_item'     => zmm_resolveColNth($headerMap, ['gr no.', 'gr no', 'gr number'], 1),
        'gr_qty'      => zmm_resolveCol($headerMap, ['gr qty.', 'gr qty', 'gr quantity']),
    ];

    // Validasi kolom wajib
    $required = ['po_number', 'po_item', 'po_date', 'po_qty', 'gr_date', 'gr_number', 'gr_qty'];
    foreach ($required as $req) {
        if (!$cols[$req]) {
            echo json_encode([
                'success' => false,
                'error'   => 'Missing required column: ' . str_replace('_', ' ', $req),
                'detected_headers' => array_keys($headerMap)
            ]);
            exit;
        }
    }

    // Ambil nilai cell berdasarkan column letter + row number
    function zmm_getVal($ws, ?string $col, int $row): mixed {
        if (!$col) return null;
        return $ws->getCell($col . $row)->getValue();
    }

    // Ambil nilai date dari cell
    function zmm_getDate($ws, ?string $col, int $row): ?string {
        if (!$col) return null;
        $cell = $ws->getCell($col . $row);
        $val  = $cell->getValue();
        if ($val === null || $val === '') return null;
        if ($val instanceof \DateTime) return $val->format('Y-m-d');
        if (is_numeric($val) && $val > 1000 &&
            \PhpOffice\PhpSpreadsheet\Shared\Date::isDateTime($cell)) {
            $ts = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToTimestamp((float)$val);
            return $ts ? date('Y-m-d', $ts) : null;
        }
        $ts = strtotime((string)$val);
        return $ts ? date('Y-m-d', $ts) : null;
    }

    $pdo->beginTransaction();

    $processed     = 0;
    $skipped       = 0;
    $grInserted    = 0;
    $grSkipped     = 0;
    $supplierCache = [];

    for ($rowNum = 2; $rowNum <= $highestRow; $rowNum++) {

        $poNumber = trim((string)(zmm_getVal($worksheet, $cols['po_number'], $rowNum) ?? ''));
        $poItem   = trim((string)(zmm_getVal($worksheet, $cols['po_item'],   $rowNum) ?? ''));
        if (empty($poNumber)) { $skipped++; continue; }

        $poDate      = zmm_getDate($worksheet, $cols['po_date'], $rowNum);
        $poQty       = floatval(zmm_getVal($worksheet, $cols['po_qty'],      $rowNum) ?? 0);
        $description = trim((string)(zmm_getVal($worksheet, $cols['description'], $rowNum) ?? ''));
        $matGroup    = trim((string)(zmm_getVal($worksheet, $cols['mat_group'],   $rowNum) ?? ''));
        $vendorCode  = trim((string)(zmm_getVal($worksheet, $cols['vendor'],      $rowNum) ?? ''));
        $vendorName  = trim((string)(zmm_getVal($worksheet, $cols['vendor_name'], $rowNum) ?? ''));
        error_log("VendorCode: $vendorCode | VendorName: $vendorName");

        if (!$poDate) { $skipped++; continue; }

        // Auto upsert Supplier dari Vendor Name di ZMM039
        $supplierId = null;
        if ($vendorName) {
            if (isset($supplierCache[$vendorName])) {
                $supplierId = $supplierCache[$vendorName];
            } else {
                $s = $pdo->prepare("SELECT supplier_id FROM Supplier WHERE supplier_name = ? LIMIT 1");
                $s->execute([$vendorName]);
                $supplierId = $s->fetchColumn();
                if (!$supplierId) {
                    $ins = $pdo->prepare("INSERT INTO Supplier (supplier_name, contact_info) VALUES (?, ?)");
                    $ins->execute([$vendorName, $vendorCode]);
                    $supplierId = $pdo->lastInsertId();
                }
                $supplierCache[$vendorName] = $supplierId;
            }
        }

        // Upsert Purchase Order
        $pdo->prepare("
            INSERT INTO Purchase_Order
                (po_number, po_item, po_date, ordered_quantity, status, material_group, description, supplier_id)
            VALUES (?, ?, ?, ?, 'Open', ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                ordered_quantity = CASE
                    WHEN VALUES(ordered_quantity) > 0
                    THEN VALUES(ordered_quantity)
                    ELSE ordered_quantity
            END,
            material_group = CASE
                WHEN VALUES(material_group) IS NOT NULL
                    AND VALUES(material_group) != ''
                    THEN VALUES(material_group)
                    ELSE material_group
            END,
            description = CASE
                WHEN VALUES(description) IS NOT NULL
                AND VALUES(description) != ''
                THEN VALUES(description)
                 ELSE description
            END,
            supplier_id = COALESCE(VALUES(supplier_id), supplier_id)
        ")->execute([$poNumber, $poItem, $poDate, $poQty, $matGroup, $description, $supplierId]);
        $processed++;

        // Insert GR (skip duplicate)
        $grNumber = trim((string)(zmm_getVal($worksheet, $cols['gr_number'], $rowNum) ?? ''));
        $grItem   = trim((string)(zmm_getVal($worksheet, $cols['gr_item'],   $rowNum) ?? ''));
        if ($grItem === '') $grItem = '1'; // fallback kalau kolom item GR tidak ada di file
        $grDate   = zmm_getDate($worksheet, $cols['gr_date'], $rowNum);
        $grQty    = floatval(zmm_getVal($worksheet, $cols['gr_qty'], $rowNum) ?? 0);

        // Duplikat dicek per (gr_number, gr_item), BUKAN gr_number saja.
        // Dengan ini: item GR berbeda dalam satu dokumen tetap tersimpan semua,
        // sedangkan baris yang benar-benar identik (gr_number + gr_item sama) tetap di-skip.
        if (!empty($grNumber) && $grDate && $grQty > 0) {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM Goods_Receipt WHERE gr_number = ? AND gr_item = ?");
            $chk->execute([$grNumber, $grItem]);
            if ($chk->fetchColumn() == 0) {
                $pdo->prepare("
                    INSERT INTO Goods_Receipt (gr_number, gr_item, gr_date, gr_quantity, po_number, po_item)
                    VALUES (?, ?, ?, ?, ?, ?)
                ")->execute([$grNumber, $grItem, $grDate, $grQty, $poNumber, $poItem]);
                $grInserted++;
            } else {
                $grSkipped++;
            }
        }

        // Update PO status
        $pdo->prepare("
            UPDATE Purchase_Order po SET status = CASE
                WHEN (SELECT COALESCE(SUM(gr_quantity),0) FROM Goods_Receipt
                      WHERE po_number = po.po_number AND po_item = po.po_item) <= 0 THEN 'Open'
                WHEN (SELECT COALESCE(SUM(gr_quantity),0) FROM Goods_Receipt
                      WHERE po_number = po.po_number AND po_item = po.po_item) >= po.ordered_quantity THEN 'Completed'
                ELSE 'Partial' END
            WHERE po_number = ? AND po_item = ?
        ")->execute([$poNumber, $poItem]);
    }

    $pdo->commit();

    // Log upload
    $pdo->prepare("
        INSERT INTO Activity_Log (user_id, action, details, created_at)
        VALUES (?, 'ZMM039_UPLOAD', ?, NOW())
    ")->execute([$_SESSION['user_id'], json_encode([
        'filename'    => $file['name'],
        'processed'   => $processed,
        'skipped'     => $skipped,
        'gr_inserted' => $grInserted,
        'gr_skipped'  => $grSkipped,
    ])]);

    echo json_encode([
        'success'     => true,
        'message'     => "Successfully processed $processed PO records. $grInserted GR inserted, $grSkipped GR duplicates skipped.",
        'processed'   => $processed,
        'gr_inserted' => $grInserted,
        'gr_skipped'  => $grSkipped,
        'skipped'     => $skipped,
        'debug_cols'  => $cols,
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>