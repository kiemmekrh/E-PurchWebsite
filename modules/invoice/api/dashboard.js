// File: assets/js/dashboard.js
let currentPage = 1;
let rowsPerPage = 10;

function loadDashboardData() {
    const searchEl = document.getElementById('searchPO');
    const statusEl = document.getElementById('filterStatus');
    const dateFromEl = document.getElementById('filterDateFrom');
    const dateToEl = document.getElementById('filterDateTo');
    
    if (!searchEl || !statusEl || !dateFromEl || !dateToEl) return;
    
    const params = new URLSearchParams({
        page: currentPage,
        limit: rowsPerPage,
        search: searchEl.value || '',
        status: statusEl.value || 'all',
        date_from: dateFromEl.value || '',
        date_to: dateToEl.value || ''
    });
    
    fetch(`api/get_po_data.php?${params}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                renderPOTable(data.data);
                updateStats(data.stats);
                updatePagination(data.pagination);
            }
        });
}

function renderPOTable(data) {
    const tbody = document.getElementById('poTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = data.map(po => `
        <tr>
            <td><input type="checkbox" class="row-check" data-id="${po.po_number}"></td>
            <td>${po.po_number}</td>
            <td>${po.po_item}</td>
            <td>${po.description}</td>
            <td>${po.po_date}</td>
            <td>${po.ordered_quantity}</td>
            <td>${po.received_qty || 0}</td>
            <td>${po.gr_numbers || '-'}</td>
            <td>${po.last_gr_date || '-'}</td>
            <td><span class="status-badge status-${po.status.toLowerCase()}">${po.status}</span></td>
        </tr>
    `).join('');
}

function updateStats(stats) {
    const totalEl = document.getElementById('totalPO');
    const openEl = document.getElementById('openPO');
    const partialEl = document.getElementById('partialPO');
    const completedEl = document.getElementById('completedPO');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (openEl) openEl.textContent = stats.open;
    if (partialEl) partialEl.textContent = stats.partial;
    if (completedEl) completedEl.textContent = stats.completed;
}

function showUploadModal() {
    document.getElementById('uploadModal')?.classList.add('active');
}

function hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    const fileList = document.getElementById('fileList');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (modal) modal.classList.remove('active');
    if (fileList) fileList.innerHTML = '';
    if (uploadBtn) uploadBtn.disabled = true;
    uploadedFile = null;
}

function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
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
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });
}

function handleFile(file) {
    uploadedFile = file;
    const fileList = document.getElementById('fileList');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (fileList) {
        fileList.innerHTML = `
            <div class="file-item">
                <div class="file-icon">📎</div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${(file.size/1024).toFixed(1)} KB</div>
                </div>
                <span class="file-remove" onclick="clearUpload()">✕</span>
            </div>
        `;
    }
    if (uploadBtn) uploadBtn.disabled = false;
}

function processUpload() {
    if (!uploadedFile) return;
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) progressBar.style.display = 'block';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = progress + '%';
        if (progress >= 100) clearInterval(interval);
    }, 100);
    
    fetch('api/upload_zmm039.php', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        clearInterval(interval);
        if (progressBar) progressBar.style.display = 'none';
        
        if (data.success) {
            alert(`Success! Processed ${data.processed} records.`);
            hideUploadModal();
            loadDashboardData();
        } else {
            alert('Error: ' + data.error);
        }
    });
}

// ============================================
// EXPORT TO EXCEL — FULL STYLING (Borders + Center + Middle Align)
// ============================================

function exportTable(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) {
        alert('Table not found');
        return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody || tbody.children.length === 0) {
        alert('No data to export');
        return;
    }

    // Gunakan SheetJS kalau tersedia (Excel .xlsx asli)
    if (typeof XLSX !== 'undefined') {
        // Ambil header (skip kolom checkbox index 0 dan actions index terakhir)
        const headerCells = Array.from(table.querySelectorAll('thead th'));
        const headers = headerCells
            .map(th => th.textContent.replace(/[↓↑↕]/g, '').trim())
            .filter((_, index) => index !== 0 && index !== headerCells.length - 1);

        // Ambil data baris (skip kolom checkbox dan actions)
        const dataRows = Array.from(table.querySelectorAll('tbody tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return cells
                .map((td, index, arr) => {
                    if (index === 0 || index === arr.length - 1) return null;
                    
                    let text = td.textContent.trim();
                    
                    // Force NO INVOICE dan PO NUMBER jadi string (t:'s')
                    if (index === 1 || index === 3) {
                        return { t: 's', v: text };
                    }
                    
                    // Amount: parse dari "IDR 2.500.000" jadi number
                    if (index === 5 && text.toLowerCase().includes('idr')) {
                        const numStr = text
                            .replace(/IDR\s?/i, '')
                            .replace(/\./g, '')
                            .replace(/,/g, '.');
                        const num = parseFloat(numStr);
                        return isNaN(num) ? text : num;
                    }
                    
                    // Invoice Date: biarkan sebagai string tanggal
                    if (index === 4) {
                        return text;
                    }
                    
                    // Status dan Validated By: string biasa
                    return text;
                })
                .filter(c => c !== null);
        });

        // Buat worksheet dari array of arrays
        const wsData = [headers, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // ============================================
        // STYLING: All Borders + Center Align + Middle Align
        // ============================================
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;

        // Style untuk semua cell (data + header)
        const allCellStyle = {
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
            }
        };

        // Style khusus untuk header (bold + background color)
        const headerStyle = {
            alignment: {
                horizontal: 'center',
                vertical: 'center',
                wrapText: true
            },
            font: {
                bold: true,
                color: { rgb: 'FFFFFF' }
            },
            fill: {
                fgColor: { rgb: '4472C4' },
                patternType: 'solid'
            },
            border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
            }
        };

        // Apply style ke setiap cell
        for (let R = 0; R < totalRows; R++) {
            for (let C = 0; C < totalCols; C++) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                
                // Buat cell kalau belum ada
                if (!ws[cellRef]) {
                    ws[cellRef] = { t: 's', v: '' };
                }
                
                // Header row (row 0) pakai headerStyle, sisanya pakai allCellStyle
                if (R === 0) {
                    ws[cellRef].s = headerStyle;
                } else {
                    ws[cellRef].s = allCellStyle;
                }
            }
        }

        // Set lebar kolom agar rapi
        ws['!cols'] = [
            { wch: 16 }, // NO INVOICE
            { wch: 24 }, // SUPPLIER NAME
            { wch: 16 }, // PO NUMBER
            { wch: 14 }, // INVOICE DATE
            { wch: 16 }, // AMOUNT
            { wch: 12 }, // STATUS
            { wch: 18 }  // VALIDATED BY
        ];

        // Set tinggi baris
        ws['!rows'] = [];
        for (let i = 0; i < totalRows; i++) {
            ws['!rows'].push({ hpt: 22 });
        }

        // Buat workbook dan export
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoice Data");

        const exportFilename = (filename || tableId) + '_' + new Date().toISOString().split('T')[0] + '.xlsx';
        XLSX.writeFile(wb, exportFilename);
        
    } else {
        // Fallback ke CSV kalau SheetJS gagal load
        const headers = Array.from(table.querySelectorAll('thead th')).map((th, index, arr) => {
            if (index === 0 || index === arr.length - 1) return null;
            return th.textContent.replace(/[↓↑↕]/g, '').trim();
        }).filter(h => h !== null);
        
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            return cells.map((td, index, arr) => {
                if (index === 0 || index === arr.length - 1) return null;
                const text = td.textContent.replace(/"/g, '""').trim();
                return `"${text}"`;
            }).filter(c => c !== null);
        });
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename || tableId}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }
}