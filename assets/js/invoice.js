// File: assets/js/invoice.js

let currentInvoiceId = null;

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
            renderTable(data.data);
            if (data.suppliers) renderSupplierFilter(data.suppliers);
        })
        .catch(err => {
            console.error('Fetch error:', err);
            showError('Failed to load invoices: ' + err.message);
        });
}

// ============================================
// EXPORT TO EXCEL — HANYA ROW YANG DICENTANG
// ============================================
function exportTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) {
        showToast('Table not found', 'error');
        return;
    }

    // Ambil SEMUA checkbox yang dicentang
    const checkedBoxes = document.querySelectorAll('.inv-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        showToast('⚠️ Please select at least one invoice to export', 'error');
        return;
    }

    // Headers (7 kolom, tanpa checkbox dan actions)
    const headers = [
        'NO INVOICE',
        'SUPPLIER NAME', 
        'PO NUMBER',
        'INVOICE DATE',
        'AMOUNT',
        'STATUS',
        'VALIDATED BY'
    ];

    // Ambil data dari row yang dicentang saja
    const rows = Array.from(checkedBoxes).map(checkbox => {
        const row = checkbox.closest('tr');
        const cells = row.querySelectorAll('td');
        
        // cells[0] = checkbox (skip)
        // cells[1] = NO INVOICE
        // cells[2] = SUPPLIER NAME
        // cells[3] = PO NUMBER
        // cells[4] = INVOICE DATE
        // cells[5] = AMOUNT
        // cells[6] = STATUS
        // cells[7] = VALIDATED BY
        // cells[8] = ACTIONS (skip)
        
        return [
            cells[1]?.textContent.trim() || '',
            cells[2]?.textContent.trim() || '',
            cells[3]?.textContent.trim() || '',
            cells[4]?.textContent.trim() || '',
            cells[5]?.textContent.trim() || '',
            cells[6]?.textContent.trim() || '',
            cells[7]?.textContent.trim() || ''
        ].map(text => `"${text.replace(/"/g, '""')}"`);
    });

    // Create CSV content with BOM for Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice_Selected_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`✅ ${checkedBoxes.length} invoice(s) exported successfully!`, 'success');
    
    // Uncheck semua setelah export
    document.querySelectorAll('.inv-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('selectAllInv').checked = false;
}

// ============================================
// FILE URL HELPER
// ============================================
function getFileUrl(path) {
    if (!path) return '#';
    
    // Kalau sudah URL absolut, pakai langsung
    if (path.startsWith('http')) return path;
    
    // Bersihkan path
    path = path.replace(/^(\.\.\/)+/, '');
    path = path.replace(/^(\.\/)+/, '');
    
    // Pastikan tidak ada leading slash ganda
    path = path.replace(/^\/+/, '');
    
    // Return relative URL dari root
    return '/' + path;
}

function renderTable(invoices) {
    const tbody = document.getElementById('invoiceTableBody');
    if (!tbody) {
        console.error('Element #invoiceTableBody not found');
        return;
    }
    
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding: 40px; color: #888;">
                    📭 No invoices found
                </td>
            </tr>`;
        return;
    }
    
    tbody.innerHTML = invoices.map(inv => `
        <tr>
            <td><input type="checkbox" class="inv-checkbox" value="${inv.invoice_id}"></td>
            <td>${escapeHtml(inv.invoice_number)}</td>
            <td>${escapeHtml(inv.supplier_name || 'Unknown')}</td>
            <td>${escapeHtml(inv.po_number || '-')}</td>
            <td>${formatDate(inv.invoice_date)}</td>
            <td>IDR ${parseFloat(inv.amount || 0).toLocaleString('id-ID')}</td>
            <td><span class="status-badge status-${(inv.status || 'pending').toLowerCase()}">${inv.status || 'Pending'}</span></td>
            <td>${escapeHtml(inv.validated_by_name || '-')}</td>
            <td>
                <button class="btn btn-primary btn-small" onclick="showValidateModal(${inv.invoice_id})">Validate</button>
                <a href="${getFileUrl(inv.file_path)}" target="_blank" class="btn btn-secondary btn-small" title="View File">📎</a>
            </td>
        </tr>
    `).join('');
}

function renderSupplierFilter(suppliers) {
    const select = document.getElementById('filterInvSupplier');
    if (!select) return;
    
    // Simpan value yang sedang dipilih
    const currentValue = select.value;
    
    // Clear existing options (kecuali "All Suppliers")
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.supplier_id;
        opt.textContent = s.supplier_name;
        select.appendChild(opt);
    });
    
    // Restore selected value kalau masih ada
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
            document.getElementById('validationNotes').value = inv.validation_notes || '';
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
            showToast(`Invoice ${status.toLowerCase()}!`, 'success');
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

function showError(msg) {
    const tbody = document.getElementById('invoiceTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: red; padding: 20px;">⚠️ ${escapeHtml(msg)}</td></tr>`;
    }
}