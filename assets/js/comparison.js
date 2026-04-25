// ==================== GLOBAL VARIABLES ====================
let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
let poData = [];
let selectedPOs = new Set();
let selectedHistoryIds = new Set();
let historyData = [];
let selectedHistoricalRow = null;
let currentMode = ''; // 'create' atau 'new'
let currentEditId = null; // ID comparison yang sedang diedit
let currentUserRole = ''; // Role user saat ini
let currentSortField = null;
let currentSortDirection = 'asc';

// Ambil role user dari session (set di PHP)
document.addEventListener('DOMContentLoaded', function() {
    // Cek role dari hidden input atau meta tag
    const roleMeta = document.querySelector('meta[name="user-role"]');
    if (roleMeta) {
        currentUserRole = roleMeta.content;
    }
    
    loadComparisonHistory();
    initCreateViewAutocomplete();
    document.getElementById('searchComparison').addEventListener('input', function() {
        const keyword = this.value.toLowerCase().trim();
        if (keyword === '') {
            renderComparisonTable(historyData);
            return;
        }
        const filtered = historyData.filter(row => {
            return Object.values(row).some(val => 
                String(val).toLowerCase().includes(keyword)
            );
        });
        renderComparisonTable(filtered);
    });
});

// ==================== FIELD VALIDATION CONFIG ====================
// Field wajib untuk status FINAL (Save / Update)
const REQUIRED_FIELDS = {
    header: ['pr_number', 'material_code', 'description', 'uom', 'qty_pr'],
    plan: ['plan_qty', 'plan_price_idr', 'plan_price_tiba_nu', 'plan_amount', 'plan_supplier'],
    awarded: ['awarded_po_date', 'awarded_deliv_date', 'awarded_po_number', 'awarded_supplier', 'awarded_amount']
};

// Label untuk field (untuk pesan error yang readable)
const FIELD_LABELS = {
    pr_number: 'PR Number',
    material_code: 'Material Code',
    description: 'Description',
    uom: 'UOM',
    qty_pr: 'Qty PR',
    plan_qty: 'Plan Qty',
    plan_price_idr: 'Plan Price IDR',
    plan_price_tiba_nu: 'Plan TIBA DI NU',
    plan_amount: 'Plan Amount',
    plan_supplier: 'Plan Supplier',
    awarded_po_date: 'Awarded PO Date',
    awarded_deliv_date: 'Awarded Delivery Date',
    awarded_po_number: 'Awarded PO Number',
    awarded_supplier: 'Awarded Supplier',
    awarded_amount: 'Awarded Amount'
};

// ==================== DRAFT/FINAL MODE MANAGEMENT ====================

/**
 * Set Last Order fields menjadi editable atau readonly
 * @param {string} prefix - 'new' atau 'create'
 * @param {boolean} isEditable - true = editable (draft), false = readonly (final)
 */
function setLastOrderEditable(prefix, isEditable) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const lastOrderInputs = document.querySelectorAll(`#${containerId} .input-last-order`);
    
    lastOrderInputs.forEach(input => {
        if (isEditable) {
            // DRAFT MODE: Bisa edit
            input.readOnly = false;
            input.removeAttribute('readonly');
            input.removeAttribute('tabindex');
            input.classList.add('editable');
            
            // Tambahkan onchange handler untuk auto-calculate
            const field = input.getAttribute('data-field');
            if (field === 'last_price_foreign' || field === 'last_kurs_idr') {
                input.setAttribute('onchange', `calculateLastPriceIDR(1, '${prefix}')`);
            } else if (field === 'last_qty') {
                input.setAttribute('onchange', `calculateLastAmount(1, '${prefix}')`);
            } else if (field === 'last_price_idr') {
                input.setAttribute('onchange', `manualOverrideLastPriceIDR(1, '${prefix}')`);
            }
        } else {
            // FINAL MODE: Readonly
            input.readOnly = true;
            input.setAttribute('readonly', 'readonly');
            input.setAttribute('tabindex', '-1');
            input.classList.remove('editable');
            input.removeAttribute('onchange');
        }
    });
}

// ==================== VIEW NAVIGATION ====================

