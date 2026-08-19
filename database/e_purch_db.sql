-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Waktu pembuatan: 17 Agu 2026 pada 13.12
-- Versi server: 10.4.28-MariaDB
-- Versi PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `e_purch_db`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `Activity_Log`
--

CREATE TABLE `Activity_Log` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Struktur dari tabel `Comparison_Detail`
--

CREATE TABLE `Comparison_Detail` (
  `detail_id` int(11) NOT NULL,
  `comparison_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `material_group` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `last_price` decimal(15,2) DEFAULT NULL,
  `plan_price` decimal(15,2) DEFAULT NULL,
  `average_price` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `Comparison_Plan_Row`
--

CREATE TABLE `Comparison_Plan_Row` (
  `plan_row_id` int(11) NOT NULL,
  `comparison_id` int(11) NOT NULL,
  `plan_qty` decimal(15,2) DEFAULT NULL,
  `plan_currency` varchar(10) DEFAULT NULL,
  `plan_price_foreign` decimal(15,2) DEFAULT NULL,
  `plan_kurs_date` date DEFAULT NULL,
  `plan_kurs_idr` decimal(15,2) DEFAULT NULL,
  `plan_price_idr` decimal(15,2) DEFAULT NULL,
  `plan_price_tiba_nu` decimal(15,2) DEFAULT NULL,
  `plan_amount` decimal(15,2) DEFAULT NULL,
  `plan_supplier_id` int(11) DEFAULT NULL,
  `plan_supplier_name` varchar(150) DEFAULT NULL,
  `gap_price` decimal(15,2) DEFAULT NULL,
  `gap_percent` decimal(5,2) DEFAULT NULL,
  `is_awarded` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Struktur dari tabel `Comparison_Table`
--

CREATE TABLE `Comparison_Table` (
  `comparison_id` int(11) NOT NULL,
  `comparison_date` date NOT NULL DEFAULT curdate(),
  `pr_number` varchar(50) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `source_mode` varchar(10) DEFAULT 'create',
  `material_code` varchar(50) DEFAULT NULL,
  `material_group` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `uom` varchar(20) DEFAULT NULL,
  `qty_pr` decimal(15,2) DEFAULT NULL,
  `last_qty` decimal(15,2) DEFAULT NULL,
  `last_po_number` varchar(50) DEFAULT NULL,
  `last_po_date` date DEFAULT NULL,
  `last_price_foreign` decimal(15,2) DEFAULT NULL,
  `last_currency` varchar(10) DEFAULT NULL,
  `last_kurs_date` date DEFAULT NULL,
  `last_kurs_idr` decimal(15,2) DEFAULT NULL,
  `last_price_idr` decimal(15,2) DEFAULT NULL,
  `last_price_tiba_nu` decimal(15,2) DEFAULT NULL,
  `last_amount` decimal(15,2) DEFAULT NULL,
  `last_supplier_id` int(11) DEFAULT NULL,
  `last_supplier_name` varchar(150) DEFAULT NULL,
  `plan_qty` decimal(15,2) DEFAULT NULL,
  `plan_price_foreign` decimal(15,2) DEFAULT NULL,
  `plan_currency` varchar(10) DEFAULT NULL,
  `plan_kurs_date` date DEFAULT NULL,
  `plan_kurs_idr` decimal(15,2) DEFAULT NULL,
  `plan_price_idr` decimal(15,2) DEFAULT NULL,
  `plan_price_tiba_nu` decimal(15,2) DEFAULT NULL,
  `plan_amount` decimal(15,2) DEFAULT NULL,
  `plan_supplier_id` int(11) DEFAULT NULL,
  `plan_supplier_name` varchar(150) DEFAULT NULL,
  `gap_price` decimal(15,2) DEFAULT NULL,
  `gap_percent` decimal(5,2) DEFAULT NULL,
  `awarded_po_date` date DEFAULT NULL,
  `awarded_deliv_date` date DEFAULT NULL,
  `awarded_po_number` varchar(50) DEFAULT NULL,
  `awarded_supplier_id` int(11) DEFAULT NULL,
  `awarded_supplier_name` varchar(150) DEFAULT NULL,
  `awarded_amount` decimal(15,2) DEFAULT NULL,
  `awarded_keterangan` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'draft',
  `plan_quantity` decimal(15,2) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `Goods_Receipt`
--

CREATE TABLE `Goods_Receipt` (
  `gr_number` varchar(20) NOT NULL,
  `gr_date` date NOT NULL,
  `gr_quantity` decimal(15,2) NOT NULL,
  `po_number` varchar(20) NOT NULL,
  `po_item` varchar(5) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Struktur dari tabel `Invoice`
--

CREATE TABLE `Invoice` (
  `invoice_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `invoice_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `po_number` varchar(20) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `validated_by` int(11) DEFAULT NULL,
  `validation_notes` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `validated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Struktur dari tabel `password_resets`
--

CREATE TABLE `password_resets` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `Purchase_Order`
--

CREATE TABLE `Purchase_Order` (
  `po_number` varchar(20) NOT NULL,
  `po_item` varchar(5) NOT NULL,
  `po_date` date NOT NULL,
  `ordered_quantity` decimal(15,2) NOT NULL,
  `unit_price` decimal(15,2) DEFAULT NULL,
  `status` enum('Open','Partial','Completed') DEFAULT 'Open',
  `material_group` varchar(20) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Struktur dari tabel `Supplier`
--

CREATE TABLE `Supplier` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `contact_info` varchar(150) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT 'supplier123',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Struktur dari tabel `User`
--

CREATE TABLE `User` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','purchasing_staff','manager') DEFAULT 'purchasing_staff',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `Activity_Log`
--
ALTER TABLE `Activity_Log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indeks untuk tabel `Comparison_Detail`
--
ALTER TABLE `Comparison_Detail`
  ADD PRIMARY KEY (`detail_id`),
  ADD KEY `comparison_id` (`comparison_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indeks untuk tabel `Comparison_Plan_Row`
--
ALTER TABLE `Comparison_Plan_Row`
  ADD PRIMARY KEY (`plan_row_id`),
  ADD KEY `idx_comparison_id` (`comparison_id`);

--
-- Indeks untuk tabel `Comparison_Table`
--
ALTER TABLE `Comparison_Table`
  ADD PRIMARY KEY (`comparison_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indeks untuk tabel `Goods_Receipt`
--
ALTER TABLE `Goods_Receipt`
  ADD PRIMARY KEY (`gr_number`),
  ADD KEY `po_number` (`po_number`,`po_item`);

--
-- Indeks untuk tabel `Invoice`
--
ALTER TABLE `Invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `validated_by` (`validated_by`);

--
-- Indeks untuk tabel `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indeks untuk tabel `Purchase_Order`
--
ALTER TABLE `Purchase_Order`
  ADD PRIMARY KEY (`po_number`,`po_item`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indeks untuk tabel `Supplier`
--
ALTER TABLE `Supplier`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indeks untuk tabel `User`
--
ALTER TABLE `User`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `Activity_Log`
--
ALTER TABLE `Activity_Log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT untuk tabel `Comparison_Detail`
--
ALTER TABLE `Comparison_Detail`
  MODIFY `detail_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `Comparison_Plan_Row`
--
ALTER TABLE `Comparison_Plan_Row`
  MODIFY `plan_row_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT untuk tabel `Comparison_Table`
--
ALTER TABLE `Comparison_Table`
  MODIFY `comparison_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT untuk tabel `Invoice`
--
ALTER TABLE `Invoice`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT untuk tabel `password_resets`
--
ALTER TABLE `password_resets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `Supplier`
--
ALTER TABLE `Supplier`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=141;

--
-- AUTO_INCREMENT untuk tabel `User`
--
ALTER TABLE `User`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `Activity_Log`
--
ALTER TABLE `Activity_Log`
  ADD CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `User` (`user_id`);

--
-- Ketidakleluasaan untuk tabel `Comparison_Detail`
--
ALTER TABLE `Comparison_Detail`
  ADD CONSTRAINT `comparison_detail_ibfk_1` FOREIGN KEY (`comparison_id`) REFERENCES `Comparison_Table` (`comparison_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `comparison_detail_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `Supplier` (`supplier_id`);

--
-- Ketidakleluasaan untuk tabel `Comparison_Plan_Row`
--
ALTER TABLE `Comparison_Plan_Row`
  ADD CONSTRAINT `comparison_plan_row_ibfk_1` FOREIGN KEY (`comparison_id`) REFERENCES `Comparison_Table` (`comparison_id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `Comparison_Table`
--
ALTER TABLE `Comparison_Table`
  ADD CONSTRAINT `comparison_table_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `User` (`user_id`);

--
-- Ketidakleluasaan untuk tabel `Goods_Receipt`
--
ALTER TABLE `Goods_Receipt`
  ADD CONSTRAINT `goods_receipt_ibfk_1` FOREIGN KEY (`po_number`,`po_item`) REFERENCES `Purchase_Order` (`po_number`, `po_item`);

--
-- Ketidakleluasaan untuk tabel `Invoice`
--
ALTER TABLE `Invoice`
  ADD CONSTRAINT `invoice_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `Supplier` (`supplier_id`),
  ADD CONSTRAINT `invoice_ibfk_2` FOREIGN KEY (`validated_by`) REFERENCES `User` (`user_id`);

--
-- Ketidakleluasaan untuk tabel `Purchase_Order`
--
ALTER TABLE `Purchase_Order`
  ADD CONSTRAINT `purchase_order_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `Supplier` (`supplier_id`);
COMMIT;

ALTER TABLE Goods_Receipt
    ADD COLUMN gr_item VARCHAR(5) NOT NULL DEFAULT '1' AFTER gr_number;

ALTER TABLE Goods_Receipt
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (gr_number, gr_item);

CREATE TABLE IF NOT EXISTS password_reset_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    identifier VARCHAR(100) NOT NULL,
    account_type ENUM('user','supplier') NOT NULL,
    account_id INT,
    account_name VARCHAR(150),
    status ENUM('pending','done') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    handled_by INT,
    handled_at TIMESTAMP NULL,
    FOREIGN KEY (handled_by) REFERENCES User(user_id) ON DELETE SET NULL
);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
