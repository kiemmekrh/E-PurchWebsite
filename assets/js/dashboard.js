// File: assets/js/dashboard.js
let currentPage = 1;
let rowsPerPage = 10;
let allData = [];

// ─── LOAD & RENDER ───────────────────────────────────────────────────────────

function loadDashboardData() {
    const params = new URLSearchParams({
        page: currentPage,
        limit: rowsPerPage,
        search: document.getElementById('searchPO')?.value || '',
        status: document.getElementById('filterStatus')?.value || 'all',
        date_from: document.getElementById('filterDateFrom')?.value || '',
        date_to: document.getElementById('filterDateTo')?.value || ''
    });

    fetch(`api/get_po_data.php?${params}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                renderPOTable(data.data);
                updateStats(data.stats);
                updatePagination(data.pagination);
            } else {
                showToast('Failed to load data: ' + (data.error || 'Unknown error'), 'error');
            }
        })
        .catch(err => {
            showToast('Connection error. Please refresh the page.', 'error');
            console.error(err);
        });
}

function renderPOTable(data) {
    const tbody = document.getElementById('poTableBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" style="text-align:center; padding:40px; color:#888;">
                    No data found
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = data.map((po, idx) => {
        // GR Numbers — collapsed if more than 2
        let grHTML = '-';
        if (po.gr_numbers && po.gr_numbers !== '-') {
            const grList = po.gr_numbers.split(', ').map(gr => `<div style="font-size:12px;">${gr}</div>`);
            const MAX_VISIBLE = 2;
            if (grList.length <= MAX_VISIBLE) {
                grHTML = grList.join('');
            } else {
                const hiddenCount = grList.length - MAX_VISIBLE;
                grHTML = `
                    ${grList.slice(0, MAX_VISIBLE).join('')}
                    <div id="dash-gr-more-${idx}" style="display:none;">
                        ${grList.slice(MAX_VISIBLE).join('')}
                    </div>
                    <span onclick="toggleDashGR(${idx}, event)"
                          id="dash-gr-toggle-${idx}"
                          style="font-size:11px; color:#4285f4; cursor:pointer; user-select:none;">
                        +${hiddenCount} more
                    </span>`;
            }
        }

        return `
        <tr>
            <td><input type="checkbox" class="row-check" data-id="${po.po_number}"></td>
            <td><strong>${po.po_number}</strong></td>
            <td>${po.po_item}</td>
            <td>${po.description || '-'}</td>
            <td>${po.supplier_name || '-'}</td>
            <td>${formatDate(po.po_date)}</td>
            <td>${formatNumber(po.ordered_quantity)}</td>
            <td>${formatNumber(po.received_qty || 0)}</td>
            <td style="${parseFloat(po.balance_qty) > 0 ? 'color:#dc3545; font-weight:bold;' : 'color:#28a745;'}">${formatNumber(po.balance_qty || 0)}</td>
            <td>${grHTML}</td>
            <td>${po.last_gr_date ? formatDate(po.last_gr_date) : '-'}</td>
            <td><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></td>
        </tr>
    `}).join('');

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', function () {
        document.querySelectorAll('.row-check').forEach(cb => cb.checked = this.checked);
    });
}

function toggleDashGR(idx, e) {
    e.stopPropagation();
    const more   = document.getElementById(`dash-gr-more-${idx}`);
    const toggle = document.getElementById(`dash-gr-toggle-${idx}`);
    if (!more) return;
    const isHidden = more.style.display === 'none';
    more.style.display = isHidden ? 'block' : 'none';
    toggle.textContent = isHidden ? 'Show less' : `+${more.querySelectorAll('div').length} more`;
}

function updateStats(stats) {
    document.getElementById('totalPO').textContent = stats.total || 0;
    document.getElementById('openPO').textContent = stats.open || 0;
    document.getElementById('partialPO').textContent = stats.partial || 0;
    document.getElementById('completedPO').textContent = stats.completed || 0;
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function updatePagination(pagination) {
    if (!pagination) return;
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages} (${pagination.total_rows} records)`;
    }
    // Store total pages for navigation
    document.getElementById('pageInfo').dataset.totalPages = pagination.total_pages;
}

function changePage(direction) {
    const pageInfo = document.getElementById('pageInfo');
    const totalPages = parseInt(pageInfo?.dataset.totalPages || 1);
    const newPage = currentPage + direction;

    if (newPage < 1 || newPage > totalPages) return;
    currentPage = newPage;
    loadDashboardData();
}

function changeRowsPerPage(value) {
    rowsPerPage = parseInt(value);
    currentPage = 1;
    loadDashboardData();
}

// ─── FILTERS ─────────────────────────────────────────────────────────────────

function resetFilters() {
    document.getElementById('searchPO').value = '';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    currentPage = 1;
    loadDashboardData();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('id-ID');
}

function formatDateForFilename(date) {
    return date.toISOString().split('T')[0];
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 14px 22px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        color: white;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeIn 0.3s ease;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    toast.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}