function showCreateComparison() {
    currentEditId = null;
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.add('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    currentMode = 'create';
    loadHistoricalForCreateView();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function showCreateNewComparison() {
    currentEditId = null;
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    document.getElementById('newComparisonView').classList.add('active');
    currentMode = 'new';
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function showSpreadsheetCreateView() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.add('active');
    currentMode = 'create';
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

// ==================== EDIT MODE - VIEW FROM HISTORY ====================

function editComparison(id, source) {
    currentEditId = id;
    
    fetch(`api/get_comparison_detail.php?id=${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (source === 'new' || data.data.created_from === 'new') {
                    openNewComparisonForEdit(data.data);
                } else {
                    openCreateComparisonForEdit(data.data);
                }
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}

function openNewComparisonForEdit(data) {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    document.getElementById('newComparisonView').classList.add('active');
    currentMode = 'new';
    
    populateNewComparisonForm(data);
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function openCreateComparisonForEdit(data) {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.add('active');
    currentMode = 'create';
    
    populateCreateComparisonForm(data);
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function populateNewComparisonForm(data) {
    const rowNum = 1;
    const prefix = 'new';
    const isDraft = data.status === 'draft';
    
    setFieldValue(rowNum, 'pr_number', data.pr_number || '', prefix);
    setFieldValue(rowNum, 'material_code', data.material_code || '', prefix);
    setFieldValue(rowNum, 'description', data.material || data.description || '', prefix);
    setFieldValue(rowNum, 'uom', data.uom || 'KG', prefix);
    setFieldValue(rowNum, 'qty_pr', data.qty_pr || data.qty || 0, prefix);
    
    setFieldValue(rowNum, 'last_qty', data.last_qty || 0, prefix);
    setFieldValue(rowNum, 'last_po_number', data.last_po_number || '', prefix);
    setFieldValue(rowNum, 'last_po_date', data.last_po_date || '', prefix);
    setFieldValue(rowNum, 'last_price_foreign', data.last_price_foreign || 0, prefix);
    setFieldValue(rowNum, 'last_kurs_date', data.last_kurs_date || '', prefix);
    setFieldValue(rowNum, 'last_kurs_idr', data.last_kurs_idr || 0, prefix);
    setFieldValue(rowNum, 'last_price_idr', data.last_price_idr || 0, prefix);
    setFieldValue(rowNum, 'last_price_tiba_nu', data.last_price_tiba_nu || 0, prefix);
    setFieldValue(rowNum, 'last_amount', data.last_amount || 0, prefix);
    setFieldValue(rowNum, 'last_supplier', data.last_supplier || data.last_supplier_name || '', prefix);
    
    setFieldValue(rowNum, 'plan_qty', data.plan_qty || 0, prefix);
    setFieldValue(rowNum, 'plan_price_foreign', data.plan_price_foreign || 0, prefix);
    setFieldValue(rowNum, 'plan_kurs_date', data.plan_kurs_date || '', prefix);
    setFieldValue(rowNum, 'plan_kurs_idr', data.plan_kurs_idr || 0, prefix);
    setFieldValue(rowNum, 'plan_price_idr', data.plan_price_idr || 0, prefix);
    setFieldValue(rowNum, 'plan_price_tiba_nu', data.plan_price_tiba_nu || 0, prefix);
    setFieldValue(rowNum, 'plan_amount', data.plan_amount || 0, prefix);
    setFieldValue(rowNum, 'plan_supplier', data.plan_supplier || data.plan_supplier_name || '', prefix);
    
    setFieldValue(rowNum, 'gap_price', data.gap_price || 0, prefix);
    setFieldValue(rowNum, 'gap_percent', data.gap_percent || 0, prefix);
    
    setFieldValue(rowNum, 'awarded_po_date', data.awarded_po_date || '', prefix);
    setFieldValue(rowNum, 'awarded_deliv_date', data.awarded_deliv_date || '', prefix);
    setFieldValue(rowNum, 'awarded_po_number', data.awarded_po_number || data.po_number || '', prefix);
    setFieldValue(rowNum, 'awarded_supplier', data.awarded_supplier || data.awarded_supplier_name || '', prefix);
    setFieldValue(rowNum, 'awarded_amount', data.awarded_amount || 0, prefix);
    setFieldValue(rowNum, 'awarded_keterangan', data.awarded_keterangan || '', prefix);
    
    setLastOrderEditable(prefix, isDraft);
    updateSaveButtonForEdit(prefix, isDraft);
}

function populateCreateComparisonForm(data) {
    const rowNum = 1;
    const prefix = 'create';
    const isDraft = data.status === 'draft';
    
    setFieldValue(rowNum, 'pr_number', data.pr_number || '', prefix);
    setFieldValue(rowNum, 'material_code', data.material_code || '', prefix);
    setFieldValue(rowNum, 'description', data.material || data.description || '', prefix);
    setFieldValue(rowNum, 'uom', data.uom || 'KG', prefix);
    setFieldValue(rowNum, 'qty_pr', data.qty_pr || data.qty || 0, prefix);
    
    setFieldValue(rowNum, 'last_qty', data.last_qty || 0, prefix);
    setFieldValue(rowNum, 'last_po_number', data.last_po_number || '', prefix);
    setFieldValue(rowNum, 'last_po_date', data.last_po_date || '', prefix);
    setFieldValue(rowNum, 'last_price_foreign', data.last_price_foreign || 0, prefix);
    setFieldValue(rowNum, 'last_kurs_date', data.last_kurs_date || '', prefix);
    setFieldValue(rowNum, 'last_kurs_idr', data.last_kurs_idr || 0, prefix);
    setFieldValue(rowNum, 'last_price_idr', data.last_price_idr || 0, prefix);
    setFieldValue(rowNum, 'last_price_tiba_nu', data.last_price_tiba_nu || 0, prefix);
    setFieldValue(rowNum, 'last_amount', data.last_amount || 0, prefix);
    setFieldValue(rowNum, 'last_supplier', data.last_supplier || data.last_supplier_name || '', prefix);
    
    setFieldValue(rowNum, 'plan_qty', data.plan_qty || 0, prefix);
    setFieldValue(rowNum, 'plan_price_foreign', data.plan_price_foreign || 0, prefix);
    setFieldValue(rowNum, 'plan_kurs_date', data.plan_kurs_date || '', prefix);
    setFieldValue(rowNum, 'plan_kurs_idr', data.plan_kurs_idr || 0, prefix);
    setFieldValue(rowNum, 'plan_price_idr', data.plan_price_idr || 0, prefix);
    setFieldValue(rowNum, 'plan_price_tiba_nu', data.plan_price_tiba_nu || 0, prefix);
    setFieldValue(rowNum, 'plan_amount', data.plan_amount || 0, prefix);
    setFieldValue(rowNum, 'plan_supplier', data.plan_supplier || data.plan_supplier_name || '', prefix);
    
    setFieldValue(rowNum, 'gap_price', data.gap_price || 0, prefix);
    setFieldValue(rowNum, 'gap_percent', data.gap_percent || 0, prefix);
    
    setFieldValue(rowNum, 'awarded_po_date', data.awarded_po_date || '', prefix);
    setFieldValue(rowNum, 'awarded_deliv_date', data.awarded_deliv_date || '', prefix);
    setFieldValue(rowNum, 'awarded_po_number', data.awarded_po_number || data.po_number || '', prefix);
    setFieldValue(rowNum, 'awarded_supplier', data.awarded_supplier || data.awarded_supplier_name || '', prefix);
    setFieldValue(rowNum, 'awarded_amount', data.awarded_amount || 0, prefix);
    setFieldValue(rowNum, 'awarded_keterangan', data.awarded_keterangan || '', prefix);
    
    setLastOrderEditable(prefix, isDraft);
    updateSaveButtonForEdit(prefix, isDraft);
}

function updateSaveButtonForEdit(prefix, isDraft = false) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const saveBtn = document.querySelector(`#${containerId} .btn-primary.btn-large`);
    const draftBtn = document.querySelector(`#${containerId} .btn-warning.btn-large`);
    
    if (saveBtn) {
        saveBtn.textContent = 'Update';
        saveBtn.onclick = function() { updateComparison(prefix); };
    }
    if (draftBtn) {
        draftBtn.textContent = isDraft ? 'Save as Draft' : 'Update Draft';
        draftBtn.onclick = function() { updateComparisonDraft(prefix); };
    }
}

// ==================== VALIDATION FUNCTIONS ====================

function validateRequiredFields(prefix) {
    const missing = [];
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    
    REQUIRED_FIELDS.header.forEach(field => {
        const input = document.querySelector(`#${containerId} [data-field="${field}"]`);
        if (!input || !input.value.trim() || input.value.trim() === '') {
            missing.push(FIELD_LABELS[field] || field);
        }
    });
    
    REQUIRED_FIELDS.plan.forEach(field => {
        const input = document.querySelector(`#${containerId} [data-field="${field}"]`);
        if (!input) {
            missing.push(FIELD_LABELS[field] || field);
            return;
        }
        const val = input.value.trim();
        if (FORMATTED_FIELDS.includes(field)) {
            const num = parseIdrNumber(val);
            if (isNaN(num) || num <= 0) {
                missing.push(FIELD_LABELS[field] || field);
            }
        } else if (!val || val === '') {
            missing.push(FIELD_LABELS[field] || field);
        }
    });
    
    REQUIRED_FIELDS.awarded.forEach(field => {
        const input = document.querySelector(`#${containerId} [data-field="${field}"]`);
        if (!input) {
            missing.push(FIELD_LABELS[field] || field);
            return;
        }
        const val = input.value.trim();
        if (field.includes('date')) {
            if (!val || val === '') {
                missing.push(FIELD_LABELS[field] || field);
            }
        }
        else if (FORMATTED_FIELDS.includes(field)) {
            const num = parseIdrNumber(val);
            if (isNaN(num) || num <= 0) {
                missing.push(FIELD_LABELS[field] || field);
            }
        }
        else if (!val || val === '') {
            missing.push(FIELD_LABELS[field] || field);
        }
    });
    
    return {
        valid: missing.length === 0,
        missing: missing
    };
}

function highlightInvalidFields(prefix, missingFields) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    
    document.querySelectorAll(`#${containerId} input`).forEach(input => {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
    });
    
    Object.keys(FIELD_LABELS).forEach(field => {
        if (missingFields.includes(FIELD_LABELS[field])) {
            const input = document.querySelector(`#${containerId} [data-field="${field}"]`);
            if (input) {
                input.style.borderColor = '#dc3545';
                input.style.backgroundColor = '#fff5f5';
                if (missingFields[0] === FIELD_LABELS[field]) {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    input.focus();
                }
            }
        }
    });
}

function clearFieldHighlights(prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    document.querySelectorAll(`#${containerId} input`).forEach(input => {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
    });
}

function updateComparison(prefix) {
    if (!currentEditId) return;
    
    // FINAL: WAJIB semua required field terisi
    const validation = validateRequiredFields(prefix);
    if (!validation.valid) {
        highlightInvalidFields(prefix, validation.missing);
        showToast('Field berikut wajib diisi untuk status FINAL: ' + validation.missing.join(', '), 'error');
        return; // BLOCK, tidak bisa update final kalau ada yang kosong
    }
    
    clearFieldHighlights(prefix);
    
    const payload = collectFormData(prefix);
    payload.comparison_id = currentEditId;
    payload.status = 'final';

    fetch('api/update_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Comparison updated successfully!');
            backToHistory();
            loadComparisonHistory();
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(err => {
        console.error('Error updating:', err);
        showToast('Server error saat update', 'error');
    });
}

function updateComparisonDraft(prefix) {
    if (!currentEditId) return;
    
    clearFieldHighlights(prefix);
    
    const payload = collectFormData(prefix);
    payload.comparison_id = currentEditId;
    payload.status = 'draft';

    fetch('api/update_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Draft updated successfully!');
            backToHistory();
            loadComparisonHistory();
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(err => {
        console.error('Error updating draft:', err);
        showToast('Server error saat update draft', 'error');
    });
}

function loadHistoricalForCreateView() {
    if (historyData.length > 0) {
        renderHistoricalTableInCreateView(historyData);
    } else {
        fetch('api/get_history.php')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    historyData = data.data;
                    renderHistoricalTableInCreateView(historyData);
                }
            })
            .catch(err => console.error('Error loading history for create view:', err));
    }
}

