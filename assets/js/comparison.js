// ==================== GLOBAL VARIABLES ====================
let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
let poData = [];
let selectedPOs = new Set();
let selectedHistoryIds = new Set();
let historyData = [];

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
    loadPODData();
}

function loadComparisonHistory() {
    fetch('api/get_history.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                historyData = data.data; // SIMPAN
                renderComparisonTable(historyData);
            } else {
                console.error('Error loading history:', data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}


function showCreateNewComparison() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('newComparisonView').classList.add('active');
    loadSupplierList();
}

function backToHistory() {
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    selectedPOs.clear();
}

function hideCreateComparison() {
    document.getElementById('createForm').style.display = 'none';
}

// ==================== CREATE COMPARISON (VIEW 2) ====================
function loadPODData(material = '', supplier = '') {
    fetch(`api/get_po_data.php?material=${encodeURIComponent(material)}&supplier=${encodeURIComponent(supplier)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                poData = data.data || [];
                totalRows = poData.length;
                currentPage = 1;
                renderPOTable();
                updatePagination();
            }
        })
        .catch(err => console.error('Error loading PO data:', err));
}

function filterCreateTable() {
    const material = document.getElementById('createMaterialSearch').value;
    const supplier = document.getElementById('createSupplierSearch').value;
    loadPODData(material, supplier);
}

function renderPOTable() {
    const tbody = document.getElementById('poDataTableBody');
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = poData.slice(start, end);

    tbody.innerHTML = pageData.map((row, index) => `
        <tr>
            <td class="checkbox-col">
                <input type="checkbox" ${selectedPOs.has(row.po_id) ? 'checked' : ''} 
                       onchange="togglePOSelection(${row.po_id})">
            </td>
            <td>${start + index + 1}</td>
            <td>${row.po_number || '-'}</td>
            <td>${row.description || '-'}</td>
            <td>${formatDate(row.po_date)}</td>
            <td>${formatDate(row.delivery_date)}</td>
            <td>${row.supplier_name || '-'}</td>
            <td>${row.ordered_quantity || 0} ${row.unit || 'PCS'}</td>
            <td>${formatCurrency(row.unit_price)}</td>
            <td>${formatCurrency(row.total_amount)}</td>
        </tr>
    `).join('');

    const showingEnd = Math.min(end, totalRows);
    document.getElementById('showingInfo').textContent = 
        totalRows > 0 ? `${start + 1}-${showingEnd} of ${totalRows}` : '0-0 of 0';
}

function updatePagination() {
    const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
    document.getElementById('pageInfo').textContent = `${currentPage} / ${totalPages}`;
    document.getElementById('btnPrev').disabled = currentPage <= 1;
    document.getElementById('btnNext').disabled = currentPage >= totalPages;
}

function changeRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    renderPOTable();
    updatePagination();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPOTable();
        updatePagination();
    }
}

function nextPage() {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderPOTable();
        updatePagination();
    }
}

function toggleSelectAll() {
    const checkAll = document.getElementById('selectAllPO').checked;
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    for (let i = start; i < Math.min(end, poData.length); i++) {
        if (checkAll) selectedPOs.add(poData[i].po_id);
        else selectedPOs.delete(poData[i].po_id);
    }
    renderPOTable();
}

function togglePOSelection(poId) {
    if (selectedPOs.has(poId)) selectedPOs.delete(poId);
    else selectedPOs.add(poId);
}

function createComparisonFromSelection() {
    if (selectedPOs.size === 0) {
        alert('Please select at least one PO');
        return;
    }
    const selectedData = poData.filter(po => selectedPOs.has(po.po_id));
    const materials = [...new Set(selectedData.map(po => po.material_group || po.description))];
    if (materials.length > 1) {
        alert('Please select POs with the same material');
        return;
    }
    const formData = new FormData();
    formData.append('material', materials[0]);
    formData.append('po_ids', JSON.stringify([...selectedPOs]));
    
    fetch('api/generate.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(`Comparison created! ID: ${data.comparison_id}`);
                backToHistory();
                loadComparisonHistory();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(err => console.error('Error:', err));
}

// ==================== CREATE NEW COMPARISON (VIEW 3 - SPREADSHEET) ====================

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

function loadNewComparisonData() {
    const material = document.getElementById('newMaterialSearch').value;
    const supplier = document.getElementById('newSupplierSearch').value;
    
    if (!material) {
        alert('Please enter material name or code');
        return;
    }
    
    fetch(`api/get_last_order.php?material=${encodeURIComponent(material)}&supplier=${encodeURIComponent(supplier)}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                populateLastOrderDefaults(data.data);
            } else {
                alert('No historical data found. You can fill manually.');
            }
        })
        .catch(err => console.error('Error:', err));
}

