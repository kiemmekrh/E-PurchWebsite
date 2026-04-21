<?php
// For Mac with Homebrew MySQL

$host = '127.0.0.1';
$dbname = 'e_purch_db';
$username = 'root';

// If you didn't set password during mysql_secure_installation:
$password = '';

// If you set a password:
// $password = 'your_password';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}
?>