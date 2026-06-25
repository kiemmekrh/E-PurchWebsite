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
let planRowCounters = { create: 1, new: 1 };

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
        if (input.tagName === 'SELECT') {
            // Handle select element
            if (isEditable) {
                input.disabled = false;
                input.removeAttribute('disabled');
                input.style.background = 'white';
                input.style.cursor = 'default';
            } else {
                input.disabled = true;
                input.setAttribute('disabled', 'disabled');
                input.style.background = '#e8e8e8';
                input.style.cursor = 'not-allowed';
            }
            return;
        }
        
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

function populateCreateComparisonForm(data) {
    const prefix = 'create';
    const isDraft = data.status === 'draft';
    
    // Clear existing plan rows (reset to 1)
    resetPlanRows(prefix);
    
    // Populate header & last order (row 1)
    setFieldValue(1, 'pr_number', data.pr_number || '', prefix);
    setFieldValue(1, 'material_code', data.material_code || '', prefix);
    setFieldValue(1, 'description', data.description || '', prefix);
    setFieldValue(1, 'uom', data.uom || 'KG', prefix);
    setFieldValue(1, 'qty_pr', data.qty_pr || 0, prefix);
    
    setFieldValue(1, 'last_qty', data.last_qty || 0, prefix);
    setFieldValue(1, 'last_po_number', data.last_po_number || '', prefix);
    setFieldValue(1, 'last_po_date', data.last_po_date || '', prefix);
    
    const lastCurrencySelect = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`);
    if (lastCurrencySelect) lastCurrencySelect.value = data.last_currency || '';
    
    setFieldValue(1, 'last_price_foreign', data.last_price_foreign || 0, prefix);
    setFieldValue(1, 'last_kurs_date', data.last_kurs_date || '', prefix);
    setFieldValue(1, 'last_kurs_idr', data.last_kurs_idr || 0, prefix);
    setFieldValue(1, 'last_price_idr', data.last_price_idr || 0, prefix);
    setFieldValue(1, 'last_price_tiba_nu', data.last_price_tiba_nu || 0, prefix);
    setFieldValue(1, 'last_amount', data.last_amount || 0, prefix);
    setFieldValue(1, 'last_supplier', data.last_supplier_name || '', prefix);
    
    // Populate plan rows from Comparison_Plan_Row
    if (data.plan_rows && data.plan_rows.length > 0) {
        data.plan_rows.forEach((planRow, index) => {
            const rowNum = index + 1;
            
            // Add row if more than 1
            if (index > 0) {
                addPlanRow(prefix);
            }
            
            // Fill plan data
            const rowElement = document.querySelector(`#${prefix}PlanOrderBody [data-plan-row="${rowNum}"]`);
            if (rowElement) {
                const qtyInput = rowElement.querySelector('[data-field="plan_qty"]');
                const currencySelect = rowElement.querySelector('[data-field="plan_currency"]');
                const foreignInput = rowElement.querySelector('[data-field="plan_price_foreign"]');
                const kursDateInput = rowElement.querySelector('[data-field="plan_kurs_date"]');
                const kursIdrInput = rowElement.querySelector('[data-field="plan_kurs_idr"]');
                const priceIdrInput = rowElement.querySelector('[data-field="plan_price_idr"]');
                const tibaNuInput = rowElement.querySelector('[data-field="plan_price_tiba_nu"]');
                const amountInput = rowElement.querySelector('[data-field="plan_amount"]');
                const supplierInput = rowElement.querySelector('[data-field="plan_supplier"]');
                
                if (qtyInput) qtyInput.value = planRow.plan_qty ? formatIdrNumber(planRow.plan_qty) : '';
                if (currencySelect) currencySelect.value = planRow.plan_currency || '';
                if (foreignInput) foreignInput.value = planRow.plan_price_foreign ? formatIdrNumber(planRow.plan_price_foreign) : '';
                if (kursDateInput) kursDateInput.value = planRow.plan_kurs_date || '';
                if (kursIdrInput) kursIdrInput.value = planRow.plan_kurs_idr ? formatIdrNumber(planRow.plan_kurs_idr) : '';
                if (priceIdrInput) priceIdrInput.value = planRow.plan_price_idr ? formatIdrNumber(planRow.plan_price_idr) : '';
                if (tibaNuInput) tibaNuInput.value = planRow.plan_price_tiba_nu ? formatIdrNumber(planRow.plan_price_tiba_nu) : '';
                if (amountInput) amountInput.value = planRow.plan_amount ? formatIdrNumber(planRow.plan_amount) : '';
                if (supplierInput) supplierInput.value = planRow.plan_supplier_name || '';
                
                // Mark awarded
                if (planRow.is_awarded == 1) {
                    fillAwardedFromPlan(prefix, rowNum);
                }
            }
            
            // Calculate gap
            calculatePlanGap(rowNum, prefix);
        });
    }
    
    // Populate awarded
    setFieldValue(1, 'awarded_po_date', data.awarded_po_date || '', prefix);
    setFieldValue(1, 'awarded_deliv_date', data.awarded_deliv_date || '', prefix);
    setFieldValue(1, 'awarded_po_number', data.awarded_po_number || '', prefix);
    setFieldValue(1, 'awarded_supplier', data.awarded_supplier_name || '', prefix);
    setFieldValue(1, 'awarded_amount', data.awarded_amount || 0, prefix);
    setFieldValue(1, 'awarded_keterangan', data.awarded_keterangan || '', prefix);
    
    setLastOrderEditable(prefix, isDraft);
    updateSaveButtonForEdit(prefix, isDraft);
    
    // Re-init formatters
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function populateNewComparisonForm(data) {
    const prefix = 'new';
    const isDraft = data.status === 'draft';
    
    // Clear existing plan rows
    resetPlanRows(prefix);
    
    // Populate header & last order
    setFieldValue(1, 'pr_number', data.pr_number || '', prefix);
    setFieldValue(1, 'material_code', data.material_code || '', prefix);
    setFieldValue(1, 'description', data.description || '', prefix);
    setFieldValue(1, 'uom', data.uom || 'KG', prefix);
    setFieldValue(1, 'qty_pr', data.qty_pr || 0, prefix);
    
    setFieldValue(1, 'last_qty', data.last_qty || 0, prefix);
    setFieldValue(1, 'last_po_number', data.last_po_number || '', prefix);
    setFieldValue(1, 'last_po_date', data.last_po_date || '', prefix);
    
    const lastCurrencySelect = document.querySelector(`#newComparisonView [data-field="last_currency"]`);
    if (lastCurrencySelect) lastCurrencySelect.value = data.last_currency || '';
    
    setFieldValue(1, 'last_price_foreign', data.last_price_foreign || 0, prefix);
    setFieldValue(1, 'last_kurs_date', data.last_kurs_date || '', prefix);
    setFieldValue(1, 'last_kurs_idr', data.last_kurs_idr || 0, prefix);
    setFieldValue(1, 'last_price_idr', data.last_price_idr || 0, prefix);
    setFieldValue(1, 'last_price_tiba_nu', data.last_price_tiba_nu || 0, prefix);
    setFieldValue(1, 'last_amount', data.last_amount || 0, prefix);
    setFieldValue(1, 'last_supplier', data.last_supplier_name || '', prefix);
    
    // Populate plan rows
    if (data.plan_rows && data.plan_rows.length > 0) {
        data.plan_rows.forEach((planRow, index) => {
            const rowNum = index + 1;
            
            if (index > 0) {
                addPlanRow(prefix);
            }
            
            const rowElement = document.querySelector(`#${prefix}PlanOrderBody [data-plan-row="${rowNum}"]`);
            if (rowElement) {
                const qtyInput = rowElement.querySelector('[data-field="plan_qty"]');
                const currencySelect = rowElement.querySelector('[data-field="plan_currency"]');
                const foreignInput = rowElement.querySelector('[data-field="plan_price_foreign"]');
                const kursDateInput = rowElement.querySelector('[data-field="plan_kurs_date"]');
                const kursIdrInput = rowElement.querySelector('[data-field="plan_kurs_idr"]');
                const priceIdrInput = rowElement.querySelector('[data-field="plan_price_idr"]');
                const tibaNuInput = rowElement.querySelector('[data-field="plan_price_tiba_nu"]');
                const amountInput = rowElement.querySelector('[data-field="plan_amount"]');
                const supplierInput = rowElement.querySelector('[data-field="plan_supplier"]');
                
                if (qtyInput) qtyInput.value = planRow.plan_qty ? formatIdrNumber(planRow.plan_qty) : '';
                if (currencySelect) currencySelect.value = planRow.plan_currency || '';
                if (foreignInput) foreignInput.value = planRow.plan_price_foreign ? formatIdrNumber(planRow.plan_price_foreign) : '';
                if (kursDateInput) kursDateInput.value = planRow.plan_kurs_date || '';
                if (kursIdrInput) kursIdrInput.value = planRow.plan_kurs_idr ? formatIdrNumber(planRow.plan_kurs_idr) : '';
                if (priceIdrInput) priceIdrInput.value = planRow.plan_price_idr ? formatIdrNumber(planRow.plan_price_idr) : '';
                if (tibaNuInput) tibaNuInput.value = planRow.plan_price_tiba_nu ? formatIdrNumber(planRow.plan_price_tiba_nu) : '';
                if (amountInput) amountInput.value = planRow.plan_amount ? formatIdrNumber(planRow.plan_amount) : '';
                if (supplierInput) supplierInput.value = planRow.plan_supplier_name || '';
                
                if (planRow.is_awarded == 1) {
                    fillAwardedFromPlan(prefix, rowNum);
                }
            }
            
            calculatePlanGap(rowNum, prefix);
        });
    }
    
    // Populate awarded
    setFieldValue(1, 'awarded_po_date', data.awarded_po_date || '', prefix);
    setFieldValue(1, 'awarded_deliv_date', data.awarded_deliv_date || '', prefix);
    setFieldValue(1, 'awarded_po_number', data.awarded_po_number || '', prefix);
    setFieldValue(1, 'awarded_supplier', data.awarded_supplier_name || '', prefix);
    setFieldValue(1, 'awarded_amount', data.awarded_amount || 0, prefix);
    setFieldValue(1, 'awarded_keterangan', data.awarded_keterangan || '', prefix);
    
    setLastOrderEditable(prefix, isDraft);
    updateSaveButtonForEdit(prefix, isDraft);
    
    setTimeout(() => { initIdrFormatters(); }, 100);
}

