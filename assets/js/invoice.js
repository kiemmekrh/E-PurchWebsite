// File: assets/js/invoice.js

let currentInvoiceId = null;

// ==================== PAGINATION VARIABLES ====================
let currentInvoicePage = 1;
let invoiceRowsPerPage = 10;
let totalInvoicePages = 1;
let filteredInvoiceData = [];

function loadInvoices() {
    const status = document.getElementById('filterInvStatus')?.value || 'all';
    const search = document.getElementById('searchInvoice')?.value || '';
    const supplier = document.getElementById('filterInvSupplier')?.value || 'all';
    const dateFrom = document.getElementById('filterInvDateFrom')?.value || '';
    const dateTo = document.getElementById('filterInvDateTo')?.value || '';

    const params = new URLSearchParams({ status, search, supplier, dateFrom, dateTo });

    fetch(`api/get_invoices.php?${params}`)
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(data => {
            if (!data.success) {
                console.error('API Error:', data.error);
                showError(data.error);
                return;
            }
            filteredInvoiceData = data.data || [];
            currentInvoicePage = 1;
            renderTableWithPagination(filteredInvoiceData);
            if (data.suppliers) renderSupplierFilter(data.suppliers);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            showError('Failed to load invoices: ' + err.message);
        });
}

// ==================== PAGINATION FUNCTIONS ====================

