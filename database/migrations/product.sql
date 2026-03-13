-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Waktu pembuatan: 10 Mar 2026 pada 02.14
-- Versi server: 11.8.3-MariaDB-log
-- Versi PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u237530081_ipos_db`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `affiliates`
--

CREATE TABLE `affiliates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `type_id` bigint(20) UNSIGNED NOT NULL,
  `fee_method` enum('percent','nominal') NOT NULL DEFAULT 'percent',
  `fee_value` double NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `affiliates`
--

INSERT INTO `affiliates` (`id`, `name`, `type_id`, `fee_method`, `fee_value`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'dr Frecilia', 1, 'percent', 10, 1, '2026-02-07 10:20:21', '2026-02-07 10:20:21'),
(2, 'dr Alfried', 1, 'percent', 0, 1, '2026-03-02 11:08:21', '2026-03-02 11:10:33');

-- --------------------------------------------------------

--
-- Struktur dari tabel `affiliate_product_commissions`
--

CREATE TABLE `affiliate_product_commissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `affiliate_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `fee_method` enum('percent','nominal') NOT NULL DEFAULT 'percent',
  `fee_value` double NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `affiliate_product_commissions`
--

INSERT INTO `affiliate_product_commissions` (`id`, `affiliate_id`, `product_id`, `fee_method`, `fee_value`, `created_at`, `updated_at`) VALUES
(2, 2, 96, 'percent', 12, '2026-03-02 11:09:41', '2026-03-02 11:09:41');

-- --------------------------------------------------------

--
-- Struktur dari tabel `attributes`
--

CREATE TABLE `attributes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `attribute_group_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `attributes`
--

INSERT INTO `attributes` (`id`, `attribute_group_id`, `name`, `created_at`, `updated_at`) VALUES
(1, 1, 'DOKTER', '2026-02-07 10:16:17', '2026-02-07 10:16:29'),
(2, 1, 'INFLUENCER', '2026-02-07 10:16:42', '2026-02-07 10:16:42'),
(3, 1, 'KARYAWAN', '2026-02-07 10:16:58', '2026-02-07 10:16:58'),
(4, 2, 'ML', '2026-02-10 14:09:36', '2026-02-10 14:09:36'),
(5, 2, 'GR', '2026-02-10 14:09:48', '2026-02-10 14:09:48'),
(6, 2, 'KG', '2026-02-10 14:10:21', '2026-02-10 14:10:30'),
(7, 2, 'L', '2026-02-10 14:10:42', '2026-02-10 14:10:42');

-- --------------------------------------------------------

--
-- Struktur dari tabel `attribute_groups`
--

CREATE TABLE `attribute_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `attribute_groups`
--

INSERT INTO `attribute_groups` (`id`, `name`, `code`, `created_at`, `updated_at`) VALUES
(1, 'Tipe Affiliate', 'AFFILIATE_TYPE', '2026-02-07 10:15:30', '2026-02-07 10:19:02'),
(2, 'Netto', 'NETTO', '2026-02-10 14:09:13', '2026-02-10 14:09:13');

-- --------------------------------------------------------

--
-- Struktur dari tabel `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `slug`, `created_at`, `updated_at`) VALUES
(1, 'Skincare', NULL, 'skincare', '2026-03-02 09:54:00', '2026-03-02 09:54:00'),
(2, 'Fragrance', NULL, 'fragrance', '2026-03-02 10:11:02', '2026-03-02 10:11:02'),
(4, 'Beautylab', NULL, 'beautylab', '2026-03-02 10:47:10', '2026-03-02 10:47:10');

-- --------------------------------------------------------

--
-- Struktur dari tabel `channel_settings`
--

CREATE TABLE `channel_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `slug` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `factors` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`factors`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `channel_settings`
--

INSERT INTO `channel_settings` (`id`, `slug`, `name`, `factors`, `created_at`, `updated_at`) VALUES
(1, 'offline-store', 'Offline Store', '[{\"label\":\"HPP\",\"operator\":\"add\",\"value\":\"39500\"},{\"label\":\"Tax\",\"operator\":\"percentage\",\"value\":\"11\"},{\"label\":\"Rayandra\",\"operator\":\"percentage\",\"value\":\"50\"},{\"label\":\"Admin dll\",\"operator\":\"percentage\",\"value\":\"46\"}]', '2026-02-05 16:42:55', '2026-02-09 14:59:22'),
(2, 'shopee', 'Shopee', '[{\"label\":\"Harga Rayandra\",\"operator\":\"multiply\",\"value\":\"2\"},{\"label\":\"PPN\",\"operator\":\"percentage\",\"value\":\"11\"},{\"label\":\"Admin Shopee\",\"operator\":\"percentage\",\"value\":\"35\"}]', '2026-02-05 16:42:55', '2026-02-07 10:36:30'),
(3, 'tokopedia', 'Tokopedia', NULL, '2026-02-05 16:42:55', '2026-02-05 16:42:55'),
(4, 'tiktok', 'TikTok Shop', NULL, '2026-02-05 16:42:55', '2026-02-05 16:42:55'),
(5, 'whatsapp', 'Whatsapp', '[]', '2026-02-07 10:36:50', '2026-02-07 10:36:50'),
(6, 'harga-test-offline', 'Harga (Test) Offline', '[{\"label\":\"HPP PABRIK\",\"operator\":\"add\",\"value\":\"39500\"},{\"label\":\"RSIA\",\"operator\":\"percentage\",\"value\":\"30\"},{\"label\":\"TARGET MARGIN\",\"operator\":\"percentage\",\"value\":\"20\"}]', '2026-03-09 17:42:30', '2026-03-09 17:49:14');

-- --------------------------------------------------------

--
-- Struktur dari tabel `customers`
--

CREATE TABLE `customers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `email`, `created_at`, `updated_at`) VALUES
(1, 'iman', '083872671933', 'iman@mail.com', '2026-02-09 10:06:39', '2026-02-09 10:06:39');

-- --------------------------------------------------------

--
-- Struktur dari tabel `delivery_notes`
--

CREATE TABLE `delivery_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(255) DEFAULT NULL,
  `delivery_note_no` varchar(255) DEFAULT NULL,
  `transaction_date` date DEFAULT NULL,
  `delivery_type` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `delivery_notes`
--

INSERT INTO `delivery_notes` (`id`, `user_id`, `customer_id`, `customer_name`, `customer_phone`, `delivery_note_no`, `transaction_date`, `delivery_type`, `notes`, `created_at`, `updated_at`) VALUES
(1, 6, NULL, 'Yunita', '00000', 'SJ/BL/III/26/0001', '2026-03-02', 'pickup', NULL, '2026-03-02 11:05:42', '2026-03-02 11:05:42');

-- --------------------------------------------------------

--
-- Struktur dari tabel `delivery_note_items`
--

CREATE TABLE `delivery_note_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `delivery_note_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_batch_id` bigint(20) UNSIGNED DEFAULT NULL,
  `qty` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `delivery_note_items`
--

INSERT INTO `delivery_note_items` (`id`, `delivery_note_id`, `product_id`, `product_batch_id`, `qty`, `created_at`, `updated_at`) VALUES
(1, 1, 111, 24, 10, '2026-03-02 11:05:42', '2026-03-02 11:05:42');

-- --------------------------------------------------------

--
-- Struktur dari tabel `goods_receipts`
--

CREATE TABLE `goods_receipts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sj_number` varchar(255) NOT NULL,
  `purchase_order_id` bigint(20) UNSIGNED DEFAULT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `delivery_note_number` varchar(255) NOT NULL,
  `delivery_date` date NOT NULL,
  `received_date` date NOT NULL,
  `received_by` bigint(20) UNSIGNED DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','confirmed') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `goods_receipts`
--

INSERT INTO `goods_receipts` (`id`, `sj_number`, `purchase_order_id`, `supplier_id`, `delivery_note_number`, `delivery_date`, `received_date`, `received_by`, `notes`, `status`, `created_at`, `updated_at`) VALUES
(1, 'SJ/BL/2026/03/0001', NULL, 1, '001', '2026-03-02', '2026-03-02', 6, NULL, 'confirmed', '2026-03-02 10:38:18', '2026-03-02 10:38:18');

-- --------------------------------------------------------

--
-- Struktur dari tabel `goods_receipt_items`
--

CREATE TABLE `goods_receipt_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `goods_receipt_id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `satuan` varchar(255) DEFAULT NULL,
  `quantity_ordered` decimal(15,2) NOT NULL DEFAULT 0.00,
  `quantity_received` decimal(15,2) NOT NULL,
  `quantity_difference` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `goods_receipt_items`
--

