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
// PERBAIKAN: Helper untuk generate URL file
// ============================================
function getFileUrl(path) {
    if (!path) return '#';
    
    // Kalau sudah URL absolut, pakai langsung
    if (path.startsWith('http')) return path;
    
    // Bersihkan path lama yang pakai ../../../ atau ./
    path = path.replace(/^(\.\.\/)+/, '');
    path = path.replace(/^(\.\/)+/, '');
    
    // Encode setiap segment path agar karakter khusus (#, %, spasi) aman
    const segments = path.split('/');
    const encodedSegments = segments.map(segment => encodeURIComponent(segment));
    
    // Pastikan diawali /
    let url = '/' + encodedSegments.join('/');
    
    // Hindari double slash
    return url.replace(/\/+/g, '/');
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
                <a href="${getFileUrl(inv.file_path)}" target="_blank" class="btn btn-secondary btn-small">📎</a>
            </td>
        </tr>
    `).join('');
}

function renderSupplierFilter(suppliers) {
    const select = document.getElementById('filterInvSupplier');
    if (!select || select.options.length > 1) return;
    
    suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.supplier_id;
        opt.textContent = s.supplier_name;
        select.appendChild(opt);
    });
}

function showValidateModal(invoiceId) {
    currentInvoiceId = invoiceId;
    
    fetch(`api/get_invoice_detail.php?id=${invoiceId}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                alert('Error: ' + data.error);
                return;
            }
            const inv = data.data;
            document.getElementById('invoiceDetail').innerHTML = `
                <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Invoice:</strong> ${escapeHtml(inv.invoice_number)}</div>
                    <div><strong>Supplier:</strong> ${escapeHtml(inv.supplier_name)}</div>
                    <div><strong>PO Number:</strong> ${escapeHtml(inv.po_number)}</div>
                    <div><strong>Amount:</strong> IDR ${parseFloat(inv.amount).toLocaleString('id-ID')}</div>
                    <div><strong>Date:</strong> ${formatDate(inv.invoice_date)}</div>
                    <div><strong>File:</strong> <a href="${getFileUrl(inv.file_path)}" target="_blank">📎 View File</a></div>
                </div>
            `;
            document.getElementById('validationNotes').value = inv.validation_notes || '';
            document.getElementById('validateModal').classList.add('active');
        })
        .catch(err => {
            console.error('Error loading invoice detail:', err);
            alert('Failed to load invoice details');
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
            hideValidateModal();
            loadInvoices();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => {
        console.error('Update error:', err);
        alert('Failed to update status');
    });
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