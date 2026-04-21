<?php
require_once 'config/database.php';

function authenticateUser($email, $password, $pdo) {
    $stmt = $pdo->prepare("SELECT * FROM User WHERE email = ? AND status = 'active'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && ($user['password'] === $password || password_verify($password, $user['password']))) {
        return $user;
    }
    return false;
}

function authenticateSupplier($supplierId, $password, $pdo) {
    $stmt = $pdo->prepare("SELECT * FROM Supplier WHERE supplier_id = ? AND password = ? AND status = 'active'");
    $stmt->execute([$supplierId, $password]);
    return $stmt->fetch();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $loginType = $_POST['login_type'] ?? 'staff';
    
    if ($loginType === 'staff') {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        
        $user = authenticateUser($email, $password, $pdo);
        
        if ($user) {
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['name'] = $user['name'];
            $_SESSION['email'] = $user['email'];
            $_SESSION['role'] = $user['role'];
            
            header('Location: modules/dashboard/index.php');
            exit;
        } else {
            $error = 'Invalid email or password';
        }
    } else {
        $supplierId = $_POST['supplier_id'] ?? '';
        $password = $_POST['password'] ?? '';
        
        $supplier = authenticateSupplier($supplierId, $password, $pdo);
        
        if ($supplier) {
            $_SESSION['user_id'] = $supplier['supplier_id'];
            $_SESSION['name'] = $supplier['supplier_name'];
            $_SESSION['role'] = 'supplier';
            
            header('Location: modules/invoice/submit.php');
            exit;
        } else {
            $error = 'Invalid supplier credentials';
        }
    }
}
?>