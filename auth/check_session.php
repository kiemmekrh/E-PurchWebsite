<?php
// File: auth/check_session.php

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

/**
 * Check if user has specific role
 */
function hasRole($role) {
    return isset($_SESSION['role']) && $_SESSION['role'] === $role;
}

/**
 * Main authorization check with role validation
 * @param array $allowedRoles Array of allowed roles
 */
function checkAuth($allowedRoles) {
    // 1. Check login
    if (!isLoggedIn()) {
        header('Location: /e-purch/index.php');
        exit;
    }
    
    // 2. Check role permission
    if (!in_array($_SESSION['role'], $allowedRoles)) {
        header('HTTP/1.1 403 Forbidden');
        echo 'Access denied. Insufficient permissions.';
        exit;
    }
}

/**
 * Redirect user based on their role (for unauthorized access attempts)
 */
function redirectByRole() {
    if (hasRole('admin') || hasRole('purchasing_staff')) {
        header('Location: /e-purch/modules/dashboard/index.php');
    } elseif (hasRole('supplier')) {
        header('Location: /e-purch/modules/invoice/submit.php');
    } else {
        header('Location: /e-purch/index.php');
    }
    exit;
}

/**
 * Check if user is admin
 */
function isAdmin() {
    return hasRole('admin');
}

/**
 * Check if user is purchasing staff
 */
function isPurchasingStaff() {
    return hasRole('purchasing_staff');
}

/**
 * Check if user is manager
 */
function isManager() {
    return hasRole('manager');
}

/**
 * Check if user is supplier
 */
function isSupplier() {
    return hasRole('supplier');
}
?>