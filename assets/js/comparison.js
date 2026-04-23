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

document.addEventListener('DOMContentLoaded', function() {
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

// ==================== VIEW NAVIGATION ====================

function showCreateComparison() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.add('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    currentMode = 'create';
    loadHistoricalForCreateView();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

function showCreateNewComparison() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.remove('active');
    document.getElementById('newComparisonView').classList.add('active');
    currentMode = 'new';
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
}

// Tampilkan spreadsheet Create Comparison (setelah pilih history)
function showSpreadsheetCreateView() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    document.getElementById('spreadsheetCreateView').classList.add('active');
    currentMode = 'create';
    loadSupplierList();
    setTimeout(() => { initIdrFormatters(); }, 100);
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
    setFieldValue(rowNum, 'last_price_tiba_nu', historyRow.plan_price_tiba_nu || historyRow.price_tiba_nu || historyRow.last_price_tiba_nu || historyRow.tiba_nu_price || 0, prefix);
    setFieldValue(rowNum, 'last_supplier', historyRow.plan_supplier || historyRow.supplier || '', prefix);
    calculateLastAmount(rowNum, prefix);

    // Reset Plan Order
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
    document.getElementById('selectedInfo').classList.remove('active');
    document.getElementById('btnUseSelected').disabled = true;
    document.querySelectorAll('.historical-row').forEach(r => r.classList.remove('selected'));
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
// prefix: 'new' untuk Create New Comparison, 'create' untuk Create Comparison

function calculateLastPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'last_price_foreign', prefix);
    const kurs = getFieldValue(rowNum, 'last_kurs_idr', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="last_price_idr"]`);

    if (foreign > 0) {
        const idr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) {
            priceIdrInput.value = formatIdrNumber(idr);
            priceIdrInput.dataset.auto = "true";
        }
    } else {
        if (priceIdrInput) priceIdrInput.dataset.auto = "false";
    }

    // Auto-fill TIBA DI NU dari Price IDR
    syncTibaNuFromPriceIDR(rowNum, 'last', prefix);
    calculateLastAmount(rowNum, prefix);
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
    // Auto-fill TIBA DI NU dari Price IDR
    syncTibaNuFromPriceIDR(rowNum, 'last', prefix);
    calculateGap(rowNum, prefix);
}

function calculateLastAmount(rowNum, prefix) {
    const qty = getFieldValue(rowNum, 'last_qty', prefix);
    const tibaNu = getFieldValue(rowNum, 'last_price_tiba_nu', prefix);
    const amount = qty * tibaNu;
    setFieldValue(rowNum, 'last_amount', amount, prefix);
}

function calculatePlanPriceIDR(rowNum, prefix) {
    const foreign = getFieldValue(rowNum, 'plan_price_foreign', prefix);
    const kurs = getFieldValue(rowNum, 'plan_kurs_idr', prefix);
    const priceIdrInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="plan_price_idr"]`);

    if (foreign > 0) {
        const idr = foreign * (kurs > 0 ? kurs : 1);
        if (priceIdrInput) {
            priceIdrInput.value = formatIdrNumber(idr);
            priceIdrInput.dataset.auto = "true";
        }
    } else {
        if (priceIdrInput) priceIdrInput.dataset.auto = "false";
    }

    // Auto-fill TIBA DI NU dari Price IDR
    syncTibaNuFromPriceIDR(rowNum, 'plan', prefix);
    calculatePlanAmount(rowNum, prefix);
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
    // Auto-fill TIBA DI NU dari Price IDR
    syncTibaNuFromPriceIDR(rowNum, 'plan', prefix);
    calculateGap(rowNum, prefix);
}

// TIBA DI NU otomatis dari Price IDR
function syncTibaNuFromPriceIDR(rowNum, type, prefix) {
    const priceIdr = getFieldValue(rowNum, `${type}_price_idr`, prefix);
    const tibaNuInput = document.querySelector(`#${prefix === 'new' ? 'newComparisonView' : 'spreadsheetCreateView'} [data-row="${rowNum}"] [data-field="${type}_price_tiba_nu"]`);
    if (tibaNuInput) {
        tibaNuInput.value = formatIdrNumber(priceIdr);
    }
}

