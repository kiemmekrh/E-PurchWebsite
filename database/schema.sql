-- File: database/schema.sql (MySQL Database Schema)

CREATE DATABASE IF NOT EXISTS e_purch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE e_purch_db;

-- User Table
CREATE TABLE User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'purchasing_staff', 'manager') DEFAULT 'purchasing_staff',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Supplier Table
CREATE TABLE Supplier (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(150) NOT NULL,
    contact_info VARCHAR(150),
    email VARCHAR(100),
    password VARCHAR(100) DEFAULT 'supplier123', -- Temporary default, should be hashed
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Table
CREATE TABLE Purchase_Order (
    po_number VARCHAR(20) NOT NULL,
    po_item VARCHAR(5) NOT NULL,
    po_date DATE NOT NULL,
    ordered_quantity DECIMAL(15,2) NOT NULL,
    unit_price DECIMAL(15,2),
    status ENUM('Open', 'Partial', 'Completed') DEFAULT 'Open',
    material_group VARCHAR(20),
    description VARCHAR(255),
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (po_number, po_item),
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id)
);

-- Goods Receipt Table
CREATE TABLE Goods_Receipt (
    gr_number VARCHAR(20) PRIMARY KEY,
    gr_date DATE NOT NULL,
    gr_quantity DECIMAL(15,2) NOT NULL,
    po_number VARCHAR(20) NOT NULL,
    po_item VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (po_number, po_item) REFERENCES Purchase_Order(po_number, po_item)
);

-- Invoice Table
CREATE TABLE Invoice (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    supplier_id INT NOT NULL,
    po_number VARCHAR(20),
    file_path VARCHAR(500),
    description TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    validated_by INT,
    validation_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id),
    FOREIGN KEY (validated_by) REFERENCES User(user_id)
);

-- Comparison Table
CREATE TABLE Comparison_Table (
    comparison_id INT PRIMARY KEY AUTO_INCREMENT,
    comparison_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    created_by INT NOT NULL,
    material_group VARCHAR(20),
    description VARCHAR(255),
    plan_quantity DECIMAL(15,2),
    FOREIGN KEY (created_by) REFERENCES User(user_id)
);
ALTER TABLE Comparison_Table
ADD COLUMN material_code VARCHAR(50) NULL AFTER created_by,
ADD COLUMN uom VARCHAR(20) NULL AFTER description,
ADD COLUMN qty_pr DECIMAL(15,2) NULL AFTER uom,
ALTER TABLE Comparison_Table
ADD COLUMN material_code VARCHAR(50) NULL AFTER created_by,
ADD COLUMN uom VARCHAR(20) NULL AFTER description,
ADD COLUMN qty_pr DECIMAL(15,2) NULL AFTER uom,

-- Last Order
ADD COLUMN last_qty DECIMAL(15,2) NULL AFTER qty_pr,
ADD COLUMN last_po_number VARCHAR(50) NULL AFTER last_qty,
ADD COLUMN last_po_date DATE NULL AFTER last_po_number,
ADD COLUMN last_price_foreign DECIMAL(15,2) NULL AFTER last_po_date,
ADD COLUMN last_kurs_date DATE NULL AFTER last_price_foreign,
ADD COLUMN last_kurs_idr DECIMAL(15,2) NULL AFTER last_kurs_date,
ADD COLUMN last_price_idr DECIMAL(15,2) NULL AFTER last_kurs_idr,
ADD COLUMN last_price_tiba_nu DECIMAL(15,2) NULL AFTER last_price_idr,
ADD COLUMN last_amount DECIMAL(15,2) NULL AFTER last_price_tiba_nu,
ADD COLUMN last_supplier_id INT NULL AFTER last_amount,

-- Plan Order
ADD COLUMN plan_qty DECIMAL(15,2) NULL AFTER last_supplier_id,
ADD COLUMN plan_price_foreign DECIMAL(15,2) NULL AFTER plan_qty,
ADD COLUMN plan_kurs_date DATE NULL AFTER plan_price_foreign,
ADD COLUMN plan_kurs_idr DECIMAL(15,2) NULL AFTER plan_kurs_date,
ADD COLUMN plan_price_idr DECIMAL(15,2) NULL AFTER plan_kurs_idr,
ADD COLUMN plan_price_tiba_nu DECIMAL(15,2) NULL AFTER plan_price_idr,
ADD COLUMN plan_amount DECIMAL(15,2) NULL AFTER plan_price_tiba_nu,
ADD COLUMN plan_supplier_id INT NULL AFTER plan_amount,

-- Gap
ADD COLUMN gap_price DECIMAL(15,2) NULL AFTER plan_supplier_id,
ADD COLUMN gap_percent DECIMAL(5,2) NULL AFTER gap_price,

