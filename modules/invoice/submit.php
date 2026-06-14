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
            position: relative;
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

        /* ===== ALERT STYLES ===== */
        .alert-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            animation: fadeIn 0.2s ease;
        }
        .alert-overlay.active {
            display: flex;
        }
        .alert-box {
            background: white;
            border-radius: 12px;
            padding: 30px 40px;
            text-align: center;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            animation: slideUp 0.3s ease;
        }
        .alert-icon {
            font-size: 60px;
            margin-bottom: 15px;
        }
        .alert-title {
            font-size: 20px;
            font-weight: 700;
            color: #2e7d32;
            margin-bottom: 10px;
        }
        .alert-message {
            font-size: 14px;
            color: #666;
            margin-bottom: 25px;
            line-height: 1.5;
        }
        .alert-btn {
            background: #4caf50;
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        .alert-btn:hover {
            background: #43a047;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        /* Loading spinner */
        .btn-loading {
            position: relative;
            color: transparent !important;
        }
        .btn-loading::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            top: 50%;
            left: 50%;
            margin-left: -8px;
            margin-top: -8px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spinner 0.8s linear infinite;
        }
        @keyframes spinner {
            to { transform: rotate(360deg); }
        }

        /* ===== VALIDATION INFO STYLES ===== */
        .validation-info {
            background: #f8f9fa;
            border-left: 4px solid var(--info-blue);
            padding: 12px 16px;
            margin-top: 10px;
            border-radius: 0 8px 8px 0;
        }
        .validation-info .validation-label {
            font-size: 12px;
            color: #888;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        .validation-info .validation-text {
            font-size: 13px;
            color: #333;
            line-height: 1.5;
        }
        .validation-info .validation-time {
            font-size: 11px;
            color: #999;
            margin-top: 6px;
        }
        .validation-info.approved {
            border-left-color: var(--success-green);
            background: #f0f9f0;
        }
        .validation-info.rejected {
            border-left-color: var(--danger-red);
            background: #fef0f0;
        }
    </style>
</head>
<body>
    <!-- ===== SUCCESS ALERT MODAL ===== -->
    <div class="alert-overlay" id="successAlert">
        <div class="alert-box">
            <div class="alert-icon">✅</div>
            <div class="alert-title">Invoice Submitted!</div>
            <div class="alert-message">
                Your invoice has been successfully submitted.<br>
                You will receive an email notification once it has been validated.
            </div>
            <button class="alert-btn" onclick="closeAlert()">OK</button>
        </div>
    </div>

    <div style="max-width: 1000px; margin: 0 auto; padding: 30px;">
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
                    <button type="submit" class="btn btn-primary" id="submitBtn">Submit Invoice</button>
                    <button type="reset" class="btn btn-secondary" id="resetBtn">Clear Form</button>
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
                                <th>VALIDATION INFO</th>
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
        // ===== ALERT FUNCTIONS =====
        function showAlert() {
            document.getElementById('successAlert').classList.add('active');
        }
        
        function closeAlert() {
            document.getElementById('successAlert').classList.remove('active');
        }

        // ===== FILE DROP HANDLING =====
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

        // ===== RESET FORM FUNCTION =====
        function resetForm() {
            const form = document.getElementById('invoiceForm');
            form.reset();
            document.getElementById('filePreview').innerHTML = '';
            fileInput.value = '';
        }

        // ===== FORM SUBMISSION =====
        document.getElementById('invoiceForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            
            const formData = new FormData(this);
            
            fetch('api/submit_invoice.php', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(data => {
                // Remove loading state
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                
                if (data.success) {
                    // Show success alert
                    showAlert();
                    
                    // Reset form to blank
                    resetForm();
                    
                    // Refresh submission history
                    loadSubmissionHistory();
                } else {
                    alert('Error: ' + (data.error || 'Something went wrong'));
                }
            })
            .catch(err => {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                alert('Network error: ' + err.message);
            });
        });

        // Clear button also resets file preview
        document.getElementById('resetBtn').addEventListener('click', function() {
            document.getElementById('filePreview').innerHTML = '';
            fileInput.value = '';
        });
        
        function loadSubmissionHistory() {
            fetch('api/get_supplier_invoices.php')
                .then(r => r.json())
                .then(data => {
                    const tbody = document.getElementById('historyTableBody');
                    if (!data.data || data.data.length === 0) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 30px; color: #888;">
                                    No invoices submitted yet.
                                </td>
                            </tr>
                        `;
                        return;
                    }
                    tbody.innerHTML = data.data.map(inv => {
                        const statusClass = (inv.status || 'Pending').toLowerCase();
                        
                        // Build validation info HTML
                        let validationHtml = '<span style="color: #888; font-size: 12px;">—</span>';
                        if (inv.status === 'Approved' || inv.status === 'Rejected') {
                            const validationClass = inv.status.toLowerCase();
                            const notes = inv.validation_notes ? escapeHtml(inv.validation_notes) : 'No notes provided';
                            const time = inv.validated_at ? formatDateTime(inv.validated_at) : '—';
                            validationHtml = `
                                <div class="validation-info ${validationClass}">
                                    <div class="validation-label">${inv.status} by ${escapeHtml(inv.validated_by_name || 'Staff')}</div>
                                    <div class="validation-text">"${notes}"</div>
                                    <div class="validation-time">🕐 ${time}</div>
                                </div>
                            `;
                        }
                        
                        return `
                        <tr>
                            <td>${escapeHtml(inv.invoice_number)}</td>
                            <td>${escapeHtml(inv.po_number)}</td>
                            <td>${formatDate(inv.invoice_date)}</td>
                            <td>IDR ${parseFloat(inv.amount).toLocaleString()}</td>
                            <td><span class="status-badge status-${statusClass}">${inv.status || 'Pending'}</span></td>
                            <td>${validationHtml}</td>
                        </tr>
                    `}).join('');
                })
                .catch(err => {
                    console.error('Failed to load history:', err);
                });
        }
        
        function logout() {
            fetch('../../auth/logout.php').then(() => location.href = '../../index.php');
        }
        
        // Helper functions
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
        
        function formatDateTime(dateStr) {
            if (!dateStr) return '—';
            const d = new Date(dateStr);
            return d.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        // Load history on page load
        loadSubmissionHistory();
    </script>
</body>
</html>