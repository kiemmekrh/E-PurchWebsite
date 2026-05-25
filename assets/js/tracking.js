// File: assets/js/tracking.js
let currentTab = 'overview';

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────

function switchTab(tab, el) {
    currentTab = tab;

    document.querySelectorAll('.tracking-tab').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(panel => panel.style.display = 'none');
    const panel = document.getElementById(`tab-${tab}`);
    if (panel) panel.style.display = 'block';

    if (tab === 'pending')   loadPendingData();
    if (tab === 'completed') loadCompletedData();
    if (tab === 'history')   loadSyncHistory();
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

function loadTrackingData() {
    const search = document.getElementById('searchTracking')?.value || '';
    const status = document.getElementById('filterTrackingStatus')?.value || 'all';

    const params = new URLSearchParams({ search, status });

    fetch(`api/get_tracking_data.php?${params}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                updateStats(data.stats);
                renderTrackingTable(data.data);
            } else {
                showToast('Failed to load tracking data.', 'error');
            }
        })
        .catch(err => {
            showToast('Connection error.', 'error');
            console.error(err);
        });
}

function updateStats(stats) {
    document.getElementById('totalItems').textContent  = stats.total    || 0;
    document.getElementById('awaitingGR').textContent  = stats.open     || 0;
    document.getElementById('partialGR').textContent   = stats.partial  || 0;
    document.getElementById('fullyReceived').textContent = stats.completed || 0;
}

function renderTrackingTable(data) {
    const tbody = document.getElementById('trackingTableBody');

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding:40px; color:#888;">
                    No data found
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = data.map(row => {
        const grDetails = row.gr_details
            ? row.gr_details.split(';;').map(gr => {
                const [num, date, qty] = gr.split('|');
                return `<div class="gr-card" style="font-size:12px; margin-bottom:4px;">
                            <strong>${num}</strong><br>
                            ${formatDate(date)} — Qty: ${formatNumber(qty)}
                        </div>`;
            }).join('')
            : '<span style="color:#aaa;">No GR yet</span>';

        const balanceColor = parseFloat(row.balance_qty) > 0 ? 'color:#dc3545; font-weight:bold;' : 'color:#28a745;';

        return `
            <tr onclick="showPODetail('${row.po_number}', '${row.po_item}')" style="cursor:pointer;">
                <td><strong>${row.po_number}</strong></td>
                <td>${row.po_item}</td>
                <td>${row.description || '-'}</td>
                <td>${row.supplier_name || '-'}</td>
                <td>${formatNumber(row.ordered_quantity)}</td>
                <td>${formatNumber(row.received_qty)}</td>
                <td style="${balanceColor}">${formatNumber(row.balance_qty)}</td>
                <td>${grDetails}</td>
                <td><span class="status-badge status-${row.status.toLowerCase()}">${row.status}</span></td>
                <td>${row.last_gr_date ? formatDate(row.last_gr_date) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// ─── PENDING TAB ─────────────────────────────────────────────────────────────

function loadPendingData() {
    fetch('api/get_tracking_data.php?status=Open')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('pendingTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#888;">No pending PO found</td></tr>`;
                return;
            }

            tbody.innerHTML = data.data.map(row => `
                <tr>
                    <td><strong>${row.po_number}</strong></td>
                    <td>${row.description || '-'}</td>
                    <td>${row.supplier_name || '-'}</td>
                    <td>${formatNumber(row.ordered_quantity)}</td>
                    <td>${formatNumber(row.received_qty)}</td>
                    <td style="color:#dc3545; font-weight:bold;">${formatNumber(row.balance_qty)}</td>
                    <td>${formatDate(row.po_date)}</td>
                    <td>
                        <span style="
                            background: ${row.days_pending > 30 ? '#f8d7da' : '#fff3cd'};
                            color: ${row.days_pending > 30 ? '#721c24' : '#856404'};
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: 500;
                        ">
                            ${row.days_pending} days
                        </span>
                    </td>
                </tr>
            `).join('');
        })
        .catch(err => {
            showToast('Failed to load pending data.', 'error');
            console.error(err);
        });
}

// ─── COMPLETED TAB ───────────────────────────────────────────────────────────

function loadCompletedData() {
    fetch('api/get_tracking_data.php?status=Completed')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('completedTableBody');

            if (!data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#888;">No completed PO found</td></tr>`;
                return;
            }

            tbody.innerHTML = data.data.map(row => {
                const daysToComplete = row.last_gr_date
                    ? Math.ceil((new Date(row.last_gr_date) - new Date(row.po_date)) / (1000 * 60 * 60 * 24))
                    : '-';

                return `
                    <tr>
                        <td><strong>${row.po_number}</strong></td>
                        <td>${row.description || '-'}</td>
                        <td>${row.supplier_name || '-'}</td>
                        <td>${formatNumber(row.ordered_quantity)}</td>
                        <td>${row.gr_count} GR(s)</td>
                        <td>${row.last_gr_date ? formatDate(row.last_gr_date) : '-'}</td>
                        <td>
                            <span style="
                                background:#d4edda; color:#155724;
                                padding:4px 10px; border-radius:12px; font-size:12px;
                            ">
                                ${daysToComplete} days
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        })
        .catch(err => {
            showToast('Failed to load completed data.', 'error');
            console.error(err);
        });
}

// ─── SYNC HISTORY TAB ────────────────────────────────────────────────────────

function loadSyncHistory() {
    fetch('api/get_sync_history.php')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('syncHistoryBody');

            if (!data.success || !data.data || data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#888;">No sync history found</td></tr>`;
                return;
            }

            tbody.innerHTML = data.data.map(log => `
                <tr>
                    <td>${formatDateTime(log.created_at)}</td>
                    <td>${log.user_name || '-'}</td>
                    <td>${log.filename || log.details || '-'}</td>
                    <td>${log.records_processed || '-'}</td>
                    <td><span class="badge-gr badge-inserted">${log.gr_inserted ?? '-'}</span></td>
                    <td><span class="badge-gr badge-skipped">${log.gr_skipped ?? '-'}</span></td>
                    <td><span class="status-badge status-completed">Success</span></td>
                </tr>
            `).join('');
        })
        .catch(err => {
            showToast('Failed to load sync history.', 'error');
            console.error(err);
        });
}

// ─── PO DETAIL MODAL ─────────────────────────────────────────────────────────

function showPODetail(poNumber, poItem) {
    fetch(`api/get_po_timeline.php?po_number=${encodeURIComponent(poNumber)}&po_item=${encodeURIComponent(poItem)}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                showToast('Failed to load PO details.', 'error');
                return;
            }

            document.getElementById('detailPONumber').textContent = `${poNumber} / Item ${poItem}`;

            const po = data.po;
            const totalReceived = data.gr_history.reduce((sum, gr) => sum + parseFloat(gr.gr_quantity), 0);
            const balance = parseFloat(po.ordered_quantity) - totalReceived;
            const pct = po.ordered_quantity > 0 ? Math.min(100, Math.round((totalReceived / po.ordered_quantity) * 100)) : 0;

            let timelineHTML = `
                <!-- PO Summary -->
                <div style="background:#f8f9fa; border-radius:10px; padding:16px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                    <div><div style="font-size:12px;color:#888;">Supplier</div><div style="font-weight:600;">${po.supplier_name || 'N/A'}</div></div>
                    <div><div style="font-size:12px;color:#888;">PO Date</div><div style="font-weight:600;">${formatDate(po.po_date)}</div></div>
                    <div><div style="font-size:12px;color:#888;">Status</div><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></div>
                    <div><div style="font-size:12px;color:#888;">Ordered Qty</div><div style="font-weight:600;">${formatNumber(po.ordered_quantity)}</div></div>
                    <div><div style="font-size:12px;color:#888;">Received Qty</div><div style="font-weight:600; color:#28a745;">${formatNumber(totalReceived)}</div></div>
                    <div><div style="font-size:12px;color:#888;">Balance</div><div style="font-weight:600; color:${balance > 0 ? '#dc3545' : '#28a745'};">${formatNumber(balance)}</div></div>
                </div>

                <!-- Progress Bar -->
                <div style="margin-bottom:24px;">
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
                        <span>Fulfillment Progress</span>
                        <strong>${pct}%</strong>
                    </div>
                    <div style="background:#e0e0e0; border-radius:6px; height:10px; overflow:hidden;">
                        <div style="height:100%; width:${pct}%; background:${pct >= 100 ? '#28a745' : pct > 0 ? '#4285f4' : '#ffc107'}; border-radius:6px; transition:width 0.5s;"></div>
                    </div>
                </div>

                <!-- Timeline -->
                <h4 style="margin-bottom:16px; font-size:14px; color:#555; text-transform:uppercase; letter-spacing:0.5px;">GR Timeline</h4>
                <div class="timeline">
                    <div class="timeline-item">
                        <strong>📋 PO Created</strong><br>
                        <span style="color:#666; font-size:13px;">Date: ${formatDate(po.po_date)} &nbsp;|&nbsp; Qty Ordered: ${formatNumber(po.ordered_quantity)}</span>
                    </div>
            `;

            if (data.gr_history.length > 0) {
                data.gr_history.forEach((gr, index) => {
                    timelineHTML += `
                        <div class="timeline-item">
                            <strong>📦 GR #${index + 1}: ${gr.gr_number}</strong><br>
                            <span style="color:#666; font-size:13px;">Date: ${formatDate(gr.gr_date)} &nbsp;|&nbsp; Qty Received: ${formatNumber(gr.gr_quantity)}</span>
                        </div>
                    `;
                });
            } else {
                timelineHTML += `
                    <div class="timeline-item pending">
                        <strong>⏳ No Goods Receipt Yet</strong><br>
                        <span style="color:#888; font-size:13px;">Waiting for delivery — ${po.days_pending || 0} days since PO created</span>
                    </div>
                `;
            }

            if (po.status === 'Completed') {
                timelineHTML += `
                    <div class="timeline-item">
                        <strong>✅ Fully Received</strong><br>
                        <span style="color:#28a745; font-size:13px;">All ordered quantity has been received.</span>
                    </div>
                `;
            }

            timelineHTML += `</div>`; // close timeline

            document.getElementById('poTimeline').innerHTML = timelineHTML;
            document.getElementById('poDetailModal').classList.add('active');
        })
        .catch(err => {
            showToast('Failed to load PO details.', 'error');
            console.error(err);
        });
}

function hideDetailModal() {
    document.getElementById('poDetailModal').classList.remove('active');
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────

let uploadedFile = null;

function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    clearUpload();
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
}

function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('zmm039File');
    if (!dropZone || !fileInput) return;

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
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });
}

function handleFile(file) {
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
    const fileInput = document.getElementById('zmm039File');
    if (fileInput) fileInput.value = '';
}

function uploadZMM039() {
    if (!uploadedFile) {
        showToast('Please select a file first.', 'error');
        return;
    }

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

    fetch('../dashboard/api/upload_zmm039.php', {
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
                    loadTrackingData();
                    if (currentTab === 'pending')   loadPendingData();
                    if (currentTab === 'completed') loadCompletedData();
                    if (currentTab === 'history')   loadSyncHistory();
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

function exportTracking() {
    const tableMap = {
        'overview':   { id: 'trackingTable',   name: 'PO_Tracking'     },
        'pending':    { id: 'pendingTable',     name: 'Pending_PO'      },
        'completed':  { id: 'completedTable',   name: 'Completed_PO'    },
        'history':    { id: 'syncHistoryTable', name: 'Sync_History'    }
    };

    const target = tableMap[currentTab];
    if (!target) return;

    const table = document.getElementById(target.id);
    if (!table) return;

    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => `"${th.textContent.trim()}"`);

    const rows = Array.from(table.querySelectorAll('tbody tr'))
        .filter(tr => !tr.querySelector('td[colspan]'))
        .map(row =>
            Array.from(row.querySelectorAll('td'))
                .map(td => `"${td.textContent.trim().replace(/"/g, '""')}"`)
        );

    if (rows.length === 0) {
        showToast('No data to export.', 'error');
        return;
    }

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    link.href = URL.createObjectURL(blob);
    link.download = `${target.name}_${date}.csv`;
    link.click();
    showToast('Export successful!', 'success');
}

// ─── FILTER HANDLERS ─────────────────────────────────────────────────────────

// Real-time search filter for overview tab
function initFilterHandlers() {
    const searchInput = document.getElementById('searchTracking');
    const statusFilter = document.getElementById('filterTrackingStatus');

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadTrackingData, 400);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', loadTrackingData);
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return parseFloat(num).toLocaleString('id-ID');
}

function showToast(message, type = 'success') {
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
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}