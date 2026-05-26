<?php
session_start();

// Fix path: naik 1 level dari auth/ ke root project
require_once __DIR__ . '/../config/database.php';

function authenticateUser($email, $password, $pdo) {
    $stmt = $pdo->prepare("SELECT * FROM User WHERE email = ? AND status = 'active'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && ($user['password'] === $password || password_verify($password, $user['password']))) {
        return $user;
    }
    return false;
}

function authenticateSupplier($email, $password, $pdo) {
    $stmt = $pdo->prepare("SELECT * FROM Supplier WHERE email = ? AND status = 'active'");
    $stmt->execute([$email]);
    $supplier = $stmt->fetch();
    
    if ($supplier && ($supplier['password'] === $password || password_verify($password, $supplier['password']))) {
        return $supplier;
    }
    return false;
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
            
            header('Location: ../modules/dashboard/index.php');  // <-- Fix path juga
            exit;
        } else {
            $_SESSION['login_error'] = 'Invalid email or password';
            $_SESSION['last_login_type'] = 'staff';
            header('Location: ../index.php');  // <-- Fix path
            exit;
        }
    } else {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        
        $supplier = authenticateSupplier($email, $password, $pdo);
        
        if ($supplier) {
            $_SESSION['user_id'] = $supplier['supplier_id'];
            $_SESSION['name'] = $supplier['supplier_name'];
            $_SESSION['email'] = $supplier['email'];
            $_SESSION['role'] = 'supplier';
            
            header('Location: ../modules/invoice/submit.php');  // <-- Fix path
            exit;
        } else {
            $_SESSION['login_error'] = 'Invalid email or password';
            $_SESSION['last_login_type'] = 'supplier';
            header('Location: ../index.php');  // <-- Fix path
            exit;
        }
    }
}
?>