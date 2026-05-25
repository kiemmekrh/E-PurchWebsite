// File: assets/js/dashboard.js
let currentPage = 1;
let rowsPerPage = 10;
let uploadedFile = null;
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

    tbody.innerHTML = data.map(po => `
        <tr>
            <td><input type="checkbox" class="row-check" data-id="${po.po_number}"></td>
            <td><strong>${po.po_number}</strong></td>
            <td>${po.po_item}</td>
            <td>${po.description || '-'}</td>
            <td>${po.supplier_name || '-'}</td>
            <td>${formatDate(po.po_date)}</td>
            <td>${formatNumber(po.ordered_quantity)}</td>
            <td>${formatNumber(po.balance_qty || 0)}</td>
            <td>${formatNumber(po.received_qty || 0)}</td>
            <td>${po.gr_numbers || '-'}</td>
            <td>${po.last_gr_date ? formatDate(po.last_gr_date) : '-'}</td>
            <td><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></td>
        </tr>
    `).join('');

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', function () {
        document.querySelectorAll('.row-check').forEach(cb => cb.checked = this.checked);
    });
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

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────

function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    uploadedFile = null;
    // Reset file input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
}

function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4285f4';
        dropZone.style.background = '#e3f2fd';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#f8f9fa';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ddd';
        dropZone.style.background = '#f8f9fa';
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });
}

function handleFile(file) {
    // Validate extension
    const allowed = ['xlsx', 'xls'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showToast('Invalid file type. Please upload .xlsx or .xls file.', 'error');
        return;
    }

    uploadedFile = file;
    document.getElementById('fileList').innerHTML = `
        <div class="file-item">
            <div class="file-icon">📎</div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
            </div>
            <span class="file-remove" onclick="clearUpload()">✕</span>
        </div>
    `;
    document.getElementById('uploadBtn').disabled = false;
}

function clearUpload() {
    uploadedFile = null;
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
}

function processUpload() {
    if (!uploadedFile) return;

    const formData = new FormData();
    formData.append('file', uploadedFile);

    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBtn = document.getElementById('uploadBtn');

    progressBar.style.display = 'block';
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Processing...';

    // Animate progress bar while waiting
    let progress = 0;
    const interval = setInterval(() => {
        if (progress < 85) {
            progress += 5;
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
    }, 150);

    fetch('api/upload_zmm039.php', {
        method: 'POST',
        body: formData
    })
        .then(r => r.json())
        .then(data => {
            clearInterval(interval);
            progressFill.style.width = '100%';
            progressText.textContent = '100%';

            setTimeout(() => {
                if (data.success) {
                    showToast(`✅ Success! ${data.processed} records processed.`, 'success');
                    hideUploadModal();
                    loadDashboardData();
                } else {
                    showToast('❌ Error: ' + data.error, 'error');
                    uploadBtn.disabled = false;
                    uploadBtn.textContent = 'Upload & Process';
                    progressBar.style.display = 'none';
                }
            }, 500);
        })
        .catch(err => {
            clearInterval(interval);
            showToast('Connection error during upload.', 'error');
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload & Process';
            progressBar.style.display = 'none';
            console.error(err);
        });
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

function exportTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => th.textContent.replace(/[↓↑↕]/g, '').trim())
        .filter((_, i) => i !== 0); // skip checkbox column

    const rows = Array.from(table.querySelectorAll('tbody tr'))
        .filter(tr => !tr.querySelector('td[colspan]')) // skip "no data" row
        .map(row =>
            Array.from(row.querySelectorAll('td'))
                .filter((_, i) => i !== 0) // skip checkbox column
                .map(td => `"${td.textContent.trim().replace(/"/g, '""')}"`)
        );

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PO_Dashboard_${formatDateForFilename(new Date())}.csv`;
    link.click();
    showToast('Export successful!', 'success');
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