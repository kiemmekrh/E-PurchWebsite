-- File: database/schema.sql
-- E-Purch Database Schema (Clean Version - No duplicate ALTER TABLE)

CREATE DATABASE IF NOT EXISTS e_purch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE e_purch_db;

CREATE TABLE User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','purchasing_staff','manager') DEFAULT 'purchasing_staff',
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Supplier (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(150) NOT NULL,
    contact_info VARCHAR(150),
    email VARCHAR(100),
    password VARCHAR(255) DEFAULT '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Purchase_Order (
    po_number VARCHAR(20) NOT NULL,
    po_item VARCHAR(5) NOT NULL,
    po_date DATE NOT NULL,
    ordered_quantity DECIMAL(15,2) NOT NULL,
    unit_price DECIMAL(15,2),
    status ENUM('Open','Partial','Completed') DEFAULT 'Open',
    material_group VARCHAR(20),
    description VARCHAR(255),
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (po_number, po_item),
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE SET NULL
);

CREATE TABLE Goods_Receipt (
    gr_number VARCHAR(20) PRIMARY KEY,
    gr_date DATE NOT NULL,
    gr_quantity DECIMAL(15,2) NOT NULL,
    po_number VARCHAR(20) NOT NULL,
    po_item VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_number, po_item) REFERENCES Purchase_Order(po_number, po_item) ON DELETE CASCADE
);

CREATE TABLE Invoice (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    supplier_id INT NOT NULL,
    po_number VARCHAR(20),
    file_path VARCHAR(500),
    description TEXT,
    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
    validated_by INT,
    validation_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id),
    FOREIGN KEY (validated_by) REFERENCES User(user_id) ON DELETE SET NULL
);

CREATE TABLE Comparison_Table (
    comparison_id INT PRIMARY KEY AUTO_INCREMENT,
    comparison_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    pr_number VARCHAR(50),
    created_by INT NOT NULL,
    material_code VARCHAR(50),
    material_group VARCHAR(20),
    description VARCHAR(255),
    uom VARCHAR(20),
    qty_pr DECIMAL(15,2),
    last_qty DECIMAL(15,2), last_po_number VARCHAR(50), last_po_date DATE,
    last_price_foreign DECIMAL(15,2), last_kurs_date DATE, last_kurs_idr DECIMAL(15,2),
    last_price_idr DECIMAL(15,2), last_price_tiba_nu DECIMAL(15,2), last_amount DECIMAL(15,2),
    last_supplier_id INT, last_supplier_name VARCHAR(150),
    plan_qty DECIMAL(15,2), plan_price_foreign DECIMAL(15,2), plan_kurs_date DATE,
    plan_kurs_idr DECIMAL(15,2), plan_price_idr DECIMAL(15,2), plan_price_tiba_nu DECIMAL(15,2),
    plan_amount DECIMAL(15,2), plan_supplier_id INT, plan_supplier_name VARCHAR(150),
    gap_price DECIMAL(15,2), gap_percent DECIMAL(5,2),
    awarded_po_date DATE, awarded_deliv_date DATE, awarded_po_number VARCHAR(50),
    awarded_supplier_id INT, awarded_supplier_name VARCHAR(150),
    awarded_amount DECIMAL(15,2), awarded_keterangan TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    FOREIGN KEY (created_by) REFERENCES User(user_id)
);

CREATE TABLE Comparison_Detail (
    detail_id INT PRIMARY KEY AUTO_INCREMENT,
    comparison_id INT NOT NULL,
    supplier_id INT NOT NULL,
    material_group VARCHAR(20),
    description VARCHAR(255),
    last_price DECIMAL(15,2),
    plan_price DECIMAL(15,2),
    average_price DECIMAL(15,2),
    FOREIGN KEY (comparison_id) REFERENCES Comparison_Table(comparison_id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id)
);

CREATE TABLE Activity_Log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE SET NULL
);

-- Seed data
INSERT INTO User (name, email, password, role) VALUES
('Administrator', 'admin@inaco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Purchasing Staff', 'staff@inaco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'purchasing_staff');

INSERT INTO Supplier (supplier_name, contact_info, email) VALUES
('PANTOS LOGISTIK INDONESIA', '021-5551234', 'pantos@email.com'),
('OKTO', '021-5555678', 'okto@email.com'),
('SAMUDERA JAYA CARGO', '021-5559012', 'samudera@email.com'),
('PT Sumber Makmur', '021-5551111', 'sumber@email.com'),
('PT Kresk Abadi', '021-5552222', 'kresk@email.com');

INSERT INTO Purchase_Order (po_number, po_item, po_date, ordered_quantity, material_group, description, supplier_id) VALUES
('4100072449', '10', '2026-01-24', 10, 'SE100', 'Plastic Wrap', 1),
('4100072544', '10', '2026-03-04', 5,  'SE100', 'Ayam Goreng',  5),
('4100072545', '10', '2026-02-08', 15, 'SE100', 'Karton Box A', 3);

INSERT INTO `User` (`name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`) 
VALUES (
    'Purchasing Staff 1', 
    'purchasing@inaco.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- password: password
    'purchasing_staff', 
    'active', 
    NOW(), 
    NOW()
);
INSERT INTO `User` (`name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`) 
VALUES (
    'Manager 1', 
    'manager@inaco.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- password: password
    'manager', 
    'active', 
    NOW(), 
    NOW()
);
UPDATE `User` 
SET `password` = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE `user_id` = 1;