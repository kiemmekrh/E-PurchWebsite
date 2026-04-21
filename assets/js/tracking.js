let currentTab = 'overview';

function switchTab(tab) {
    currentTab = tab;
    
    document.querySelectorAll('.tracking-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.getElementById(`tab-${tab}`).style.display = 'block';
    
    if (tab === 'pending') loadPendingData();
    if (tab === 'completed') loadCompletedData();
    if (tab === 'history') loadSyncHistory();
}

function loadTrackingData() {
    fetch('api/get_tracking_data.php')
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                updateStats(data.stats);
                renderTrackingTable(data.data);
            }
        });
}

function updateStats(stats) {
    document.getElementById('totalItems').textContent = stats.total;
    document.getElementById('awaitingGR').textContent = stats.open;
    document.getElementById('partialGR').textContent = stats.partial;
    document.getElementById('fullyReceived').textContent = stats.completed;
}

function renderTrackingTable(data) {
    const tbody = document.getElementById('trackingTableBody');
    tbody.innerHTML = data.map(row => {
        const grDetails = row.gr_details ? row.gr_details.split(';;').map(gr => {
            const [num, date, qty] = gr.split('|');
            return `<div class="gr-card">GR: ${num}<br>Date: ${date}<br>Qty: ${qty}</div>`;
        }).join('') : '-';
        
        return `
            <tr onclick="showPODetail('${row.po_number}', '${row.po_item}')" style="cursor: pointer;">
                <td><strong>${row.po_number}</strong></td>
                <td>${row.po_item}</td>
                <td>${row.description}</td>
                <td>${row.ordered_quantity}</td>
                <td>${row.received_qty}</td>
                <td>${row.balance_qty}</td>
                <td>${grDetails}</td>
                <td><span class="status-badge status-${row.status.toLowerCase()}">${row.status}</span></td>
                <td>${row.last_gr_date || 'N/A'}</td>
            </tr>
        `;
    }).join('');
}

function showPODetail(poNumber, poItem) {
    fetch(`api/get_po_timeline.php?po_number=${poNumber}&po_item=${poItem}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                document.getElementById('detailPONumber').textContent = poNumber;
                
                let timelineHTML = `
                    <div class="timeline-item">
                        <strong>PO Created</strong><br>
                        Date: ${data.po.po_date}<br>
                        Qty Ordered: ${data.po.ordered_quantity}<br>
                        Supplier: ${data.po.supplier_name || 'N/A'}
                    </div>
                `;
                
                data.gr_history.forEach((gr, index) => {
                    timelineHTML += `
                        <div class="timeline-item">
                            <strong>GR #${index + 1}: ${gr.gr_number}</strong><br>
                            Date: ${gr.gr_date}<br>
                            Quantity Received: ${gr.gr_quantity}
                        </div>
                    `;
                });
                
                if (data.po.status === 'Open') {
                    timelineHTML += `
                        <div class="timeline-item pending">
                            <strong>Awaiting Goods Receipt</strong><br>
                            ${data.po.days_pending} days since PO created
                        </div>
                    `;
                }
                
                document.getElementById('poTimeline').innerHTML = timelineHTML;
                document.getElementById('poDetailModal').classList.add('active');
            }
        });
}

function hideDetailModal() {
    document.getElementById('poDetailModal').classList.remove('active');
}

function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function hideUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

function initUploadHandlers() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('zmm039File');
    
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4285f4';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
    });
}

function uploadZMM039() {
    const fileInput = document.getElementById('zmm039File');
    if (!fileInput.files[0]) {
        alert('Please select a file');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    fetch('../dashboard/api/upload_zmm039.php', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert(`Processed ${data.processed} records successfully!`);
            hideUploadModal();
            loadTrackingData();
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function exportTracking() {
    // Similar to dashboard export
    alert('Export functionality - implement as needed');
}

function loadPendingData() {
    fetch('api/get_tracking_data.php?status=Open')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('pendingTableBody');
            tbody.innerHTML = data.data.map(row => `
                <tr>
                    <td>${row.po_number}</td>
                    <td>${row.description}</td>
                    <td>${row.ordered_quantity}</td>
                    <td>${row.received_qty}</td>
                    <td style="color: var(--danger-red); font-weight: bold;">${row.balance_qty}</td>
                    <td>${row.po_date}</td>
                    <td>${row.days_pending} days</td>
                </tr>
            `).join('');
        });
}

function loadCompletedData() {
    fetch('api/get_tracking_data.php?status=Completed')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('completedTableBody');
            tbody.innerHTML = data.data.map(row => `
                <tr>
                    <td>${row.po_number}</td>
                    <td>${row.description}</td>
                    <td>${row.ordered_quantity}</td>
                    <td>${row.gr_count} GR(s)</td>
                    <td>${row.last_gr_date}</td>
                    <td>${Math.ceil((new Date(row.last_gr_date) - new Date(row.po_date)) / (1000 * 60 * 60 * 24))} days</td>
                </tr>
            `).join('');
        });
}

function loadSyncHistory() {
    // Load from activity log
    fetch('../master/api/get_logs.php?action=ZMM039_UPLOAD')
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('syncHistoryBody');
            tbody.innerHTML = data.data.map(log => `
                <tr>
                    <td>${log.created_at}</td>
                    <td>${log.user_name}</td>
                    <td>${log.details}</td>
                    <td>-</td>
                    <td><span class="status-badge status-approved">Success</span></td>
                </tr>
            `).join('');
        });
}