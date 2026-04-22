// ==================== GLOBAL VARIABLES ====================
let currentPage = 1;
let rowsPerPage = 10;
let totalRows = 0;
let poData = [];
let selectedPOs = new Set();
let selectedHistoryIds = new Set();
let historyData = [];
let selectedHistoricalRow = null; // VARIABEL BARU: menyimpan row historical yang dipilih

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

// MODIFIKASI: showCreateComparison sekarang menampilkan View 2 dengan historical table
function showCreateComparison() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.add('active');

    // Load historical data untuk View 2
    loadHistoricalForCreateView();
}

// BARU: Load historical comparison data untuk ditampilkan di View 2
function loadHistoricalForCreateView() {
    // Gunakan historyData yang sudah di-load sebelumnya, atau fetch ulang
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

// BARU: Render historical table di dalam View 2 (Create Comparison)
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
            <td>${row.plan_qty != null ? row.plan_qty : (row.qty || 0)}</td>
            <td>${row.price ? 'Rp ' + new Intl.NumberFormat('id-ID').format(row.price) : '-'}</td>
            <td>${row.amount ? 'Rp ' + new Intl.NumberFormat('id-ID').format(row.amount) : '-'}</td>
            <td>${row.plan_supplier || row.supplier || '-'}</td>
            <td>${formatDate(row.delivery_date)}</td>
        </tr>
    `).join('');
}

// BARU: Saat user klik row di tabel historical (di View 2)
function selectHistoricalRow(rowElement, comparisonId) {
    // Hapus seleksi sebelumnya
    document.querySelectorAll('.historical-row').forEach(r => r.classList.remove('selected'));

    // Tandai row yang diklik
    rowElement.classList.add('selected');

    // Cari data row yang dipilih dari historyData
    selectedHistoricalRow = historyData.find(h => h.comparison_id == comparisonId);

    if (selectedHistoricalRow) {
        // Update info box
        document.getElementById('selectedMaterial').textContent = selectedHistoricalRow.material || selectedHistoricalRow.material_group || selectedHistoricalRow.material_code || '-';
        document.getElementById('selectedSupplier').textContent = selectedHistoricalRow.plan_supplier || selectedHistoricalRow.supplier || '-';
        document.getElementById('selectedQty').textContent = selectedHistoricalRow.plan_qty || selectedHistoricalRow.qty || '-';
        document.getElementById('selectedInfo').classList.add('active');

        // Enable tombol "Use Selected as Last Order"
        document.getElementById('btnUseSelected').disabled = false;

        // Check radio button
        const radio = rowElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

// BARU: Saat user klik "Use Selected as Last Order" → pindah ke View 3 (spreadsheet)
function useSelectedHistorical() {
    if (!selectedHistoricalRow) {
        alert('Please select a historical comparison first');
        return;
    }

    // Pindah ke View 3 (spreadsheet New Comparison)
    showCreateNewComparison();

    // Isi Last Order dengan data dari historical row yang dipilih
    populateLastOrderFromHistorical(selectedHistoricalRow);
}

// BARU: Isi Last Order di spreadsheet dari data historical yang dipilih
function populateLastOrderFromHistorical(historyRow) {
    const rowNum = 1;

    // Header columns
    setFieldValue(rowNum, 'pr_number', historyRow.pr_number || '');
    setFieldValue(rowNum, 'material_code', historyRow.material_code || historyRow.material_group || '');
    setFieldValue(rowNum, 'description', historyRow.material || historyRow.description || '');
    setFieldValue(rowNum, 'uom', historyRow.uom || 'KG');
    setFieldValue(rowNum, 'qty_pr', historyRow.qty_pr || historyRow.qty || 0);

    // Last Order columns
    setFieldValue(rowNum, 'last_qty', historyRow.plan_qty || historyRow.qty || 0);
    setFieldValue(rowNum, 'last_po_number', historyRow.po_number || '');
    setFieldValue(rowNum, 'last_po_date', formatDateForInput(historyRow.po_date));

    // PERBAIKAN: Cek dulu jenis price-nya
    const hasForeignPrice = historyRow.plan_price_foreign || historyRow.price_foreign;
    const hasKurs = historyRow.plan_kurs_idr || historyRow.kurs_idr;
    const hasPriceIdr = historyRow.plan_price_idr || historyRow.price_idr;
    const tibaNuValue = historyRow.plan_price_tiba_nu || historyRow.price_tiba_nu 
        || historyRow.last_price_tiba_nu
        || historyRow.tiba_nu_price
        || 0;

    if (hasForeignPrice) {
        // Ada foreign price → masuk ke Price (CNY/USD/SGD)
        setFieldValue(rowNum, 'last_price_foreign', historyRow.plan_price_foreign || historyRow.price_foreign || 0);
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date));
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0);
        // Price IDR dihitung otomatis
    } else if (hasKurs && historyRow.price) {
        // Ada kurs + price → price dianggap foreign
        setFieldValue(rowNum, 'last_price_foreign', historyRow.price || 0);
        setFieldValue(rowNum, 'last_kurs_date', formatDateForInput(historyRow.plan_kurs_date || historyRow.kurs_date));
        setFieldValue(rowNum, 'last_kurs_idr', historyRow.plan_kurs_idr || historyRow.kurs_idr || 0);
    } else if (hasPriceIdr) {
        // Ada price_idr eksplisit
        setFieldValue(rowNum, 'last_price_foreign', '');
        setFieldValue(rowNum, 'last_kurs_date', '');
        setFieldValue(rowNum, 'last_kurs_idr', '');
        setFieldValue(rowNum, 'last_price_idr', historyRow.plan_price_idr || historyRow.price_idr || 0);
    } else {
        // Hanya ada price (generic), tidak ada kurs → ini IDR
        setFieldValue(rowNum, 'last_price_foreign', '');
        setFieldValue(rowNum, 'last_kurs_date', '');
        setFieldValue(rowNum, 'last_kurs_idr', '');
        setFieldValue(rowNum, 'last_price_idr', historyRow.price || 0);
    }

    calculateLastPriceIDR(rowNum);

    setFieldValue(rowNum, 'last_price_tiba_nu', historyRow.plan_price_tiba_nu || historyRow.price_tiba_nu || 0);
    setFieldValue(rowNum, 'last_supplier', historyRow.plan_supplier || historyRow.supplier || '');

    calculateLastAmount(rowNum);

    // Reset Plan Order (kosongkan untuk input baru)
    setFieldValue(rowNum, 'plan_qty', '');
    setFieldValue(rowNum, 'plan_price_foreign', '');
    setFieldValue(rowNum, 'plan_kurs_date', '');
    setFieldValue(rowNum, 'plan_kurs_idr', '');
    setFieldValue(rowNum, 'plan_price_idr', '');
    setFieldValue(rowNum, 'plan_price_tiba_nu', '');
    setFieldValue(rowNum, 'plan_amount', '');
    setFieldValue(rowNum, 'plan_supplier', '');

    // Reset GAP & Awarded
    setFieldValue(rowNum, 'gap_price', '');
    setFieldValue(rowNum, 'gap_percent', '');
    setFieldValue(rowNum, 'awarded_po_date', '');
    setFieldValue(rowNum, 'awarded_deliv_date', '');
    setFieldValue(rowNum, 'awarded_po_number', '');
    setFieldValue(rowNum, 'awarded_supplier', '');
    setFieldValue(rowNum, 'awarded_amount', '');
    setFieldValue(rowNum, 'awarded_keterangan', '');
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


// TIDAK DIUBAH - showCreateNewComparison tetap seperti semula (spreadsheet kosong)
function showCreateNewComparison() {
    document.getElementById('historyView').classList.add('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.add('active');
    loadSupplierList();
}

function backToHistory() {
    document.getElementById('historyView').classList.remove('hidden');
    document.getElementById('createView').classList.remove('active');
    document.getElementById('newComparisonView').classList.remove('active');
    selectedPOs.clear();
    selectedHistoricalRow = null; // RESET

    // Reset info box dan tombol
    document.getElementById('selectedInfo').classList.remove('active');
    document.getElementById('btnUseSelected').disabled = true;
    document.querySelectorAll('.historical-row').forEach(r => r.classList.remove('selected'));
}

function hideCreateComparison() {
    document.getElementById('createForm').style.display = 'none';
}

// ==================== CREATE COMPARISON (VIEW 2) ====================

// MODIFIKASI: filterCreateTable juga filter historical table
function filterCreateTable() {
    const material = document.getElementById('createMaterialSearch').value;
    const supplier = document.getElementById('createSupplierSearch').value;

    // BARU: Filter historical table
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

// ==================== CREATE NEW COMPARISON (VIEW 3 - SPREADSHEET) ====================
// TIDAK DIUBAH - fungsi spreadsheet tetap seperti semula

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
// TIDAK DIUBAH - fungsi kalkulasi tetap seperti semula

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
        alert('Price IDR auto-calculated from Foreign Price × Kurs. Clear foreign price to input IDR manually.');
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
// TIDAK DIUBAH

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
// TIDAK DIUBAH

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

// ==================== collectFormData ====================
// TIDAK DIUBAH

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
// TIDAK DIUBAH

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
// TIDAK DIUBAH

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
// TIDAK DIUBAH

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
                        <td><input type="number" class="input-last-order" id="edit_last_qty" value="${data.last_qty || ''}" readonly></td>
                        <td><input type="text" class="input-last-order" id="edit_last_po_number" value="${escapeHtml(data.last_po_number || '')}" readonly></td>
                        <td><input type="date" class="input-last-order" id="edit_last_po_date" value="${data.last_po_date || ''}" readonly></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_foreign" value="${data.last_price_foreign || ''}" readonly></td>
                        <td><input type="date" class="input-last-order" id="edit_last_kurs_date" value="${data.last_kurs_date || ''}" readonly></td>
                        <td><input type="number" class="input-last-order" id="edit_last_kurs_idr" value="${data.last_kurs_idr || ''}" readonly></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_idr" value="${data.last_price_idr || ''}" readonly></td>
                        <td><input type="number" class="input-last-order" id="edit_last_price_tiba_nu" value="${data.last_price_tiba_nu || ''}" readonly></td>
                        <td><input type="number" class="input-last-order" id="edit_last_amount" value="${data.last_amount || ''}" readonly></td>
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
// TIDAK DIUBAH

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
// TIDAK DIUBAH

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
            
            // hapus dari state biar ga reload full juga bisa
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

    // Ambil semua data dari Last Order
    const lastQty = getFieldValue(rowNum, 'last_qty');
    const lastPriceForeign = getFieldValue(rowNum, 'last_price_foreign');
    const lastKursDate = getFieldValueSafe(rowNum, 'last_kurs_date');
    const lastKursIdr = getFieldValue(rowNum, 'last_kurs_idr');
    const lastPriceIdr = getFieldValue(rowNum, 'last_price_idr');
    const lastPriceTibaNu = getFieldValue(rowNum, 'last_price_tiba_nu');
    const lastAmount = getFieldValue(rowNum, 'last_amount');
    const lastSupplier = document.querySelector(`[data-row="${rowNum}"] [data-field="last_supplier"]`)?.value || '';

    // Validasi: cek apakah Last Order sudah terisi
    if (!lastQty && !lastPriceIdr && !lastPriceTibaNu) {
        alert('Last Order is empty. Please fill Last Order first or select from historical data.');
        return;
    }

    // Isi Plan Order dengan data dari Last Order
    setFieldValue(rowNum, 'plan_qty', lastQty || '');
    setFieldValue(rowNum, 'plan_price_foreign', lastPriceForeign || '');
    setFieldValue(rowNum, 'plan_kurs_date', lastKursDate || '');
    setFieldValue(rowNum, 'plan_kurs_idr', lastKursIdr || '');
    setFieldValue(rowNum, 'plan_price_idr', lastPriceIdr || '');
    setFieldValue(rowNum, 'plan_price_tiba_nu', lastPriceTibaNu || '');
    setFieldValue(rowNum, 'plan_amount', lastAmount || '');
    setFieldValue(rowNum, 'plan_supplier', lastSupplier);

    // Update styling untuk Price IDR (auto/manual)
    const planPriceIdrInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_idr"]`);
    const planPriceForeignInput = document.querySelector(`[data-row="${rowNum}"] [data-field="plan_price_foreign"]`);
    
    if (planPriceForeignInput && parseFloat(planPriceForeignInput.value) > 0) {
        planPriceIdrInput.dataset.auto = "true";
    } else {
        planPriceIdrInput.dataset.auto = "false";
    }

    // Hitung ulang Gap
    calculateGap(rowNum);

    // Tampilkan notifikasi
    showToast('Plan Order filled successfully from Last Order data!');
}

// Helper: Toast notification
function showToast(message) {
    // Hapus toast lama jika ada
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    // Buat toast baru
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    // Tambah animation style
    if (!document.getElementById('toast-style')) {
        const style = document.createElement('style');
        style.id = 'toast-style';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto remove setelah 3 detik
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}