function populateLastOrderDefaults(historyData) {
    setFieldValue(1, 'last_qty', historyData.last_qty || '');
    setFieldValue(1, 'last_po_number', historyData.last_po_number || '');
    setFieldValue(1, 'last_po_date', formatDateForInput(historyData.last_po_date));
    setFieldValue(1, 'last_price_foreign', historyData.last_price_foreign || '');
    setFieldValue(1, 'last_kurs_date', formatDateForInput(historyData.last_kurs_date));
    setFieldValue(1, 'last_kurs_idr', historyData.last_kurs_idr || '');
    
    calculateLastPriceIDR(1);
    
    setFieldValue(1, 'last_price_tiba_nu', historyData.last_price_tiba_nu || '');
    setFieldValue(1, 'last_supplier', historyData.supplier_name || '');
    
    calculateLastAmount(1);
    
    setFieldValue(1, 'material_code', historyData.material_group || '');
    setFieldValue(1, 'description', historyData.description || '');
    setFieldValue(1, 'uom', historyData.uom || 'KG');
}

// ==================== CALCULATION FUNCTIONS ====================

function calculateLastPriceIDR(rowNum) {
    const foreign = getFieldValue(rowNum, 'last_price_foreign');
    const kurs = getFieldValue(rowNum, 'last_kurs_idr');
    const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="last_price_idr"]`);
    
    if (foreign > 0) {
        const idr = foreign * (kurs > 0 ? kurs : 1);
        priceIdrInput.value = idr.toFixed(2);
        priceIdrInput.dataset.auto = "true";
    } else {
        priceIdrInput.dataset.auto = "false";
    }
    
    calculateLastAmount(rowNum);
    calculateGap(rowNum);
}

function manualOverrideLastPriceIDR(rowNum) {
    const foreign = getFieldValue(rowNum, 'last_price_foreign');
    const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="last_price_idr"]`);
    
    if (foreign > 0) {
        const kurs = getFieldValue(rowNum, 'last_kurs_idr');
        const idr = foreign * (kurs > 0 ? kurs : 1);
        priceIdrInput.value = idr.toFixed(2);
        alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear Foreign Price to input manually.');
    }
    calculateGap(rowNum);
}

function calculateLastAmount(rowNum) {
    const qty = getFieldValue(rowNum, 'last_qty');
    const tibaNu = getFieldValue(rowNum, 'last_price_tiba_nu');
    const amount = qty * tibaNu;
    setFieldValue(rowNum, 'last_amount', amount.toFixed(2));
}

function calculatePlanPriceIDR(rowNum) {
    const foreign = getFieldValue(rowNum, 'plan_price_foreign');
    const kurs = getFieldValue(rowNum, 'plan_kurs_idr');
    const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_idr"]`);
    
    if (foreign > 0) {
        const idr = foreign * (kurs > 0 ? kurs : 1);
        priceIdrInput.value = idr.toFixed(2);
        priceIdrInput.dataset.auto = "true";
    } else {
        priceIdrInput.dataset.auto = "false";
    }
    
    calculatePlanAmount(rowNum);
    calculateGap(rowNum);
}

