// File: assets/js/comparison-builder.js
// Stage 2 Builder: spreadsheet, 1 baris per PR dengan BISA banyak baris Plan
// Order per PR (rowspan pada kolom ITEM/Last Order/Awarded). Last Order dari
// historical comparison; Plan Order auto-follow Last Order (qty dari Qty PR).
// Kolom Supplier pakai datalist SEMUA supplier.

let groupData = null;
let groupId = null;
let cidMeta = {};      // cid -> { pr_number, pr_item, material_code, description, uom, qty_pr, recommended, plansSeed }
let cidOrder = [];     // urutan cid
let manualAward = {};  // cid -> prow yang dipilih MANUAL (override auto termurah)
let historyCache = [];
let histTargetCid = null;

const CUR = ['', 'CNY', 'USD', 'SGD', 'MYR', 'EUR', 'JPY', 'AUD', 'GBP', 'IDR'];
const LAST_FIELDS = ['qty', 'po_number', 'po_date', 'currency', 'price_foreign', 'kurs_date', 'kurs_idr', 'price_idr', 'supplier'];
const PLAN_FIELDS = ['qty', 'currency', 'price_foreign', 'kurs_date', 'kurs_idr', 'price_idr', 'tiba_nu', 'amount', 'supplier'];
const AWD_FIELDS = ['po_date', 'deliv_date', 'po_number', 'supplier', 'amount', 'keterangan'];

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    groupId = parseInt(params.get('group') || '0', 10);
    loadAllSuppliers();
    if (groupId > 0) loadGroup(groupId); else loadGroupList();

    const body = document.getElementById('ssBody');
    body.addEventListener('input', e => onEdit(e));
    body.addEventListener('change', e => onEdit(e));
    document.getElementById('histSearch').addEventListener('input', renderHistBody);
});

function onEdit(e) {
    const tr = e.target.closest('tr[data-cid]');
    if (!tr) return;
    const cid = tr.getAttribute('data-cid');
    const f = e.target.getAttribute('data-f') || '';
    // Saat selesai edit (change/blur), rapikan angka jadi format ribuan.
    if (e.type === 'change' && isNumericField(f)) e.target.value = fmtNum(num(e.target.value));
    if (f.startsWith('last.')) { copyLastToPlan(cid, 0); recalcCid(cid); }
    else if (f.startsWith('plan.')) { recalcPlan(cid, tr.getAttribute('data-prow')); applyAward(cid); }
}

// Datalist SEMUA supplier (klik kolom supplier -> muncul list).
async function loadAllSuppliers() {
    try {
        const res = await fetch('api/get_suppliers.php');
        const json = await res.json();
        if (json.success) {
            document.getElementById('supplierDatalist').innerHTML =
                json.data.map(s => `<option value="${esc(s.supplier_name)}">`).join('');
        }
    } catch (e) { /* diamkan; datalist opsional */ }
}

// ================= LISTING =================
async function loadGroupList() {
    document.getElementById('groupListCard').style.display = 'block';
    document.getElementById('builderCard').style.display = 'none';
    try {
        const res = await fetch('api/get_group.php');
        const json = await res.json();
        const body = document.getElementById('groupListBody');
        if (!json.success || !json.groups.length) {
            body.innerHTML = '<tr><td colspan="7" class="empty">Belum ada comparison dari PR. Buat dari PR Intake.</td></tr>';
            return;
        }
        body.innerHTML = json.groups.map(g => `
            <tr>
                <td>#${g.group_id}</td><td>${esc(g.title)}</td>
                <td class="num">${g.pr_count}</td><td class="num">${g.awarded_count || 0}</td>
                <td><span class="pill ${g.status}">${g.status.toUpperCase()}</span></td>
                <td>${esc(g.created_at)}</td>
                <td><a class="btn btn-blue" style="text-decoration:none;padding:5px 12px;" href="builder.php?group=${g.group_id}">Buka</a></td>
            </tr>`).join('');
    } catch (e) {
        document.getElementById('groupListBody').innerHTML = `<tr><td colspan="7" class="empty">Error: ${esc(e.message)}</td></tr>`;
    }
}