function renderHistoricalTableInCreateView(data) {
    const tbody = document.getElementById('historicalTableInCreateBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:20px;color:#888;">No historical data found</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(row => `
        <tr class="historical-row" onclick="selectHistoricalRow(this, ${row.comparison_id})">
            <td class="checkbox-col">
                <input type="radio" name="selectedHistorical" value="${row.comparison_id}"
                    onchange="selectHistoricalRow(this.closest('tr'), ${row.comparison_id})">
            </td>
            <td>#${row.comparison_id}</td>
            <td>${row.pr_number || '-'}</td>
            <td>${row.po_number || '-'}</td>
            <td>${formatDate(row.po_date)}</td>
            <td>${formatDate(row.table_created_date)}</td>
            <td>${row.material || row.material_group || row.material_code || '-'}</td>
            <td>${row.plan_qty != null ? formatIdrNumber(row.plan_qty) : formatIdrNumber(row.qty || 0)}</td>
            <td>${row.price ? 'Rp ' + formatIdrNumber(row.price) : '-'}</td>
            <td>${row.amount ? 'Rp ' + formatIdrNumber(row.amount) : '-'}</td>
            <td>${row.plan_supplier || row.supplier || '-'}</td>
            <td>${formatDate(row.delivery_date)}</td>
        </tr>
    `).join('');
}

function selectHistoricalRow(rowElement, comparisonId) {
    document.querySelectorAll('.historical-row').forEach(r => r.classList.remove('selected'));
    rowElement.classList.add('selected');
    selectedHistoricalRow = historyData.find(h => h.comparison_id == comparisonId);
    if (selectedHistoricalRow) {
        document.getElementById('selectedMaterial').textContent = selectedHistoricalRow.material || selectedHistoricalRow.material_group || selectedHistoricalRow.material_code || '-';
        document.getElementById('selectedSupplier').textContent = selectedHistoricalRow.plan_supplier || selectedHistoricalRow.supplier || '-';
        document.getElementById('selectedQty').textContent = selectedHistoricalRow.plan_qty || selectedHistoricalRow.qty || '-';
        document.getElementById('selectedInfo').classList.add('active');
        document.getElementById('btnUseSelected').disabled = false;
        const radio = rowElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

function useSelectedHistorical() {
    if (!selectedHistoricalRow) {
        alert('Please select a historical comparison first');
        return;
    }
    showSpreadsheetCreateView();
    populateLastOrderFromHistorical(selectedHistoricalRow);
}

function populateLastOrderFromHistorical(historyRow) {
    const rowNum = 1;
    const prefix = 'create';

    setFieldValue(rowNum, 'pr_number', historyRow.pr_number || '', prefix);
    setFieldValue(rowNum, 'material_code', historyRow.material_code || historyRow.material_group || '', prefix);
    setFieldValue(rowNum, 'description', historyRow.material || historyRow.description || '', prefix);
    setFieldValue(rowNum, 'uom', historyRow.uom || 'KG', prefix);
    setFieldValue(rowNum, 'qty_pr', historyRow.qty_pr || historyRow.qty || 0, prefix);

    setFieldValue(rowNum, 'last_qty', historyRow.plan_qty || historyRow.qty || 0, prefix);
    setFieldValue(rowNum, 'last_po_number', historyRow.po_number || '', prefix);
    setFieldValue(rowNum, 'last_po_date', formatDateForInput(historyRow.po_date), prefix);

    const hasForeignPrice = historyRow.plan_price_foreign || historyRow.price_foreign;
    const hasKurs = historyRow.plan_kurs_idr || historyRow.kurs_idr;
    const hasPriceIdr = historyRow.plan_price_idr || historyRow.price_idr;

    if (hasForeignPrice) {
        setFieldValue(rowNum, 'last_price_foreign', historyRow.plan_price_foreign || historyRow.price_foreign || 0, prefix);
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date), prefix);
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0, prefix);
    } else if (hasKurs && historyRow.price) {
        setFieldValue(rowNum, 'last_price_foreign', historyRow.price || 0, prefix);
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date), prefix);
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0, prefix);
    } else if (hasPriceIdr) {
        setFieldValue(rowNum, 'last_price_foreign', '', prefix);
        setFieldValue(rowNum, 'last_kurs_date', '', prefix);
        setFieldValue(rowNum, 'last_kurs_idr', '', prefix);
        setFieldValue(rowNum, 'last_price_idr', historyRow.plan_price_idr || historyRow.price_idr || 0, prefix);
    } else {
        setFieldValue(rowNum, 'last_price_foreign', '', prefix);
        setFieldValue(rowNum, 'last_kurs_date', '', prefix);
        setFieldValue(rowNum, 'last_kurs_idr', '', prefix);
        setFieldValue(rowNum, 'last_price_idr', historyRow.price || 0, prefix);
    }

    calculateLastPriceIDR(rowNum, prefix);
    
    setFieldValue(rowNum, 'last_supplier', historyRow.plan_supplier || historyRow.supplier || '', prefix);

    setFieldValue(rowNum, 'plan_qty', '', prefix);
    setFieldValue(rowNum, 'plan_price_foreign', '', prefix);
    setFieldValue(rowNum, 'plan_kurs_date', '', prefix);
    setFieldValue(rowNum, 'plan_kurs_idr', '', prefix);
    setFieldValue(rowNum, 'plan_price_idr', '', prefix);
    setFieldValue(rowNum, 'plan_price_tiba_nu', '', prefix);
    setFieldValue(rowNum, 'plan_amount', '', prefix);
    setFieldValue(rowNum, 'plan_supplier', '', prefix);

    setFieldValue(rowNum, 'gap_price', '', prefix);
    setFieldValue(rowNum, 'gap_percent', '', prefix);
    setFieldValue(rowNum, 'awarded_po_date', '', prefix);
    setFieldValue(rowNum, 'awarded_deliv_date', '', prefix);
    setFieldValue(rowNum, 'awarded_po_number', '', prefix);
    setFieldValue(rowNum, 'awarded_supplier', '', prefix);
    setFieldValue(rowNum, 'awarded_amount', '', prefix);
    setFieldValue(rowNum, 'awarded_keterangan', '', prefix);
}

function loadComparisonHistory() {
    fetch('api/get_history.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                historyData = data.data;
                renderComparisonTable(historyData);
            } else {
                console.error('Error loading history:', data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}

function backToHistory() {
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    selectedPOs.clear();
    selectedHistoricalRow = null;
    currentEditId = null;
    document.getElementById('selectedInfo').classList.remove('active');
    document.getElementById('btnUseSelected').disabled = true;
    document.querySelectorAll('.historical-row').forEach(r => r.classList.remove('selected'));
    
    resetSaveButtons();
}

function resetSaveButtons() {
    const newSaveBtn = document.querySelector('#newComparisonView .btn-primary.btn-large');
    const newDraftBtn = document.querySelector('#newComparisonView .btn-warning.btn-large');
    if (newSaveBtn) {
        newSaveBtn.textContent = 'Save';
        newSaveBtn.onclick = function() { saveComparison('new'); };
    }
    if (newDraftBtn) {
        newDraftBtn.textContent = 'Save as Draft';
        newDraftBtn.onclick = function() { saveAsDraft('new'); };
    }
    
    const createSaveBtn = document.querySelector('#spreadsheetCreateView .btn-primary.btn-large');
    const createDraftBtn = document.querySelector('#spreadsheetCreateView .btn-warning.btn-large');
    if (createSaveBtn) {
        createSaveBtn.textContent = 'Save';
        createSaveBtn.onclick = function() { saveComparison('create'); };
    }
    if (createDraftBtn) {
        createDraftBtn.textContent = 'Save as Draft';
        createDraftBtn.onclick = function() { saveAsDraft('create'); };
    }
}

// ==================== FILTER ====================

function filterCreateTable() {
    const material = document.getElementById('createMaterialSearch').value;
    const supplier = document.getElementById('createSupplierSearch').value;
    if (historyData.length > 0) {
        const filtered = historyData.filter(row => {
            const matchMaterial = !material || 
                (row.material && row.material.toLowerCase().includes(material.toLowerCase())) ||
                (row.material_code && row.material_code.toLowerCase().includes(material.toLowerCase())) ||
                (row.material_group && row.material_group.toLowerCase().includes(material.toLowerCase()));
            const matchSupplier = !supplier || 
                (row.plan_supplier && row.plan_supplier.toLowerCase().includes(supplier.toLowerCase())) ||
                (row.supplier && row.supplier.toLowerCase().includes(supplier.toLowerCase()));
            return matchMaterial && matchSupplier;
        });
        renderHistoricalTableInCreateView(filtered);
    }
}

// ==================== SUPPLIER LIST ====================

function loadSupplierList() {
    fetch('api/get_suppliers.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const datalist = document.getElementById('supplierList');
                datalist.innerHTML = data.data.map(s => 
                    `<option value="${s.supplier_name}">${s.supplier_code} - ${s.supplier_name}</option>`
                ).join('');
            }
        })
        .catch(err => console.error('Error loading suppliers:', err));
}

// ==================== CALCULATION FUNCTIONS ====================

function calculateLastPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'last_price_foreign', prefix);
    const kurs = getFieldValue(rowNum, 'last_kurs_idr', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="last_price_idr"]`);

    let priceIdr = 0;
    if (foreign > 0) {
        priceIdr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) {
            priceIdrInput.value = formatIdrNumber(priceIdr);
            priceIdrInput.dataset.auto = "true";
        }
    } else {
        if (priceIdrInput) priceIdrInput.dataset.auto = "false";
        priceIdr = getFieldValue(rowNum, 'last_price_idr', prefix);
    }

    const tibaNuInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="last_price_tiba_nu"]`);
    if (tibaNuInput) {
        tibaNuInput.value = formatIdrNumber(priceIdr);
    }

    const qty = getFieldValue(rowNum, 'last_qty', prefix);
    const amount = qty * priceIdr;
    setFieldValue(rowNum, 'last_amount', amount, prefix);

    calculateGap(rowNum, prefix);
}

function manualOverrideLastPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'last_price_foreign', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="last_price_idr"]`);

    if (foreign > 0) {
        const kurs = getFieldValue(rowNum, 'last_kurs_idr', prefix);
        const idr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) priceIdrInput.value = formatIdrNumber(idr);
        alert('Price IDR auto-calculated from Foreign Price x Kurs. Clear Foreign Price to input manually.');
    }
    
    calculateLastPriceIDR(rowNum, prefix);
}

