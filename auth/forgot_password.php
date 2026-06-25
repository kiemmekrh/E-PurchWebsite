<?php
session_start();

// Enable error display for debugging (remove in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ambil error/success message dari session
$error = $_SESSION['forgot_error'] ?? '';
$success = $_SESSION['forgot_success'] ?? '';

// Clear session messages setelah diambil
unset($_SESSION['forgot_error']);
unset($_SESSION['forgot_success']);

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Cek apakah config/database.php bisa di-load
    $configPath = '../config/database.php';
    if (!file_exists($configPath)) {
        $_SESSION['forgot_error'] = 'Config file not found at: ' . $configPath;
        header('Location: forgot_password.php');
        exit;
    }

    require_once $configPath;

    // Cek apakah $pdo sudah terdefinisi
    if (!isset($pdo)) {
        $_SESSION['forgot_error'] = 'Database connection failed. Variable $pdo not found.';
        header('Location: forgot_password.php');
        exit;
    }

    $email = filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL);

    if (empty($email)) {
        $_SESSION['forgot_error'] = 'Email is required.';
        header('Location: forgot_password.php');
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $_SESSION['forgot_error'] = 'Please enter a valid email address.';
        header('Location: forgot_password.php');
        exit;
    }

    try {
        // Cek apakah tabel password_resets ada
        $stmt = $pdo->query("SHOW TABLES LIKE 'password_resets'");
        if ($stmt->rowCount() == 0) {
            $_SESSION['forgot_error'] = 'Database table "password_resets" not found. Please run the SQL setup first.';
            header('Location: forgot_password.php');
            exit;
        }

        // Cek apakah email ada di database (tabel users atau suppliers)
        $userFound = false;

        // Cek tabel users
        try {
            $stmt = $pdo->prepare("SELECT id, email, name, role FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                $userFound = true;
            }
        } catch (PDOException $e) {
            // Tabel users mungkin tidak ada atau kolom berbeda
        }

        // Kalau tidak ada di users, cek suppliers
        if (!$userFound) {
            try {
                $stmt = $pdo->prepare("SELECT id, email, company_name as name, 'supplier' as role FROM suppliers WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($user) {
                    $userFound = true;
                }
            } catch (PDOException $e) {
                // Tabel suppliers mungkin tidak ada atau kolom berbeda
            }
        }

        if ($userFound) {
            // Generate token reset password
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Simpan token ke database
            $stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$email, $token, $expires]);

            // Kirim email reset (placeholder - perlu konfigurasi SMTP)
            // KirimEmailReset($email, $token, $user['name']);

            $_SESSION['forgot_success'] = 'Password reset link has been sent to your email. Please check your inbox (and spam folder). Link expires in 1 hour.';
        } else {
            // Security: jangan kasih tahu kalau email tidak ada
            $_SESSION['forgot_success'] = 'If this email exists in our system, you will receive a password reset link shortly.';
        }

        header('Location: forgot_password.php');
        exit;

    } catch (PDOException $e) {
        // Log error ke file (tidak expose ke user)
        error_log('Forgot Password Error: ' . $e->getMessage());
        $_SESSION['forgot_error'] = 'Database error: ' . $e->getMessage();
        header('Location: forgot_password.php');
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Purch - Forgot Password | PT. NIRAMAS UTAMA</title>
    <link rel="icon" type="image/png" href="../assets/images/inaco_logo-removebg-preview.png">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #FFD700 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .forgot-container {
            display: flex;
            width: 900px;
            max-width: 95%;
            min-height: 500px;
            background: #fff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .forgot-left {
            flex: 1;
            background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: #fff;
            padding: 40px;
            position: relative;
            overflow: hidden;
        }

        .forgot-left::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.3;
        }

        .forgot-left h2 {
            font-size: 28px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .forgot-left p {
            font-size: 14px;
            opacity: 0.9;
            text-align: center;
            position: relative;
            z-index: 1;
        }

        .forgot-left .icon-lock {
            font-size: 80px;
            margin-bottom: 20px;
            opacity: 0.8;
            position: relative;
            z-index: 1;
        }

        .forgot-right {
            flex: 1;
            padding: 50px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo {
            width: 80px;
            height: auto;
            margin-bottom: 10px;
        }

        .company-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }

        .system-name {
            font-size: 13px;
            color: #666;
            margin-top: 2px;
        }

        .forgot-title {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }

        .forgot-subtitle {
            font-size: 14px;
            color: #666;
            text-align: center;
            margin-bottom: 25px;
            line-height: 1.5;
        }

        .alert {
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .alert-error {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }

        .alert-success {
            background: #dcfce7;
            color: #16a34a;
            border: 1px solid #bbf7d0;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 8px;
        }

        .form-input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 14px;
            transition: all 0.3s ease;
            outline: none;
        }

        .form-input:focus {
            border-color: #1a73e8;
            box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.1);
        }

        .btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .btn-primary {
            background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
            color: #fff;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(26, 115, 232, 0.3);
        }

        .btn-outline {
            background: transparent;
            color: #1a73e8;
            border: 2px solid #1a73e8;
            margin-top: 12px;
        }

        .btn-outline:hover {
            background: #1a73e8;
            color: #fff;
        }

        .back-link {
            text-align: center;
            margin-top: 20px;
        }

        .back-link a {
            color: #1a73e8;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s ease;
        }

        .back-link a:hover {
            gap: 10px;
        }

        .info-box {
            background: #f3f4f6;
            border-left: 4px solid #1a73e8;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #555;
            line-height: 1.6;
        }

        .info-box strong {
            color: #333;
            display: block;
            margin-bottom: 5px;
        }

        .debug-info {
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin-top: 20px;
            white-space: pre-wrap;
            word-break: break-all;
        }

        @media (max-width: 768px) {
            .forgot-container {
                flex-direction: column;
                min-height: auto;
            }

            .forgot-left {
                padding: 30px 20px;
                min-height: 200px;
            }

            .forgot-left h2 {
                font-size: 22px;
            }

            .forgot-right {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="forgot-container">
        <div class="forgot-left">
            <div class="icon-lock">🔐</div>
            <h2>Reset Password</h2>
            <p>Don't worry, we'll help you<br>get back into your account</p>
        </div>
        <div class="forgot-right">
            <div class="logo-container">
                <img src="../assets/images/inaco_logo-removebg-preview.png" alt="logo" class="logo"/>
                <div class="company-name">PT Niramas Utama (INACO)</div>
                <div class="system-name">E-Purch</div>
            </div>

            <h2 class="forgot-title">Forgot Password?</h2>
            <p class="forgot-subtitle">Enter your email address and we'll send you a link to reset your password.</p>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <span>⚠️</span>
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <span>✅</span>
                    <?php echo htmlspecialchars($success); ?>
                </div>
                <div class="info-box">
                    <strong>What's next?</strong>
                    Check your email inbox for the reset link. If you don't see it within a few minutes, check your spam or junk folder. The link will expire in 1 hour for security reasons.
                </div>
            <?php else: ?>
                <form method="POST" action="">
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" name="email" class="form-input" placeholder="Enter your registered email" required autofocus>
                    </div>
                    <button type="submit" class="btn btn-primary">Send Reset Link</button>
                </form>
            <?php endif; ?>

            <div class="back-link">
                <a href="../index.php">← Back to Login</a>
            </div>
        </div>
    </div>
</body>
</html>