// ================= DETAIL =================
async function loadGroup(id) {
    document.getElementById('groupListCard').style.display = 'none';
    document.getElementById('builderCard').style.display = 'block';
    try {
        const res = await fetch('api/get_group.php?id=' + id);
        const json = await res.json();
        if (!json.success) { toast(json.error || 'Gagal memuat', 'err'); return; }
        groupData = json;
        buildStatesFromServer();
        renderHead();
        renderFromStates(initialStates);
    } catch (e) { toast('Error: ' + e.message, 'err'); }
}

function renderHead() {
    const { group, rows } = groupData;
    document.getElementById('cbTitle').textContent = group.title || ('Comparison #' + group.group_id);
    document.getElementById('grpMeta').textContent =
        `${rows.length} PR · dibuat oleh ${group.created_by_name || '-'} · ${group.created_at || ''}`;
    const st = document.getElementById('grpStatus');
    st.textContent = (group.status || 'draft').toUpperCase();
    st.className = 'pill ' + (group.status || 'draft');
}

// Bangun state awal dari server.
function buildStatesFromServer() {
    cidMeta = {}; cidOrder = []; manualAward = {};
    initialStates = [];
    (groupData.rows || []).forEach(r => {
        const cid = String(r.comparison_id);
        cidOrder.push(cid);
        cidMeta[cid] = {
            pr_number: r.pr_number, pr_item: r.pr_item, material_code: r.material_code,
            description: r.description, uom: r.uom, qty_pr: srv(r.qty_pr),
            recommended: r.recommended_supplier_name || ''
        };
        // Plan seed dari kandidat; kalau kosong buat 1 baris default.
        let plans = (r.plans || []).map(p => ({
            qty: srv(p.plan_qty) || srv(r.qty_pr),
            currency: p.plan_currency || '',
            price_foreign: p.plan_price_foreign ? srv(p.plan_price_foreign) : '',
            kurs_date: dateVal(p.plan_kurs_date),
            kurs_idr: p.plan_kurs_idr ? srv(p.plan_kurs_idr) : '',
            price_idr: p.plan_price_idr ? srv(p.plan_price_idr) : '',
            supplier: p.plan_supplier_name || '',
            is_awarded: srv(p.is_awarded) === 1
        }));
        if (!plans.length) plans = [blankPlan(srv(r.qty_pr))];
        let awardedIndex = plans.findIndex(p => p.is_awarded);
        // Kalau ada awarded_supplier di parent tapi plan belum ditandai.
        if (awardedIndex < 0 && r.awarded_supplier_name) {
            awardedIndex = plans.findIndex(p => p.supplier === r.awarded_supplier_name);
        }
        // Kalau award tersimpan BUKAN yang termurah, anggap itu pilihan MANUAL
        // supaya tidak ketimpa auto saat reload.
        let cheapest = -1, cp = Infinity;
        plans.forEach((p, idx) => {
            const pr = srv(p.price_idr);
            if (String(p.supplier || '').trim() && pr > 0 && pr < cp) { cp = pr; cheapest = idx; }
        });
        if (awardedIndex >= 0 && awardedIndex !== cheapest) manualAward[cid] = awardedIndex;
        initialStates.push({
            cid,
            last: {
                qty: r.last_qty ? srv(r.last_qty) : '', po_number: r.last_po_number || '',
                po_date: dateVal(r.last_po_date), currency: r.last_currency || '',
                price_foreign: r.last_price_foreign ? srv(r.last_price_foreign) : '',
                kurs_date: dateVal(r.last_kurs_date), kurs_idr: r.last_kurs_idr ? srv(r.last_kurs_idr) : '',
                price_idr: r.last_price_idr ? srv(r.last_price_idr) : '', supplier: r.last_supplier_name || ''
            },
            awarded: {
                po_date: dateVal(r.awarded_po_date),
                // Deliv. schedule default dari Delivery Date PR (ME5A kolom G).
                deliv_date: dateVal(r.awarded_deliv_date) || dateVal(r.pr_delivery_date),
                po_number: r.awarded_po_number || '', supplier: r.awarded_supplier_name || '',
                amount: r.awarded_amount ? srv(r.awarded_amount) : '', keterangan: r.awarded_keterangan || ''
            },
            plans, awardedIndex
        });
    });
}
let initialStates = [];