/**
 * Reset plan rows ke 1 row kosong
 */
function resetPlanRows(mode) {
    const planBody = document.getElementById(`${mode}PlanOrderBody`);
    const gapBody = document.getElementById(`${mode}GapBody`);
    
    // Remove all except first
    const planRows = planBody.querySelectorAll('.plan-row');
    planRows.forEach((row, idx) => {
        if (idx > 0) row.remove();
    });
    
    const gapRows = gapBody.querySelectorAll('.gap-row');
    gapRows.forEach((row, idx) => {
        if (idx > 0) row.remove();
    });
    
    // Clear first row
    const firstPlanRow = planBody.querySelector('.plan-row');
    if (firstPlanRow) {
        firstPlanRow.querySelectorAll('input').forEach(input => {
            if (!input.readOnly && input.getAttribute('data-field') !== 'plan_price_tiba_nu' && input.getAttribute('data-field') !== 'plan_amount') {
                input.value = '';
            }
        });
        const currencySelect = firstPlanRow.querySelector('[data-field="plan_currency"]');
        if (currencySelect) currencySelect.value = '';
        firstPlanRow.classList.remove('awarded-row');
        const awardBtn = firstPlanRow.querySelector('.btn-award-plan');
        if (awardBtn) {
            awardBtn.textContent = '🏆 Award';
            awardBtn.classList.remove('awarded');
        }
    }
    
    // Clear first gap row
    const firstGapRow = gapBody.querySelector('.gap-row');
    if (firstGapRow) {
        firstGapRow.querySelectorAll('input').forEach(input => input.value = '');
        firstGapRow.querySelector('.gap-status').innerHTML = '—';
    }
    
    planRowCounters[mode] = 1;
    updateRemoveButtons(mode);
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

function updateComparison(prefix) {
    if (!currentEditId) return;
    
    const validation = validateRequiredFields(prefix);
    if (!validation.valid) {
        highlightInvalidFields(prefix, validation.missing);
        showToast('Field berikut wajib diisi untuk status FINAL: ' + validation.missing.join(', '), 'error');
        return;
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
        const lastCurrencySelect = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`);
        if (lastCurrencySelect) {
            lastCurrencySelect.value = historyRow.plan_currency || historyRow.currency || historyRow.last_currency || '';
        }
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date), prefix);
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0, prefix);
    } else if (hasKurs && historyRow.price) {
        setFieldValue(rowNum, 'last_price_foreign', historyRow.price || 0, prefix);
        const lastCurrencySelect = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`);
        if (lastCurrencySelect) {
            lastCurrencySelect.value = historyRow.plan_currency || historyRow.currency || historyRow.last_currency || '';
        }
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date), prefix);
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0, prefix);
    } else if (hasPriceIdr) {
        setFieldValue(rowNum, 'last_price_foreign', '', prefix);
        const lastCurrencySelect = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`);
        if (lastCurrencySelect) lastCurrencySelect.value = '';
        setFieldValue(rowNum, 'last_kurs_date', '', prefix);
        setFieldValue(rowNum, 'last_kurs_idr', '', prefix);
        setFieldValue(rowNum, 'last_price_idr', historyRow.plan_price_idr || historyRow.price_idr || 0, prefix);
    } else {
        setFieldValue(rowNum, 'last_price_foreign', '', prefix);
        const lastCurrencySelect = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`);
        if (lastCurrencySelect) lastCurrencySelect.value = '';
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
    let planRow;
    if (prefix === 'new') {
        planRow = document.querySelector(`#newPlanOrderBody [data-plan-row="${rowNum}"]`);
    } else {
        planRow = document.querySelector(`#createPlanOrderBody [data-plan-row="${rowNum}"]`);
    }
    
    if (!planRow) return;
    
    const foreignInput = planRow.querySelector('[data-field="plan_price_foreign"]');
    const kursInput = planRow.querySelector('[data-field="plan_kurs_idr"]');
    const priceIdrInput = planRow.querySelector('[data-field="plan_price_idr"]');
    const tibaNuInput = planRow.querySelector('[data-field="plan_price_tiba_nu"]');
    const qtyInput = planRow.querySelector('[data-field="plan_qty"]');
    const amountInput = planRow.querySelector('[data-field="plan_amount"]');
    
    const foreign = parseIdrNumber(foreignInput?.value || '0');
    const kurs = parseIdrNumber(kursInput?.value || '0');
    const qty = parseIdrNumber(qtyInput?.value || '0');
    
    let priceIdr = 0;
    
    if (foreign > 0) {
        // Ada foreign price, calculate IDR = foreign × kurs
        priceIdr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) {
            priceIdrInput.value = formatIdrNumber(priceIdr);
            priceIdrInput.dataset.auto = "true";
        }
    } else {
        // Tidak ada foreign price, ambil Price IDR manual
        priceIdr = parseIdrNumber(priceIdrInput?.value || '0');
        if (priceIdrInput) priceIdrInput.dataset.auto = "false";
    }
    
    // TIBA DI NU = Price IDR
    if (tibaNuInput) {
        tibaNuInput.value = formatIdrNumber(priceIdr);
    }
    
    // Amount = QTY × TIBA DI NU
    if (amountInput) {
        const amount = qty * priceIdr;
        amountInput.value = formatIdrNumber(amount);
    }
    
    // Recalculate gap
    calculatePlanGap(rowNum, prefix);
}

