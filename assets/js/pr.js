// File: assets/js/pr.js
// Stage 1 PR Intake: upload ME5A + tampilkan daftar PR.

let prData = [];
let prPage = 1;
const PR_PER_PAGE = 15;
let selectedFile = null;
let selectedPRs = new Set(); // pr_id yang dipilih untuk comparison

document.addEventListener('DOMContentLoaded', () => {
    const dropZone  = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => setFile(fileInput.files[0]));

    ['dragover', 'dragenter'].forEach(ev =>
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev =>
        dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag'); }));
    dropZone.addEventListener('drop', e => {
        if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });

    uploadBtn.addEventListener('click', doUpload);

    document.getElementById('searchInput').addEventListener('input', debounce(loadPRList, 300));
    document.getElementById('needPoOnly').addEventListener('change', loadPRList);

    loadPRList();
});

function setFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
        toast('File harus .xlsx atau .xls', 'err');
        return;
    }
    selectedFile = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('uploadBtn').disabled = false;
}

async function doUpload() {
    if (!selectedFile) return;
    const btn = document.getElementById('uploadBtn');
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const fd = new FormData();
    fd.append('file', selectedFile);

    try {
        const res = await fetch('api/upload_me5a.php', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.success) {
            toast(json.message || 'Upload berhasil', 'ok');
            selectedFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('fileName').textContent = 'Belum ada file dipilih.';
            loadPRList();
        } else {
            toast(json.error || 'Upload gagal', 'err');
        }
    } catch (e) {
        toast('Error: ' + e.message, 'err');
    } finally {
        btn.textContent = 'Upload & Proses';
        btn.disabled = selectedFile === null;
    }
}

async function loadPRList() {
    const search = document.getElementById('searchInput').value.trim();
    const needPo = document.getElementById('needPoOnly').checked;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (needPo) params.set('need_po', '1');

    try {
        const res = await fetch('api/get_pr_list.php?' + params.toString());
        const json = await res.json();
        if (!json.success) { toast(json.error || 'Gagal memuat data', 'err'); return; }

        prData = json.data || [];
        prPage = 1;
        renderStats(json.summary);
        renderTable();
    } catch (e) {
        toast('Error: ' + e.message, 'err');
    }
}

function renderStats(s) {
    if (!s) return;
    document.getElementById('statTotal').textContent = fmt(s.total);
    document.getElementById('statNeed').textContent  = fmt(s.need_po);
    document.getElementById('statHas').textContent   = fmt(s.with_po);
}

function renderTable() {
    const body = document.getElementById('prTableBody');
    if (!prData.length) {
        body.innerHTML = '<tr><td colspan="9" class="empty">Tidak ada PR yang cocok.</td></tr>';
        document.getElementById('rowInfo').textContent = '0 baris';
        document.getElementById('pagination').innerHTML = '';
        updateSelectionUI();
        return;
    }

    const start = (prPage - 1) * PR_PER_PAGE;
    const page  = prData.slice(start, start + PR_PER_PAGE);

    body.innerHTML = page.map(r => {
        // Hanya PR yang belum ada PO & belum di-award yang bisa dipilih.
        const selectable = (r.status === 'open' || r.status === 'in_comparison');
        const checked = selectedPRs.has(String(r.pr_id)) ? 'checked' : '';
        const cb = selectable
            ? `<input type="checkbox" value="${r.pr_id}" ${checked} onchange="togglePR('${r.pr_id}')">`
            : `<span style="color:#ccc" title="Sudah ada PO / awarded">—</span>`;
        return `
        <tr>
            <td class="chk-col">${cb}</td>
            <td><strong>${esc(r.pr_number)}</strong></td>
            <td>${esc(r.pr_item)}</td>
            <td>${esc(r.material_code) || '<span style="color:#bbb">—</span>'}</td>
            <td>${esc(r.description)}</td>
            <td>${esc(r.uom)}</td>
            <td style="text-align:right">${fmt(r.qty_pr)}</td>
            <td>${esc(r.po_number) || '<span style="color:#e67e22">belum ada</span>'}</td>
            <td><span class="badge ${r.status}">${statusLabel(r.status)}</span></td>
        </tr>`;
    }).join('');

    const total = prData.length;
    document.getElementById('rowInfo').textContent =
        `Menampilkan ${start + 1}–${Math.min(start + PR_PER_PAGE, total)} dari ${total} baris`;
    renderPagination(total);
    updateSelectionUI();
}

function togglePR(prId) {
    prId = String(prId);
    if (selectedPRs.has(prId)) selectedPRs.delete(prId);
    else selectedPRs.add(prId);
    updateSelectionUI();
}

function toggleSelectAllPR() {
    const checkAll = document.getElementById('selectAllPR').checked;
    document.querySelectorAll('#prTableBody input[type="checkbox"]').forEach(cb => {
        cb.checked = checkAll;
        if (checkAll) selectedPRs.add(String(cb.value));
        else selectedPRs.delete(String(cb.value));
    });
    updateSelectionUI();
}

function updateSelectionUI() {
    const n = selectedPRs.size;
    const countEl = document.getElementById('selCount');
    const btn = document.getElementById('btnCreateComparison');
    if (countEl) countEl.textContent = n;
    if (btn) btn.disabled = n === 0;
}

async function createComparisonFromPR() {
    if (selectedPRs.size === 0) return;
    const btn = document.getElementById('btnCreateComparison');
    btn.disabled = true;
    const prIds = Array.from(selectedPRs).map(Number);

    try {
        const res = await fetch('../comparison/api/create_from_pr.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pr_ids: prIds })
        });
        const json = await res.json();
        if (json.success) {
            toast(json.message || 'Comparison dibuat', 'ok');
            selectedPRs.clear();
            // Arahkan ke builder untuk review & confirm.
            setTimeout(() => {
                window.location.href = '../comparison/builder.php?group=' + json.group_id;
            }, 600);
        } else {
            toast(json.error || 'Gagal membuat comparison', 'err');
            btn.disabled = false;
        }
    } catch (e) {
        toast('Error: ' + e.message, 'err');
        btn.disabled = false;
    }
}

function renderPagination(total) {
    const pages = Math.ceil(total / PR_PER_PAGE);
    const el = document.getElementById('pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }

    let html = `<button ${prPage === 1 ? 'disabled' : ''} onclick="gotoPage(${prPage - 1})">‹</button>`;
    const win = 2;
    for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || (p >= prPage - win && p <= prPage + win)) {
            html += `<button class="${p === prPage ? 'active' : ''}" onclick="gotoPage(${p})">${p}</button>`;
        } else if (p === prPage - win - 1 || p === prPage + win + 1) {
            html += `<span style="padding:0 6px;color:#aaa">…</span>`;
        }
    }
    html += `<button ${prPage === pages ? 'disabled' : ''} onclick="gotoPage(${prPage + 1})">›</button>`;
    el.innerHTML = html;
}

function gotoPage(p) { prPage = p; renderTable(); }

function statusLabel(s) {
    return { open: 'Butuh PO', in_comparison: 'In Comparison', awarded: 'Awarded', has_po: 'Ada PO' }[s] || s;
}

// ── util ──
function fmt(n) {
    if (n === null || n === undefined || n === '') return '0';
    const num = parseFloat(n);
    if (isNaN(num)) return esc(n);
    return num.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}
function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function toast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast ' + (type || '');
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 4000);
}