function blankPlan(qty) {
    return { qty: qty || '', currency: '', price_foreign: '', kurs_date: '', kurs_idr: '', price_idr: '', supplier: '', is_awarded: false };
}

// ================= RENDER =================
function renderFromStates(states) {
    const body = document.getElementById('ssBody');
    if (!states.length) { body.innerHTML = '<tr><td colspan="38" class="empty">Tidak ada PR.</td></tr>'; return; }
    body.innerHTML = states.map((s, i) => renderPrBlock(s, i)).join('');
    states.forEach(s => recalcCid(s.cid));
}

function inp(f, val, opts = {}) {
    const cls = opts.cls || '';
    const ro = opts.ro ? 'readonly' : '';
    const type = opts.type || 'text';
    const list = opts.list ? `list="${opts.list}"` : '';
    let v = (val === null || val === undefined) ? '' : val;
    if (isNumericField(f)) v = fmtNum(v);   // price & qty pakai pemisah ribuan
    return `<input type="${type}" data-f="${f}" class="${cls}" ${ro} ${list} value="${esc(v)}">`;
}
function selCur(f, val) {
    return `<select data-f="${f}" class="in-cur">` +
        CUR.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o || '-'}</option>`).join('') + `</select>`;
}

function planCells(cid, prow, plan, isAwarded, isPrimary, total) {
    // 9 field + Award + (+/−)
    const rmBtn = isPrimary
        ? `<button class="btn-addp" onclick="addPlan('${cid}')" title="Tambah baris Plan Order">＋</button>`
        : `<button class="btn-delp" onclick="removePlan('${cid}',${prow})" title="Hapus baris ini">×</button>`;
    return `
        <td class="col-plan">${inp('plan.qty', plan.qty, { cls: 'in-qty' })}</td>
        <td class="col-plan">${selCur('plan.currency', plan.currency || '')}</td>
        <td class="col-plan">${inp('plan.price_foreign', plan.price_foreign, { cls: 'in-price' })}</td>
        <td class="col-plan">${inp('plan.kurs_date', plan.kurs_date, { type: 'date', cls: 'in-date' })}</td>
        <td class="col-plan">${inp('plan.kurs_idr', plan.kurs_idr, { cls: 'in-price' })}</td>
        <td class="col-plan">${inp('plan.price_idr', plan.price_idr, { cls: 'in-price' })}</td>
        <td class="col-plan">${inp('plan.tiba_nu', '', { cls: 'in-price', ro: true })}</td>
        <td class="col-plan">${inp('plan.amount', '', { cls: 'in-price', ro: true })}</td>
        <td class="col-plan">${inp('plan.supplier', plan.supplier, { cls: 'in-sup', list: 'supplierDatalist' })}</td>
        <td class="col-plan" style="text-align:center;"><button type="button" class="btn-awardsel ${isAwarded ? 'on' : ''}" onclick="awardClick('${cid}',${prow})" title="Klik untuk award manual baris ini">${isAwarded ? '✔' : '○'}</button></td>
        <td class="col-plan">${rmBtn}</td>`;
}
function gapCells() {
    return `
        <td class="col-gap">${inp('gap.price', '', { cls: 'in-price', ro: true })}</td>
        <td class="col-gap">${inp('gap.percent', '', { cls: 'in-qty', ro: true })}</td>
        <td class="col-gap gap-status">—</td>`;
}

function renderPrBlock(s, idx) {
    const cid = s.cid;
    const meta = cidMeta[cid];
    const R = s.plans.length;
    const rec = meta.recommended;
    const recBadge = rec ? `<div class="rec-badge" title="Rekomendasi termurah">★ ${esc(rec)}</div>` : '';
    const anyAwd = s.awardedIndex >= 0;

    let html = '';
    s.plans.forEach((plan, prow) => {
        const awarded = prow === s.awardedIndex;
        if (prow === 0) {
            html += `<tr data-cid="${cid}" data-prow="0" data-awarded="${s.awardedIndex}" class="${anyAwd ? 'awarded-row' : ''} ${awarded ? 'plan-awarded' : ''}">
                <td rowspan="${R}">${idx + 1}</td>
                <td rowspan="${R}" class="pr-cell">${esc(meta.pr_number)}<br><span class="muted">item ${esc(meta.pr_item || '')}</span></td>
                <td rowspan="${R}">${esc(meta.material_code) || '<span class="muted">—</span>'}</td>
                <td rowspan="${R}" style="text-align:left; min-width:180px;">${esc(meta.description)}${recBadge}</td>
                <td rowspan="${R}">${esc(meta.uom)}</td>
                <td rowspan="${R}">${fmt(meta.qty_pr)}</td>
                <td rowspan="${R}" class="col-last">
                    <button class="btn-hist" onclick="openHist('${cid}')" title="Pilih dari historical comparison">📋</button>
                    <button class="btn-all" onclick="applyToAll('${cid}')" title="Terapkan Last Order ke SEMUA baris">⇊ All</button>
                </td>
                <td rowspan="${R}" class="col-last">${inp('last.qty', s.last.qty, { cls: 'in-qty' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.po_number', s.last.po_number, { cls: 'in-po' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.po_date', s.last.po_date, { type: 'date', cls: 'in-date' })}</td>
                <td rowspan="${R}" class="col-last">${selCur('last.currency', s.last.currency)}</td>
                <td rowspan="${R}" class="col-last">${inp('last.price_foreign', s.last.price_foreign, { cls: 'in-price' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.kurs_date', s.last.kurs_date, { type: 'date', cls: 'in-date' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.kurs_idr', s.last.kurs_idr, { cls: 'in-price' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.price_idr', s.last.price_idr, { cls: 'in-price' })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.tiba_nu', '', { cls: 'in-price', ro: true })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.amount', '', { cls: 'in-price', ro: true })}</td>
                <td rowspan="${R}" class="col-last">${inp('last.supplier', s.last.supplier, { cls: 'in-sup', list: 'supplierDatalist' })}</td>
                ${planCells(cid, 0, plan, awarded, true, R)}
                ${gapCells()}
                <td rowspan="${R}" class="col-awd">${inp('awd.po_date', s.awarded.po_date, { type: 'date', cls: 'in-date' })}</td>
                <td rowspan="${R}" class="col-awd">${inp('awd.deliv_date', s.awarded.deliv_date, { type: 'date', cls: 'in-date' })}</td>
                <td rowspan="${R}" class="col-awd">${inp('awd.po_number', s.awarded.po_number, { cls: 'in-po' })}</td>
                <td rowspan="${R}" class="col-awd">${inp('awd.supplier', s.awarded.supplier, { cls: 'in-sup', list: 'supplierDatalist' })}</td>
                <td rowspan="${R}" class="col-awd">${inp('awd.amount', s.awarded.amount, { cls: 'in-price' })}</td>
                <td rowspan="${R}" class="col-awd">${inp('awd.keterangan', s.awarded.keterangan, { cls: 'in-sup' })}</td>
            </tr>`;
        } else {
            html += `<tr data-cid="${cid}" data-prow="${prow}" class="${awarded ? 'plan-awarded' : ''}">
                ${planCells(cid, prow, plan, awarded, false, R)}
                ${gapCells()}
            </tr>`;
        }
    });
    return html;
}

// ================= CALC =================
function planTr(cid, prow) { return document.querySelector(`#ssBody tr[data-cid="${cid}"][data-prow="${prow}"]`); }
function primaryTr(cid) { return document.querySelector(`#ssBody tr[data-cid="${cid}"][data-prow="0"]`); }
function nf(f, v) { return isNumericLeaf(f) ? fmtNum(v) : v; } // format numeric leaf
function getL(cid, f) { const el = primaryTr(cid)?.querySelector(`[data-f="last.${f}"]`); return el ? el.value : ''; }
function setL(cid, f, v) { const el = primaryTr(cid)?.querySelector(`[data-f="last.${f}"]`); if (el) el.value = nf(f, v); }
function getA(cid, f) { const el = primaryTr(cid)?.querySelector(`[data-f="awd.${f}"]`); return el ? el.value : ''; }
function setA(cid, f, v) { const el = primaryTr(cid)?.querySelector(`[data-f="awd.${f}"]`); if (el) el.value = nf(f, v); }
function getP(cid, prow, f) { const el = planTr(cid, prow)?.querySelector(`[data-f="plan.${f}"]`); return el ? el.value : ''; }
function setP(cid, prow, f, v) { const el = planTr(cid, prow)?.querySelector(`[data-f="plan.${f}"]`); if (el) el.value = nf(f, v); }
function setGap(cid, prow, f, v) { const el = planTr(cid, prow)?.querySelector(`[data-f="gap.${f}"]`); if (el) el.value = nf(f, v); }

function copyLastToPlan(cid, prow) {
    setP(cid, prow, 'currency', getL(cid, 'currency'));
    setP(cid, prow, 'price_foreign', num(getL(cid, 'price_foreign')));
    setP(cid, prow, 'kurs_date', getL(cid, 'kurs_date'));
    setP(cid, prow, 'kurs_idr', num(getL(cid, 'kurs_idr')));
    setP(cid, prow, 'price_idr', num(getL(cid, 'price_idr')));
    if (getL(cid, 'supplier')) setP(cid, prow, 'supplier', getL(cid, 'supplier'));
}

function lastPriceIdr(cid) {
    const foreign = num(getL(cid, 'price_foreign'));
    const kurs = num(getL(cid, 'kurs_idr'));
    let p;
    if (foreign > 0) { p = foreign * (kurs > 0 ? kurs : 1); setL(cid, 'price_idr', round2(p)); }
    else p = num(getL(cid, 'price_idr'));
    setL(cid, 'tiba_nu', round2(p));
    setL(cid, 'amount', round2(num(getL(cid, 'qty')) * p));
    return p;
}

function recalcPlan(cid, prow) {
    const foreign = num(getP(cid, prow, 'price_foreign'));
    const kurs = num(getP(cid, prow, 'kurs_idr'));
    let p;
    if (foreign > 0) { p = foreign * (kurs > 0 ? kurs : 1); setP(cid, prow, 'price_idr', round2(p)); }
    else p = num(getP(cid, prow, 'price_idr'));
    const qty = num(getP(cid, prow, 'qty'));
    setP(cid, prow, 'tiba_nu', round2(p));
    setP(cid, prow, 'amount', round2(qty * p));

    const lp = num(getL(cid, 'price_idr'));
    const tr = planTr(cid, prow);
    const gapPrice = (p > 0 && lp > 0) ? (p - lp) : 0;
    const gapPct = lp > 0 ? (gapPrice / lp * 100) : 0;
    setGap(cid, prow, 'price', (p > 0 && lp > 0) ? round2(gapPrice) : '');
    setGap(cid, prow, 'percent', (p > 0 && lp > 0) ? gapPct.toFixed(2) : '');
    const gs = tr.querySelector('.gap-status');
    if (p > 0 && lp > 0) {
        const cls = gapPrice < 0 ? 'gap-cheaper' : (gapPrice > 0 ? 'gap-exp' : 'gap-same');
        const arr = gapPrice < 0 ? '▼ MURAH' : (gapPrice > 0 ? '▲ MAHAL' : '— SAMA');
        gs.innerHTML = `<span class="${cls}">${arr}</span>`;
    } else gs.textContent = '—';
}

function recalcCid(cid) {
    lastPriceIdr(cid);
    nPlans(cid).forEach(prow => recalcPlan(cid, prow));
    applyAward(cid);
}
function nPlans(cid) {
    return Array.from(document.querySelectorAll(`#ssBody tr[data-cid="${cid}"]`)).map(tr => tr.getAttribute('data-prow'));
}

// ================= ADD / REMOVE / AWARD =================
function addPlan(cid) {
    const states = collectStates();
    const s = states.find(x => x.cid === cid);
    s.plans.push(blankPlan(cidMeta[cid].qty_pr));
    renderFromStates(states);
}
function removePlan(cid, prow) {
    const states = collectStates();
    const s = states.find(x => x.cid === cid);
    if (s.plans.length <= 1) { toast('Minimal 1 baris plan', 'err'); return; }
    s.plans.splice(prow, 1);
    if (s.awardedIndex === prow) s.awardedIndex = -1;
    else if (s.awardedIndex > prow) s.awardedIndex -= 1;
    // Geser index pilihan manual mengikuti penghapusan baris.
    if (manualAward[cid] === prow) delete manualAward[cid];
    else if (manualAward[cid] !== undefined && manualAward[cid] > prow) manualAward[cid] -= 1;
    renderFromStates(states);
}
// APPLY AWARD: default AUTO (harga termurah), tapi kalau user sudah memilih
// MANUAL (manualAward[cid]) & pilihan itu valid -> pakai pilihan manual.
// Awarded Supplier & Amount auto-terisi; No PO & Tgl PO TIDAK disentuh.
function applyAward(cid) {
    const prows = nPlans(cid).map(Number).sort((a, b) => a - b);
    const valid = prow => String(getP(cid, prow, 'supplier') || '').trim() && num(getP(cid, prow, 'price_idr')) > 0;

    let chosen = -1;
    if (manualAward[cid] !== undefined && prows.includes(manualAward[cid]) && valid(manualAward[cid])) {
        chosen = manualAward[cid];                       // pilihan manual user
    } else {
        let best = -1, bestPrice = Infinity;             // auto termurah
        prows.forEach(prow => {
            const price = num(getP(cid, prow, 'price_idr'));
            if (valid(prow) && price < bestPrice) { bestPrice = price; best = prow; }
        });
        chosen = best;
    }

    prows.forEach(prow => {
        const tr = planTr(cid, prow);
        const isAwd = (prow === chosen);
        tr.classList.toggle('plan-awarded', isAwd);
        const btn = tr.querySelector('.btn-awardsel');
        if (btn) {
            btn.classList.toggle('on', isAwd);
            const isManual = (manualAward[cid] === prow);
            btn.textContent = isAwd ? '✔' : '○';
            btn.title = isAwd
                ? (isManual ? 'Awarded (manual) — klik lagi untuk kembali ke auto termurah'
                            : 'Awarded (auto termurah) — klik untuk kunci manual')
                : 'Klik untuk award manual baris ini';
        }
    });

    const primary = primaryTr(cid);
    if (primary) primary.classList.toggle('awarded-row', chosen >= 0);

    if (chosen >= 0) {
        setA(cid, 'supplier', getP(cid, chosen, 'supplier'));
        setA(cid, 'amount', num(getP(cid, chosen, 'amount')));
    } else {
        setA(cid, 'supplier', '');
        setA(cid, 'amount', '');
    }
}

// Klik indikator award: toggle manual. Klik baris yang sudah awarded manual
// -> kembali ke auto termurah.
function awardClick(cid, prow) {
    prow = Number(prow);
    if (manualAward[cid] === prow) delete manualAward[cid];
    else manualAward[cid] = prow;
    applyAward(cid);
}

function recommendAll() {
    const states = collectStates();
    states.forEach(s => {
        const rec = cidMeta[s.cid].recommended;
        if (!rec) return;
        // set plan pertama ke supplier rekomendasi (biarkan harga apa adanya).
        s.plans[0].supplier = rec;
    });
    renderFromStates(states);
    toast('Plan Order #1 diset ke supplier termurah', 'ok');
}

// ================= COLLECT (DOM -> state) =================
function collectStates() {
    // Simpan numeric sebagai NUMBER (di-parse dari input UI), teks apa adanya.
    return cidOrder.map(cid => {
        const last = {}; LAST_FIELDS.forEach(f => last[f] = isNumericLeaf(f) ? num(getL(cid, f)) : getL(cid, f));
        const awarded = {}; AWD_FIELDS.forEach(f => awarded[f] = isNumericLeaf(f) ? num(getA(cid, f)) : getA(cid, f));
        const prows = nPlans(cid).map(Number).sort((a, b) => a - b);
        const plans = prows.map(prow => {
            const o = {}; PLAN_FIELDS.forEach(f => o[f] = isNumericLeaf(f) ? num(getP(cid, prow, f)) : getP(cid, prow, f));
            o.is_awarded = planTr(cid, prow).classList.contains('plan-awarded');
            return o;
        });
        let awardedIndex = plans.findIndex(p => p.is_awarded);
        return { cid, last, awarded, plans, awardedIndex };
    });
}

// ================= APPLY TO ALL / HISTORICAL =================
function applyToAll(cid) {
    const vals = {}; LAST_FIELDS.forEach(f => vals[f] = getL(cid, f));
    cidOrder.forEach(t => {
        LAST_FIELDS.forEach(f => setL(t, f, isNumericLeaf(f) ? num(vals[f]) : vals[f]));
        copyLastToPlan(t, 0);
        recalcCid(t);
    });
    toast('Last Order diterapkan ke semua baris', 'ok');
}

async function openHist(cid) {
    histTargetCid = cid;
    document.getElementById('histModal').classList.add('on');
    document.getElementById('histSearch').value = '';
    if (historyCache.length === 0) {
        try {
            const res = await fetch('api/get_history.php');
            const json = await res.json();
            historyCache = (json.success ? json.data : []).filter(h => srv(h.price) > 0);
        } catch (e) { toast('Error load history: ' + e.message, 'err'); }
    }
    renderHistBody();
}
function closeHist() { document.getElementById('histModal').classList.remove('on'); }

function renderHistBody() {
    const kw = (document.getElementById('histSearch').value || '').toLowerCase();
    const rows = historyCache.filter(h => !kw ||
        [h.pr_number, h.material, h.material_code, h.plan_supplier].some(v => String(v || '').toLowerCase().includes(kw)));
    const body = document.getElementById('histBody');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="8" class="empty">Tidak ada historical dengan harga.</td></tr>'; return; }
    body.innerHTML = rows.slice(0, 200).map(h => `
        <tr class="hist-row" onclick='applyHist(${h.comparison_id})'>
            <td>#${h.comparison_id}</td><td>${esc(h.pr_number) || '-'}</td>
            <td>${esc(h.material || h.material_code || h.material_group || '-')}</td>
            <td>${esc(h.plan_supplier || '-')}</td>
            <td class="num">${fmtRp(h.price)}</td>
            <td>${esc(h.po_number) || '-'}</td><td>${esc(fmtDate(h.po_date))}</td>
            <td><span class="pill ${h.status || 'draft'}">${String(h.status || '').toUpperCase()}</span></td>
        </tr>`).join('');
}

function applyHist(comparisonId) {
    const h = historyCache.find(x => x.comparison_id == comparisonId);
    if (!h || histTargetCid == null) return;
    const cid = histTargetCid;
    const q = h.plan_qty ?? h.qty;
    setL(cid, 'qty', q ? srv(q) : '');
    setL(cid, 'po_number', h.po_number || '');
    setL(cid, 'po_date', dateVal(h.po_date));
    setL(cid, 'currency', h.plan_currency || 'IDR');
    setL(cid, 'price_foreign', '');
    setL(cid, 'kurs_date', '');
    setL(cid, 'kurs_idr', '');
    setL(cid, 'price_idr', srv(h.price));
    setL(cid, 'supplier', h.plan_supplier || '');
    copyLastToPlan(cid, 0);
    recalcCid(cid);
    closeHist();
    toast('Last Order + Plan #1 terisi dari comparison #' + comparisonId, 'ok');
}

// ================= SAVE =================
async function saveGroup(finalize) {
    const states = collectStates();
    const rows = states.map(s => {
        const awardedIdx = s.awardedIndex;
        const isAwd = awardedIdx >= 0;
        const plans = s.plans.map((p, i) => ({
            qty: srv(p.qty), currency: p.currency, price_foreign: srv(p.price_foreign),
            kurs_date: p.kurs_date, kurs_idr: srv(p.kurs_idr), price_idr: srv(p.price_idr),
            tiba_nu: srv(p.tiba_nu), amount: srv(p.amount), supplier: p.supplier,
            is_awarded: i === awardedIdx ? 1 : 0
        }));
        return {
            comparison_id: Number(s.cid),
            last: normLast(s.last),
            awarded: normAwd(s.awarded),
            plans,
            awarded_index: awardedIdx,
            is_awarded: isAwd ? 1 : 0
        };
    });

    const awardCount = rows.filter(r => r.is_awarded).length;
    if (finalize && awardCount === 0) { toast('Belum ada item ter-award (isi Supplier + Price di Plan Order).', 'err'); return; }
    if (finalize) {
        // No PO & Tgl PO TIDAK wajib saat award — auto-terisi dari SAP export
        // (ME5A kolom PO / ZMM039) setelah PO dibuat di SAP.
        const notAwarded = rows.length - awardCount;
        if (notAwarded > 0 && !confirm(`${notAwarded} item belum ter-award. Finalisasi hanya mengunci yang sudah ter-award. Lanjut?`)) return;
    }

    try {
        const res = await fetch('api/save_group.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: groupId, rows, finalize })
        });
        const json = await res.json();
        if (json.success) { toast(json.message || 'Tersimpan', 'ok'); loadGroup(groupId); }
        else toast(json.error || 'Gagal menyimpan', 'err');
    } catch (e) { toast('Error: ' + e.message, 'err'); }
}
function normLast(l) {
    return {
        qty: srv(l.qty), po_number: l.po_number, po_date: l.po_date, currency: l.currency,
        price_foreign: srv(l.price_foreign), kurs_date: l.kurs_date, kurs_idr: srv(l.kurs_idr),
        price_idr: srv(l.price_idr), tiba_nu: srv(l.price_idr), amount: round2(srv(l.qty) * srv(l.price_idr)),
        supplier: l.supplier
    };
}
function normAwd(a) {
    return {
        po_date: a.po_date, deliv_date: a.deliv_date, po_number: a.po_number,
        supplier: a.supplier, amount: srv(a.amount), keterangan: a.keterangan
    };
}

// ================= util =================
// Parse angka dari INPUT UI (format Indonesia): '.' = ribuan, ',' = desimal.
// "30.000" -> 30000 ; "30.000,5" -> 30000.5 ; "30000" -> 30000
function num(v) {
    if (v === null || v === undefined || v === '') return 0;
    let s = String(v).trim().replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}
// Parse angka dari SERVER (JSON number / "30000.00"): '.' = desimal.
function srv(v) {
    if (v === null || v === undefined || v === '') return 0;
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}
// Format sebuah NUMBER jadi string ribuan Indonesia. Kosong kalau 0.
// PENTING: argumen harus sudah berupa number (bukan string ter-format).
function fmtNum(v) {
    const x = (typeof v === 'number') ? v : srv(v);
    return x ? x.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '';
}
// Leaf field yang berupa angka (price & qty) -> diformat ribuan.
const NUMERIC_LEAVES = ['qty', 'price_foreign', 'kurs_idr', 'price_idr', 'tiba_nu', 'amount', 'price'];
function isNumericLeaf(leaf) { return NUMERIC_LEAVES.includes(leaf); }
function isNumericField(f) { return isNumericLeaf(String(f).split('.').pop()); }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function fmt(n) { const x = parseFloat(n); return isNaN(x) ? '0' : x.toLocaleString('id-ID', { maximumFractionDigits: 2 }); }
function fmtRp(n) { const x = parseFloat(n || 0); return x ? 'Rp ' + x.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—'; }
function fmtDate(d) { if (!d) return '-'; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString('id-ID'); }
function dateVal(d) { if (!d) return ''; const s = String(d); return s.length >= 10 ? s.substring(0, 10) : ''; }
function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg; el.className = 'toast ' + (type || ''); el.style.display = 'block';
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