function manualOverridePlanPriceIDR(rowNum) {
    const foreign = getFieldValue(rowNum, 'plan_price_foreign');
    const priceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_idr"]`);
    
    if (foreign > 0) {
        const kurs = getFieldValue(rowNum, 'plan_kurs_idr');
        const idr = foreign * (kurs > 0 ? kurs : 1);
        priceIdrInput.value = idr.toFixed(2);
        alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear Foreign Price to input manually.');
    }
    calculateGap(rowNum);
}

function calculatePlanAmount(rowNum) {
    const qty = getFieldValue(rowNum, 'plan_qty');
    const tibaNu = getFieldValue(rowNum, 'plan_price_tiba_nu');
    const amount = qty * tibaNu;
    setFieldValue(rowNum, 'plan_amount', amount.toFixed(2));
}

function calculateGap(rowNum) {
    const lastPrice = getFieldValue(rowNum, 'last_price_idr');
    const planPrice = getFieldValue(rowNum, 'plan_price_idr');
    
    const gapPrice = planPrice - lastPrice;
    const gapPercent = lastPrice > 0 ? ((gapPrice / lastPrice) * 100) : 0;
    
    setFieldValue(rowNum, 'gap_price', gapPrice.toFixed(2));
    setFieldValue(rowNum, 'gap_percent', gapPercent.toFixed(2));
}

// ==================== HELPER FUNCTIONS ====================