function calculatePlanAmount(rowNum, prefix) {
    const qty = getFieldValue(rowNum, 'plan_qty', prefix);
    const tibaNu = getFieldValue(rowNum, 'plan_price_tiba_nu', prefix);
    const amount = qty * tibaNu;
    setFieldValue(rowNum, 'plan_amount', amount, prefix);
}

function calculateGap(rowNum, prefix) {
    const lastPrice = getFieldValue(rowNum, 'last_price_idr', prefix);
    const planPrice = getFieldValue(rowNum, 'plan_price_idr', prefix);
    const gapPrice = planPrice - lastPrice;
    const gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100) : 0;
    setFieldValue(rowNum, 'gap_price', gapPrice, prefix);
    setFieldValue(rowNum, 'gap_percent', gapPercent, prefix);
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
    saveComparisonData('final', prefix);
}

function saveComparisonData(status, prefix) {
    const payload = collectFormData(prefix);
    payload.status = status;

    fetch('api/save_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`Comparison saved as ${status}! ID: ${data.comparison_id}`);
            backToHistory();
            loadComparisonHistory();
        } else {
            alert('Error: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(err => console.error('Error saving:', err));
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

function renderComparisonTable(data) {
    const tbody = document.getElementById('comparisonTableBody');
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:20px;color:#888;">No comparison data found</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(row => `
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
            <td>
                <button class="btn btn-small btn-primary" onclick="viewComparisonDetail(${row.comparison_id})">View</button>
                <button class="btn btn-small" 
                    style="background:#dc3545;color:white;margin-left:5px;"
                    onclick="deleteComparison(${row.comparison_id})">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
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

// ==================== VIEW DETAIL (MODAL) ====================

function viewComparisonDetail(id) {
    fetch(`api/get_comparison_detail.php?id=${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showDetailModal(data.data);
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}

function showDetailModal(data) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');

    content.innerHTML = `
        <div class="comparison-spreadsheet-container">
            <table class="comparison-spreadsheet">
                <thead>
                    <tr class="section-header">
                        <th rowspan="2">No</th>
                        <th rowspan="2">PR</th>
                        <th rowspan="2">Material Code</th>
                        <th rowspan="2">Description</th>
                        <th rowspan="2">UOM</th>
                        <th rowspan="2">Qty PR</th>
                        <th colspan="10" class="header-last-order">LAST ORDER</th>
                    </tr>
                    <tr class="sub-header">
                        <th>QTY</th><th>No PO</th><th>Tgl PO</th><th>Price Foreign</th>
                        <th>Tgl Kurs</th><th>Nilai Kurs</th><th>Price IDR</th>
                        <th>Price TIBA NU</th><th>Amount</th><th>Supplier</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="data-row">
                        <td>1</td>
                        <td><input type="text" class="input-header" id="edit_pr_number" value="${escapeHtml(data.pr_number || '')}"></td>
                        <td><input type="text" class="input-header" id="edit_material_code" value="${escapeHtml(data.material_code || '')}"></td>
                        <td><input type="text" class="input-header" id="edit_description" value="${escapeHtml(data.material || data.description || '')}"></td>
                        <td><input type="text" class="input-header" id="edit_uom" value="${escapeHtml(data.uom || 'KG')}" style="width:40px;"></td>
                        <td><input type="text" class="input-header" id="edit_qty_pr" value="${formatIdrNumber(data.qty_pr || data.qty || 0)}" style="width:50px;"></td>
                        <td><input type="text" class="input-last-order" id="edit_last_qty" value="${formatIdrNumber(data.last_qty || '')}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_po_number" value="${escapeHtml(data.last_po_number || '')}" readonly></td>
                        <td><input type="date" class="input-last-order" id="edit_last_po_date" value="${data.last_po_date || ''}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_price_foreign" value="${formatIdrNumber(data.last_price_foreign || '')}" readonly></td>
                        <td><input type="date" class="input-last-order" id="edit_last_kurs_date" value="${data.last_kurs_date || ''}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_kurs_idr" value="${formatIdrNumber(data.last_kurs_idr || '')}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_price_idr" value="${formatIdrNumber(data.last_price_idr || '')}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_price_tiba_nu" value="${formatIdrNumber(data.last_price_tiba_nu || '')}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_amount" value="${formatIdrNumber(data.last_amount || '')}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_supplier" value="${escapeHtml(data.last_supplier || data.last_supplier_name || '')}" readonly></td>
                    </tr>
                </tbody>
            </table>

            <table class="comparison-spreadsheet" style="margin-top:0;border-top:none;">
                <thead>
                    <tr class="section-header"><th colspan="8" class="header-plan">PLAN ORDER</th></tr>
                    <tr class="sub-header">
                        <th>QTY</th><th>Price Foreign</th><th>Tgl Kurs</th><th>Nilai Kurs</th>
                        <th>Price IDR</th><th>TIBA DI NU</th><th>Amount</th><th>Supplier</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><input type="text" class="input-plan" id="edit_plan_qty" value="${formatIdrNumber(data.plan_qty || '')}"></td>
                        <td><input type="text" class="input-plan" id="edit_plan_price_foreign" value="${formatIdrNumber(data.plan_price_foreign || '')}"></td>
                        <td><input type="date" class="input-plan" id="edit_plan_kurs_date" value="${data.plan_kurs_date || ''}"></td>
                        <td><input type="text" class="input-plan" id="edit_plan_kurs_idr" value="${formatIdrNumber(data.plan_kurs_idr || '')}"></td>
                        <td><input type="text" class="input-plan" id="edit_plan_price_idr" value="${formatIdrNumber(data.plan_price_idr || '')}"></td>
                        <td><input type="text" class="input-plan" id="edit_plan_price_tiba_nu" value="${formatIdrNumber(data.plan_price_tiba_nu || '')}" readonly></td>
                        <td><input type="text" class="input-plan" id="edit_plan_amount" value="${formatIdrNumber(data.plan_amount || '')}" readonly></td>
                        <td><input type="text" class="input-plan" id="edit_plan_supplier" value="${escapeHtml(data.plan_supplier || data.plan_supplier_name || '')}"></td>
                    </tr>
                </tbody>
            </table>

            <table class="comparison-spreadsheet" style="margin-top:0;border-top:none;">
                <thead>
                    <tr class="section-header"><th colspan="2" class="header-gap">GAP (Auto)</th></tr>
                    <tr class="sub-header"><th>Price IDR</th><th>%</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><input type="text" class="input-gap" id="edit_gap_price" value="${formatIdrNumber(data.gap_price || '')}" readonly></td>
                        <td><input type="text" class="input-gap" id="edit_gap_percent" value="${formatIdrNumber(data.gap_percent || '')}" readonly></td>
                    </tr>
                </tbody>
            </table>

            <table class="comparison-spreadsheet" style="margin-top:0;border-top:none;">
                <thead>
                    <tr class="section-header"><th colspan="6" class="header-awarded">AWARDED</th></tr>
                    <tr class="sub-header">
                        <th>Tgl PO</th><th>Deliv. Schedule</th><th>No PO</th>
                        <th>Supplier</th><th>Amount</th><th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><input type="date" class="input-awarded" id="edit_awarded_po_date" value="${data.awarded_po_date || ''}"></td>
                        <td><input type="date" class="input-awarded" id="edit_awarded_deliv_date" value="${data.awarded_deliv_date || ''}"></td>
                        <td><input type="text" class="input-awarded" id="edit_awarded_po_number" value="${escapeHtml(data.po_number || data.awarded_po_number || '')}"></td>
                        <td><input type="text" class="input-awarded" id="edit_awarded_supplier" value="${escapeHtml(data.awarded_supplier || data.awarded_supplier_name || data.plan_supplier || '')}"></td>
                        <td><input type="text" class="input-awarded" id="edit_awarded_amount" value="${formatIdrNumber(data.awarded_amount || '')}"></td>
                        <td><input type="text" class="input-awarded" id="edit_awarded_keterangan" value="${escapeHtml(data.awarded_keterangan || '')}"></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="margin-top:15px;text-align:center;">
            <button class="btn btn-primary" onclick="saveComparisonEdit(${data.comparison_id})">Save Changes</button>
            <button class="btn btn-secondary" onclick="hideDetailModal()">Cancel</button>
        </div>
    `;

    modal.style.display = 'block';
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function hideDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function saveComparisonEdit(id) {
    const payload = {
        comparison_id: id,
        pr_number: document.getElementById('edit_pr_number').value,
        material_code: document.getElementById('edit_material_code').value,
        description: document.getElementById('edit_description').value,
        uom: document.getElementById('edit_uom').value,
        qty_pr: parseIdrNumber(document.getElementById('edit_qty_pr').value),

        last_qty: parseIdrNumber(document.getElementById('edit_last_qty').value),
        last_po_number: document.getElementById('edit_last_po_number').value,
        last_po_date: document.getElementById('edit_last_po_date').value || null,
        last_price_foreign: parseIdrNumber(document.getElementById('edit_last_price_foreign').value),
        last_kurs_date: document.getElementById('edit_last_kurs_date').value || null,
        last_kurs_idr: parseIdrNumber(document.getElementById('edit_last_kurs_idr').value),
        last_price_idr: parseIdrNumber(document.getElementById('edit_last_price_idr').value),
        last_price_tiba_nu: parseIdrNumber(document.getElementById('edit_last_price_tiba_nu').value),
        last_amount: parseIdrNumber(document.getElementById('edit_last_amount').value),
        last_supplier: document.getElementById('edit_last_supplier').value,

        plan_qty: parseIdrNumber(document.getElementById('edit_plan_qty').value),
        plan_price_foreign: parseIdrNumber(document.getElementById('edit_plan_price_foreign').value),
        plan_kurs_date: document.getElementById('edit_plan_kurs_date').value || null,
        plan_kurs_idr: parseIdrNumber(document.getElementById('edit_plan_kurs_idr').value),
        plan_price_idr: parseIdrNumber(document.getElementById('edit_plan_price_idr').value),
        plan_price_tiba_nu: parseIdrNumber(document.getElementById('edit_plan_price_tiba_nu').value),
        plan_amount: parseIdrNumber(document.getElementById('edit_plan_amount').value),
        plan_supplier: document.getElementById('edit_plan_supplier').value,

        gap_price: parseIdrNumber(document.getElementById('edit_gap_price').value),
        gap_percent: parseIdrNumber(document.getElementById('edit_gap_percent').value),

        awarded_po_date: document.getElementById('edit_awarded_po_date').value || null,
        awarded_deliv_date: document.getElementById('edit_awarded_deliv_date').value || null,
        awarded_po_number: document.getElementById('edit_awarded_po_number').value,
        awarded_supplier: document.getElementById('edit_awarded_supplier').value,
        awarded_amount: parseIdrNumber(document.getElementById('edit_awarded_amount').value),
        awarded_keterangan: document.getElementById('edit_awarded_keterangan').value
    };

    fetch('api/update_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Comparison updated successfully!');
            hideDetailModal();
            loadComparisonHistory();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => console.error('Error:', err));
}

function exportComparisonDetail() {
    alert('Export functionality to be implemented');
}

function exportSelectedToExcel() {
    const selectedIds = Array.from(selectedHistoryIds);
    if (selectedIds.length === 0) {
        alert('Please select at least one comparison to export');
        return;
    }
    fetch('api/export_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
    })
    .then(res => res.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'comparison_export.xlsx';
        a.click();
    })
    .catch(err => console.error('Export error:', err));
}

function deleteComparison(id) {
    if (!confirm(`Delete comparison #${id}?`)) return;
    fetch('api/delete_comparison.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Deleted successfully');
            historyData = historyData.filter(item => item.comparison_id != id);
            renderComparisonTable(historyData);
        } else {
            alert('Error: ' + (data.error || 'Delete failed'));
        }
    })
    .catch(err => {
        console.error(err);
        alert('Server error');
    });
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

    const newWidth = temp.offsetWidth + 20; // padding
    input.style.width = newWidth + "px";

    document.body.removeChild(temp);
}

document.addEventListener("input", function(e) {
    if (e.target.matches(".input-last-order, .input-header, .input-plan")) {
        autoResizeInput(e.target);
    }
});