function calculateLastAmount(rowNum, prefix) {
    calculateLastPriceIDR(rowNum, prefix);
}

function calculatePlanPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'plan_price_foreign', prefix);
    const kurs = getFieldValue(rowNum, 'plan_kurs_idr', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="plan_price_idr"]`);

    let priceIdr = 0;
    if (foreign > 0) {
        priceIdr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) {
            priceIdrInput.value = formatIdrNumber(priceIdr);
            priceIdrInput.dataset.auto = "true";
        }
    } else {
        if (priceIdrInput) priceIdrInput.dataset.auto = "false";
        priceIdr = getFieldValue(rowNum, 'plan_price_idr', prefix);
    }

    const tibaNuInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="plan_price_tiba_nu"]`);
    if (tibaNuInput) {
        tibaNuInput.value = formatIdrNumber(priceIdr);
    }

    const qty = getFieldValue(rowNum, 'plan_qty', prefix);
    const amount = qty * priceIdr;
    setFieldValue(rowNum, 'plan_amount', amount, prefix);

    calculateGap(rowNum, prefix);
}

function manualOverridePlanPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'plan_price_foreign', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="plan_price_idr"]`);

    if (foreign > 0) {
        const kurs = getFieldValue(rowNum, 'plan_kurs_idr', prefix);
        const idr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) priceIdrInput.value = formatIdrNumber(idr);
        alert('Price IDR auto-calculated from Foreign Price x Kurs. Clear foreign price to input IDR manually.');
    }
    
    calculatePlanPriceIDR(rowNum, prefix);
}

function calculatePlanAmount(rowNum, prefix) {
    calculatePlanPriceIDR(rowNum, prefix);
}

function calculateGap(rowNum, prefix) {
    const lastPrice = getFieldValue(rowNum, 'last_price_idr', prefix);
    const planPrice = getFieldValue(rowNum, 'plan_price_idr', prefix);
    
    if (lastPrice === 0 && planPrice === 0) {
        setFieldValue(rowNum, 'gap_price', '', prefix);
        setFieldValue(rowNum, 'gap_percent', '', prefix);
        return;
    }
    
    const gapPrice = planPrice - lastPrice;
    const gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100) : 0;
    
    setFieldValue(rowNum, 'gap_price', gapPrice, prefix);
    setFieldValue(rowNum, 'gap_percent', gapPercent.toFixed(2), prefix);
}

// ==================== HELPER FUNCTIONS ====================

function setFieldValue(rowNum, fieldName, value, prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const inputs = document.querySelectorAll(`#${containerId} [data-row="${rowNum}"] [data-field="${fieldName}"]`);
    inputs.forEach(input => {
        if (input) {
            if (FORMATTED_FIELDS.includes(fieldName) && value !== '' && value !== null && value !== undefined) {
                input.value = formatIdrNumber(value);
            } else {
                input.value = value;
            }
        }
    });
}

