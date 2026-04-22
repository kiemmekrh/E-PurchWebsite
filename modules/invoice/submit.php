<?php
// File: modules/invoice/submit.php (Supplier Invoice Submission)
session_start();
require_once '../../auth/check_session.php';
checkAuth(['supplier']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Submit Invoice | E-Purch</title>
    <link rel="icon" type="image/png" href="../../assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="../../assets/css/dashboard.css">
    <link rel="stylesheet" href="../../assets/css/modules.css">
    <style>
        .supplier-header {
            background: var(--primary-yellow);
            padding: 20px;
            margin: -30px -30px 30px -30px;
            border-bottom: 3px solid var(--primary-red);
        }
        .supplier-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .supplier-logo {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <div style="max-width: 800px; margin: 0 auto; padding: 30px;">
        <div class="supplier-header">
            <div class="supplier-info">
                <div class="supplier-logo">📄</div>
                <div>
                    <h2>Welcome, <?php echo htmlspecialchars($_SESSION['name']); ?></h2>
                    <p>Submit your invoice for processing</p>
                </div>
            </div>
            <button onclick="logout()" style="position: absolute; top: 30px; right: 30px;" class="btn btn-secondary btn-small">
                Logout
            </button>
        </div>

        <div class="invoice-form-container">
            <h3 style="margin-bottom: 25px;">Invoice Submission Form</h3>
            
            <form id="invoiceForm" enctype="multipart/form-data">
                <div class="form-row">
                    <div class="form-group">
                        <label>Invoice Number *</label>
                        <input type="text" name="invoice_number" class="form-input" required 
                               placeholder="e.g., INV-2026-001">
                    </div>
                    <div class="form-group">
                        <label>PO Number *</label>
                        <input type="text" name="po_number" class="form-input" required
                               placeholder="Enter PO number from INACO">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Invoice Date *</label>
                        <input type="date" name="invoice_date" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label>Amount (IDR) *</label>
                        <input type="number" name="amount" class="form-input" required
                               placeholder="Enter invoice amount" min="0" step="0.01">
                    </div>
                </div>

                <div class="form-group">
                    <label>Description / Notes</label>
                    <textarea name="description" class="form-input form-textarea" rows="3"
                              placeholder="Additional information..."></textarea>
                </div>

                <div class="form-group">
                    <label>Upload Invoice File (PDF/XLSX) *</label>
                    <div class="drag-drop-zone" id="dropZone">
                        <div style="font-size: 48px; margin-bottom: 15px;">📎</div>
                        <div>Drop file here or click to browse</div>
                        <div style="font-size: 12px; color: var(--text-gray); margin-top: 10px;">
                            Maximum file size: 10MB
                        </div>
                        <input type="file" name="invoice_file" id="invoiceFile" style="display: none;" 
                               accept=".pdf,.xlsx,.xls" required>
                    </div>
                    <div id="filePreview" style="margin-top: 15px;"></div>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="submit" class="btn btn-primary">Submit Invoice</button>
                    <button type="reset" class="btn btn-secondary">Clear Form</button>
                </div>
            </form>

            <!-- Submission History -->
            <div style="margin-top: 50px;">
                <h3 style="margin-bottom: 20px;">Your Submission History</h3>
                <div class="data-table-container">
                    <table class="data-table" id="historyTable">
                        <thead>
                            <tr>
                                <th>INVOICE NUMBER</th>
                                <th>PO NUMBER</th>
                                <th>DATE</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody id="historyTableBody">
                            <!-- Loaded via AJAX -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // File drop handling
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('invoiceFile');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                showFilePreview(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                showFilePreview(e.target.files[0]);
            }
        });
        
        function showFilePreview(file) {
            document.getElementById('filePreview').innerHTML = `
                <div class="file-item">
                    <div class="file-icon">📄</div>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${(file.size/1024).toFixed(1)} KB</div>
                    </div>
                </div>
            `;
        }
        
        // Form submission
        document.getElementById('invoiceForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('api/submit_invoice.php', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert('Invoice submitted successfully! You will receive email notification once validated.');
                    this.reset();
                    document.getElementById('filePreview').innerHTML = '';
                    loadSubmissionHistory();
                } else {
                    alert('Error: ' + data.error);
                }
            });
        });
        
        function loadSubmissionHistory() {
            fetch('api/get_supplier_invoices.php')
                .then(r => r.json())
                .then(data => {
                    const tbody = document.getElementById('historyTableBody');
                    tbody.innerHTML = data.data.map(inv => `
                        <tr>
                            <td>${inv.invoice_number}</td>
                            <td>${inv.po_number}</td>
                            <td>${inv.invoice_date}</td>
                            <td>IDR ${parseFloat(inv.amount).toLocaleString()}</td>
                            <td><span class="status-badge status-${inv.status.toLowerCase()}">${inv.status}</span></td>
                        </tr>
                    `).join('');
                });
        }
        
        function logout() {
            fetch('../../auth/logout.php').then(() => location.href = '../../index.php');
        }
        
        loadSubmissionHistory();
    </script>
</body>
</html>