function manualOverridePlanPriceIDR(rowNum, prefix) {
    let planRow;
    if (prefix === 'new') {
        planRow = document.querySelector(`#newPlanOrderBody [data-plan-row="${rowNum}"]`);
    } else {
        planRow = document.querySelector(`#createPlanOrderBody [data-plan-row="${rowNum}"]`);
    }
    
    if (!planRow) return;
    
    const foreignInput = planRow.querySelector('[data-field="plan_price_foreign"]');
    const priceIdrInput = planRow.querySelector('[data-field="plan_price_idr"]');
    
    if (foreignInput && parseFloat(foreignInput.value) > 0) {
        const kursInput = planRow.querySelector('[data-field="plan_kurs_idr"]');
        const kurs = parseIdrNumber(kursInput?.value || '0');
        const foreign = parseIdrNumber(foreignInput.value);
        const idr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) priceIdrInput.value = formatIdrNumber(idr);
        alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear foreign price to input IDR manually.');
    }
    
    // Re-run full calculation
    calculatePlanPriceIDR(rowNum, prefix);
}

function calculatePlanAmount(rowNum, prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    
    let planRow;
    if (prefix === 'new') {
        planRow = document.querySelector(`#newPlanOrderBody [data-plan-row="${rowNum}"]`);
    } else {
        planRow = document.querySelector(`#createPlanOrderBody [data-plan-row="${rowNum}"]`);
    }
    
    if (!planRow) {
        // Fallback ke cara lama
        const qty = getFieldValue(rowNum, 'plan_qty', prefix);
        const tibaNu = getFieldValue(rowNum, 'plan_price_tiba_nu', prefix);
        const amount = qty * tibaNu;
        setFieldValue(rowNum, 'plan_amount', amount, prefix);
        calculatePlanGap(rowNum, prefix);
        return;
    }
    
    // Cara baru
    const qtyInput = planRow.querySelector('[data-field="plan_qty"]');
    const tibaNuInput = planRow.querySelector('[data-field="plan_price_tiba_nu"]');
    const amountInput = planRow.querySelector('[data-field="plan_amount"]');
    
    const qty = parseIdrNumber(qtyInput?.value || '0');
    const tibaNu = parseIdrNumber(tibaNuInput?.value || '0');
    const amount = qty * tibaNu;
    
    if (amountInput) {
        amountInput.value = formatIdrNumber(amount);
    }
    
    calculatePlanGap(rowNum, prefix);
}