function getFieldValue(rowNum, fieldName, prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const input = document.querySelector(`#${containerId} [data-row="${rowNum}"] [data-field="${fieldName}"]`);
    if (!input) return 0;
    if (FORMATTED_FIELDS.includes(fieldName)) {
        return parseIdrNumber(input.value);
    }
    return parseFloat(input.value) || 0;
}

function getFieldValueSafe(rowNum, fieldName, prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const input = document.querySelector(`#${containerId} [data-row="${rowNum}"] [data-field="${fieldName}"]`);
    if (!input) return '';
    const val = input.value.trim();
    return val === '' ? null : val;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(amount) {
    if (!amount) return '0';
    return formatIdrNumber(amount);
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
}

// ==================== SAVE FUNCTIONS ====================

function saveAsDraft(prefix) {
    saveComparisonData('draft', prefix);
}

function saveComparison(prefix) {
    // FINAL: WAJIB semua required field terisi
    const validation = validateRequiredFields(prefix);
    if (!validation.valid) {
        highlightInvalidFields(prefix, validation.missing);
        showToast('Field berikut wajib diisi untuk status FINAL: ' + validation.missing.join(', '), 'error');
        return; // BLOCK, tidak bisa save final kalau ada yang kosong
    }
    
    clearFieldHighlights(prefix);
    
    const payload = collectFormData(prefix);
    payload.status = 'final';
    payload.created_from = prefix;

    fetch('api/save_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Comparison saved! ID: ' + data.comparison_id);
            backToHistory();
            loadComparisonHistory();
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(err => {
        console.error('Error saving:', err);
        showToast('Server error saat save', 'error');
    });
}

function saveComparisonData(status, prefix) {
    if (status === 'final') {
        const validation = validateRequiredFields(prefix);
        if (!validation.valid) {
            highlightInvalidFields(prefix, validation.missing);
            showToast('Field berikut wajib diisi: ' + validation.missing.join(', '), 'error');
            return;
        }
    }
    
    clearFieldHighlights(prefix);
    
    const payload = collectFormData(prefix);
    payload.status = status;
    payload.created_from = prefix;

    fetch('api/save_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const msg = status === 'final' ? 'Comparison saved!' : 'Draft saved!';
            showToast(msg + ' ID: ' + data.comparison_id);
            backToHistory();
            loadComparisonHistory();
        } else {
            showToast('Error: ' + (data.error || 'Unknown error'), 'error');
        }
    })
    .catch(err => {
        console.error('Error saving:', err);
        showToast('Server error saat save', 'error');
    });
}