function renderTableWithPagination(data, page = 1, perPage = 10) {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) {
        console.error('Element #invoiceTableBody not found');
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding: 40px; color: #888;">
                    📭 No invoices found
                </td>
            </tr>`;
        renderInvoicePaginationControls(0, 1, 10);
        return;
    }

    currentInvoicePage = page;
    invoiceRowsPerPage = perPage;

    const totalItems = data.length;
    totalInvoicePages = Math.ceil(totalItems / perPage);

    if (page < 1) page = 1;
    if (page > totalInvoicePages) page = totalInvoicePages;
    currentInvoicePage = page;

    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalItems);
    const pageData = data.slice(startIndex, endIndex);

    tbody.innerHTML = pageData.map(inv => {
        // Format validated_at timestamp
        let validatedAtHtml = '<span style="color: #bbb;">—</span>';
        if (inv.validated_at) {
            const d = new Date(inv.validated_at);
            validatedAtHtml = `
                <div class="timestamp-cell">
                    <div class="date-part">${d.toLocaleDateString('id-ID')}</div>
                    <div class="time-part">${d.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
                    ${inv.validated_by_name ? `<div class="validated-by">by ${escapeHtml(inv.validated_by_name)}</div>` : ''}
                </div>
            `;
        }
        
        return `
        <tr>
            <td><input type="checkbox" class="inv-checkbox" value="${inv.invoice_id}"></td>
            <td>${escapeHtml(inv.invoice_number)}</td>
            <td>${escapeHtml(inv.supplier_name || 'Unknown')}</td>
            <td>${escapeHtml(inv.po_number || '-')}</td>
            <td>${formatDate(inv.invoice_date)}</td>
            <td>IDR ${parseFloat(inv.amount || 0).toLocaleString('id-ID')}</td>
            <td><span class="status-badge status-${(inv.status || 'pending').toLowerCase()}">${inv.status || 'Pending'}</span></td>
            <td>${escapeHtml(inv.validated_by_name || '-')}</td>
            <td>${validatedAtHtml}</td>
            <td>
                <button class="btn btn-primary btn-small" onclick="showValidateModal(${inv.invoice_id})">Validate</button>
                <a href="${getFileUrl(inv.file_path)}" target="_blank" class="btn btn-secondary btn-small" title="View File">📎</a>
            </td>
        </tr>
    `}).join('');

    renderInvoicePaginationControls(totalItems, page, perPage);
}

function renderInvoicePaginationControls(totalItems, currentPage, perPage) {
    let paginationContainer = document.getElementById('invoicePaginationContainer');

    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'invoicePaginationContainer';
        paginationContainer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#f8f9fa;border-top:1px solid #e0e0e0;border-radius:0 0 8px 8px;margin-top:-1px;';

        const tableWrapper = document.getElementById('invoiceTable');
        if (tableWrapper && tableWrapper.parentNode) {
            tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
        }
    }

    if (totalItems === 0) {
        paginationContainer.innerHTML = '<span style="color:#888;font-size:13px;">No records</span>';
        return;
    }

    const totalPages = Math.ceil(totalItems / perPage);
    const startItem = (currentPage - 1) * perPage + 1;
    const endItem = Math.min(currentPage * perPage, totalItems);

    let pageNumbers = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        pageNumbers += `<button onclick="goToInvoicePage(1)" style="${getInvoicePageButtonStyle(false)}">1</button>`;
        if (startPage > 2) {
            pageNumbers += `<span style="padding:0 6px;color:#888;">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        pageNumbers += `<button onclick="goToInvoicePage(${i})" style="${getInvoicePageButtonStyle(isActive)}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers += `<span style="padding:0 6px;color:#888;">...</span>`;
        }
        pageNumbers += `<button onclick="goToInvoicePage(${totalPages})" style="${getInvoicePageButtonStyle(false)}">${totalPages}</button>`;
    }

    paginationContainer.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#666;font-size:13px;">Showing <strong>${startItem}-${endItem}</strong> of <strong>${totalItems}</strong> records</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
            <button onclick="goToInvoicePage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} style="${getInvoiceNavButtonStyle(currentPage <= 1)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            ${pageNumbers}
            <button onclick="goToInvoicePage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} style="${getInvoiceNavButtonStyle(currentPage >= totalPages)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:#666;font-size:13px;">Rows per page:</span>
            <select onchange="changeInvoiceRowsPerPage(this.value)" style="padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-size:13px;cursor:pointer;outline:none;">
                <option value="10" ${perPage == 10 ? 'selected' : ''}>10</option>
                <option value="25" ${perPage == 25 ? 'selected' : ''}>25</option>
                <option value="50" ${perPage == 50 ? 'selected' : ''}>50</option>
                <option value="100" ${perPage == 100 ? 'selected' : ''}>100</option>
            </select>
        </div>
    `;
}

function getInvoicePageButtonStyle(isActive) {
    if (isActive) {
        return 'padding:6px 12px;border:1px solid #4a90e2;background:#4a90e2;color:white;border-radius:4px;font-size:13px;cursor:pointer;font-weight:600;min-width:36px;';
    }
    return 'padding:6px 12px;border:1px solid #ddd;background:white;color:#555;border-radius:4px;font-size:13px;cursor:pointer;min-width:36px;transition:all 0.2s;';
}

function getInvoiceNavButtonStyle(disabled) {
    if (disabled) {
        return 'padding:6px 10px;border:1px solid #e0e0e0;background:#f5f5f5;color:#bbb;border-radius:4px;cursor:not-allowed;display:flex;align-items:center;';
    }
    return 'padding:6px 10px;border:1px solid #ddd;background:white;color:#555;border-radius:4px;cursor:pointer;display:flex;align-items:center;transition:all 0.2s;';
}

function goToInvoicePage(page) {
    if (page < 1 || page > totalInvoicePages) return;
    currentInvoicePage = page;
    renderTableWithPagination(filteredInvoiceData, page, invoiceRowsPerPage);
}

function changeInvoiceRowsPerPage(newPerPage) {
    invoiceRowsPerPage = parseInt(newPerPage);
    currentInvoicePage = 1;
    renderTableWithPagination(filteredInvoiceData, 1, invoiceRowsPerPage);
}

// ============================================
// EXPORT TO EXCEL
// ============================================
function exportTable(tableId) {
    const checkedBoxes = document.querySelectorAll('.inv-checkbox:checked');

    if (checkedBoxes.length === 0) {
        showToast('⚠️ Please select at least one invoice to export', 'error');
        return;
    }

    const headers = [
        'NO INVOICE',
        'SUPPLIER NAME', 
        'PO NUMBER',
        'INVOICE DATE',
        'AMOUNT',
        'STATUS',
        'VALIDATED BY',
        'VALIDATED AT'
    ];

    // Ambil ID invoice yang di-check, lalu cari data lengkapnya dari filteredInvoiceData
    const selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
    const selectedData = filteredInvoiceData.filter(inv => selectedIds.includes(inv.invoice_id));

    const rows = selectedData.map(inv => {
        // Format validated_at: tanggal doang, tanpa jam & tanpa "by ..."
        let validatedAt = '';
        if (inv.validated_at) {
            const d = new Date(inv.validated_at);
            validatedAt = d.toLocaleDateString('id-ID');
        }

        return [
            inv.invoice_number || '',
            inv.supplier_name || 'Unknown',
            inv.po_number || '-',
            inv.invoice_date ? formatDate(inv.invoice_date) : '-',
            'IDR ' + parseFloat(inv.amount || 0).toLocaleString('id-ID'),
            inv.status || 'Pending',
            inv.validated_by_name || '-',
            validatedAt || '-'
        ].map(text => `"${String(text).replace(/"/g, '""')}"`);
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];

    link.href = URL.createObjectURL(blob);
    link.download = `Invoice_Selected_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`✅ ${selectedData.length} invoice(s) exported successfully!`, 'success');

    document.querySelectorAll('.inv-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllInv').checked = false;
}

// ============================================
// FILE URL HELPER
// ============================================
function getFileUrl(path) {
    if (!path) return '#';
    if (path.startsWith('http')) return path;
    path = path.replace(/^(\.\.\/)+/, '');
    path = path.replace(/^(\.\/)+/, '');
    path = path.replace(/^\/+/, '');
    return '/' + path;
}

function renderTable(invoices) {
    filteredInvoiceData = invoices || [];
    currentInvoicePage = 1;
    renderTableWithPagination(filteredInvoiceData);
}

function renderSupplierFilter(suppliers) {
    const select = document.getElementById('filterInvSupplier');
    if (!select) return;

    const currentValue = select.value;

    while (select.options.length > 1) {
        select.remove(1);
    }

    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.supplier_id;
        opt.textContent = s.supplier_name;
        select.appendChild(opt);
    });

    if (currentValue !== 'all') {
        select.value = currentValue;
    }
}

function showValidateModal(invoiceId) {
    currentInvoiceId = invoiceId;

    fetch(`api/get_invoice_detail.php?id=${invoiceId}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                showToast('Error: ' + data.error, 'error');
                return;
            }
            const inv = data.data;
            
            // Build invoice detail HTML
            document.getElementById('invoiceDetail').innerHTML = `
                <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Invoice:</strong> ${escapeHtml(inv.invoice_number)}</div>
                    <div><strong>Supplier:</strong> ${escapeHtml(inv.supplier_name)}</div>
                    <div><strong>PO Number:</strong> ${escapeHtml(inv.po_number)}</div>
                    <div><strong>Amount:</strong> IDR ${parseFloat(inv.amount || 0).toLocaleString('id-ID')}</div>
                    <div><strong>Date:</strong> ${formatDate(inv.invoice_date)}</div>
                    <div><strong>File:</strong> <a href="${getFileUrl(inv.file_path)}" target="_blank">📎 View File</a></div>
                </div>
            `;
            
            // Set validation notes
            document.getElementById('validationNotes').value = inv.validation_notes || '';
            
            // Show previous validation info if exists
            const prevValidationDiv = document.getElementById('previousValidationInfo');
            if (inv.status === 'Approved' || inv.status === 'Rejected') {
                const prevTime = inv.validated_at ? formatDateTime(inv.validated_at) : '—';
                const prevBy = inv.validated_by_name || 'Staff';
                const prevNotes = inv.validation_notes || 'No notes';
                
                prevValidationDiv.innerHTML = `
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ${inv.status === 'Approved' ? '#28a745' : '#dc3545'};">
                        <div style="font-size: 12px; color: #888; font-weight: 600; margin-bottom: 4px;">
                            🕐 Previously ${inv.status} on ${prevTime}
                        </div>
                        <div style="font-size: 13px; color: #555;">
                            <strong>By:</strong> ${escapeHtml(prevBy)}<br>
                            <strong>Notes:</strong> "${escapeHtml(prevNotes)}"
                        </div>
                    </div>
                `;
                prevValidationDiv.style.display = 'block';
            } else {
                prevValidationDiv.innerHTML = '';
                prevValidationDiv.style.display = 'none';
            }
            
            document.getElementById('validateModal').classList.add('active');
        })
        .catch(err => {
            console.error('Error loading invoice detail:', err);
            showToast('Failed to load invoice details', 'error');
        });
}