function calculateGap(rowNum, prefix) {
    const lastPrice = getFieldValue(1, 'last_price_idr', prefix); // Last order selalu row 1
    const planPriceInput = document.querySelector(`#${prefix}PlanOrderBody [data-plan-row="${rowNum}"] [data-field="plan_price_idr"]`);
    const planPrice = planPriceInput ? parseIdrNumber(planPriceInput.value) : 0;
    
    const gapRow = document.querySelector(`#${prefix}GapBody [data-gap-row="${rowNum}"]`);
    if (!gapRow) return;
    
    const gapPriceInput = gapRow.querySelector('[data-field="gap_price"]');
    const gapPercentInput = gapRow.querySelector('[data-field="gap_percent"]');
    const gapStatus = gapRow.querySelector('.gap-status');
    
    if (lastPrice > 0 && planPrice > 0) {
        const gapPrice = planPrice - lastPrice;
        const gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100).toFixed(2) : 0;
        
        gapPriceInput.value = formatIdrNumber(gapPrice);
        gapPercentInput.value = gapPercent + '%';
        
        if (gapPrice < 0) {
            gapStatus.innerHTML = '<span class="gap-status-cheaper">▼ CHEAPER</span>';
        } else if (gapPrice > 0) {
            gapStatus.innerHTML = '<span class="gap-status-expensive">▲ MORE EXPENSIVE</span>';
        } else {
            gapStatus.innerHTML = '<span class="gap-status-same">— SAME</span>';
        }
    } else {
        gapPriceInput.value = '';
        gapPercentInput.value = '';
        gapStatus.innerHTML = '—';
    }
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
    
    const getSelectValue = (field, context = document) => {
        const select = context.querySelector(`[data-field="${field}"]`);
        return select ? select.value : '';
    };
    
    // Collect multiple plan rows
    const planRows = [];
    let awardedPlanRow = null;
    
    document.querySelectorAll(`#${prefix}PlanOrderBody .plan-row`).forEach((row, idx) => {
        const rowNum = row.getAttribute('data-plan-row');
        const gapRow = document.querySelector(`#${prefix}GapBody [data-gap-row="${rowNum}"]`);
        
        // Check if this row is awarded
        if (row.classList.contains('awarded-row')) {
            awardedPlanRow = idx + 1;
        }
        
        planRows.push({
            plan_qty: parseIdrNumber(row.querySelector('[data-field="plan_qty"]')?.value || 0),
            plan_currency: row.querySelector('[data-field="plan_currency"]')?.value || '',
            plan_price_foreign: parseIdrNumber(row.querySelector('[data-field="plan_price_foreign"]')?.value || 0),
            plan_kurs_date: row.querySelector('[data-field="plan_kurs_date"]')?.value || '',
            plan_kurs_idr: parseIdrNumber(row.querySelector('[data-field="plan_kurs_idr"]')?.value || 0),
            plan_price_idr: parseIdrNumber(row.querySelector('[data-field="plan_price_idr"]')?.value || 0),
            plan_price_tiba_nu: parseIdrNumber(row.querySelector('[data-field="plan_price_tiba_nu"]')?.value || 0),
            plan_amount: parseIdrNumber(row.querySelector('[data-field="plan_amount"]')?.value || 0),
            plan_supplier: row.querySelector('[data-field="plan_supplier"]')?.value || '',
            gap_price: parseIdrNumber(gapRow?.querySelector('[data-field="gap_price"]')?.value || 0),
            gap_percent: Math.max(-999.99, Math.min(999.99, parseIdrNumber(gapRow?.querySelector('[data-field="gap_percent"]')?.value?.replace('%', '') || 0)))
        });
    });
    
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
        last_currency: getSelectValue('last_currency'),
        last_kurs_date: getFieldValueSafe(1, 'last_kurs_date', prefix),
        last_kurs_idr: getFieldValue(1, 'last_kurs_idr', prefix),
        last_price_idr: getFieldValue(1, 'last_price_idr', prefix),
        last_price_tiba_nu: getFieldValue(1, 'last_price_tiba_nu', prefix),
        last_amount: getFieldValue(1, 'last_amount', prefix),
        last_supplier: document.querySelector(`#${containerId} [data-field="last_supplier"]`).value,

        plan_rows: planRows,
        awarded_plan_row: awardedPlanRow,

        awarded_po_date: getFieldValueSafe(1, 'awarded_po_date', prefix),
        awarded_deliv_date: getFieldValueSafe(1, 'awarded_deliv_date', prefix),
        awarded_po_number: document.querySelector(`#${containerId} [data-field="awarded_po_number"]`).value,
        awarded_supplier: document.querySelector(`#${containerId} [data-field="awarded_supplier"]`).value,
        awarded_amount: getFieldValue(1, 'awarded_amount', prefix),
        awarded_keterangan: document.querySelector(`#${containerId} [data-field="awarded_keterangan"]`).value
    };
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
    
    tbody.innerHTML = data.map(row => {
        const deleteBtn = `<button class="btn btn-small" style="background:#dc3545;color:white;margin-left:5px;" onclick="deleteComparison(${row.comparison_id})">Delete</button>`;
        
        // Badge jumlah plan rows
        let planBadge = '';
        if (row.plan_count > 1) {
            planBadge = ` <span style="background:#4a90e2;color:white;padding:1px 6px;border-radius:3px;font-size:10px;">${row.plan_count} plans</span>`;
        }
        
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
            <td>${row.material || row.material_group || row.material_code || '-'}${planBadge}</td>
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
    const prefix = 'create';
    const planRows = document.querySelectorAll(`#${prefix}PlanOrderBody .plan-row`);
    
    // Data dari Last Order
    const lastQty = getFieldValue(1, 'last_qty', prefix);
    const lastPriceForeign = getFieldValue(1, 'last_price_foreign', prefix);
    const lastCurrency = document.querySelector(`#spreadsheetCreateView [data-field="last_currency"]`)?.value || '';
    const lastKursDate = getFieldValueSafe(1, 'last_kurs_date', prefix);
    const lastKursIdr = getFieldValue(1, 'last_kurs_idr', prefix);
    const lastPriceIdr = getFieldValue(1, 'last_price_idr', prefix);
    const lastPriceTibaNu = getFieldValue(1, 'last_price_tiba_nu', prefix);
    const lastAmount = getFieldValue(1, 'last_amount', prefix);
    const lastSupplier = document.querySelector(`#spreadsheetCreateView [data-row="1"] [data-field="last_supplier"]`)?.value || '';

    if (!lastQty && !lastPriceIdr) {
        alert('Last Order is empty. Please fill Last Order first or select from historical data.');
        return;
    }

    // Generate ke SEMUA plan rows yang ada
    planRows.forEach(row => {
        const rowNum = row.getAttribute('data-plan-row');
        
        // QTY selalu diisi dari Last Order QTY
        const qtyInput = row.querySelector('[data-field="plan_qty"]');
        if (qtyInput) qtyInput.value = lastQty ? formatIdrNumber(lastQty) : '';
        
        // Jika Last Order punya Foreign Price, copy semua currency data
        if (lastPriceForeign > 0 && lastCurrency) {
            const foreignInput = row.querySelector('[data-field="plan_price_foreign"]');
            const currencySelect = row.querySelector('[data-field="plan_currency"]');
            const kursDateInput = row.querySelector('[data-field="plan_kurs_date"]');
            const kursIdrInput = row.querySelector('[data-field="plan_kurs_idr"]');
            
            if (foreignInput) foreignInput.value = formatIdrNumber(lastPriceForeign);
            if (currencySelect) currencySelect.value = lastCurrency;
            if (kursDateInput) kursDateInput.value = lastKursDate || '';
            if (kursIdrInput) kursIdrInput.value = lastKursIdr ? formatIdrNumber(lastKursIdr) : '';
            
            // Price IDR auto-calculate dari Foreign × Kurs
            const priceIdrInput = row.querySelector('[data-field="plan_price_idr"]');
            if (priceIdrInput) {
                const calculatedIdr = lastPriceForeign * (lastKursIdr > 0 ? lastKursIdr : 1);
                priceIdrInput.value = formatIdrNumber(calculatedIdr);
                priceIdrInput.dataset.auto = "true";
            }
            
            // TIBA DI NU = Price IDR
            const tibaNuInput = row.querySelector('[data-field="plan_price_tiba_nu"]');
            if (tibaNuInput) {
                const calculatedIdr = lastPriceForeign * (lastKursIdr > 0 ? lastKursIdr : 1);
                tibaNuInput.value = formatIdrNumber(calculatedIdr);
            }
            
        } else {
            // Last Order hanya punya Price IDR (tanpa foreign), copy langsung
            const foreignInput = row.querySelector('[data-field="plan_price_foreign"]');
            const currencySelect = row.querySelector('[data-field="plan_currency"]');
            const kursDateInput = row.querySelector('[data-field="plan_kurs_date"]');
            const kursIdrInput = row.querySelector('[data-field="plan_kurs_idr"]');
            const priceIdrInput = row.querySelector('[data-field="plan_price_idr"]');
            const tibaNuInput = row.querySelector('[data-field="plan_price_tiba_nu"]');
            
            if (foreignInput) foreignInput.value = '';
            if (currencySelect) currencySelect.value = '';
            if (kursDateInput) kursDateInput.value = '';
            if (kursIdrInput) kursIdrInput.value = '';
            
            if (priceIdrInput) {
                priceIdrInput.value = lastPriceIdr ? formatIdrNumber(lastPriceIdr) : '';
                priceIdrInput.dataset.auto = "false"; // Manual, bukan dari foreign
            }
            if (tibaNuInput) {
                tibaNuInput.value = lastPriceTibaNu ? formatIdrNumber(lastPriceTibaNu) : (lastPriceIdr ? formatIdrNumber(lastPriceIdr) : '');
            }
        }
        
        // Amount = QTY × TIBA DI NU
        const amountInput = row.querySelector('[data-field="plan_amount"]');
        if (amountInput) {
            const qty = lastQty || 0;
            const tibaNu = getFieldValue(rowNum, 'plan_price_tiba_nu', prefix) || lastPriceTibaNu || lastPriceIdr || 0;
            const amount = qty * tibaNu;
            amountInput.value = amount ? formatIdrNumber(amount) : '';
        }
        
        // Supplier
        const supplierInput = row.querySelector('[data-field="plan_supplier"]');
        if (supplierInput) supplierInput.value = lastSupplier;
        
        // Recalculate gap untuk row ini
        calculatePlanGap(rowNum, prefix);
    });
    
    highlightBestPrice(prefix);
    showToast(`Plan Order filled successfully for ${planRows.length} row(s) from Last Order data!`);
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

// ============================================
// EXPORT TO IMAGE
// ============================================

function exportSelectedToImage() {
    if (selectedHistoryIds.size === 0) {
        showToast('Please select at least one comparison from the table', 'error');
        return;
    }

    const selectedId = Array.from(selectedHistoryIds)[0];

    fetch(`api/get_comparison_detail.php?id=${selectedId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                generateComparisonImage(data.data);
            } else {
                showToast('Error: ' + (data.error || 'Failed to load detail'), 'error');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            showToast('Server error while loading detail', 'error');
        });
}

function generateComparisonImage(data) {
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;padding:30px;width:1400px;font-family:Arial, sans-serif;';

    let html = `
        <div style="text-align:center;margin-bottom:20px;">
            <h2 style="margin:0 0 5px 0;font-size:20px;color:#333;">SUPPLIER COMPARISON TABLE</h2>
            <p style="margin:0;font-size:12px;color:#666;">PT. Niramas Utama (INACO)</p>
            <p style="margin:5px 0 0 0;font-size:11px;color:#888;">Comparison ID: #${data.comparison_id} | Status: ${data.status ? data.status.toUpperCase() : 'N/A'}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:15px;">
            <tr style="background:#f5f5f5;">
                <td style="border:1px solid #ddd;padding:6px 10px;font-weight:600;width:120px;">PR Number</td>
                <td style="border:1px solid #ddd;padding:6px 10px;">${data.pr_number || '-'}</td>
                <td style="border:1px solid #ddd;padding:6px 10px;font-weight:600;width:120px;">Material</td>
                <td style="border:1px solid #ddd;padding:6px 10px;">${data.material_code || data.description || '-'}</td>
                <td style="border:1px solid #ddd;padding:6px 10px;font-weight:600;width:120px;">UOM</td>
                <td style="border:1px solid #ddd;padding:6px 10px;">${data.uom || '-'}</td>
            </tr>
            <tr style="background:#f5f5f5;">
                <td style="border:1px solid #ddd;padding:6px 10px;font-weight:600;">Qty PR</td>
                <td style="border:1px solid #ddd;padding:6px 10px;">${data.qty_pr ? formatIdrNumber(data.qty_pr) : '-'}</td>
                <td style="border:1px solid #ddd;padding:6px 10px;font-weight:600;">Description</td>
                <td style="border:1px solid #ddd;padding:6px 10px;" colspan="3">${data.description || '-'}</td>
            </tr>
        </table>
    `;

    // LAST ORDER
    html += `
        <div style="background:#e8e8e8;padding:8px 12px;font-weight:700;font-size:12px;margin-bottom:0;border:1px solid #bbb;border-bottom:none;">LAST ORDER</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:15px;">
            <tr style="background:#f5f5f5;">
                <th style="border:1px solid #bbb;padding:5px;">QTY</th>
                <th style="border:1px solid #bbb;padding:5px;">No PO</th>
                <th style="border:1px solid #bbb;padding:5px;">Tgl PO</th>
                <th style="border:1px solid #bbb;padding:5px;">Currency</th>
                <th style="border:1px solid #bbb;padding:5px;">Price (Foreign)</th>
                <th style="border:1px solid #bbb;padding:5px;">Tgl Kurs</th>
                <th style="border:1px solid #bbb;padding:5px;">Nilai Kurs (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Price (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Price TIBA DI NU (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Amount (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Supplier</th>
            </tr>
            <tr>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.last_qty ? formatIdrNumber(data.last_qty) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.last_po_number || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${formatDate(data.last_po_date) || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.last_currency || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.last_price_foreign ? formatIdrNumber(data.last_price_foreign) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${formatDate(data.last_kurs_date) || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.last_kurs_idr ? formatIdrNumber(data.last_kurs_idr) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.last_price_idr ? formatIdrNumber(data.last_price_idr) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.last_price_tiba_nu ? formatIdrNumber(data.last_price_tiba_nu) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.last_amount ? formatIdrNumber(data.last_amount) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.last_supplier_name || data.last_supplier || '-'}</td>
            </tr>
        </table>
    `;

    // PLAN ORDER
    const planRows = data.plan_rows || [];
    html += `
        <div style="background:#e3f2fd;padding:8px 12px;font-weight:700;font-size:12px;color:#1565c0;margin-bottom:0;border:1px solid #bbb;border-bottom:none;">PLAN ORDER</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:15px;">
            <tr style="background:#f5f5f5;">
                <th style="border:1px solid #bbb;padding:5px;width:30px;">#</th>
                <th style="border:1px solid #bbb;padding:5px;">QTY</th>
                <th style="border:1px solid #bbb;padding:5px;">Currency</th>
                <th style="border:1px solid #bbb;padding:5px;">Price (Foreign)</th>
                <th style="border:1px solid #bbb;padding:5px;">Tgl Kurs</th>
                <th style="border:1px solid #bbb;padding:5px;">Nilai Kurs (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Price (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">TIBA DI NU (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Amount (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Supplier</th>
                <th style="border:1px solid #bbb;padding:5px;width:60px;">Awarded</th>
            </tr>
    `;

    if (planRows.length > 0) {
        planRows.forEach((pr, idx) => {
            const isAwarded = pr.is_awarded == 1;
            const awardedStyle = isAwarded ? 'background:#fff9c4;' : '';
            const awardedText = isAwarded ? '✓ YES' : '-';
            html += `
                <tr style="${awardedStyle}">
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${pr.plan_qty ? formatIdrNumber(pr.plan_qty) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${pr.plan_currency || '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${pr.plan_price_foreign ? formatIdrNumber(pr.plan_price_foreign) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${formatDate(pr.plan_kurs_date) || '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${pr.plan_kurs_idr ? formatIdrNumber(pr.plan_kurs_idr) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${pr.plan_price_idr ? formatIdrNumber(pr.plan_price_idr) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${pr.plan_price_tiba_nu ? formatIdrNumber(pr.plan_price_tiba_nu) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${pr.plan_amount ? formatIdrNumber(pr.plan_amount) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${pr.plan_supplier_name || pr.plan_supplier || '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;font-weight:600;color:${isAwarded ? '#2e7d32' : '#666'};">${awardedText}</td>
                </tr>
            `;
        });
    } else {
        html += `<tr><td colspan="11" style="border:1px solid #bbb;padding:10px;text-align:center;color:#888;">No plan order data</td></tr>`;
    }
    html += `</table>`;

    // GAP
    html += `
        <div style="background:#ffcc80;padding:8px 12px;font-weight:700;font-size:12px;color:#e65100;margin-bottom:0;border:1px solid #bbb;border-bottom:none;">GAP (Auto-calculated)</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:15px;">
            <tr style="background:#f5f5f5;">
                <th style="border:1px solid #bbb;padding:5px;width:30px;">#</th>
                <th style="border:1px solid #bbb;padding:5px;">Price (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">%</th>
                <th style="border:1px solid #bbb;padding:5px;">Status</th>
            </tr>
    `;

    if (planRows.length > 0) {
        const lastPrice = data.last_price_idr || 0;
        planRows.forEach((pr, idx) => {
            const planPrice = pr.plan_price_idr || 0;
            let gapPrice = 0, gapPercent = 0, statusText = '—', statusColor = '#666';
            if (lastPrice > 0 && planPrice > 0) {
                gapPrice = planPrice - lastPrice;
                gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100).toFixed(2) : 0;
                if (gapPrice < 0) { statusText = '▼ CHEAPER'; statusColor = '#2e7d32'; }
                else if (gapPrice > 0) { statusText = '▲ MORE EXPENSIVE'; statusColor = '#c62828'; }
                else { statusText = '— SAME'; statusColor = '#666'; }
            }
            html += `
                <tr>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${gapPrice !== 0 ? formatIdrNumber(gapPrice) : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:right;">${gapPercent !== 0 ? gapPercent + '%' : '-'}</td>
                    <td style="border:1px solid #bbb;padding:5px;text-align:center;color:${statusColor};font-weight:600;">${statusText}</td>
                </tr>
            `;
        });
    }
    html += `</table>`;

    // AWARDED
    html += `
        <div style="background:#fff59d;padding:8px 12px;font-weight:700;font-size:12px;color:#f57f17;margin-bottom:0;border:1px solid #bbb;border-bottom:none;">AWARDED (Final Selection)</div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:15px;">
            <tr style="background:#f5f5f5;">
                <th style="border:1px solid #bbb;padding:5px;">Tgl PO</th>
                <th style="border:1px solid #bbb;padding:5px;">Deliv. Schedule</th>
                <th style="border:1px solid #bbb;padding:5px;">No PO</th>
                <th style="border:1px solid #bbb;padding:5px;">Supplier</th>
                <th style="border:1px solid #bbb;padding:5px;">Amount (IDR)</th>
                <th style="border:1px solid #bbb;padding:5px;">Keterangan</th>
            </tr>
            <tr>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${formatDate(data.awarded_po_date) || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${formatDate(data.awarded_deliv_date) || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.awarded_po_number || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.awarded_supplier_name || data.awarded_supplier || '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:right;">${data.awarded_amount ? formatIdrNumber(data.awarded_amount) : '-'}</td>
                <td style="border:1px solid #bbb;padding:5px;text-align:center;">${data.awarded_keterangan || '-'}</td>
            </tr>
        </table>

        <div style="margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#888;text-align:center;">
            Generated on ${new Date().toLocaleString('id-ID')} | E-Purch System
        </div>
    `;

    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);

    html2canvas(tempDiv, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Comparison_${data.comparison_id || 'export'}_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        document.body.removeChild(tempDiv);
        showToast('Image exported successfully!', 'success');
    }).catch(err => {
        console.error('html2canvas error:', err);
        document.body.removeChild(tempDiv);
        showToast('Error generating image. Please try again.', 'error');
    });
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

// ============================================
// AUTO STATUS PROMOTION - DRAFT TO FINAL
// ============================================

/**
 * Cek apakah semua required fields sudah terisi
 */
function checkAllFieldsFilled(prefix) {
    const validation = validateRequiredFields(prefix);
    return validation.valid;
}

/**
 * Progress bar kelengkapan field
 */
function addProgressBar(prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const container = document.getElementById(containerId);
    
    let progressContainer = document.getElementById(`progressContainer-${prefix}`);
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = `progressContainer-${prefix}`;
        progressContainer.style.cssText = 'background:#f8f9fa;border:1px solid #e0e0e0;border-radius:6px;padding:10px 15px;margin-bottom:15px;';
        
        progressContainer.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:12px;font-weight:600;color:#555;">Completion Status</span>
                <span id="progressText-${prefix}" style="font-size:12px;font-weight:600;color:#4a90e2;">0%</span>
            </div>
            <div style="width:100%;height:6px;background:#e0e0e0;border-radius:3px;overflow:hidden;">
                <div id="progressBar-${prefix}" style="width:0%;height:100%;background:#4a90e2;transition:width 0.3s;border-radius:3px;"></div>
            </div>
            <div id="progressDetail-${prefix}" style="font-size:11px;color:#888;margin-top:4px;"></div>
        `;
        
        const pageHeader = container.querySelector('.page-header');
        if (pageHeader && pageHeader.nextSibling) {
            container.insertBefore(progressContainer, pageHeader.nextSibling);
        }
    }
    updateProgressBar(prefix);
}

function updateProgressBar(prefix) {
    const allFields = [...REQUIRED_FIELDS.header, ...REQUIRED_FIELDS.plan, ...REQUIRED_FIELDS.awarded];
    let filledCount = 0;
    let emptyFields = [];
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    
    allFields.forEach(field => {
        const input = document.querySelector(`#${containerId} [data-field="${field}"]`);
        if (input) {
            const val = input.value.trim();
            if (val && val !== '' && val !== '0') filledCount++;
            else emptyFields.push(FIELD_LABELS[field] || field);
        }
    });
    
    const percentage = Math.round((filledCount / allFields.length) * 100);
    const progressBar = document.getElementById(`progressBar-${prefix}`);
    const progressText = document.getElementById(`progressText-${prefix}`);
    const progressDetail = document.getElementById(`progressDetail-${prefix}`);
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
        if (percentage === 100) {
            progressBar.style.background = '#28a745';
            progressText.style.color = '#28a745';
            progressText.textContent = '100% - READY FOR FINAL!';
        } else {
            progressBar.style.background = '#ffc107';
            progressText.style.color = '#856404';
            progressText.textContent = percentage + '%';
        }
    }
    
    if (progressDetail) {
        progressDetail.textContent = emptyFields.length > 0 ? 'Missing: ' + emptyFields.join(', ') : 'All fields filled! Will auto-promote to FINAL.';
    }
}

// Override fungsi existing untuk tracking
const originalShowCreateNewComparison = showCreateNewComparison;
showCreateNewComparison = function() {
    originalShowCreateNewComparison();
    setTimeout(() => addProgressBar('new'), 200);
};

const originalShowSpreadsheetCreateView = showSpreadsheetCreateView;
showSpreadsheetCreateView = function() {
    originalShowSpreadsheetCreateView();
    setTimeout(() => addProgressBar('create'), 200);
};

// Real-time monitoring
function initAutoStatusCheck(prefix) {
    const containerId = prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    const inputs = document.querySelectorAll(`#${containerId} input[data-field]`);
    inputs.forEach(input => {
        input.addEventListener('blur', () => setTimeout(() => updateProgressBar(prefix), 100));
        input.addEventListener('change', () => setTimeout(() => updateProgressBar(prefix), 100));
    });
}

// Override save functions untuk auto-promote
const originalSaveComparisonData = saveComparisonData;
saveComparisonData = function(status, prefix) {
    const allFilled = checkAllFieldsFilled(prefix);
    
    // Auto-promote: jika draft tapi semua field terisi, jadikan final
    if (status === 'draft' && allFilled) {
        if (confirm('All required fields are filled! Promote to FINAL status?')) {
            status = 'final';
            showToast('Auto-promoting to FINAL...', 'success');
        }
    }
    
    // Panggil fungsi original dengan status yang mungkin sudah berubah
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
            const msg = status === 'final' ? 'Comparison saved as FINAL!' : 'Draft saved!';
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
};

// ============================================
// MULTIPLE PLAN ROWS MANAGEMENT
// ============================================

/**
 * Add new Plan Order row
 */
function addPlanRow(mode) {
    const counter = ++planRowCounters[mode];
    const planBody = document.getElementById(`${mode}PlanOrderBody`);
    const gapBody = document.getElementById(`${mode}GapBody`);
    const supplierListId = mode === 'new' ? 'newSupplierList' : 'supplierList';
    
    // Plan Row
    const planRow = document.createElement('tr');
    planRow.className = 'data-row plan-row';
    planRow.setAttribute('data-plan-row', counter);
    planRow.innerHTML = `
        <td><span class="plan-row-num">${counter}</span></td>
        <td class="col-plan"><input type="text" inputmode="decimal" class="input-plan" data-field="plan_qty" onchange="calculatePlanAmount(${counter}, '${mode}')"></td>
        <td class="col-plan">
            <select class="input-plan" data-field="plan_currency" style="font-size:10px; padding:2px; border:1px solid #ccc; background:white; width:100%;">
                <option value="">-</option>
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="SGD">SGD</option>
                <option value="MYR">MYR</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
                <option value="AUD">AUD</option>
                <option value="GBP">GBP</option>
            </select>
        </td>
        <td class="col-plan"><input type="text" inputmode="decimal" class="input-plan" data-field="plan_price_foreign" onchange="calculatePlanPriceIDR(${counter}, '${mode}')"></td>
        <td class="col-plan"><input type="date" class="input-plan" data-field="plan_kurs_date"></td>
        <td class="col-plan"><input type="text" inputmode="decimal" class="input-plan" data-field="plan_kurs_idr" onchange="calculatePlanPriceIDR(${counter}, '${mode}')"></td>
        <td class="col-plan"><input type="text" inputmode="decimal" class="input-plan" data-field="plan_price_idr" onchange="manualOverridePlanPriceIDR(${counter}, '${mode}')"></td>
        <td class="col-plan"><input type="text" inputmode="decimal" class="input-plan" data-field="plan_price_tiba_nu" readonly tabindex="-1"></td>
        <td class="col-plan"><input type="text" class="input-plan" data-field="plan_amount" readonly tabindex="-1"></td>
        <td class="col-plan"><input type="text" class="input-plan" data-field="plan_supplier" list="${supplierListId}"></td>
        <td style="padding:2px;">
            <button type="button" class="btn-award-plan" onclick="fillAwardedFromPlan('${mode}', ${counter})" title="Fill Awarded from this plan">🏆 Award</button>
        </td>
        <td style="padding:2px;">
            <button type="button" class="btn-remove-plan" onclick="removePlanRow('${mode}', ${counter})" title="Remove">×</button>
        </td>
    `;
    planBody.appendChild(planRow);
    
    // Gap Row
    const gapRow = document.createElement('tr');
    gapRow.className = 'data-row gap-row';
    gapRow.setAttribute('data-gap-row', counter);
    gapRow.innerHTML = `
        <td><span class="gap-row-num">${counter}</span></td>
        <td class="col-gap"><input type="text" class="input-gap" data-field="gap_price" readonly tabindex="-1"></td>
        <td class="col-gap"><input type="text" class="input-gap" data-field="gap_percent" readonly tabindex="-1"></td>
        <td class="col-gap gap-status" style="font-size:11px;">—</td>
    `;
    gapBody.appendChild(gapRow);
    
    updateRemoveButtons(mode);
    
    setTimeout(() => {
        planRow.querySelectorAll('input[data-field]').forEach(input => attachIdrFormatter(input));
    }, 10);
    
    planRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Remove Plan Order row
 */
function removePlanRow(mode, rowNum) {
    const planBody = document.getElementById(`${mode}PlanOrderBody`);
    const gapBody = document.getElementById(`${mode}GapBody`);
    
    planBody.querySelector(`[data-plan-row="${rowNum}"]`)?.remove();
    gapBody.querySelector(`[data-gap-row="${rowNum}"]`)?.remove();
    
    renumberPlanRows(mode);
    recalculateAllGaps(mode);
    updateRemoveButtons(mode);
}

/**
 * Renumber rows after deletion
 */
function renumberPlanRows(mode) {
    const planRows = document.querySelectorAll(`#${mode}PlanOrderBody .plan-row`);
    const gapRows = document.querySelectorAll(`#${mode}GapBody .gap-row`);
    
    planRows.forEach((row, idx) => {
        const newNum = idx + 1;
        row.setAttribute('data-plan-row', newNum);
        row.querySelector('.plan-row-num').textContent = newNum;
        
        row.querySelectorAll('input, select').forEach(input => {
            const oc = input.getAttribute('onchange');
            if (oc) input.setAttribute('onchange', oc.replace(/\d+/, newNum));
        });
        
        const awardBtn = row.querySelector('.btn-award-plan');
        if (awardBtn) awardBtn.setAttribute('onclick', `fillAwardedFromPlan('${mode}', ${newNum})`);
        
        const removeBtn = row.querySelector('.btn-remove-plan');
        if (removeBtn) removeBtn.setAttribute('onclick', `removePlanRow('${mode}', ${newNum})`);
    });
    
    gapRows.forEach((row, idx) => {
        row.setAttribute('data-gap-row', idx + 1);
        row.querySelector('.gap-row-num').textContent = idx + 1;
    });
    
    planRowCounters[mode] = planRows.length;
}

function updateRemoveButtons(mode) {
    const rows = document.querySelectorAll(`#${mode}PlanOrderBody .plan-row`);
    document.querySelectorAll(`#${mode}PlanOrderBody .btn-remove-plan`).forEach(btn => {
        btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
    });
}

/**
 * 🏆 Fill Awarded section from selected plan row
 */
function fillAwardedFromPlan(mode, planRowNum) {
    let planRow;
    if (mode === 'new') {
        planRow = document.querySelector(`#newPlanOrderBody [data-plan-row="${planRowNum}"]`);
    } else {
        planRow = document.querySelector(`#createPlanOrderBody [data-plan-row="${planRowNum}"]`);
    }
    
    if (!planRow) return;
    
    const containerId = mode === 'new' ? 'newComparisonView' : 'spreadsheetCreateView';
    
    const planSupplier = planRow.querySelector('[data-field="plan_supplier"]')?.value || '';
    const planAmount = planRow.querySelector('[data-field="plan_amount"]')?.value || '';
    const planQty = planRow.querySelector('[data-field="plan_qty"]')?.value || '';
    const planPriceIdr = planRow.querySelector('[data-field="plan_price_idr"]')?.value || '';
    
    // Fill awarded fields
    const awardedSupplier = document.querySelector(`#${containerId} [data-field="awarded_supplier"]`);
    const awardedAmount = document.querySelector(`#${containerId} [data-field="awarded_amount"]`);
    
    if (awardedSupplier) awardedSupplier.value = planSupplier;
    if (awardedAmount) awardedAmount.value = planAmount;
    
    // Visual feedback
    document.querySelectorAll(`#${mode}PlanOrderBody .plan-row`).forEach(r => {
        r.classList.remove('awarded-row');
        const btn = r.querySelector('.btn-award-plan');
        if (btn) {
            btn.textContent = '🏆 Award';
            btn.classList.remove('awarded');
        }
    });
    
    planRow.classList.add('awarded-row');
    const activeBtn = planRow.querySelector('.btn-award-plan');
    if (activeBtn) {
        activeBtn.textContent = '✓ Awarded';
        activeBtn.classList.add('awarded');
    }
    
    showToast(`Awarded filled from Plan #${planRowNum} — Supplier: ${planSupplier || '-'}, Amount: ${planAmount || '-'}`, 'success');
}

/**
 * Calculate GAP for specific plan row
 */
function calculatePlanGap(rowNum, mode) {
    const lastPrice = getFieldValue(1, 'last_price_idr', mode);
    
    let planPriceInput;
    if (mode === 'new') {
        planPriceInput = document.querySelector(`#newPlanOrderBody [data-plan-row="${rowNum}"] [data-field="plan_price_idr"]`);
    } else {
        planPriceInput = document.querySelector(`#createPlanOrderBody [data-plan-row="${rowNum}"] [data-field="plan_price_idr"]`);
    }
    
    const planPrice = planPriceInput ? parseIdrNumber(planPriceInput.value) : 0;
    
    let gapRow;
    if (mode === 'new') {
        gapRow = document.querySelector(`#newGapBody [data-gap-row="${rowNum}"]`);
    } else {
        gapRow = document.querySelector(`#createGapBody [data-gap-row="${rowNum}"]`);
    }
    
    if (!gapRow) return;
    
    const gapPriceInput = gapRow.querySelector('[data-field="gap_price"]');
    const gapPercentInput = gapRow.querySelector('[data-field="gap_percent"]');
    const gapStatus = gapRow.querySelector('.gap-status');
    
    if (lastPrice > 0 && planPrice > 0) {
        const gapPrice = planPrice - lastPrice;
        let gapPercent = lastPrice > 0 ? (gapPrice / lastPrice) * 100 : 0;
        
        // Clamp ke range -999.99 sampai 999.99
        gapPercent = Math.max(-999.99, Math.min(999.99, gapPercent));
        
        gapPriceInput.value = formatIdrNumber(gapPrice);
        gapPercentInput.value = gapPercent.toFixed(2) + '%';
        
        if (gapPrice < 0) gapStatus.innerHTML = '<span class="gap-status-cheaper">▼ CHEAPER</span>';
        else if (gapPrice > 0) gapStatus.innerHTML = '<span class="gap-status-expensive">▲ MORE EXPENSIVE</span>';
        else gapStatus.innerHTML = '<span class="gap-status-same">— SAME</span>';
    } else {
        gapPriceInput.value = '';
        gapPercentInput.value = '';
        gapStatus.innerHTML = '—';
    }
}

function recalculateAllGaps(mode) {
    document.querySelectorAll(`#${mode}PlanOrderBody .plan-row`).forEach(row => {
        calculatePlanGap(row.getAttribute('data-plan-row'), mode);
    });
    highlightBestPrice(mode);
}

function highlightBestPrice(mode) {
    const planRows = document.querySelectorAll(`#${mode}PlanOrderBody .plan-row`);
    let bestRow = null, bestPrice = Infinity;
    
    planRows.forEach(row => {
        if (row.classList.contains('awarded-row')) return; // Skip awarded
        const priceInput = row.querySelector('[data-field="plan_price_idr"]');
        const price = parseIdrNumber(priceInput?.value || '0');
        if (price > 0 && price < bestPrice) {
            bestPrice = price;
            bestRow = row;
        }
    });
    
    planRows.forEach(r => r.classList.remove('best-price'));
    if (bestRow) bestRow.classList.add('best-price');
}

// Override calculate functions to also calculate gap
const _origCalcPlanPriceIDR = calculatePlanPriceIDR;
calculatePlanPriceIDR = function(rowNum, mode) {
    _origCalcPlanPriceIDR(rowNum, mode);
    calculatePlanGap(rowNum, mode);
    highlightBestPrice(mode);
};

const _origCalcPlanAmount = calculatePlanAmount;
calculatePlanAmount = function(rowNum, mode) {
    _origCalcPlanAmount(rowNum, mode);
    calculatePlanGap(rowNum, mode);
    highlightBestPrice(mode);
};