function collectFormData(prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    return {
        pr_number: document.querySelector(`#${containerId} [data-field="pr_number"]`).value,
        material_code: document.querySelector(`#${containerId} [data-field="material_code"]`).value,
        description: document.querySelector(`#${containerId} [data-field="description"]`).value,
        uom: document.querySelector(`#${containerId} [data-field="uom"]`).value,
        qty_pr: parseIdrNumber(document.querySelector(`#${containerId} [data-field="qty_pr"]`).value),

        last_qty: getFieldValue(1, 'last_qty', prefix),
        last_po_number: document.querySelector(`#${containerId} [data-field="last_po_number"]`).value,
        last_po_date: getFieldValueSafe(1, 'last_po_date', prefix),
        last_price_foreign: getFieldValue(1, 'last_price_foreign', prefix),
        last_kurs_date: getFieldValueSafe(1, 'last_kurs_date', prefix),
        last_kurs_idr: getFieldValue(1, 'last_kurs_idr', prefix),
        last_price_idr: getFieldValue(1, 'last_price_idr', prefix),
        last_price_tiba_nu: getFieldValue(1, 'last_price_tiba_nu', prefix),
        last_amount: getFieldValue(1, 'last_amount', prefix),
        last_supplier: document.querySelector(`#${containerId} [data-field="last_supplier"]`).value,

        plan_qty: getFieldValue(1, 'plan_qty', prefix),
        plan_price_foreign: getFieldValue(1, 'plan_price_foreign', prefix),
        plan_kurs_date: getFieldValueSafe(1, 'plan_kurs_date', prefix),
        plan_kurs_idr: getFieldValue(1, 'plan_kurs_idr', prefix),
        plan_price_idr: getFieldValue(1, 'plan_price_idr', prefix),
        plan_price_tiba_nu: getFieldValue(1, 'plan_price_tiba_nu', prefix),
        plan_amount: getFieldValue(1, 'plan_amount', prefix),
        plan_supplier: document.querySelector(`#${containerId} [data-field="plan_supplier"]`).value,

        gap_price: getFieldValue(1, 'gap_price', prefix),
        gap_percent: getFieldValue(1, 'gap_percent', prefix),

        awarded_po_date: getFieldValueSafe(1, 'awarded_po_date', prefix),
        awarded_deliv_date: getFieldValueSafe(1, 'awarded_deliv_date', prefix),
        awarded_po_number: document.querySelector(`#${containerId} [data-field="awarded_po_number"]`).value,
        awarded_supplier: document.querySelector(`#${containerId} [data-field="awarded_supplier"]`).value,
        awarded_amount: getFieldValue(1, 'awarded_amount', prefix),
        awarded_keterangan: document.querySelector(`#${containerId} [data-field="awarded_keterangan"]`).value
    };
}

// ==================== AUTOCOMPLETE ====================

function initCreateViewAutocomplete() {
    const materialInput = document.getElementById('createMaterialSearch');
    const supplierInput = document.getElementById('createSupplierSearch');

    materialInput.addEventListener('input', debounce(function() {
        if (this.value.length < 2) return;
        fetch(`api/autocomplete.php?type=material&q=${encodeURIComponent(this.value)}`)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('createMaterialSuggestions');
                list.innerHTML = data.map(item => `
                    <div onclick="selectCreateMaterial('${item.value}')">${item.label}</div>
                `).join('');
                list.style.display = 'block';
            });
    }, 300));

    supplierInput.addEventListener('input', debounce(function() {
        if (this.value.length < 2) return;
        fetch(`api/autocomplete.php?type=supplier&q=${encodeURIComponent(this.value)}`)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('createSupplierSuggestions');
                list.innerHTML = data.map(item => `
                    <div onclick="selectCreateSupplier('${item.value}')">${item.label}</div>
                `).join('');
                list.style.display = 'block';
            });
    }, 300));
}

function selectCreateMaterial(value) {
    document.getElementById('createMaterialSearch').value = value;
    document.getElementById('createMaterialSuggestions').style.display = 'none';
}