-- Awarded
ADD COLUMN awarded_po_date DATE NULL AFTER gap_percent,
ADD COLUMN awarded_deliv_date DATE NULL AFTER awarded_po_date,
ADD COLUMN awarded_po_number VARCHAR(50) NULL AFTER awarded_deliv_date,
ADD COLUMN awarded_supplier_id INT NULL AFTER awarded_po_number,
ADD COLUMN awarded_amount DECIMAL(15,2) NULL AFTER awarded_supplier_id,
ADD COLUMN awarded_keterangan TEXT NULL AFTER awarded_amount,

-- Status
ADD COLUMN status VARCHAR(20) DEFAULT 'draft' AFTER awarded_keterangan;

ALTER TABLE Comparison_Table
ADD COLUMN last_supplier_name VARCHAR(150) NULL AFTER last_supplier_id,
ADD COLUMN plan_supplier_name VARCHAR(150) NULL AFTER plan_supplier_id,
ADD COLUMN awarded_supplier_name VARCHAR(150) NULL AFTER awarded_supplier_id;

ALTER TABLE Comparison_Table ADD COLUMN pr_number VARCHAR(50) NULL AFTER comparison_date;

-- Last Order
ADD COLUMN last_qty DECIMAL(15,2) NULL AFTER qty_pr,
ADD COLUMN last_po_number VARCHAR(50) NULL AFTER last_qty,
ADD COLUMN last_po_date DATE NULL AFTER last_po_number,
ADD COLUMN last_price_foreign DECIMAL(15,2) NULL AFTER last_po_date,
ADD COLUMN last_kurs_date DATE NULL AFTER last_price_foreign,
ADD COLUMN last_kurs_idr DECIMAL(15,2) NULL AFTER last_kurs_date,
ADD COLUMN last_price_idr DECIMAL(15,2) NULL AFTER last_kurs_idr,
ADD COLUMN last_price_tiba_nu DECIMAL(15,2) NULL AFTER last_price_idr,
ADD COLUMN last_amount DECIMAL(15,2) NULL AFTER last_price_tiba_nu,
ADD COLUMN last_supplier_id INT NULL AFTER last_amount,

-- Plan Order
ADD COLUMN plan_qty DECIMAL(15,2) NULL AFTER last_supplier_id,
ADD COLUMN plan_price_foreign DECIMAL(15,2) NULL AFTER plan_qty,
ADD COLUMN plan_kurs_date DATE NULL AFTER plan_price_foreign,
ADD COLUMN plan_kurs_idr DECIMAL(15,2) NULL AFTER plan_kurs_date,
ADD COLUMN plan_price_idr DECIMAL(15,2) NULL AFTER plan_kurs_idr,
ADD COLUMN plan_price_tiba_nu DECIMAL(15,2) NULL AFTER plan_price_idr,
ADD COLUMN plan_amount DECIMAL(15,2) NULL AFTER plan_price_tiba_nu,
ADD COLUMN plan_supplier_id INT NULL AFTER plan_amount,

-- Gap
ADD COLUMN gap_price DECIMAL(15,2) NULL AFTER plan_supplier_id,
ADD COLUMN gap_percent DECIMAL(5,2) NULL AFTER gap_price,

-- Awarded
ADD COLUMN awarded_po_date DATE NULL AFTER gap_percent,
ADD COLUMN awarded_deliv_date DATE NULL AFTER awarded_po_date,
ADD COLUMN awarded_po_number VARCHAR(50) NULL AFTER awarded_deliv_date,
ADD COLUMN awarded_supplier_id INT NULL AFTER awarded_po_number,
ADD COLUMN awarded_amount DECIMAL(15,2) NULL AFTER awarded_supplier_id,
ADD COLUMN awarded_keterangan TEXT NULL AFTER awarded_amount,

-- Status
ADD COLUMN status VARCHAR(20) DEFAULT 'draft' AFTER awarded_keterangan;

-- Comparison Detail Table
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


-- Activity Log Table
CREATE TABLE Activity_Log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);

-- Insert default admin user (password: admin123)
INSERT INTO User (name, email, password, role) VALUES 
('Administrator', 'admin@inaco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert sample suppliers
INSERT INTO Supplier (supplier_name, contact_info, email) VALUES
('PT Sumber Makmur', '021-5551234, supplier1@email.com', 'supplier1@email.com'),
('PT Kresk Abadi', '021-5555678, supplier2@email.com', 'supplier2@email.com'),
('PT Kardus Jaya', '021-5559012, supplier3@email.com', 'supplier3@email.com'),
('PT Plastiku', '021-5553456, supplier4@email.com', 'supplier4@email.com');

-- Insert sample PO data
INSERT INTO Purchase_Order (po_number, po_item, po_date, ordered_quantity, unit_price, material_group, description, supplier_id) VALUES
('4100072449', '10', '2026-01-24', 10, 20000, 'RM01', 'Plastic Wrap', 4),
('4100072544', '10', '2026-03-04', 5, 15000, 'RM02', 'Ayam Goreng', 2),
('4100072545', '10', '2026-02-08', 15, 100000, 'RM03', 'Karton Box A', 3);