<?php
// File: auth/check_session.php
function checkAuth($allowedRoles) {
    if (!isset($_SESSION['user_id'])) {
        header('Location: /e-purch/index.php');
        exit;
    }
    
    if (!in_array($_SESSION['role'], $allowedRoles)) {
        header('HTTP/1.1 403 Forbidden');
        echo 'Access denied. Insufficient permissions.';
        exit;
    }
}
?>