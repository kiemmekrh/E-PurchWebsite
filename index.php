<?php
session_start();
require_once 'config/database.php';

if (isset($_SESSION['user_id'])) {
    if ($_SESSION['role'] === 'supplier') {
        header('Location: modules/invoice/submit.php');
    } else {
        header('Location: modules/dashboard/index.php');
    }
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once 'auth/login_handler.php';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Purch - Login | PT. NIRAMAS UTAMA</title>
    <link rel="icon" type="image/png" href="assets/images/inaco_logo-removebg-preview.png">
    <link rel="stylesheet" href="assets/css/login.css">
</head>
<body>
    <div class="login-container">
        <div class="login-left">
            <div class="building-overlay">
                <h2>PT. NIRAMAS UTAMA</h2>
                <p>Purchasing Management System</p>
            </div>
        </div>
        <div class="login-right">
            <div class="logo-container">
                <img src="assets/images/inaco_logo-removebg-preview.png" alt="logo" class="logo"/>
                <div class="company-name">PT Niramas Utama (INACO)</div>
                <div class="system-name">E-Purch</div>
            </div>
            
            <div class="login-form">
                <h2 class="login-title" id="formTitle">Login</h2>
                
                <?php if ($error): ?>
                    <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
                <?php endif; ?>
                
                <!-- Purchasing Staff Login Form -->
                <form id="staffLoginForm" method="POST" action="">
                    <input type="hidden" name="login_type" value="staff">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" name="email" class="form-input" placeholder="Enter your email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="password-wrapper">
                            <input type="password" name="password" class="form-input" id="staffPassword" placeholder="Enter your password" required>
                            <span class="toggle-password" onclick="togglePassword('staffPassword')">👁</span>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
                
                <div class="forgot-password">
                    <a href="#">Forgot password?</a>
                </div>
                
                <div class="divider">
                    <span>or</span>
                </div>
                
                <button class="btn btn-outline" onclick="showSupplierLogin()">
                    Login for Supplier (Invoice only)
                </button>
            </div>
            
            <!-- Supplier Login Form (Hidden by default) -->
            <div class="login-form" id="supplierForm" style="display: none;">
                <form method="POST" action="">
                    <input type="hidden" name="login_type" value="supplier">
                    <div class="form-group">
                        <label class="form-label">Select Company</label>
                        <select name="supplier_id" class="form-input" required>
                            <option value="">Select your company</option>
                            <?php
                            require_once 'config/database.php';
                            $stmt = $pdo->query("SELECT supplier_id, supplier_name FROM Supplier WHERE status = 'active'");
                            while ($row = $stmt->fetch()) {
                                echo '<option value="' . $row['supplier_id'] . '">' . htmlspecialchars($row['supplier_name']) . '</option>';
                            }
                            ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="password-wrapper">
                            <input type="password" name="password" class="form-input" id="supplierPassword" placeholder="Enter password" required>
                            <span class="toggle-password" onclick="togglePassword('supplierPassword')">👁</span>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Login</button>
                    <button type="button" class="btn btn-outline" onclick="showStaffLogin()" style="margin-top: 10px;">
                        Back to Staff Login
                    </button>
                </form>
            </div>
        </div>
    </div>

    <script>
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }
        
        function showSupplierLogin() {
            document.getElementById('staffLoginForm').style.display = 'none';
            document.querySelector('.forgot-password').style.display = 'none';
            document.querySelector('.divider').style.display = 'none';
            document.querySelector('.btn-outline').style.display = 'none';
            document.getElementById('supplierForm').style.display = 'block';
            document.getElementById('formTitle').textContent = 'Login for Supplier';
        }
        
        function showStaffLogin() {
            document.getElementById('supplierForm').style.display = 'none';
            document.getElementById('staffLoginForm').style.display = 'block';
            document.querySelector('.forgot-password').style.display = 'block';
            document.querySelector('.divider').style.display = 'flex';
            document.querySelectorAll('.btn-outline')[0].style.display = 'block';
            document.getElementById('formTitle').textContent = 'Login';
        }
    </script>
</body>
</html>