function hideValidateModal() {
    document.getElementById('validateModal')?.classList.remove('active');
    currentInvoiceId = null;
}

function approveInvoice() {
    if (!currentInvoiceId) return;
    updateStatus(currentInvoiceId, 'Approved');
}

function rejectInvoice() {
    if (!currentInvoiceId) return;
    updateStatus(currentInvoiceId, 'Rejected');
}

function updateStatus(id, status) {
    const notes = document.getElementById('validationNotes')?.value || '';

    fetch('api/update_invoice_status.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id, status, notes })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            // Format timestamp untuk toast
            const time = data.validated_at ? new Date(data.validated_at).toLocaleString('id-ID') : '';
            showToast(`✅ Invoice ${data.status} by ${data.validated_by_name} at ${time}`, 'success');
            hideValidateModal();
            loadInvoices();
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Update error:', err);
        showToast('Failed to update status', 'error');
    });
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
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

    const style = document.createElement('style');
    style.textContent = `@keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadInvoices();

    const selectAll = document.getElementById('selectAllInv');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            document.querySelectorAll('.inv-checkbox').forEach(cb => cb.checked = e.target.checked);
        });
    }
});

// Helpers
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(msg) {
    const tbody = document.getElementById('invoiceTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color: red; padding: 20px;">⚠️ ${escapeHtml(msg)}</td></tr>`;
    }
}