INSERT INTO `goods_receipt_items` (`id`, `goods_receipt_id`, `purchase_order_item_id`, `product_name`, `description`, `satuan`, `quantity_ordered`, `quantity_received`, `quantity_difference`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'Shower Gel Vast spirit', '10', NULL, 50.00, 50.00, 0.00, NULL, '2026-03-02 10:38:18', '2026-03-02 10:38:18');

-- --------------------------------------------------------

--
-- Struktur dari tabel `merek`
--

CREATE TABLE `merek` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `merek`
--

INSERT INTO `merek` (`id`, `name`, `slug`, `description`, `created_at`, `updated_at`) VALUES
(1, 'DERMOND', 'dermond', 'DERMOND products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(2, 'EGGSHELLENT', 'eggshellent', 'EGGSHELLENT products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(3, 'LUECIÉLLEDERM', 'lueciellederm', 'LUECIÉLLEDERM products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(4, 'BABYLATORY', 'babylatory', 'BABYLATORY products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(5, 'ADHWA', 'adhwa', 'ADHWA products', '2025-09-27 10:42:23', '2025-09-27 15:47:28'),
(6, 'MOMMYLATORY', 'mommylatory', 'MOMMYLATORY products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(7, 'DERMALINK', 'dermalink', 'DERMALINK products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(8, 'BEAUTYLATORY', 'beautylatory', 'BEAUTYLATORY products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(9, 'SAM SUN AND MOON', 'sam-sun-and-moon', 'SAM SUN AND MOON products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(10, 'MOMALAYA', 'momalaya', 'MOMALAYA products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(11, 'CREYA', 'creya', 'CREYA products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(12, 'COSMETORY', 'cosmetory', 'COSMETORY products', '2025-09-27 10:42:23', '2025-09-27 10:42:23'),
(13, 'COSMO AMBYAR 70%', 'cosmo-ambyar-70', NULL, '2025-10-02 11:12:20', '2025-10-02 11:13:25'),
(14, 'PHYTOSYNC', 'phytosync', NULL, '2025-10-09 09:40:41', '2025-10-09 09:40:41'),
(15, 'GWIYOMI', 'gwiyomi', 'GWIYOMI', '2026-02-07 12:41:18', '2026-02-07 12:41:18'),
(16, 'Sheluna', 'sheluna', 'Sheluna Products', '2026-02-10 16:09:08', '2026-02-10 16:15:10'),
(20, 'DEADERM', 'deaderm', 'DEADERM Products', '2026-02-10 17:14:27', '2026-02-10 17:14:27'),
(21, 'UMADERM', 'umaderm', 'UMADERM Products', '2026-02-10 17:14:50', '2026-02-10 17:14:50'),
(22, 'Beautylab/Kelas', 'beautylabkelas', 'Kelas formulasi', '2026-02-18 10:36:29', '2026-02-18 10:36:29'),
(23, 'Beautylab/Kelas', 'beautylabkelas-2', 'Fun Class', '2026-02-18 10:38:04', '2026-02-18 10:38:38');

-- --------------------------------------------------------

--
-- Struktur dari tabel `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(2, '2025_09_26_143349_create_users_table', 1),
(3, '2025_09_26_143352_create_categories_table', 1),
(4, '2025_09_26_143354_create_products_table', 1),
(5, '2025_09_26_143356_create_transactions_table', 1),
(6, '2025_09_26_143359_create_transaction_items_table', 1),
(7, '2025_09_27_104657_create_photo_product_table', 2),
(8, '2025_09_29_133622_create_vouchers_table', 3),
(9, '2025_09_29_140344_add_column_to_transactions_table', 3),
(10, '2025_09_29_140344_add_column_to_products_table', 4),
(11, '2025_09_29_140344_add_column_to_voucher_table', 4),
(12, '2025_09_29_140344_add_status_to_products_table', 5),
(13, '2026_02_05_123046_create_product_batches_table', 6),
(14, '2026_02_05_123050_add_batch_and_source_fields', 6),
(15, '2026_02_05_123051_add_batch_id_to_transaction_items', 6),
(16, '2026_02_05_123111_add_min_stock_alert_to_products', 6),
(17, '2026_02_05_141509_add_buy_price_to_product_batches', 6),
(18, '2026_02_05_141510_create_channel_settings_table', 6),
(19, '2026_02_05_142045_add_buy_price_to_transaction_items', 6),
(20, '2026_02_05_151411_add_customer_and_pos_fields_to_transactions_table', 6),
(21, '2026_02_05_155714_create_store_settings_table', 6),
(22, '2026_02_06_100127_update_channel_settings_schema', 7),
(23, '2026_02_06_102424_add_scheduling_to_vouchers_table', 7),
(24, '2026_02_06_102436_add_scheduling_to_vouchers_table', 7),
(25, '2026_02_06_103350_add_usage_limit_to_vouchers_table', 7),
(26, '2026_02_06_104847_add_discount_type_to_vouchers_table', 7),
(27, '2026_02_06_115042_create_attribute_groups_table', 7),
(28, '2026_02_06_115044_create_attributes_table', 7),
(29, '2026_02_06_115142_create_affiliates_table', 7),
(30, '2026_02_06_123945_add_affiliate_columns_to_transactions_table', 7),
(31, '2026_02_06_132203_create_affiliate_product_commissions_table', 7),
(32, '2026_02_06_171200_modify_product_price_columns_to_bigint', 7),
(33, '2026_02_07_110815_update_vouchers_table_and_add_pivot', 8),
(34, '2026_02_07_121500_change_transaction_source_to_string', 8),
(35, '2026_02_07_134711_create_customers_table', 8),
(36, '2026_02_07_135315_add_customer_id_to_transactions_table', 8),
(37, '2026_02_16_100747_rename_categories_to_merek_table', 9),
(38, '2026_02_16_110814_create_product_hierarchy_and_variants_tables', 9),
(39, '2026_02_16_114143_add_description_to_hierarchy_tables', 9),
(40, '2026_02_16_115133_simplify_product_hierarchy_remove_subcategory', 10),
(41, '2026_02_16_132555_create_sub_categories_table_v2', 10),
(42, '2026_02_16_134646_add_sub_category_id_to_products_table', 10),
(43, '2026_02_16_163352_make_variant_name_nullable_in_product_variants_table', 10),
(44, '2026_02_17_085643_add_satuan_to_product_nettos_table', 10),
(45, '2026_02_17_101305_create_suppliers_table', 10),
(46, '2026_02_17_101311_create_purchase_orders_table', 10),
(47, '2026_02_17_101349_create_purchase_order_items_table', 10),
(48, '2026_02_17_101353_create_goods_receipts_table', 10),
(49, '2026_02_17_101355_create_goods_receipt_items_table', 10),
(50, '2026_02_17_135657_add_satuan_to_purchasing_items_table', 10),
(51, '2026_02_17_164750_add_payment_receipt_to_transactions_table', 10),
(52, '2026_02_19_085017_make_buy_price_nullable_in_product_batches_table', 10),
(53, '2026_02_21_104921_create_invoices_table', 10),
(54, '2026_02_21_104926_create_invoice_items_table', 10),
(55, '2026_02_21_110513_add_tax_percentage_to_store_settings_table', 10),
(56, '2026_02_21_110818_add_use_tax_to_invoices_table', 10),
(57, '2026_02_21_111249_add_discount_fields_to_invoices_table', 10),
(58, '2026_02_21_122600_add_invoice_number_to_transactions_table', 10),
(59, '2026_02_21_122700_drop_invoices_and_invoice_items_tables', 10),
(60, '2026_02_21_135321_add_due_date_to_transactions_table', 10),
(61, '2026_02_21_143135_add_transaction_type_and_dp_to_transactions_table', 10),
(62, '2026_02_21_145951_add_tax_and_discount_type_to_transactions_table', 10),
(63, '2026_02_26_110145_create_transaction_payments_table', 10),
(64, '2026_02_26_155231_create_delivery_notes_and_items_table', 10);

-- --------------------------------------------------------

--
-- Struktur dari tabel `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `photo_product`
--

CREATE TABLE `photo_product` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `foto` varchar(255) NOT NULL,
  `id_product` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `merek_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sub_category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_type_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `price` bigint(20) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'Y',
  `price_real` bigint(20) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `min_stock_alert` int(11) NOT NULL DEFAULT 0,
  `neto` varchar(30) DEFAULT NULL,
  `pieces` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `products`
--

INSERT INTO `products` (`id`, `merek_id`, `category_id`, `sub_category_id`, `product_type_id`, `name`, `slug`, `price`, `status`, `price_real`, `stock`, `min_stock_alert`, `neto`, `pieces`, `created_at`, `updated_at`) VALUES
(94, 6, NULL, NULL, NULL, 'Shower Gel Calm Up', 'shower-gel-calm-up', 160500, 'Y', NULL, 17, 25, '250', 'ml', '2026-02-06 10:49:33', '2026-03-04 14:22:37'),
(95, 6, NULL, NULL, NULL, 'Shower Gel Fresh Air', 'shower-gel-fresh-air', 160500, 'Y', NULL, 35, 25, '250', 'ml', '2026-02-06 11:00:51', '2026-02-06 11:08:40'),
(96, 6, NULL, NULL, NULL, 'Shower Gel Good Mood', 'shower-gel-good-mood', 160500, 'Y', NULL, 24, 25, '250', 'ml', '2026-02-06 11:10:14', '2026-02-06 11:13:54'),
(97, 6, NULL, NULL, NULL, 'Shower Gel Vast spirit', 'shower-gel-vast-spirit', 160500, 'Y', NULL, 26, 25, '250', 'ml', '2026-02-06 11:15:30', '2026-02-06 11:16:27'),
(98, 6, NULL, NULL, NULL, 'Body Lotion Calm up', 'body-lotion-calm-up', 117400, 'Y', 117400, 45, 25, '250', NULL, '2026-02-06 11:18:47', '2026-03-04 14:22:37'),
(99, 6, NULL, NULL, NULL, 'Body Lotion Fresh Air', 'body-lotion-fresh-air', 117400, 'Y', 117400, 28, 25, '250', NULL, '2026-02-06 11:22:12', '2026-02-18 11:35:58'),
(100, 6, NULL, NULL, NULL, 'Body Lotion Good Mood', 'body-lotion-good-mood', 117400, 'Y', 117400, 4, 25, '250', NULL, '2026-02-07 07:44:45', '2026-02-18 11:35:58'),
(101, 6, NULL, NULL, NULL, 'Body Lotion Vast Spirit', 'body-lotion-vast-spirit', 117400, 'Y', 117400, 41, 25, '250', NULL, '2026-02-07 07:58:13', '2026-02-16 09:24:21'),
(102, 6, NULL, NULL, NULL, 'Shampoo Calm Up', 'shampoo-calm-up', 114000, 'Y', NULL, 50, 25, '250', 'ml', '2026-02-07 08:06:49', '2026-02-07 08:08:53'),
(103, 6, NULL, NULL, NULL, 'Shampoo Fresh Air', 'shampoo-fresh-air', 114000, 'Y', NULL, 10, 25, '250', 'ml', '2026-02-07 08:09:48', '2026-02-07 08:11:40'),
(104, 6, NULL, NULL, NULL, 'Shampoo Good Mood', 'shampoo-good-mood', 114000, 'Y', NULL, 6, 25, '250', 'ml', '2026-02-07 08:12:31', '2026-02-07 08:14:12'),
(105, 6, NULL, NULL, NULL, 'Shampoo Vast Spirit', 'shampoo-vast-spirit', 114000, 'Y', NULL, 18, 25, '250', 'ml', '2026-02-07 08:16:15', '2026-02-07 08:17:30'),
(106, 6, NULL, NULL, NULL, 'Massage Cream Calm Up', 'massage-cream-calm-up', 99900, 'Y', NULL, 34, 25, '250', 'ml', '2026-02-07 08:19:22', '2026-02-07 08:20:26'),
(107, 6, NULL, NULL, NULL, 'Massage Cream Fresh Air', 'massage-cream-fresh-air', 99900, 'Y', NULL, 37, 25, '250', 'ml', '2026-02-07 08:25:08', '2026-02-07 08:26:12'),
(108, 6, NULL, NULL, NULL, 'Massage Cream Good Mood', 'massage-cream-good-mood', 99900, 'Y', NULL, 35, 25, '250', 'ml', '2026-02-07 08:27:07', '2026-02-07 08:28:09'),
(109, 6, NULL, NULL, NULL, 'Massage Cream Vast Spirit', 'massage-cream-vast-spirit', 99900, 'Y', NULL, 29, 25, '250', 'ml', '2026-02-07 08:29:00', '2026-02-07 08:29:54'),
(110, 8, NULL, NULL, NULL, 'Triple Action Skin Defense Sunscreen', 'triple-action-skin-defense-sunscreen', 109400, 'Y', NULL, 185, 25, '100', 'ml', '2026-02-07 12:16:45', '2026-02-09 10:57:39'),
(111, 8, 1, 1, 1, 'Mugwort Deep Cleansing Facial Wash Acne Treatment', 'mugwort-deep-cleansing-facial-wash-acne-treatment', 94100, 'Y', NULL, 78, 25, '100', 'ml', '2026-02-07 12:20:22', '2026-03-02 10:01:05'),
(112, 8, NULL, NULL, NULL, 'Snow Bright Purifying Facil Wash', 'snow-bright-purifying-facil-wash', 84300, 'Y', NULL, 70, 25, '100', 'ml', '2026-02-07 12:23:28', '2026-02-07 12:25:48'),
(113, 15, NULL, NULL, NULL, 'Lip Serum', 'lip-serum', 10000, 'Y', NULL, -60, 0, NULL, NULL, '2026-02-07 12:45:22', '2026-02-18 10:50:59'),
(114, 4, NULL, NULL, NULL, 'Hydro-moist baby cream', 'hydro-moist-baby-cream', 69300, 'Y', NULL, 50, 25, '100', NULL, '2026-02-10 11:30:24', '2026-02-10 11:51:41'),
(115, 4, NULL, NULL, NULL, 'Top To Toe Baby Smile Wash', 'top-to-toe-baby-smile-wash', 125500, 'Y', NULL, 83, 20, '200', NULL, '2026-02-10 12:02:10', '2026-02-10 12:11:53'),
(116, 4, NULL, NULL, NULL, 'Baby Touch Gentle Baby Cream', 'baby-touch-gentle-baby-cream', 155000, 'Y', NULL, 0, 25, '30', NULL, '2026-02-10 12:04:39', '2026-02-10 12:04:39'),
(117, 4, NULL, NULL, NULL, 'Baby Touch Gentle Baby Cream', 'baby-touch-gentle-baby-cream-2', 155000, 'Y', NULL, 49, 25, '30', NULL, '2026-02-10 12:04:40', '2026-02-16 15:27:49'),
(118, 6, NULL, NULL, NULL, 'Silk Skin Renewal Cream', 'silk-skin-renewal-cream', 80500, 'Y', NULL, 5, 20, '10', NULL, '2026-02-10 13:36:01', '2026-02-10 13:37:06'),
(119, 6, NULL, NULL, NULL, 'Daily Intimate Wash Triple Protection', 'daily-intimate-wash-triple-protection', 69200, 'Y', NULL, 66, 20, '100', NULL, '2026-02-10 13:42:25', '2026-02-16 15:19:55'),
(120, 6, NULL, NULL, NULL, 'Daily Intimate Wash Triple Protection', 'daily-intimate-wash-triple-protection-2', 69200, 'Y', NULL, 193, 20, '100', 'ML', '2026-02-10 14:30:20', '2026-02-10 16:22:59'),
(121, 6, NULL, NULL, NULL, 'Daily Intimate Wash Triple Protection Foam', 'daily-intimate-wash-triple-protection-foam', 79100, 'Y', NULL, 51, 20, '100', 'ML', '2026-02-10 14:34:29', '2026-02-10 16:25:10'),
(123, 6, NULL, NULL, NULL, 'Cica Peptide Intensive Stretch Mark Cream', 'cica-peptide-intensive-stretch-mark-cream-2', 135400, 'Y', NULL, 58, 20, '20', 'ML', '2026-02-10 16:03:15', '2026-02-18 15:32:04'),
(124, 16, NULL, NULL, NULL, 'Luna Lips Color Blaze Auburn', 'luna-lips-color-blaze-auburn', 66400, 'Y', 66400, 301, 20, '5', 'GR', '2026-02-10 16:19:38', '2026-02-16 15:31:43'),
(125, 16, NULL, NULL, NULL, 'Luna Lips Color Blaze Rose', 'luna-lips-color-blaze-rose', 66400, 'Y', 66400, 307, 20, '5', 'GR', '2026-02-10 16:27:04', '2026-02-16 15:31:43'),
(126, 16, NULL, NULL, NULL, 'Luna Lips Color Blaze Cookies', 'luna-lips-color-blaze-cookies', 66400, 'Y', NULL, 297, 20, '5', 'GR', '2026-02-10 16:29:49', '2026-02-10 16:30:52'),
(127, 16, NULL, NULL, NULL, 'Luna Lips Color Blaze Sundown', 'luna-lips-color-blaze-sundown', 66400, 'Y', NULL, 16, 25, '5', 'GR', '2026-02-10 16:32:25', '2026-02-10 16:33:14'),
(128, 8, NULL, NULL, NULL, 'Ever Fresh Deo spray', 'ever-fresh-deo-spray', 46450, 'Y', NULL, 49, 20, '60', 'ML', '2026-02-10 16:35:30', '2026-02-10 16:36:54'),
(129, 16, NULL, NULL, NULL, 'Sparkling Flower Face Mist', 'sparkling-flower-face-mist', 41000, 'Y', NULL, 208, 20, '60', 'ML', '2026-02-10 16:38:11', '2026-02-10 16:39:48'),
(130, 1, NULL, NULL, NULL, 'Intimen Men Guard Intimate Foam', 'intimen-men-guard-intimate-foam', 50200, 'Y', NULL, 51, 20, '60', 'ML', '2026-02-10 16:41:36', '2026-02-10 16:43:01'),
(131, 1, NULL, NULL, NULL, 'Intimen Freshcore Mist', 'intimen-freshcore-mist', 36500, 'Y', NULL, 37, 25, '60', 'ML', '2026-02-10 16:44:18', '2026-02-18 11:19:47'),
(132, 1, NULL, NULL, NULL, 'Intimen Reboot Cream', 'intimen-reboot-cream', 47600, 'Y', NULL, 50, 20, '30', 'GR', '2026-02-10 16:46:27', '2026-02-10 16:47:23'),
(133, 9, NULL, NULL, NULL, 'Laveu Gentle Shower Gel', 'laveu-gentle-shower-gel', 75000, 'Y', NULL, 240, 25, '100', 'ML', '2026-02-10 16:49:16', '2026-02-10 16:52:24'),
(134, 9, NULL, NULL, NULL, 'Sun Protection Mozziecare', 'sun-protection-mozziecare', 95800, 'Y', NULL, 237, 25, '30', 'GR', '2026-02-10 16:54:17', '2026-02-10 16:56:26'),
(135, 9, NULL, NULL, NULL, 'Prebio Hydra Cream', 'prebio-hydra-cream', 87100, 'Y', NULL, 239, 25, '30', 'GR', '2026-02-10 16:58:51', '2026-02-10 17:01:01'),
(136, 22, NULL, NULL, NULL, 'Kelas Formulasi', 'kelas-formulasi', 375000, 'Y', NULL, 0, 0, NULL, NULL, '2026-02-18 10:37:41', '2026-02-18 10:37:41'),
(137, 23, NULL, NULL, NULL, 'Fun Class', 'fun-class', 175000, 'Y', NULL, -1, 0, NULL, NULL, '2026-02-18 10:39:30', '2026-02-18 10:50:59'),
(138, 15, NULL, NULL, NULL, 'lips serum', 'lips-serum', 10000, 'Y', NULL, 59, 10, '10', 'GR', '2026-02-18 10:46:47', '2026-02-18 10:50:59'),
(139, 21, NULL, NULL, NULL, 'Mangosteen Sun Protector', 'mangosteen-sun-protector', 60000, 'Y', NULL, 47, 20, '10', 'GR', '2026-02-18 11:55:20', '2026-02-18 15:29:51'),
(140, 21, NULL, NULL, NULL, 'Radiance Gold Serum', 'radiance-gold-serum', 63700, 'Y', NULL, 2, 20, '20', 'ML', '2026-02-18 12:04:45', '2026-02-18 12:28:53'),
(141, 4, 4, 8, 2, 'Fun Class', 'fun-class-2', NULL, 'Y', NULL, 100000, 0, NULL, NULL, '2026-03-02 10:52:09', '2026-03-02 11:16:15'),
(142, 6, 1, 1, 1, 'Body Lotion Calm Up Regular', 'body-lotion-calm-up-regular', NULL, 'Y', NULL, 0, 0, NULL, NULL, '2026-03-09 11:36:21', '2026-03-09 11:36:21'),
(143, 6, 1, 1, 1, 'Body LOtion Fresh Air Regular', 'body-lotion-fresh-air-regular', NULL, 'Y', NULL, 0, 0, NULL, NULL, '2026-03-09 11:43:42', '2026-03-09 11:43:42'),
(144, 6, 1, 1, 1, 'Body Lotion Vast Spirit Regular', 'body-lotion-vast-spirit-regular', NULL, 'Y', NULL, 0, 0, NULL, NULL, '2026-03-09 11:46:29', '2026-03-09 11:46:29'),
(145, 6, 1, 1, 1, 'Body Lotion Good Mood Regular', 'body-lotion-good-mood-regular', NULL, 'Y', NULL, 0, 0, NULL, NULL, '2026-03-09 11:47:27', '2026-03-09 11:47:27'),
(146, 6, 1, 1, 1, 'Shower Gel Calm Up Regular', 'shower-gel-calm-up-regular', NULL, 'Y', NULL, 0, 0, NULL, NULL, '2026-03-09 11:48:47', '2026-03-09 11:48:47');

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_batches`
--

CREATE TABLE `product_batches` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `batch_no` varchar(255) NOT NULL,
  `expiry_date` date NOT NULL,
  `qty` int(11) NOT NULL COMMENT 'Initial incoming quantity',
  `buy_price` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_batches`
--

INSERT INTO `product_batches` (`id`, `product_id`, `product_variant_id`, `batch_no`, `expiry_date`, `qty`, `buy_price`, `created_at`, `updated_at`) VALUES
(5, 94, NULL, '1023075', '2026-10-06', 18, 55600.00, '2026-02-06 10:58:47', '2026-03-04 14:22:37'),
(6, 95, NULL, '1023076', '2026-10-06', 35, 55600.00, '2026-02-06 11:08:40', '2026-02-06 11:08:40'),
(7, 96, NULL, '1023078', '2026-10-06', 24, 55600.00, '2026-02-06 11:13:54', '2026-02-06 11:13:54'),
(8, 97, NULL, '1023077', '2026-10-06', 26, 55600.00, '2026-02-06 11:16:27', '2026-02-06 11:16:27'),
(9, 98, NULL, '0126015', '2028-01-06', 47, 40700.00, '2026-02-06 11:21:05', '2026-03-04 14:22:37'),
(10, 99, NULL, '1023070', '2026-10-07', 30, 40700.00, '2026-02-07 07:55:20', '2026-02-18 11:35:58'),
(13, 100, NULL, '1023072', '2026-10-07', 8, 40700.00, '2026-02-07 08:03:47', '2026-02-18 11:35:58'),
(14, 102, NULL, '0126016', '2028-01-07', 50, 39500.00, '2026-02-07 08:08:53', '2026-02-07 08:08:53'),
(15, 103, NULL, '1023080', '2026-10-07', 10, 39500.00, '2026-02-07 08:11:40', '2026-02-07 08:11:40'),
(16, 104, NULL, '1023082', '2026-10-07', 6, 39500.00, '2026-02-07 08:14:12', '2026-02-07 08:14:12'),
(17, 105, NULL, '1023081', '2026-10-07', 18, 39500.00, '2026-02-07 08:17:30', '2026-02-07 08:17:30'),
(18, 106, NULL, '1023083', '2026-10-07', 34, 34600.00, '2026-02-07 08:20:26', '2026-02-07 08:20:26'),
(19, 107, NULL, '1023084', '2026-10-07', 37, 34600.00, '2026-02-07 08:26:12', '2026-02-07 08:26:12'),
(20, 108, NULL, '1023086', '2026-10-07', 35, 34600.00, '2026-02-07 08:28:09', '2026-02-07 08:28:09'),
(21, 109, NULL, '1023085', '2026-10-07', 29, 34600.00, '2026-02-07 08:29:54', '2026-02-07 08:29:54'),
(22, 110, NULL, '0325009', '2027-03-07', 186, 37900.00, '2026-02-07 12:18:37', '2026-02-09 10:57:39'),
(24, 111, NULL, '0725032', '2027-07-07', 79, 32600.00, '2026-02-07 12:21:42', '2026-02-09 10:57:39'),
(25, 112, NULL, '0724039', '2026-07-07', 70, 29200.00, '2026-02-07 12:25:07', '2026-02-07 12:25:07'),
(27, 113, NULL, 'BL001', '2027-03-07', 5, 5000.00, '2026-02-07 12:56:41', '2026-02-18 10:50:59'),
(28, 101, NULL, '1225016', '2027-12-09', 42, 40700.00, '2026-02-09 11:14:30', '2026-02-16 09:24:21'),
(29, 114, NULL, '0624033', '2026-06-05', 50, 24000.00, '2026-02-10 11:51:41', '2026-02-10 11:51:41'),
(31, 117, NULL, '1025002', '2027-10-07', 51, 31500.00, '2026-02-10 12:07:41', '2026-02-16 15:27:49'),
(32, 115, NULL, '0925021', '2027-09-10', 83, 43500.00, '2026-02-10 12:11:53', '2026-02-10 12:11:53'),
(33, 118, NULL, '0724101', '2026-07-10', 5, 24753.00, '2026-02-10 13:37:06', '2026-02-10 13:37:06'),
(34, 119, NULL, '0724108', '2026-07-09', 67, 23976.00, '2026-02-10 14:17:55', '2026-02-16 15:19:55'),
(35, 120, NULL, '0325021', '2027-03-10', 193, 23976.00, '2026-02-10 14:32:20', '2026-02-10 14:32:20'),
(38, 123, NULL, '0725029', '2027-07-08', 59, 43845.00, '2026-02-10 16:04:52', '2026-02-18 15:32:04'),
(41, 124, NULL, '0525009', '2028-05-10', 302, 23000.00, '2026-02-10 16:20:50', '2026-02-16 15:31:43'),
(42, 121, NULL, '0724095', '2026-07-10', 51, 27417.00, '2026-02-10 16:25:10', '2026-02-10 16:25:10'),
(44, 125, NULL, '0525006', '2028-05-10', 308, 23000.00, '2026-02-10 16:28:15', '2026-02-16 15:31:43'),
(45, 126, NULL, '0525007', '2028-05-10', 297, 23000.00, '2026-02-10 16:30:52', '2026-02-10 16:30:52'),
(46, 127, NULL, '1122045', '2026-07-10', 16, 23000.00, '2026-02-10 16:33:14', '2026-02-10 16:33:14'),
(47, 128, NULL, '0825019', '2027-08-10', 49, 12876.00, '2026-02-10 16:36:54', '2026-02-10 16:36:54'),
(48, 129, NULL, '0223006', '2026-02-10', 208, 14200.00, '2026-02-10 16:39:48', '2026-02-10 16:39:48'),
(49, 130, NULL, '0725019', '2027-07-09', 51, 17400.00, '2026-02-10 16:43:01', '2026-02-10 16:43:01'),
(50, 131, NULL, '1125034', '2027-12-10', 38, 12650.00, '2026-02-10 16:45:19', '2026-02-18 11:19:47'),
(51, 132, NULL, '1225033', '2027-12-10', 50, 16500.00, '2026-02-10 16:47:23', '2026-02-10 16:47:23'),
(52, 133, NULL, '0425010', '2027-04-08', 240, 28971.00, '2026-02-10 16:52:24', '2026-02-10 16:52:24'),
(53, 134, NULL, '0825016', '2027-08-10', 237, 48729.00, '2026-02-10 16:56:26', '2026-02-10 16:56:26'),
(54, 135, NULL, '0825006', '2027-08-10', 239, 44289.00, '2026-02-10 17:01:01', '2026-02-10 17:01:01'),
(55, 137, NULL, 'BL002', '2028-12-18', 0, 65000.00, '2026-02-18 10:43:01', '2026-02-18 10:50:59'),
(56, 138, NULL, 'Bl004', '2027-02-27', 67, 5000.00, '2026-02-18 10:48:12', '2026-02-18 10:50:59'),
(57, 139, NULL, '1225042', '2027-12-18', 48, 16650.00, '2026-02-18 12:01:04', '2026-02-18 15:29:51'),
(58, 140, NULL, '0724019', '2026-07-18', 2, 22089.00, '2026-02-18 12:28:53', '2026-02-18 12:28:53'),
(59, 141, 2, 'FC00001', '2030-10-15', 100000, NULL, '2026-03-02 10:55:53', '2026-03-02 11:16:15');

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_nettos`
--

CREATE TABLE `product_nettos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `netto_value` varchar(255) NOT NULL,
  `satuan` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_nettos`
--

INSERT INTO `product_nettos` (`id`, `product_id`, `netto_value`, `satuan`, `created_at`, `updated_at`) VALUES
(1, 111, '100', 'ML', '2026-03-02 10:01:05', '2026-03-02 10:01:05'),
(2, 141, 'Bath Bomb', 'ML', '2026-03-02 10:52:09', '2026-03-02 10:52:09'),
(3, 141, 'Parfume', 'ML', '2026-03-02 10:52:09', '2026-03-02 10:52:09'),
(4, 142, '50', 'ML', '2026-03-09 11:36:21', '2026-03-09 11:36:21'),
(5, 143, '50', 'ML', '2026-03-09 11:43:42', '2026-03-09 11:43:42'),
(6, 144, '50', 'ML', '2026-03-09 11:46:29', '2026-03-09 11:46:29'),
(7, 145, '50', 'ML', '2026-03-09 11:47:27', '2026-03-09 11:47:27'),
(8, 146, '50', 'ML', '2026-03-09 11:48:47', '2026-03-09 11:48:47');

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_types`
--

CREATE TABLE `product_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sub_category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_types`
--

INSERT INTO `product_types` (`id`, `sub_category_id`, `name`, `description`, `slug`, `created_at`, `updated_at`) VALUES
(1, NULL, 'Gentle Cleanser', NULL, 'gentle-cleanser', '2026-03-02 09:55:04', '2026-03-02 09:55:04'),
(2, NULL, 'Formulasi', NULL, 'formulasi', '2026-03-02 10:48:33', '2026-03-02 10:48:33');

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_variants`
--

CREATE TABLE `product_variants` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_netto_id` bigint(20) UNSIGNED NOT NULL,
  `variant_name` varchar(255) DEFAULT NULL,
  `sku_code` varchar(255) NOT NULL,
  `price` bigint(20) NOT NULL DEFAULT 0,
  `price_real` bigint(20) NOT NULL DEFAULT 0,
  `stock` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_netto_id`, `variant_name`, `sku_code`, `price`, `price_real`, `stock`, `created_at`, `updated_at`) VALUES
(1, 1, 'Mugwort Deep Cleansing Facial Wash Acne Treatment 100ML', '001', 100000, 100000, 0, '2026-03-02 10:01:05', '2026-03-02 10:01:05'),
(2, 2, 'Fun Class Bath BombML', 'FC001', 175000, 175000, 0, '2026-03-02 10:52:09', '2026-03-02 10:52:09'),
(3, 3, 'Fun Class ParfumeML', 'FC002', 100000, 100000, 0, '2026-03-02 10:52:09', '2026-03-02 10:52:09'),
(4, 4, 'Body Lotion Calm Up Regular 50ML', 'SKU 001', 11000, 11000, 0, '2026-03-09 11:36:21', '2026-03-09 11:36:21'),
(5, 5, 'Body LOtion Fresh Air Regular 50ML', 'SKU 002', 11000, 11000, 0, '2026-03-09 11:43:42', '2026-03-09 11:43:42'),
(6, 6, 'Body Lotion Vast Spirit Regular 50ML', 'SKU 003', 11000, 11000, 0, '2026-03-09 11:46:29', '2026-03-09 11:46:29'),
(7, 7, 'Body Lotion Good Mood Regular 50ML', 'SKU 004', 11000, 11000, 0, '2026-03-09 11:47:27', '2026-03-09 11:47:27'),
(8, 8, 'Shower Gel Calm Up Regular 50ML', 'SKU 005', 11000, 11000, 0, '2026-03-09 11:48:47', '2026-03-09 11:48:47');

-- --------------------------------------------------------

--
-- Struktur dari tabel `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `po_number` varchar(255) NOT NULL,
  `supplier_id` bigint(20) UNSIGNED NOT NULL,
  `po_date` date NOT NULL,
  `expected_delivery_date` date DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'fixed',
  `discount_value` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT 11.00,
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `status` enum('draft','submitted','approved','received','cancelled') NOT NULL DEFAULT 'draft',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_number`, `supplier_id`, `po_date`, `expected_delivery_date`, `subtotal`, `discount_type`, `discount_value`, `discount_amount`, `tax_percentage`, `tax_amount`, `total`, `notes`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(6, 'PO/BL/2026/03/0001', 3, '2026-03-06', '2026-03-06', 0.00, 'percentage', 0.00, 0.00, 11.00, 0.00, 0.00, 'Produk untuk pihak Novus da akan di bawa ke Jkt hari ini', 'submitted', 8, '2026-03-06 10:57:47', '2026-03-06 10:57:47'),
(7, 'PO/BL/2026/03/0002', 3, '2026-03-06', '2026-03-06', 0.00, 'percentage', 0.00, 0.00, 11.00, 0.00, 0.00, 'produk untuk novus', 'submitted', 8, '2026-03-06 10:59:45', '2026-03-06 10:59:45');

-- --------------------------------------------------------

--
-- Struktur dari tabel `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `purchase_order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `satuan` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,2) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `total` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`id`, `purchase_order_id`, `product_id`, `product_name`, `description`, `satuan`, `quantity`, `unit_price`, `total`, `created_at`, `updated_at`) VALUES
(6, 6, 129, 'Sparkling Flower Face Mist', '60', NULL, 100.00, 0.00, 0.00, '2026-03-06 10:57:47', '2026-03-06 10:57:47'),
(7, 7, 128, 'Ever Fresh Deo spray', NULL, NULL, 100.00, 0.00, 0.00, '2026-03-06 10:59:45', '2026-03-06 10:59:45');

-- --------------------------------------------------------

--
-- Struktur dari tabel `store_settings`
--

CREATE TABLE `store_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `store_name` varchar(100) NOT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `address` text NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `whatsapp` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `instagram` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `tiktok` varchar(255) DEFAULT NULL,
  `shopee_url` varchar(255) DEFAULT NULL,
  `tokopedia_url` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `footer_text` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `store_settings`
--

INSERT INTO `store_settings` (`id`, `store_name`, `logo_path`, `address`, `phone`, `whatsapp`, `email`, `instagram`, `facebook`, `tiktok`, `shopee_url`, `tokopedia_url`, `website`, `footer_text`, `created_at`, `updated_at`) VALUES
(1, 'Beautylatory Store', 'assets/img/store/logo-1770284977.jpg', 'Jl. Parahyangan Raya No.Kav. 11, Kota Baru, Kec. Padalarang, Kabupaten Bandung Barat, Jawa Barat 40553', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-05 16:40:05', '2026-02-05 16:49:37');

-- --------------------------------------------------------

--
-- Struktur dari tabel `sub_categories`
--

CREATE TABLE `sub_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `sub_categories`
--

INSERT INTO `sub_categories` (`id`, `category_id`, `name`, `slug`, `description`, `created_at`, `updated_at`) VALUES
(1, 1, 'Cleanser', 'cleanser', NULL, '2026-03-02 09:54:38', '2026-03-02 09:54:38'),
(2, 2, 'Extrait de Parfum', 'extrait-de-parfum', NULL, '2026-03-02 10:11:37', '2026-03-02 10:11:37'),
(3, 2, 'Eau de Toilette', 'eau-de-toilette', NULL, '2026-03-02 10:12:42', '2026-03-02 10:12:42'),
(5, 1, 'Serum', 'serum', NULL, '2026-03-02 10:40:15', '2026-03-02 10:40:15'),
(8, 4, 'Fun Class', 'fun-class', NULL, '2026-03-02 10:47:31', '2026-03-02 10:47:31'),
(9, 4, 'Kelas Formulasi', 'kelas-formulasi', NULL, '2026-03-02 10:47:57', '2026-03-02 10:47:57');

-- --------------------------------------------------------

--
-- Struktur dari tabel `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `postal_code` varchar(255) DEFAULT NULL,
  `bank_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(255) DEFAULT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `npwp` varchar(255) DEFAULT NULL,
  `tax_status` enum('PKP','Non-PKP') NOT NULL DEFAULT 'Non-PKP',
  `payment_terms` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `suppliers`
--

INSERT INTO `suppliers` (`id`, `code`, `name`, `contact_person`, `phone`, `email`, `address`, `city`, `province`, `postal_code`, `bank_name`, `account_number`, `account_holder_name`, `npwp`, `tax_status`, `payment_terms`, `notes`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'SUP-00001', 'PT Lunaray Cahya Abadi', NULL, NULL, NULL, 'Nanjung Industrial Park Kav 9, Nanjung, Margaasih, Kab Bandung, Jawa Barat', 'Bandung', 'Jawa Barat', NULL, NULL, NULL, NULL, NULL, 'Non-PKP', NULL, NULL, 'active', 6, '2026-03-02 10:15:18', '2026-03-02 10:15:18'),
(2, 'SUP-00002', 'Shopee', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Non-PKP', NULL, NULL, 'active', 6, '2026-03-02 10:37:07', '2026-03-02 10:37:07'),
(3, 'SUP-00003', 'CV. Dian Indah Abadi', 'Moh. Taufiq', '082118199261', 'po.dianindahabadi@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PKP', NULL, NULL, 'active', 8, '2026-03-05 10:29:28', '2026-03-05 10:29:28');

-- --------------------------------------------------------

--
-- Struktur dari tabel `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_number` varchar(30) DEFAULT NULL,
  `transaction_type` enum('produk','kelas') NOT NULL DEFAULT 'produk',
  `due_date` date DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(255) DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `source` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  `total_amount` varchar(255) NOT NULL,
  `tax_type` enum('none','ppn') NOT NULL DEFAULT 'none',
  `tax_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `down_payment` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_dp` tinyint(1) NOT NULL DEFAULT 0,
  `payment_method` varchar(255) DEFAULT NULL,
  `payment_status` varchar(50) NOT NULL DEFAULT 'unpaid',
  `delivery_type` enum('pickup','delivery') NOT NULL DEFAULT 'pickup',
  `delivery_desc` text DEFAULT NULL,
  `voucher_code` varchar(255) DEFAULT NULL,
  `discount` varchar(255) NOT NULL DEFAULT '0',
  `discount_type` enum('fixed','percent') NOT NULL DEFAULT 'fixed',
  `midtrans_order_id` varchar(100) DEFAULT NULL,
  `midtrans_transaction_id` varchar(100) DEFAULT NULL,
  `payment_receipt` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `affiliate_id` bigint(20) UNSIGNED DEFAULT NULL,
  `affiliate_fee_total` double NOT NULL DEFAULT 0,
  `affiliate_fee_mode` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `transactions`
--

INSERT INTO `transactions` (`id`, `invoice_number`, `transaction_type`, `due_date`, `user_id`, `customer_name`, `customer_phone`, `customer_id`, `source`, `notes`, `total_amount`, `tax_type`, `tax_amount`, `down_payment`, `is_dp`, `payment_method`, `payment_status`, `delivery_type`, `delivery_desc`, `voucher_code`, `discount`, `discount_type`, `midtrans_order_id`, `midtrans_transaction_id`, `payment_receipt`, `created_at`, `updated_at`, `affiliate_id`, `affiliate_fee_total`, `affiliate_fee_mode`) VALUES
(63, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'offline-store', '-', '176900', 'none', 0.00, 0.00, 0, 'transfer', 'paid', 'pickup', 'POS Offline Sale', NULL, '76600', 'fixed', 'POS-LUL2FRH0HH', NULL, NULL, '2026-02-09 10:57:39', '2026-02-09 10:57:39', NULL, 0, 'ADD_TO_PRICE'),
(64, NULL, 'produk', NULL, 8, 'bp. Ibnu', '0811231236', NULL, 'offline-store', '-', '316980', 'none', 0.00, 0.00, 0, 'debit', 'paid', 'pickup', 'POS Offline Sale', NULL, '35220', 'fixed', 'POS-8URPAJJEDA', NULL, NULL, '2026-02-16 09:24:21', '2026-02-16 09:24:21', NULL, 0, 'ADD_TO_PRICE'),
(65, NULL, 'produk', NULL, 6, NULL, NULL, NULL, 'offline-store', '-', '47000', 'none', 0.00, 0.00, 0, 'qris', 'paid', 'pickup', 'POS Offline Sale', NULL, '22200', 'fixed', 'POS-B8MGTA9664', NULL, NULL, '2026-02-16 15:19:55', '2026-02-16 15:19:55', NULL, 0, 'ADD_TO_PRICE'),
(66, NULL, 'produk', NULL, 8, 'Ibu Riska', '08170822508', NULL, 'offline-store', '-', '310000', 'none', 0.00, 0.00, 0, 'transfer', 'paid', 'pickup', 'POS Offline Sale', NULL, '0', 'fixed', 'POS-PP5WIOLGUY', NULL, NULL, '2026-02-16 15:27:49', '2026-02-16 15:27:49', NULL, 0, 'ADD_TO_PRICE'),
(67, NULL, 'produk', NULL, 8, 'Pak Arif', '085318183330', NULL, 'offline-store', '-', '82000', 'none', 0.00, 0.00, 0, 'qris', 'paid', 'pickup', 'POS Offline Sale', NULL, '50800', 'fixed', 'POS-BNVXNKXUCU', NULL, NULL, '2026-02-16 15:31:43', '2026-02-16 15:31:43', NULL, 0, 'ADD_TO_PRICE'),
(68, NULL, 'produk', NULL, 8, 'Tia', '081321214988', NULL, 'offline-store', '-', '855000', 'none', 0.00, 0.00, 0, 'transfer', 'paid', 'pickup', 'POS Offline Sale', NULL, '0', 'fixed', 'POS-6OHY6JFXYT', NULL, NULL, '2026-02-18 10:50:59', '2026-02-18 10:50:59', NULL, 0, 'ADD_TO_PRICE'),
(69, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'shopee', '260201HN98QJ8H', '117400', 'none', 0.00, 0.00, 0, NULL, 'paid', 'delivery', 'Online Marketplace Sale', NULL, '0', 'fixed', 'MARKET-SHOPEE-69953afd1e412', NULL, NULL, '2026-02-01 08:02:00', '2026-02-18 11:07:25', NULL, 0, NULL),
(70, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'shopee', '260202MMKP1N5Q', '36500', 'none', 0.00, 0.00, 0, NULL, 'paid', 'delivery', 'Online Marketplace Sale', NULL, '0', 'fixed', 'MARKET-SHOPEE-69953de383ca2', NULL, NULL, '2026-02-02 00:28:00', '2026-02-18 11:19:47', NULL, 0, NULL),
(71, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'shopee', '260203PYMJYHAX', '469600', 'none', 0.00, 0.00, 0, NULL, 'paid', 'delivery', 'Online Marketplace Sale', NULL, '0', 'fixed', 'MARKET-SHOPEE-699541ae91081', NULL, NULL, '2026-02-03 10:52:00', '2026-02-18 11:35:58', NULL, 0, NULL),
(72, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'offline-store', '-', '60000', 'none', 0.00, 0.00, 0, 'qris', 'paid', 'pickup', 'POS Offline Sale', NULL, '0', 'fixed', 'POS-9FFY503WSU', NULL, NULL, '2026-02-18 15:29:51', '2026-02-18 15:29:51', NULL, 0, 'ADD_TO_PRICE'),
(73, NULL, 'produk', NULL, 8, NULL, NULL, NULL, 'offline-store', '-', '134000', 'none', 0.00, 0.00, 0, 'qris', 'paid', 'pickup', 'POS Offline Sale', NULL, '1400', 'fixed', 'POS-KSEULGTMGU', NULL, NULL, '2026-02-18 15:32:04', '2026-02-18 15:32:04', NULL, 0, 'ADD_TO_PRICE'),
(76, NULL, 'produk', NULL, 6, NULL, NULL, NULL, 'offline-store', '-', '277900', 'none', 0.00, 0.00, 0, 'qris', 'paid', 'pickup', 'POS Offline Sale', NULL, '0', 'fixed', 'POS-IE2KFQGI8P', NULL, NULL, '2026-03-04 14:22:37', '2026-03-04 14:22:37', NULL, 0, 'ADD_TO_PRICE');

-- --------------------------------------------------------

--
-- Struktur dari tabel `transaction_items`
--

CREATE TABLE `transaction_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_variant_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_batch_id` bigint(20) UNSIGNED DEFAULT NULL,
  `qty` int(11) NOT NULL,
  `buy_price` bigint(20) NOT NULL DEFAULT 0,
  `price` varchar(255) NOT NULL,
  `subtotal` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `transaction_items`
--

INSERT INTO `transaction_items` (`id`, `transaction_id`, `product_id`, `product_variant_id`, `product_batch_id`, `qty`, `buy_price`, `price`, `subtotal`) VALUES
(80, 63, 113, NULL, 27, 5, 5000, '10000', '50000'),
(81, 63, 111, NULL, 24, 1, 32600, '94100', '94100'),
(82, 63, 110, NULL, 22, 1, 37900, '109400', '109400'),
(83, 64, 98, NULL, 9, 1, 40700, '117400', '117400'),
(84, 64, 100, NULL, 13, 1, 40700, '117400', '117400'),
(85, 64, 101, NULL, 28, 1, 40700, '117400', '117400'),
(86, 65, 119, NULL, 34, 1, 23976, '69200', '69200'),
(87, 66, 117, NULL, 31, 2, 31500, '155000', '310000'),
(88, 67, 124, NULL, 41, 1, 23000, '66400', '66400'),
(89, 67, 125, NULL, 44, 1, 23000, '66400', '66400'),
(90, 68, 137, NULL, 55, 1, 65000, '175000', '175000'),
(91, 68, 113, NULL, 27, 60, 5000, '10000', '600000'),
(92, 68, 138, NULL, 56, 8, 5000, '10000', '80000'),
(93, 69, 100, NULL, 13, 1, 40700, '117400', '117400'),
(94, 70, 131, NULL, 50, 1, 12650, '36500', '36500'),
(95, 71, 99, NULL, 10, 2, 40700, '117400', '234800'),
(96, 71, 100, NULL, 13, 2, 40700, '117400', '234800'),
(97, 72, 139, NULL, 57, 1, 16650, '60000', '60000'),
(98, 73, 123, NULL, 38, 1, 43845, '135400', '135400'),
(101, 76, 94, NULL, 5, 1, 55600, '160500', '160500'),
(102, 76, 98, NULL, 9, 1, 40700, '117400', '117400');

-- --------------------------------------------------------

--
-- Struktur dari tabel `transaction_payments`
--

CREATE TABLE `transaction_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `transaction_id` bigint(20) UNSIGNED NOT NULL,
  `amount` bigint(20) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(255) NOT NULL,
  `payment_receipt` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','sales') NOT NULL DEFAULT 'sales',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`) VALUES
(2, 'Sales User', 'sales@pos.com', '$2y$10$PwbHM61giGb2Z.hVnYRRZ.kYbAh/OLWnRArSwZJgzYm6F3c..HxoS', 'sales', '2025-09-27 10:42:23', '2025-12-02 13:51:34'),
(5, 'RIZKI PUTRA RAMADHAN', 'sukher1001@gmail.com', '$2y$10$WGkiK2XWzBRG4gJPyBcWg..K252Jf6RjwB09XEWap2RiIXPvr/RNa', 'admin', '2025-10-08 08:49:13', '2025-10-08 08:49:13'),
(6, 'Iffah', 'iffah@beautylatory.com', '$2y$10$B0PqrF.2gm/1OD9ypxno2u4SnlpCRVLklllNy6WzK/cF2JK9pNi9a', 'admin', '2025-10-08 10:25:17', '2026-02-05 16:51:36'),
(7, 'Iman Cangga', 'it.rayandra@gmail.com', '$2y$10$kJfyx/L.Ahwcu8FtiRDJPuBYzgqZy9gHEdjmNfu28JetRh1bVwNPq', 'admin', '2025-10-08 10:28:26', '2026-02-05 16:45:21'),
(8, 'Dewi', 'dewi@beautylatory.com', '$2y$10$OdTD9.aNPw1FP0h0WAMzKOVYKqTXKPiUmmc1qEPtZCrpDNoUWINuC', 'admin', '2025-10-09 12:22:58', '2026-02-05 16:53:11'),
(10, 'Bu Azizah', 'azizah@pos.com', '$2y$10$TomPZ6CpBT02usnZxAbMBenmFJ3TPFj3pPe6YeduusQ.T1bvRfaGO', 'admin', '2025-10-23 12:12:11', '2025-10-23 12:12:11'),
(11, 'Bu Uli', 'uli@beautylatory.com', '$2y$10$io76DmU.hIlsJx8krChmP.8GTFBl7i7Ue.XcYSGrlQJOEYjuw1Fu6', 'admin', '2026-02-05 16:52:43', '2026-02-05 16:52:43'),
(12, 'Ayu', 'ayu@beautylatory.com', '$2y$10$0VVZ7CKQOwNF5k3BE9ry4OZZ3b09bCP0vKIrEmM943NwnvD1v2ykK', 'admin', '2026-02-11 15:16:47', '2026-02-11 15:16:47');

-- --------------------------------------------------------

--
-- Struktur dari tabel `vouchers`
--

CREATE TABLE `vouchers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `discount_type` enum('PERCENT','NOMINAL') NOT NULL DEFAULT 'PERCENT',
  `percent` varchar(255) NOT NULL,
  `nominal` double DEFAULT NULL,
  `applies_to_all` tinyint(1) NOT NULL DEFAULT 0,
  `product_id` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','NON ACTIVE') NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `usage_count` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `voucher_product`
--

CREATE TABLE `voucher_product` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `voucher_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `affiliates`
--
ALTER TABLE `affiliates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `affiliates_type_id_foreign` (`type_id`);

--
-- Indeks untuk tabel `affiliate_product_commissions`
--
ALTER TABLE `affiliate_product_commissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `affiliate_product_commissions_affiliate_id_product_id_unique` (`affiliate_id`,`product_id`),
  ADD KEY `affiliate_product_commissions_product_id_foreign` (`product_id`);

--
-- Indeks untuk tabel `attributes`
--
ALTER TABLE `attributes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `attributes_attribute_group_id_foreign` (`attribute_group_id`);

--
-- Indeks untuk tabel `attribute_groups`
--
ALTER TABLE `attribute_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `attribute_groups_code_unique` (`code`);

--
-- Indeks untuk tabel `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_slug_unique` (`slug`);

--
-- Indeks untuk tabel `channel_settings`
--
ALTER TABLE `channel_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `channel_settings_slug_unique` (`slug`);

--
-- Indeks untuk tabel `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `customers_phone_unique` (`phone`);

--
-- Indeks untuk tabel `delivery_notes`
--
ALTER TABLE `delivery_notes`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `delivery_note_items`
--
ALTER TABLE `delivery_note_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `delivery_note_items_delivery_note_id_foreign` (`delivery_note_id`);

--
-- Indeks untuk tabel `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `goods_receipts_sj_number_unique` (`sj_number`),
  ADD KEY `goods_receipts_purchase_order_id_foreign` (`purchase_order_id`),
  ADD KEY `goods_receipts_supplier_id_foreign` (`supplier_id`),
  ADD KEY `goods_receipts_received_by_foreign` (`received_by`);

--
-- Indeks untuk tabel `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `goods_receipt_items_goods_receipt_id_foreign` (`goods_receipt_id`),
  ADD KEY `goods_receipt_items_purchase_order_item_id_foreign` (`purchase_order_item_id`);

--
-- Indeks untuk tabel `merek`
--
ALTER TABLE `merek`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_slug_unique` (`slug`);

--
-- Indeks untuk tabel `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Indeks untuk tabel `photo_product`
--
ALTER TABLE `photo_product`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `products_slug_unique` (`slug`),
  ADD KEY `products_category_id_foreign` (`merek_id`),
  ADD KEY `products_product_type_id_foreign` (`product_type_id`),
  ADD KEY `products_sub_category_id_foreign` (`sub_category_id`);

--
-- Indeks untuk tabel `product_batches`
--
ALTER TABLE `product_batches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_batches_product_id_foreign` (`product_id`),
  ADD KEY `product_batches_product_variant_id_foreign` (`product_variant_id`);

--
-- Indeks untuk tabel `product_nettos`
--
ALTER TABLE `product_nettos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_nettos_product_id_foreign` (`product_id`);

--
-- Indeks untuk tabel `product_types`
--
ALTER TABLE `product_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_types_slug_unique` (`slug`),
  ADD KEY `product_types_sub_category_id_foreign` (`sub_category_id`);

--
-- Indeks untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_variants_sku_code_unique` (`sku_code`),
  ADD KEY `product_variants_product_netto_id_foreign` (`product_netto_id`);

--
-- Indeks untuk tabel `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `purchase_orders_po_number_unique` (`po_number`),
  ADD KEY `purchase_orders_supplier_id_foreign` (`supplier_id`),
  ADD KEY `purchase_orders_created_by_foreign` (`created_by`);

--
-- Indeks untuk tabel `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_order_items_purchase_order_id_foreign` (`purchase_order_id`),
  ADD KEY `purchase_order_items_product_id_foreign` (`product_id`);

--
-- Indeks untuk tabel `store_settings`
--
ALTER TABLE `store_settings`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `sub_categories`
--
ALTER TABLE `sub_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sub_categories_slug_unique` (`slug`),
  ADD KEY `sub_categories_category_id_foreign` (`category_id`);

--
-- Indeks untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `suppliers_code_unique` (`code`),
  ADD KEY `suppliers_created_by_foreign` (`created_by`);

--
-- Indeks untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transactions_midtrans_order_id_unique` (`midtrans_order_id`),
  ADD UNIQUE KEY `transactions_invoice_number_unique` (`invoice_number`),
  ADD KEY `transactions_user_id_foreign` (`user_id`),
  ADD KEY `transactions_affiliate_id_foreign` (`affiliate_id`),
  ADD KEY `transactions_customer_id_foreign` (`customer_id`);

--
-- Indeks untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transaction_items_transaction_id_foreign` (`transaction_id`),
  ADD KEY `transaction_items_product_id_foreign` (`product_id`),
  ADD KEY `transaction_items_product_batch_id_foreign` (`product_batch_id`),
  ADD KEY `transaction_items_product_variant_id_foreign` (`product_variant_id`);

--
-- Indeks untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transaction_payments_transaction_id_foreign` (`transaction_id`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indeks untuk tabel `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vouchers_code_index` (`code`);

--
-- Indeks untuk tabel `voucher_product`
--
ALTER TABLE `voucher_product`
  ADD PRIMARY KEY (`id`),
  ADD KEY `voucher_product_voucher_id_foreign` (`voucher_id`),
  ADD KEY `voucher_product_product_id_foreign` (`product_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `affiliates`
--
ALTER TABLE `affiliates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `affiliate_product_commissions`
--
ALTER TABLE `affiliate_product_commissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `attributes`
--
ALTER TABLE `attributes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `attribute_groups`
--
ALTER TABLE `attribute_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `channel_settings`
--
ALTER TABLE `channel_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT untuk tabel `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `delivery_notes`
--
ALTER TABLE `delivery_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `delivery_note_items`
--
ALTER TABLE `delivery_note_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `goods_receipts`
--
ALTER TABLE `goods_receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `merek`
--
ALTER TABLE `merek`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT untuk tabel `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT untuk tabel `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT untuk tabel `photo_product`
--
ALTER TABLE `photo_product`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=147;

--
-- AUTO_INCREMENT untuk tabel `product_batches`
--
ALTER TABLE `product_batches`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT untuk tabel `product_nettos`
--
ALTER TABLE `product_nettos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `product_types`
--
ALTER TABLE `product_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT untuk tabel `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `store_settings`
--
ALTER TABLE `store_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT untuk tabel `sub_categories`
--
ALTER TABLE `sub_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

--
-- AUTO_INCREMENT untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT untuk tabel `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT untuk tabel `voucher_product`
--
ALTER TABLE `voucher_product`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `affiliates`
--
ALTER TABLE `affiliates`
  ADD CONSTRAINT `affiliates_type_id_foreign` FOREIGN KEY (`type_id`) REFERENCES `attributes` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `affiliate_product_commissions`
--
ALTER TABLE `affiliate_product_commissions`
  ADD CONSTRAINT `affiliate_product_commissions_affiliate_id_foreign` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `affiliate_product_commissions_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `attributes`
--
ALTER TABLE `attributes`
  ADD CONSTRAINT `attributes_attribute_group_id_foreign` FOREIGN KEY (`attribute_group_id`) REFERENCES `attribute_groups` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `delivery_note_items`
--
ALTER TABLE `delivery_note_items`
  ADD CONSTRAINT `delivery_note_items_delivery_note_id_foreign` FOREIGN KEY (`delivery_note_id`) REFERENCES `delivery_notes` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `goods_receipts`
--
ALTER TABLE `goods_receipts`
  ADD CONSTRAINT `goods_receipts_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `goods_receipts_received_by_foreign` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `goods_receipts_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Ketidakleluasaan untuk tabel `goods_receipt_items`
--
ALTER TABLE `goods_receipt_items`
  ADD CONSTRAINT `goods_receipt_items_goods_receipt_id_foreign` FOREIGN KEY (`goods_receipt_id`) REFERENCES `goods_receipts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `goods_receipt_items_purchase_order_item_id_foreign` FOREIGN KEY (`purchase_order_item_id`) REFERENCES `purchase_order_items` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_id_foreign` FOREIGN KEY (`merek_id`) REFERENCES `merek` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `products_product_type_id_foreign` FOREIGN KEY (`product_type_id`) REFERENCES `product_types` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `products_sub_category_id_foreign` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `product_batches`
--
ALTER TABLE `product_batches`
  ADD CONSTRAINT `product_batches_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_batches_product_variant_id_foreign` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_nettos`
--
ALTER TABLE `product_nettos`
  ADD CONSTRAINT `product_nettos_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_types`
--
ALTER TABLE `product_types`
  ADD CONSTRAINT `product_types_sub_category_id_foreign` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_product_netto_id_foreign` FOREIGN KEY (`product_netto_id`) REFERENCES `product_nettos` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `purchase_orders_supplier_id_foreign` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Ketidakleluasaan untuk tabel `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `purchase_order_items_purchase_order_id_foreign` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `sub_categories`
--
ALTER TABLE `sub_categories`
  ADD CONSTRAINT `sub_categories_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `suppliers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_affiliate_id_foreign` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `transaction_items_product_batch_id_foreign` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transaction_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `transaction_items_product_variant_id_foreign` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transaction_items_transaction_id_foreign` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `transaction_payments`
--
ALTER TABLE `transaction_payments`
  ADD CONSTRAINT `transaction_payments_transaction_id_foreign` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `voucher_product`
--
ALTER TABLE `voucher_product`
  ADD CONSTRAINT `voucher_product_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `voucher_product_voucher_id_foreign` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