function selectCreateSupplier(value) {
    document.getElementById('createSupplierSearch').value = value;
    document.getElementById('createSupplierSuggestions').style.display = 'none';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================== HISTORY TABLE ====================

function loadComparisonHistory() {
    fetch('api/get_history.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                historyData = data.data;
                renderComparisonTable(historyData);
            } else {
                console.error('Error loading history:', data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}

/**
 * Render status badge untuk Draft/Final
 */
function getStatusBadge(status) {
    if (status === 'draft') {
        return `<span style="background:#ffc107;color:#333;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">DRAFT</span>`;
    } else if (status === 'final') {
        return `<span style="background:#28a745;color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">FINAL</span>`;
    }
    return `<span style="background:#6c757d;color:white;padding:2px 8px;border-radius:4px;font-size:11px;">UNKNOWN</span>`;
}

/**
 * Cek apakah user bisa delete data ini
 * - Draft: bisa delete (owner atau admin)
 * - Final: hanya admin/manager bisa delete
 */
function canDelete(row) {
    // Draft bisa di-delete
    return true;
}

function renderComparisonTable(data) {
    const tbody = document.getElementById('comparisonTableBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:20px;color:#888;">No comparison data found</td></tr>';
        return;
    }
    
    // HAPUS BAGIAN INI (sudah ada di HTML):
    // const thead = document.querySelector('#comparisonTable thead tr');
    // if (thead && !thead.querySelector('th.status-col')) { ... }
    
    tbody.innerHTML = data.map(row => {
        const deleteBtn = `<button class="btn btn-small" style="background:#dc3545;color:white;margin-left:5px;" onclick="deleteComparison(${row.comparison_id})">Delete</button>`;
        
        return `
        <tr>
            <td class="checkbox-col">
                <input type="checkbox" value="${row.comparison_id}" 
                    ${selectedHistoryIds.has(row.comparison_id.toString()) ? 'checked' : ''}
                    onchange="toggleHistorySelection(${row.comparison_id})">
            </td>
            <td>#${row.comparison_id}</td>
            <td>${row.pr_number || '-'}</td>
            <td>${row.po_number || '-'}</td>
            <td>${formatDate(row.po_date)}</td>
            <td>${formatDate(row.table_created_date)}</td>
            <td>${row.material || row.material_group || row.material_code || '-'}</td>
            <td>${row.plan_qty != null ? formatIdrNumber(row.plan_qty) : formatIdrNumber(row.qty || 0)}</td>
            <td>${row.price ? 'Rp ' + formatIdrNumber(row.price) : '-'}</td>
            <td>${row.amount ? 'Rp ' + formatIdrNumber(row.amount) : '-'}</td>
            <td>${row.plan_supplier || '-'}</td>
            <td>${formatDate(row.delivery_date)}</td>
            <td>${getStatusBadge(row.status)}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="editComparison(${row.comparison_id}, '${row.created_from || 'create'}')">View</button>
                ${deleteBtn}
            </td>
        </tr>
    `}).join('');
}

function toggleHistorySelection(id) {
    const strId = id.toString();
    if (selectedHistoryIds.has(strId)) selectedHistoryIds.delete(strId);
    else selectedHistoryIds.add(strId);
}

function toggleSelectAllHistory() {
    const checkAll = document.getElementById('selectAllHistory').checked;
    const checkboxes = document.querySelectorAll('#comparisonTableBody input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = checkAll;
        const id = cb.value;
        if (checkAll) selectedHistoryIds.add(id);
        else selectedHistoryIds.delete(id);
    });
}

// ==================== VIEW DETAIL ====================

function viewComparisonDetail(id) {
    const row = historyData.find(h => h.comparison_id == id);
    const source = row ? (row.created_from || 'create') : 'create';
    editComparison(id, source);
}

function showDetailModal(data) {
    console.log('showDetailModal is deprecated, use editComparison instead');
}

function hideDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function saveComparisonEdit(id) {
    console.log('saveComparisonEdit is deprecated, use updateComparison instead');
}

// ==================== GENERATE SAME AS LAST ORDER ====================

function generateSameAsLastOrder() {
    const rowNum = 1;
    const prefix = 'create';

    const lastQty = getFieldValue(rowNum, 'last_qty', prefix);
    const lastPriceForeign = getFieldValue(rowNum, 'last_price_foreign', prefix);
    const lastKursDate = getFieldValueSafe(rowNum, 'last_kurs_date', prefix);
    const lastKursIdr = getFieldValue(rowNum, 'last_kurs_idr', prefix);
    const lastPriceIdr = getFieldValue(rowNum, 'last_price_idr', prefix);
    const lastPriceTibaNu = getFieldValue(rowNum, 'last_price_tiba_nu', prefix);
    const lastAmount = getFieldValue(rowNum, 'last_amount', prefix);
    const lastSupplier = document.querySelector(`#spreadsheetCreateView [data-row="${rowNum}"] [data-field="last_supplier"]`)?.value || '';

    if (!lastQty && !lastPriceIdr && !lastPriceTibaNu) {
        alert('Last Order is empty. Please fill Last Order first or select from historical data.');
        return;
    }

    setFieldValue(rowNum, 'plan_qty', lastQty || '', prefix);
    setFieldValue(rowNum, 'plan_price_foreign', lastPriceForeign || '', prefix);
    setFieldValue(rowNum, 'plan_kurs_date', lastKursDate || '', prefix);
    setFieldValue(rowNum, 'plan_kurs_idr', lastKursIdr || '', prefix);
    setFieldValue(rowNum, 'plan_price_idr', lastPriceIdr || '', prefix);
    setFieldValue(rowNum, 'plan_price_tiba_nu', lastPriceTibaNu || '', prefix);
    setFieldValue(rowNum, 'plan_amount', lastAmount || '', prefix);
    setFieldValue(rowNum, 'plan_supplier', lastSupplier, prefix);

    const planPriceIdrInput = document.querySelector(`#spreadsheetCreateView [data-row="${rowNum}"] [data-field="plan_price_idr"]`);
    const planPriceForeignInput = document.querySelector(`#spreadsheetCreateView [data-row="${rowNum}"] [data-field="plan_price_foreign"]`);

    if (planPriceForeignInput && parseFloat(planPriceForeignInput.value) > 0) {
        if (planPriceIdrInput) planPriceIdrInput.dataset.auto = "true";
    } else {
        if (planPriceIdrInput) planPriceIdrInput.dataset.auto = "false";
    }

    calculateGap(rowNum, 'create');
    showToast('Plan Order filled successfully from Last Order data!');
}

// ==================== CLEAR TABLE ====================

function clearComparisonTable(viewId) {
    if (!confirm('Apakah Anda yakin ingin mengosongkan semua data di tabel?')) {
        return;
    }

    const prefix = viewId === 'newComparisonView' ? 'new' : 'create';
    const container = document.getElementById(viewId);
    const allInputs = container.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]');

    allInputs.forEach(input => {
        if (input.readOnly) return;
        const field = input.getAttribute('data-field');
        if (field === 'uom') {
            input.value = 'KG';
        } else if (field === 'qty_pr') {
            input.value = '5';
        } else {
            input.value = '';
        }
        input.removeAttribute('data-auto');
    });

    const autoInputs = container.querySelectorAll('input[readonly]');
    autoInputs.forEach(input => {
        input.value = '';
    });

    showToast('Tabel berhasil dikosongkan', 'success');
}

// ==================== NUMBER FORMATTING ====================

const FORMATTED_FIELDS = [
    'last_qty', 'last_price_foreign', 'last_kurs_idr', 'last_price_idr', 
    'last_price_tiba_nu', 'last_amount',
    'plan_qty', 'plan_price_foreign', 'plan_kurs_idr', 'plan_price_idr', 
    'plan_price_tiba_nu', 'plan_amount',
    'gap_price', 'gap_percent',
    'awarded_amount', 'qty_pr'
];

function formatIdrNumber(value) {
    if (value === '' || value === null || value === undefined || isNaN(value)) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const parts = num.toString().split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger;
}

function parseIdrNumber(value) {
    if (!value || value === '') return 0;
    const clean = String(value).replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(clean) || 0;
}

function attachIdrFormatter(input) {
    if (!input) return;
    const field = input.getAttribute('data-field');
    if (!FORMATTED_FIELDS.includes(field)) return;

    input.addEventListener('blur', function() {
        if (this.value !== '') {
            const num = parseIdrNumber(this.value);
            if (!isNaN(num)) {
                this.value = formatIdrNumber(num);
            }
        }
    });

    input.addEventListener('focus', function() {
        if (this.value !== '') {
            const num = parseIdrNumber(this.value);
            if (!isNaN(num)) {
                this.value = num;
            }
        }
    });

    input.addEventListener('input', function(e) {
        let val = this.value;
        val = val.replace(/[^0-9.,]/g, '');
        const commas = (val.match(/,/g) || []).length;
        if (commas > 1) {
            const firstComma = val.indexOf(',');
            val = val.substring(0, firstComma + 1) + val.substring(firstComma + 1).replace(/,/g, '');
        }
        this.value = val;
    });
}

function initIdrFormatters() {
    const inputs = document.querySelectorAll('#newComparisonView input[data-field], #spreadsheetCreateView input[data-field]');
    inputs.forEach(input => attachIdrFormatter(input));
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:6px;color:white;font-size:13px;z-index:9999;transition:all 0.3s;opacity:0;';
        document.body.appendChild(toast);
    }
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2500);
}

