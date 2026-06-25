<?php
session_start();
require_once '../config/database.php';

$token = $_GET['token'] ?? '';
$error = $_SESSION['reset_error'] ?? '';
$success = $_SESSION['reset_success'] ?? '';
$validToken = false;
$email = '';

unset($_SESSION['reset_error']);
unset($_SESSION['reset_success']);

// Validasi token
if (!empty($token)) {
    try {
        $stmt = $pdo->prepare("SELECT email, expires_at FROM password_resets WHERE token = ? AND used = 0 LIMIT 1");
        $stmt->execute([$token]);
        $reset = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($reset) {
            if (strtotime($reset['expires_at']) > time()) {
                $validToken = true;
                $email = $reset['email'];
            } else {
                $error = 'This reset link has expired. Please request a new one.';
            }
        } else {
            $error = 'Invalid or already used reset link.';
        }
    } catch (PDOException $e) {
        $error = 'An error occurred. Please try again.';
    }
} else {
    $error = 'No reset token provided.';
}

// Handle password reset submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $validToken) {
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (strlen($password) < 6) {
        $error = 'Password must be at least 6 characters long.';
    } elseif ($password !== $confirmPassword) {
        $error = 'Passwords do not match.';
    } else {
        try {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Update password di tabel users
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
            $stmt->execute([$hashedPassword, $email]);

            // Kalau tidak ada di users, cek suppliers
            if ($stmt->rowCount() == 0) {
                $stmt = $pdo->prepare("UPDATE suppliers SET password = ? WHERE email = ?");
                $stmt->execute([$hashedPassword, $email]);
            }

            // Tandai token sudah digunakan
            $stmt = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
            $stmt->execute([$token]);

            $success = 'Password has been reset successfully! You can now login with your new password.';
            $validToken = false; // Hide form after success

        } catch (PDOException $e) {
            $error = 'Failed to reset password. Please try again.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Purch - Reset Password | PT. NIRAMAS UTAMA</title>
    <link rel="icon" type="image/png" href="../assets/images/inaco_logo-removebg-preview.png">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .reset-container {
            display: flex;
            width: 900px;
            max-width: 95%;
            min-height: 500px;
            background: #fff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .reset-left {
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

        .reset-left::before {
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

        .reset-left h2 {
            font-size: 28px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }

        .reset-left p {
            font-size: 14px;
            opacity: 0.9;
            text-align: center;
            position: relative;
            z-index: 1;
        }

        .reset-left .icon-key {
            font-size: 80px;
            margin-bottom: 20px;
            opacity: 0.8;
            position: relative;
            z-index: 1;
        }

        .reset-right {
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

        .reset-title {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }

        .reset-subtitle {
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

        .password-wrapper {
            position: relative;
        }

        .toggle-password {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 18px;
            user-select: none;
            opacity: 0.6;
            transition: opacity 0.3s;
        }

        .toggle-password:hover {
            opacity: 1;
        }

        .password-hint {
            font-size: 12px;
            color: #888;
            margin-top: 6px;
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

        .success-icon {
            font-size: 60px;
            text-align: center;
            margin-bottom: 15px;
        }

        @media (max-width: 768px) {
            .reset-container {
                flex-direction: column;
                min-height: auto;
            }

            .reset-left {
                padding: 30px 20px;
                min-height: 200px;
            }

            .reset-left h2 {
                font-size: 22px;
            }

            .reset-right {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="reset-container">
        <div class="reset-left">
            <div class="icon-key">🔑</div>
            <h2>New Password</h2>
            <p>Create a strong password<br>to protect your account</p>
        </div>
        <div class="reset-right">
            <div class="logo-container">
                <img src="../assets/images/inaco_logo-removebg-preview.png" alt="logo" class="logo"/>
                <div class="company-name">PT Niramas Utama (INACO)</div>
                <div class="system-name">E-Purch</div>
            </div>

            <?php if ($success): ?>
                <div class="success-icon">🎉</div>
                <h2 class="reset-title">Success!</h2>
                <div class="alert alert-success">
                    <span>✅</span>
                    <?php echo htmlspecialchars($success); ?>
                </div>
                <a href="../index.php" class="btn btn-primary" style="text-decoration: none; text-align: center; display: inline-block;">Go to Login</a>
            <?php elseif ($validToken): ?>
                <h2 class="reset-title">Create New Password</h2>
                <p class="reset-subtitle">Your new password must be at least 6 characters long.</p>

                <?php if ($error): ?>
                    <div class="alert alert-error">
                        <span>⚠️</span>
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="">
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <div class="password-wrapper">
                            <input type="password" name="password" class="form-input" id="newPassword" placeholder="Enter new password" required minlength="6">
                            <span class="toggle-password" onclick="togglePassword('newPassword')">👁</span>
                        </div>
                        <div class="password-hint">Minimum 6 characters</div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <div class="password-wrapper">
                            <input type="password" name="confirm_password" class="form-input" id="confirmPassword" placeholder="Confirm new password" required minlength="6">
                            <span class="toggle-password" onclick="togglePassword('confirmPassword')">👁</span>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Reset Password</button>
                </form>
            <?php else: ?>
                <h2 class="reset-title">Oops!</h2>
                <div class="alert alert-error">
                    <span>⚠️</span>
                    <?php echo htmlspecialchars($error); ?>
                </div>
                <a href="forgot_password.php" class="btn btn-outline" style="text-decoration: none; text-align: center; display: inline-block;">Request New Link</a>
            <?php endif; ?>

            <div class="back-link">
                <a href="../index.php">← Back to Login</a>
            </div>
        </div>
    </div>

    <script>
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    </script>
</body>
</html>