function setFieldValue(rowNum, fieldName, value) {
    const inputs = document.querySelectorAll(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
    inputs.forEach(input => { if (input) input.value = value; });
}

function getFieldValue(rowNum, fieldName) {
    const input = document.querySelector(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
    return input ? parseFloat(input.value) || 0 : 0;
}

function getFieldValueSafe(rowNum, fieldName) {
    const input = document.querySelector(`[data-row="${rowNum}"] [data-field="${fieldName}"]`);
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
    return new Intl.NumberFormat('id-ID').format(amount);
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
}

// ==================== SAVE FUNCTIONS ====================

function saveAsDraft() {
    saveComparisonData('draft');
}

function saveComparison() {
    saveComparisonData('final');
}

function saveComparisonData(status) {
    const payload = collectFormData();
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

// ==================== collectFormData - SATU SAJA, pakai getFieldValueSafe ====================

function collectFormData() {
    return {
        pr_number: document.querySelector('[data-field="pr_number"]').value,
        material_code: document.querySelector('[data-field="material_code"]').value,
        description: document.querySelector('[data-field="description"]').value,
        uom: document.querySelector('[data-field="uom"]').value,
        qty_pr: getFieldValue(1, 'qty_pr'),
        
        last_qty: getFieldValue(1, 'last_qty'),
        last_po_number: document.querySelector('[data-field="last_po_number"]').value,
        last_po_date: getFieldValueSafe(1, 'last_po_date'),
        last_price_foreign: getFieldValue(1, 'last_price_foreign'),
        last_kurs_date: getFieldValueSafe(1, 'last_kurs_date'),
        last_kurs_idr: getFieldValue(1, 'last_kurs_idr'),
        last_price_idr: getFieldValue(1, 'last_price_idr'),
        last_price_tiba_nu: getFieldValue(1, 'last_price_tiba_nu'),
        last_amount: getFieldValue(1, 'last_amount'),
        last_supplier: document.querySelector('[data-field="last_supplier"]').value,
        
        plan_qty: getFieldValue(1, 'plan_qty'),
        plan_price_foreign: getFieldValue(1, 'plan_price_foreign'),
        plan_kurs_date: getFieldValueSafe(1, 'plan_kurs_date'),
        plan_kurs_idr: getFieldValue(1, 'plan_kurs_idr'),
        plan_price_idr: getFieldValue(1, 'plan_price_idr'),
        plan_price_tiba_nu: getFieldValue(1, 'plan_price_tiba_nu'),
        plan_amount: getFieldValue(1, 'plan_amount'),
        plan_supplier: document.querySelector('[data-field="plan_supplier"]').value,
        
        gap_price: getFieldValue(1, 'gap_price'),
        gap_percent: getFieldValue(1, 'gap_percent'),
        
        awarded_po_date: getFieldValueSafe(1, 'awarded_po_date'),
        awarded_deliv_date: getFieldValueSafe(1, 'awarded_deliv_date'),
        awarded_po_number: document.querySelector('[data-field="awarded_po_number"]').value,
        awarded_supplier: document.querySelector('[data-field="awarded_supplier"]').value,
        awarded_amount: getFieldValue(1, 'awarded_amount'),
        awarded_keterangan: document.querySelector('[data-field="awarded_keterangan"]').value
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

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.filter-group')) {
            document.getElementById('createMaterialSuggestions').style.display = 'none';
            document.getElementById('createSupplierSuggestions').style.display = 'none';
        }
    });
}

function initNewComparisonAutocomplete() {
    const materialInput = document.getElementById('newMaterialSearch');
    const supplierInput = document.getElementById('newSupplierSearch');
    
    materialInput.addEventListener('input', debounce(function() {
        if (this.value.length < 2) return;
        fetch(`api/autocomplete.php?type=material&q=${encodeURIComponent(this.value)}`)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('newMaterialSuggestions');
                list.innerHTML = data.map(item => `
                    <div onclick="selectNewMaterial('${item.value}')">${item.label}</div>
                `).join('');
                list.style.display = 'block';
            });
    }, 300));

    supplierInput.addEventListener('input', debounce(function() {
        if (this.value.length < 2) return;
        fetch(`api/autocomplete.php?type=supplier&q=${encodeURIComponent(this.value)}`)
            .then(res => res.json())
            .then(data => {
                const list = document.getElementById('newSupplierSuggestions');
                list.innerHTML = data.map(item => `
                    <div onclick="selectNewSupplier('${item.value}')">${item.label}</div>
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

function selectNewMaterial(value) {
    document.getElementById('newMaterialSearch').value = value;
    document.getElementById('newMaterialSuggestions').style.display = 'none';
}

function selectNewSupplier(value) {
    document.getElementById('newSupplierSearch').value = value;
    document.getElementById('newSupplierSuggestions').style.display = 'none';
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
            <td>${row.plan_qty != null ? row.plan_qty : (row.qty || 0)}</td>
            <td>${row.price ? 'Rp ' + new Intl.NumberFormat('id-ID').format(row.price) : '-'}</td>
            <td>${row.amount ? 'Rp ' + new Intl.NumberFormat('id-ID').format(row.amount) : '-'}</td>
            <td>${row.plan_supplier || '-'}</td>
            <td>${formatDate(row.delivery_date)}</td>
            <td>
                <button class="btn btn-small btn-primary" onclick="viewComparisonDetail(${row.comparison_id})">View</button>
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
                        <td><input type="number" class="input-header" id="edit_qty_pr" value="${data.qty_pr || data.qty || 0}" style="width:50px;"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_qty" value="${data.last_qty || ''}"></td>
                        <td><input type="text" class="input-last-order" id="edit_last_po_number" value="${escapeHtml(data.last_po_number || '')}"></td>
                        <td><input type="date" class="input-last-order" id="edit_last_po_date" value="${data.last_po_date || ''}"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_foreign" value="${data.last_price_foreign || ''}"></td>
                        <td><input type="date" class="input-last-order" id="edit_last_kurs_date" value="${data.last_kurs_date || ''}"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_kurs_idr" value="${data.last_kurs_idr || ''}"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_idr" value="${data.last_price_idr || ''}"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_tiba_nu" value="${data.last_price_tiba_nu || ''}"></td>
                        <td><input type="number" class="input-last-order" id="edit_last_amount" value="${data.last_amount || ''}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_supplier" value="${escapeHtml(data.last_supplier || data.last_supplier_name || '')}"></td>
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
                        <td><input type="number" class="input-plan" id="edit_plan_qty" value="${data.plan_qty || ''}"></td>
                        <td><input type="number" class="input-plan" id="edit_plan_price_foreign" value="${data.plan_price_foreign || ''}"></td>
                        <td><input type="date" class="input-plan" id="edit_plan_kurs_date" value="${data.plan_kurs_date || ''}"></td>
                        <td><input type="number" class="input-plan" id="edit_plan_kurs_idr" value="${data.plan_kurs_idr || ''}"></td>
                        <td><input type="number" class="input-plan" id="edit_plan_price_idr" value="${data.plan_price_idr || ''}"></td>
                        <td><input type="number" class="input-plan" id="edit_plan_price_tiba_nu" value="${data.plan_price_tiba_nu || ''}"></td>
                        <td><input type="number" class="input-plan" id="edit_plan_amount" value="${data.plan_amount || ''}" readonly></td>
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
                        <td><input type="number" class="input-gap" id="edit_gap_price" value="${data.gap_price || ''}" readonly></td>
                        <td><input type="number" class="input-gap" id="edit_gap_percent" value="${data.gap_percent || ''}" readonly></td>
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
                        <td><input type="number" class="input-awarded" id="edit_awarded_amount" value="${data.awarded_amount || ''}"></td>
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
    setTimeout(() => {
        calculateEditModal();
    }, 100);
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

// ==================== SAVE EDIT ====================

function saveComparisonEdit(id) {
    const payload = {
        comparison_id: id,
        pr_number: document.getElementById('edit_pr_number').value,
        material_code: document.getElementById('edit_material_code').value,
        description: document.getElementById('edit_description').value,
        uom: document.getElementById('edit_uom').value,
        qty_pr: parseFloat(document.getElementById('edit_qty_pr').value) || 0,
        
        last_qty: parseFloat(document.getElementById('edit_last_qty').value) || 0,
        last_po_number: document.getElementById('edit_last_po_number').value,
        last_po_date: document.getElementById('edit_last_po_date').value || null,
        last_price_foreign: parseFloat(document.getElementById('edit_last_price_foreign').value) || 0,
        last_kurs_date: document.getElementById('edit_last_kurs_date').value || null,
        last_kurs_idr: parseFloat(document.getElementById('edit_last_kurs_idr').value) || 0,
        last_price_idr: parseFloat(document.getElementById('edit_last_price_idr').value) || 0,
        last_price_tiba_nu: parseFloat(document.getElementById('edit_last_price_tiba_nu').value) || 0,
        last_amount: parseFloat(document.getElementById('edit_last_amount').value) || 0,
        last_supplier: document.getElementById('edit_last_supplier').value,
        
        plan_qty: parseFloat(document.getElementById('edit_plan_qty').value) || 0,
        plan_price_foreign: parseFloat(document.getElementById('edit_plan_price_foreign').value) || 0,
        plan_kurs_date: document.getElementById('edit_plan_kurs_date').value || null,
        plan_kurs_idr: parseFloat(document.getElementById('edit_plan_kurs_idr').value) || 0,
        plan_price_idr: parseFloat(document.getElementById('edit_plan_price_idr').value) || 0,
        plan_price_tiba_nu: parseFloat(document.getElementById('edit_plan_price_tiba_nu').value) || 0,
        plan_amount: parseFloat(document.getElementById('edit_plan_amount').value) || 0,
        plan_supplier: document.getElementById('edit_plan_supplier').value,
        
        gap_price: parseFloat(document.getElementById('edit_gap_price').value) || 0,
        gap_percent: parseFloat(document.getElementById('edit_gap_percent').value) || 0,
        
        awarded_po_date: document.getElementById('edit_awarded_po_date').value || null,
        awarded_deliv_date: document.getElementById('edit_awarded_deliv_date').value || null,
        awarded_po_number: document.getElementById('edit_awarded_po_number').value,
        awarded_supplier: document.getElementById('edit_awarded_supplier').value,
        awarded_amount: parseFloat(document.getElementById('edit_awarded_amount').value) || 0,
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

// ==================== EXPORT EXCEL ====================

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
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    })
    .catch(err => console.error('Export error:', err));
}