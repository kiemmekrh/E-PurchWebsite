// File: assets/js/dashboard.js (Partial - key functions)
let currentPage = 1;
let rowsPerPage = 10;

function loadDashboardData() {
    const params = new URLSearchParams({
        page: currentPage,
        limit: rowsPerPage,
        search: document.getElementById('searchPO')?.value || '',
        status: document.getElementById('filterStatus')?.value || 'all',
        date_from: document.getElementById('filterDateFrom')?.value || '',
        date_to: document.getElementById('filterDateTo')?.value || ''
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
    document.getElementById('totalPO').textContent = stats.total;
    document.getElementById('openPO').textContent = stats.open;
    document.getElementById('partialPO').textContent = stats.partial;
    document.getElementById('completedPO').textContent = stats.completed;
}

function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    uploadedFile = null;
}

function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
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
        handleFile(e.dataTransfer.files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });
}

function handleFile(file) {
    uploadedFile = file;
    document.getElementById('fileList').innerHTML = `
        <div class="file-item">
            <div class="file-icon">📎</div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${(file.size/1024).toFixed(1)} KB</div>
            </div>
            <span class="file-remove" onclick="clearUpload()">✕</span>
        </div>
    `;
    document.getElementById('uploadBtn').disabled = false;
}

function processUpload() {
    if (!uploadedFile) return;
    
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressBar.style.display = 'block';
    
    // Simulate progress (in real implementation, use XMLHttpRequest for progress tracking)
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
        if (progress >= 100) clearInterval(interval);
    }, 100);
    
    fetch('api/upload_zmm039.php', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        clearInterval(interval);
        progressBar.style.display = 'none';
        
        if (data.success) {
            alert(`Success! Processed ${data.processed} records.`);
            hideUploadModal();
            loadDashboardData();
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function exportTable(tableId) {
    const table = document.getElementById(tableId);
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.replace(/[↓↑↕]/g, '').trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(row => 
        Array.from(row.querySelectorAll('td')).map(td => {
            const text = td.textContent.replace(/"/g, '""').trim();
            return `"${text}"`;
        })
    );
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tableId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}