function autoResizeInput(input) {
    const temp = document.createElement("span");
    temp.style.visibility = "hidden";
    temp.style.position = "absolute";
    temp.style.whiteSpace = "nowrap";
    temp.style.fontSize = window.getComputedStyle(input).fontSize;
    temp.style.fontFamily = window.getComputedStyle(input).fontFamily;

    temp.innerText = input.value || input.placeholder || "";
    document.body.appendChild(temp);

    const newWidth = temp.offsetWidth + 20;
    input.style.width = newWidth + "px";

    document.body.removeChild(temp);
}

document.addEventListener("input", function(e) {
    if (e.target.matches(".input-last-order, .input-header, .input-plan")) {
        autoResizeInput(e.target);
    }
});

// ============================================
// PERBAIKAN PATH EXPORT CSV
// ============================================

function exportSelectedToExcel(filename = "comparison_export.csv") {
    const table = document.getElementById("comparisonTable");

    let csv = [];

    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        let cols = row.querySelectorAll("th, td");
        let rowData = [];

        cols.forEach(col => {

            if (col.querySelector("input[type='checkbox']")) return;

            let text = "";

            const input = col.querySelector("input");
            if (input) {
                text = input.value;
            } else {
                text = col.innerText;
            }

            text = text.replace(/\n/g, " ").trim();
            text = text.replace(/"/g, '""');

            rowData.push(`"${text}"`);
        });

        if (rowData.length > 0) {
            csv.push(rowData.join(","));
        }
    });

    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function deleteComparison(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        return;
    }

    fetch('api/delete_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('Data berhasil dihapus');
            loadComparisonHistory();
        } else {
            showToast('Error: ' + (data.error || 'Gagal menghapus'), 'error');
        }
    })
    .catch(err => {
        console.error('Error deleting:', err);
        showToast('Server error saat menghapus', 'error');
    });
}

// ==================== SORT & FILTER (NEW) ====================

/**
 * Toggle sort direction untuk field tertentu
 * @param {string} field - nama field untuk sort
 */
function sortTableBy(field) {
    if (currentSortField === field) {
        // Toggle direction
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    const sorted = [...historyData].sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        
        // Handle null/undefined
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';
        
        // Convert to string for comparison
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        
        // Number comparison for numeric fields
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
            return currentSortDirection === 'asc' ? numA - numB : numB - numA;
        }
        
        // String comparison
        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderComparisonTable(sorted);
    updateSortIndicators(field, currentSortDirection);
}

/**
 * Update visual indicator (arrow) di header table
 */
function updateSortIndicators(activeField, direction) {
    // Remove all existing sort indicators
    document.querySelectorAll('.sort-indicator').forEach(el => el.remove());
    
    // Find the header cell for this field
    const fieldMap = {
        'comparison_id': 2,
        'pr_number': 3,
        'po_number': 4,
        'po_date': 5,
        'table_created_date': 6,
        'material': 7,
        'plan_qty': 8,
        'price': 9,
        'amount': 10,
        'plan_supplier': 11,
        'delivery_date': 12,
        'status': 13
    };
    
    const colIndex = fieldMap[activeField];
    if (!colIndex) return;
    
    const th = document.querySelector(`#comparisonTable thead tr th:nth-child(${colIndex})`);
    if (th) {
        const arrow = direction === 'asc' ? ' ▲' : ' ▼';
        const indicator = document.createElement('span');
        indicator.className = 'sort-indicator';
        indicator.textContent = arrow;
        indicator.style.fontSize = '10px';
        indicator.style.marginLeft = '4px';
        th.appendChild(indicator);
    }
}

/**
 * Filter table by multiple criteria
 */
function filterTable() {
    const materialFilter = document.getElementById('filterMaterial')?.value.toLowerCase().trim() || '';
    const supplierFilter = document.getElementById('filterSupplier')?.value.toLowerCase().trim() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const dateFrom = document.getElementById('filterDateFrom')?.value || '';
    const dateTo = document.getElementById('filterDateTo')?.value || '';
    
    let filtered = historyData.filter(row => {
        // Material filter
        const materialMatch = !materialFilter || 
            (row.material && String(row.material).toLowerCase().includes(materialFilter)) ||
            (row.material_code && String(row.material_code).toLowerCase().includes(materialFilter)) ||
            (row.material_group && String(row.material_group).toLowerCase().includes(materialFilter));
        
        // Supplier filter
        const supplierMatch = !supplierFilter || 
            (row.plan_supplier && String(row.plan_supplier).toLowerCase().includes(supplierFilter)) ||
            (row.supplier && String(row.supplier).toLowerCase().includes(supplierFilter));
        
        // Status filter
        const statusMatch = !statusFilter || row.status === statusFilter;
        
        // Date range filter
        let dateMatch = true;
        if (dateFrom || dateTo) {
            const rowDate = row.table_created_date || row.po_date;
            if (rowDate) {
                const rowDateObj = new Date(rowDate);
                if (dateFrom) {
                    dateMatch = dateMatch && rowDateObj >= new Date(dateFrom);
                }
                if (dateTo) {
                    dateMatch = dateMatch && rowDateObj <= new Date(dateTo + 'T23:59:59');
                }
            }
        }
        
        return materialMatch && supplierMatch && statusMatch && dateMatch;
    });
    
    // Re-apply current sort if exists
    if (currentSortField) {
        filtered = [...filtered].sort((a, b) => {
            let valA = a[currentSortField];
            let valB = b[currentSortField];
            if (valA === null || valA === undefined) valA = '';
            if (valB === null || valB === undefined) valB = '';
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
                return currentSortDirection === 'asc' ? numA - numB : numB - numA;
            }
            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    renderComparisonTable(filtered);
    
    // Update count display
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
        countEl.textContent = `Showing ${filtered.length} of ${historyData.length} records`;
    }
}

/**
 * Reset all filters
 */
function resetFilters() {
    const filterInputs = document.querySelectorAll('.filter-input-advanced');
    filterInputs.forEach(input => {
        if (input.tagName === 'SELECT') {
            input.value = '';
        } else {
            input.value = '';
        }
    });
    renderComparisonTable(historyData);
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
        countEl.textContent = `Showing ${historyData.length} records`;
    }
}

/**
 * Toggle filter panel visibility
 */
function toggleFilterPanel() {
    const panel = document.getElementById('advancedFilterPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}