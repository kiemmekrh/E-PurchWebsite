<?php
// File: modules/comparison/builder.php
// STAGE 2: Comparison table (1 grup = banyak PR) — spreadsheet gaya
// "Create Comparison Table": Last Order / Plan Order / Gap / Awarded,
// satu baris per PR. Last Order diisi dari historical comparison.
session_start();
require_once '../../auth/check_session.php';
checkAuth(['purchasing_staff', 'manager']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="user-role" content="<?php echo htmlspecialchars($_SESSION['role']); ?>">
    <title>Comparison Builder | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
        .cb-card { background:#fff; border:1px solid #e6e6e6; border-radius:12px; padding:16px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05); }
        .cb-toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
        .btn { border:none; border-radius:6px; padding:9px 16px; font-weight:600; cursor:pointer; font-size:13px; }
        .btn-green { background:#28a745; color:#fff; } .btn-green:hover { background:#218838; }
        .btn-blue { background:#4a90e2; color:#fff; } .btn-blue:hover { background:#357abd; }
        .btn-ghost { background:#fff; border:1px solid #ddd; color:#444; }
        .btn:disabled { opacity:.5; cursor:default; }
        .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .pill.draft { background:#fff3e0; color:#e67e22; } .pill.final { background:#e8f5e9; color:#27ae60; }
        .muted { color:#999; }

        /* Spreadsheet */
        .ss-wrap { overflow-x:auto; border:1px solid #ccc; border-radius:8px; }
        table.ss { border-collapse:collapse; font-size:13px; width:max-content; }
        table.ss th, table.ss td { border:1px solid #bbb; padding:6px 7px; text-align:center; }
        .sec th { font-weight:700; font-size:13px; padding:8px; }
        .sub th { font-size:12px; font-weight:600; padding:7px 6px; background:#f5f5f5; white-space:nowrap; }
        .sec-hdr  { background:#e0e0e0; color:#333; }
        .sec-last { background:#e8e8e8; color:#333; }
        .sec-plan { background:#e3f2fd; color:#1565c0; }
        .sec-gap  { background:#ffcc80; color:#e65100; }
        .sec-awd  { background:#fff59d; color:#f57f17; }
        .col-hdr  { background:#fafafa; }
        .col-last { background:#f5f5f5; }
        .col-plan { background:#eaf5ff; }
        .col-gap  { background:#ffe9cc; }
        .col-awd  { background:#fffdf0; }
        table.ss input, table.ss select { width:100%; box-sizing:border-box; border:1px solid #ccc; padding:5px 6px; font-size:12px; text-align:center; border-radius:3px; background:#fff; }
        table.ss input[readonly] { background:#ececec; color:#555; }
        table.ss td.pr-cell { text-align:left; white-space:nowrap; font-weight:600; }
        .in-qty { min-width:70px; } .in-price { min-width:100px; } .in-sup { min-width:140px; } .in-po { min-width:110px; } .in-date { min-width:140px; } .in-cur { min-width:74px; }
        .rec-badge { display:inline-block; background:#e8f5e9; color:#27ae60; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; margin-top:3px; }
        .btn-hist { background:#4a90e2; color:#fff; border:none; border-radius:4px; padding:6px 9px; font-size:13px; cursor:pointer; white-space:nowrap; }
        .btn-all { background:#6c5ce7; color:#fff; border:none; border-radius:4px; padding:5px 7px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; margin-top:4px; display:block; width:100%; }
        .btn-all:hover { background:#5a4bd4; }
        .btn-award { background:#ff9800; color:#fff; border:none; border-radius:4px; padding:5px 10px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; }
        .btn-award.on { background:#4caf50; }
        .gap-cheaper { color:#2e7d32; font-weight:700; } .gap-exp { color:#c62828; font-weight:700; } .gap-same { color:#888; }
        tr.awarded-row td { background:#fff9e6 !important; }
        tr.plan-awarded td.col-plan { background:#e8f5e9 !important; }
        .award-badge { display:inline-block; background:#4caf50; color:#fff; font-weight:700; border-radius:50%; width:22px; height:22px; line-height:22px; text-align:center; font-size:13px; }
        .btn-awardsel { width:26px; height:26px; border-radius:50%; border:1px solid #cbb; background:#fff; color:#aaa; font-weight:700; font-size:14px; cursor:pointer; line-height:1; }
        .btn-awardsel.on { background:#4caf50; color:#fff; border-color:#43a047; }
        .btn-awardsel:hover { border-color:#4caf50; color:#4caf50; }
        .btn-awardsel.on:hover { color:#fff; }
        .btn-addp { background:#28a745; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:12px; font-weight:700; cursor:pointer; }
        .btn-delp { background:#e74c3c; color:#fff; border:none; border-radius:4px; padding:4px 8px; font-size:12px; font-weight:700; cursor:pointer; }

        /* Listing */
        table.cb-list { width:100%; border-collapse:collapse; font-size:13px; }
        table.cb-list th, table.cb-list td { border:1px solid #e2e2e2; padding:8px; text-align:left; }
        table.cb-list th { background:#f4f6f8; font-size:11px; text-transform:uppercase; color:#5a6672; }
        .num { text-align:right; }
        .empty { text-align:center; padding:40px; color:#999; }

        /* Modal */
        .modal-ov { position:fixed; inset:0; background:rgba(0,0,0,.45); display:none; z-index:9998; align-items:center; justify-content:center; }
        .modal-ov.on { display:flex; }
        .modal-bx { background:#fff; border-radius:12px; width:90%; max-width:1000px; max-height:82vh; display:flex; flex-direction:column; overflow:hidden; }
        .modal-hd { padding:14px 18px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:12px; }
        .modal-hd h3 { margin:0; font-size:16px; flex:1; }
        .modal-bd { padding:14px 18px; overflow:auto; }
        .modal-bd input.search { width:100%; padding:9px 12px; border:1px solid #ddd; border-radius:6px; margin-bottom:12px; }
        .hist-row { cursor:pointer; } .hist-row:hover td { background:#e3f2fd; }
        .x { cursor:pointer; font-size:22px; color:#888; border:none; background:none; }
        .toast { position:fixed; top:20px; right:20px; background:#333; color:#fff; padding:14px 20px; border-radius:8px; font-size:14px; z-index:9999; display:none; box-shadow:0 6px 24px rgba(0,0,0,.2); }
        .toast.ok { background:#27ae60; } .toast.err { background:#c0392b; }
    </style>
</head>
<body>
    <?php include '../../includes/sidebar.php'; ?>
    <main class="main-content">
        <div class="page-header">
            <div>
                <h1 class="page-title" id="cbTitle">Comparison Builder</h1>
                <p class="welcome-text">Satu comparison table, banyak PR. Isi Last Order dari historical comparison, pilih supplier, lalu Confirm.</p>
            </div>
            <div class="header-actions">
                <a href="index.php" class="btn btn-ghost" style="text-decoration:none;">← Comparison</a>
                <a href="../pr/index.php" class="btn btn-ghost" style="text-decoration:none;">PR Intake</a>
            </div>
        </div>

        <div id="groupListCard" class="cb-card" style="display:none;">
            <h3 style="margin:0 0 12px;">Comparison Tables (dari PR)</h3>
            <div style="overflow-x:auto;">
                <table class="cb-list">
                    <thead><tr><th>ID</th><th>Judul</th><th class="num">Jumlah PR</th><th class="num">Awarded</th><th>Status</th><th>Dibuat</th><th></th></tr></thead>
                    <tbody id="groupListBody"><tr><td colspan="7" class="empty">Memuat...</td></tr></tbody>
                </table>
            </div>
        </div>

        <div id="builderCard" class="cb-card" style="display:none;">
            <div class="cb-toolbar">
                <span id="grpStatus" class="pill draft">DRAFT</span>
                <span class="muted" id="grpMeta"></span>
                <span style="flex:1"></span>
                <button class="btn btn-blue" onclick="saveGroup(false)">💾 Save Draft</button>
                <button class="btn btn-green" onclick="saveGroup(true)">✔ Confirm &amp; Finalize</button>
            </div>

            <div class="ss-wrap">
                <table class="ss">
                    <thead>
                        <tr class="sec">
                            <th class="sec-hdr" colspan="6">ITEM (dari PR)</th>
                            <th class="sec-last" colspan="12">LAST ORDER</th>
                            <th class="sec-plan" colspan="11">PLAN ORDER</th>
                            <th class="sec-gap" colspan="3">GAP</th>
                            <th class="sec-awd" colspan="6">AWARDED (Final Selection)</th>
                        </tr>
                        <tr class="sub">
                            <th>No</th><th>PR</th><th>Material<br>Code</th><th>Description</th><th>UOM</th><th>Qty<br>PR</th>
                            <!-- LAST ORDER -->
                            <th class="col-last">Src</th>
                            <th class="col-last">QTY</th><th class="col-last">No PO</th><th class="col-last">Tgl PO</th>
                            <th class="col-last">Curr</th><th class="col-last">Price<br>(asing)</th><th class="col-last">Tgl Kurs</th>
                            <th class="col-last">Nilai Kurs<br>(IDR)</th><th class="col-last">Price<br>(IDR)</th><th class="col-last">TIBA NU<br>(IDR)</th>
                            <th class="col-last">Amount<br>(IDR)</th><th class="col-last">Supplier</th>
                            <!-- PLAN ORDER -->
                            <th class="col-plan">QTY</th><th class="col-plan">Curr</th><th class="col-plan">Price<br>(asing)</th>
                            <th class="col-plan">Tgl Kurs</th><th class="col-plan">Nilai Kurs<br>(IDR)</th><th class="col-plan">Price<br>(IDR)</th>
                            <th class="col-plan">TIBA NU<br>(IDR)</th><th class="col-plan">Amount<br>(IDR)</th><th class="col-plan">Supplier</th>
                            <th class="col-plan">Award</th><th class="col-plan">+/−</th>
                            <!-- GAP -->
                            <th class="col-gap">Price<br>(IDR)</th><th class="col-gap">%</th><th class="col-gap">Status</th>
                            <!-- AWARDED -->
                            <th class="col-awd">Tgl PO</th><th class="col-awd">Deliv.</th><th class="col-awd">No PO</th>
                            <th class="col-awd">Supplier</th><th class="col-awd">Amount<br>(IDR)</th><th class="col-awd">Ket.</th>
                        </tr>
                    </thead>
                    <tbody id="ssBody"><tr><td colspan="38" class="empty">Memuat...</td></tr></tbody>
                </table>
            </div>
            <p style="font-size:12px; color:#888; margin-top:10px;">
                * <strong>Award</strong>: default otomatis ke harga <strong>termurah</strong> (✔). Mau pilih supplier lain? Klik lingkaran <strong>○</strong> di kolom Award baris itu (kunci manual); klik lagi untuk balik ke auto. Awarded Supplier &amp; Amount auto-terisi. <strong>No PO &amp; Tgl PO auto-terisi dari SAP export</strong> (ME5A/ZMM039) tapi <strong>tetap bisa diedit</strong> manual. Klik <strong>📋</strong> untuk isi Last Order dari historical. Gap = Plan − Last Order.
            </p>
        </div>
    </main>

    <!-- Historical picker modal -->
    <div class="modal-ov" id="histModal">
        <div class="modal-bx">
            <div class="modal-hd">
                <h3>Pilih Historical Comparison sebagai Last Order</h3>
                <button class="x" onclick="closeHist()">&times;</button>
            </div>
            <div class="modal-bd">
                <input type="text" class="search" id="histSearch" placeholder="Cari material / supplier / PR...">
                <table class="cb-list">
                    <thead><tr><th>ID</th><th>PR</th><th>Material</th><th>Supplier</th><th class="num">Price IDR</th><th>No PO</th><th>Tgl PO</th><th>Status</th></tr></thead>
                    <tbody id="histBody"><tr><td colspan="8" class="empty">Memuat...</td></tr></tbody>
                </table>
            </div>
        </div>
    </div>

    <datalist id="supplierDatalist"></datalist>
    <div class="toast" id="toast"></div>
    <script src="../../assets/js/comparison-builder.js"></script>
</body>
</html>
