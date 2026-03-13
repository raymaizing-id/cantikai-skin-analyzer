/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_admins_username` (`username`),
  KEY `idx_admins_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `analyses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `visualization_url` text COLLATE utf8mb4_unicode_ci,
  `overall_score` decimal(5,2) DEFAULT '0.00',
  `skin_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fitzpatrick_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `predicted_age` int DEFAULT NULL,
  `analysis_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_time_ms` int DEFAULT NULL,
  `cv_metrics` json DEFAULT NULL,
  `vision_analysis` json DEFAULT NULL,
  `ai_insights` json DEFAULT NULL,
  `product_recommendations` json DEFAULT NULL,
  `skincare_routine` json DEFAULT NULL,
  `client_session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_analyses_user_session_unique` (`user_id`,`client_session_id`),
  KEY `idx_analyses_user_id` (`user_id`),
  KEY `idx_analyses_created_at` (`created_at`),
  CONSTRAINT `analyses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_settings` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `value_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_public` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  KEY `idx_app_settings_category` (`category`),
  KEY `idx_app_settings_is_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci,
  `excerpt` text COLLATE utf8mb4_unicode_ci,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `featured_image` text COLLATE utf8mb4_unicode_ci,
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'published',
  `published_at` timestamp NULL DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT '0',
  `views` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_articles_slug` (`slug`),
  KEY `idx_articles_category` (`category`),
  KEY `idx_articles_status` (`status`),
  KEY `idx_articles_published_at` (`published_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `banners` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link_url` text COLLATE utf8mb4_unicode_ci,
  `link_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_is_active` (`is_active`),
  KEY `idx_banners_display_order` (`display_order`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chat_messages_session_id` (`session_id`),
  KEY `idx_chat_messages_created_at` (`created_at`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `chat_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'New Chat',
  `session_uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_uuid` (`session_uuid`),
  KEY `idx_chat_sessions_user_id` (`user_id`),
  KEY `idx_chat_sessions_uuid` (`session_uuid`),
  CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kiosk_analyses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `result_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `visualization_url` text COLLATE utf8mb4_unicode_ci,
  `overall_score` decimal(5,2) DEFAULT '0.00',
  `skin_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fitzpatrick_type` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `predicted_age` int DEFAULT NULL,
  `analysis_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `engine` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_time_ms` int DEFAULT NULL,
  `cv_metrics` json DEFAULT NULL,
  `vision_analysis` json DEFAULT NULL,
  `ai_insights` json DEFAULT NULL,
  `product_recommendations` json DEFAULT NULL,
  `skincare_routine` json DEFAULT NULL,
  `result_summary` text COLLATE utf8mb4_unicode_ci,
  `delivery_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `delivery_channel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `result_token` (`result_token`),
  UNIQUE KEY `idx_kiosk_analyses_token` (`result_token`),
  UNIQUE KEY `idx_kiosk_analyses_session_unique` (`session_id`),
  KEY `idx_kiosk_analyses_created_at` (`created_at`),
  KEY `idx_kiosk_analyses_delivery_status` (`delivery_status`),
  KEY `idx_kiosk_analyses_session_id` (`session_id`),
  CONSTRAINT `kiosk_analyses_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `kiosk_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kiosk_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `device_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `whatsapp` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'started',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_uuid` (`session_uuid`),
  UNIQUE KEY `idx_kiosk_sessions_uuid` (`session_uuid`),
  KEY `idx_kiosk_sessions_status` (`status`),
  KEY `idx_kiosk_sessions_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) DEFAULT NULL,
  `image_url` text COLLATE utf8mb4_unicode_ci,
  `ingredients` text COLLATE utf8mb4_unicode_ci,
  `skin_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `concerns` text COLLATE utf8mb4_unicode_ci,
  `rating` decimal(3,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `is_featured` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_brand` (`brand`),
  KEY `idx_products_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int DEFAULT NULL,
  `gender` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `skin_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'email',
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` text COLLATE utf8mb4_unicode_ci,
  `email_verified` tinyint(1) DEFAULT '0',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `admins` (`id`, `username`, `password`, `hashed_password`, `email`, `role`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'admin123', '$2a$10$V2GMN07h0xuF9y.dVT6GZu16hA0Ls0.ykNO/0nnna7ZammO3ix7MK', 'admin@cantikai.com', 'admin', '2026-03-11 16:02:56', '2026-03-11 15:53:22', '2026-03-11 16:02:56');




INSERT INTO `app_settings` (`key`, `value`, `value_type`, `category`, `description`, `is_public`, `updated_at`) VALUES
('app.name', 'Cantik AI Skin Analyzer', 'string', 'general', 'Nama aplikasi', 1, '2026-03-09 12:06:34');
INSERT INTO `app_settings` (`key`, `value`, `value_type`, `category`, `description`, `is_public`, `updated_at`) VALUES
('app.tagline', 'cantik.ai asisten kulit sehatmu', 'string', 'general', 'Tagline di beranda', 1, '2026-03-09 12:06:34');
INSERT INTO `app_settings` (`key`, `value`, `value_type`, `category`, `description`, `is_public`, `updated_at`) VALUES
('feature.allow_guest', 'true', 'boolean', 'feature', 'Izinkan mode guest', 1, '2026-03-09 12:06:34');
INSERT INTO `app_settings` (`key`, `value`, `value_type`, `category`, `description`, `is_public`, `updated_at`) VALUES
('feature.enable_google_login', 'true', 'boolean', 'feature', 'Aktifkan tombol Google login', 1, '2026-03-09 12:06:34'),
('kiosk.auto_reset_seconds', '90', 'number', 'kiosk', 'Auto reset halaman hasil kiosk (detik)', 0, '2026-03-09 16:57:17'),
('kiosk.idle_timeout_seconds', '180', 'number', 'kiosk', 'Timeout idle kiosk untuk reset sesi (detik)', 0, '2026-03-09 16:57:17'),
('security.smoke_test', 'ok', 'string', 'security', '', 0, '2026-03-09 14:06:28'),
('theme.primary_color', '#9d5a76', 'string', 'design', 'Warna utama UI', 1, '2026-03-09 12:06:34'),
('theme.primary_hover', '#8c4f69', 'string', 'design', 'Warna hover tombol utama', 1, '2026-03-09 12:06:34'),
('theme.primary_light', '#c084a0', 'string', 'design', 'Warna gradient kedua', 1, '2026-03-09 12:06:34');

INSERT INTO `articles` (`id`, `slug`, `title`, `content`, `excerpt`, `image_url`, `featured_image`, `author`, `category`, `tags`, `status`, `published_at`, `is_featured`, `views`, `created_at`, `updated_at`) VALUES
(2, 'panduan-lengkap-skincare-untuk-pemula', 'Panduan Lengkap Skincare untuk Pemula', 'Memulai rutinitas skincare tidak harus rumit. Fokuslah pada tiga langkah inti: membersihkan wajah dengan lembut, menjaga kelembapan, dan melindungi kulit dari sinar UV. Setelah kulit mulai stabil, Anda bisa menambahkan serum sesuai kebutuhan seperti hidrasi, jerawat, atau mencerahkan.', 'Panduan lengkap untuk memulai rutinitas skincare yang tepat.', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200', 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200', 'Tim Cantik AI', 'Skincare Basics', 'skincare,pemula,rutinitas', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 08:33:16', '2026-03-09 14:38:46');
INSERT INTO `articles` (`id`, `slug`, `title`, `content`, `excerpt`, `image_url`, `featured_image`, `author`, `category`, `tags`, `status`, `published_at`, `is_featured`, `views`, `created_at`, `updated_at`) VALUES
(3, 'mengenal-jenis-kulit-dan-cara-merawatnya', 'Mengenal Jenis Kulit dan Cara Merawatnya', 'Jenis kulit umumnya dibagi menjadi normal, kering, berminyak, kombinasi, dan sensitif. Menentukan jenis kulit membantu Anda memilih tekstur produk, kadar aktif, dan frekuensi pemakaian yang tepat. Kulit berminyak butuh kontrol sebum, sementara kulit kering perlu fokus pada hidrasi dan perbaikan barrier.', 'Panduan mengenali dan merawat berbagai jenis kulit.', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1200', 'Tim Cantik AI', 'Skin Types', 'jenis kulit,perawatan,skin type', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 08:33:16', '2026-03-09 14:38:46');
INSERT INTO `articles` (`id`, `slug`, `title`, `content`, `excerpt`, `image_url`, `featured_image`, `author`, `category`, `tags`, `status`, `published_at`, `is_featured`, `views`, `created_at`, `updated_at`) VALUES
(4, 'pentingnya-sunscreen-dalam-rutinitas-harian', 'Pentingnya Sunscreen dalam Rutinitas Harian', 'Sunscreen adalah langkah anti-aging paling efektif dan terjangkau. Paparan UV dapat mempercepat keriput, hiperpigmentasi, dan memperburuk bekas jerawat. Gunakan sunscreen minimal SPF 30 setiap pagi dan ulangi pemakaian tiap 2-3 jam saat beraktivitas di luar.', 'Mengapa sunscreen wajib digunakan setiap hari.', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200', 'Tim Cantik AI', 'Sun Protection', 'sunscreen,uv protection,anti aging', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 08:33:16', '2026-03-09 14:38:46');
INSERT INTO `articles` (`id`, `slug`, `title`, `content`, `excerpt`, `image_url`, `featured_image`, `author`, `category`, `tags`, `status`, `published_at`, `is_featured`, `views`, `created_at`, `updated_at`) VALUES
(5, 'rutinitas-pagi-skincare-5-menit', 'Rutinitas Pagi Skincare 5 Menit untuk Hari Sibuk', 'Rutinitas pagi singkat tetap bisa efektif: cleanser ringan, moisturizer, lalu sunscreen. Jika Anda punya waktu tambahan, tambahkan serum antioksidan seperti vitamin C untuk perlindungan dari radikal bebas. Kunci utamanya adalah konsisten setiap hari, bukan banyaknya langkah.', 'Skincare pagi cepat dan efektif untuk jadwal padat.', 'https://images.unsplash.com/photo-1498843053639-170ff2122f35?w=1200', 'https://images.unsplash.com/photo-1498843053639-170ff2122f35?w=1200', 'Dr. Aulia Rahma', 'Daily Routine', 'rutinitas pagi,skincare cepat,produktif', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(6, 'rutinitas-malam-untuk-memperbaiki-skin-barrier', 'Rutinitas Malam untuk Memperbaiki Skin Barrier', 'Malam hari adalah waktu terbaik untuk pemulihan kulit. Gunakan pembersih lembut, serum hidrasi, lalu moisturizer dengan ceramide. Hindari terlalu banyak bahan aktif sekaligus agar barrier tidak makin teriritasi.', 'Langkah malam sederhana untuk barrier kulit lebih sehat.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200', 'Dr. Nadia Putri', 'Barrier Repair', 'skin barrier,ceramide,rutinitas malam', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(7, 'cara-patch-test-produk-baru-dengan-benar', 'Cara Patch Test Produk Baru dengan Benar', 'Sebelum memakai produk baru ke seluruh wajah, lakukan patch test di area kecil seperti bawah rahang atau belakang telinga. Amati reaksi selama 24-48 jam. Jika muncul kemerahan, rasa terbakar, atau gatal berlebihan, hentikan penggunaan.', 'Panduan aman mencoba produk skincare baru.', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200', 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1200', 'Dr. Lina Pratama', 'Skincare Basics', 'patch test,iritasi,produk baru', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(8, 'eksfoliasi-kimia-vs-fisik-mana-yang-tepat', 'Eksfoliasi Kimia vs Fisik: Mana yang Tepat?', 'Eksfoliasi fisik bekerja dengan gesekan, sedangkan eksfoliasi kimia menggunakan AHA/BHA/PHA untuk meluruhkan sel kulit mati. Kulit sensitif biasanya lebih cocok dengan eksfoliasi kimia ringan berfrekuensi rendah. Gunakan maksimal 1-3 kali seminggu untuk menghindari over-exfoliation.', 'Perbedaan eksfoliasi kimia dan fisik serta cara memilihnya.', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200', 'Dr. Fajar Wibowo', 'Ingredients', 'eksfoliasi,AHA,BHA,PHA', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(9, 'niacinamide-untuk-kulit-berminyak-dan-pori', 'Niacinamide untuk Kulit Berminyak dan Pori Besar', 'Niacinamide membantu menyeimbangkan produksi minyak, memperbaiki tekstur, dan mendukung skin barrier. Mulailah dari konsentrasi 4-5 persen untuk meminimalkan iritasi. Kombinasikan dengan sunscreen agar hasil mencerahkan lebih optimal.', 'Manfaat niacinamide untuk sebum, pori, dan barrier.', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200', 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200', 'Dr. Aulia Rahma', 'Ingredients', 'niacinamide,pori,kulit berminyak', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(10, 'retinol-untuk-pemula-frekuensi-dan-kombinasi-aman', 'Retinol untuk Pemula: Frekuensi dan Kombinasi Aman', 'Retinol sebaiknya dimulai perlahan, misalnya 2 kali seminggu di malam hari. Gunakan metode sandwich moisturizer bila kulit mudah kering. Hindari pemakaian bersamaan dengan eksfolian kuat pada malam yang sama untuk menurunkan risiko iritasi.', 'Panduan retinol pemula agar efektif tanpa iritasi.', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200', 'Dr. Reza Santoso', 'Ingredients', 'retinol,anti aging,iritasi', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46'),
(11, 'hyaluronic-acid-cara-pakai-yang-benar', 'Hyaluronic Acid: Cara Pakai yang Benar', 'Hyaluronic acid bekerja optimal pada kulit yang sedikit lembap, lalu dikunci dengan moisturizer. Jika dipakai pada kulit terlalu kering tanpa lapisan oklusif, kulit bisa terasa makin kering. Kombinasi HA dan ceramide cocok untuk hidrasi harian.', 'Tips memakai hyaluronic acid agar hidrasi maksimal.', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1200', 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=1200', 'Dr. Nadia Putri', 'Hydration', 'hyaluronic acid,hidrasi,moisturizer', 'published', '2026-03-09 14:38:46', 0, 0, '2026-03-09 14:38:46', '2026-03-09 14:38:46');

INSERT INTO `banners` (`id`, `title`, `image_url`, `link_url`, `link_text`, `description`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'Welcome to Cantik AI', 'https://i.pinimg.com/736x/c0/3a/f9/c03af94dc6007cc43b59e3f440ced6d4.jpg', '/analysis', NULL, 'Analisis kulit Anda dengan AI terbaru', 1, 1, '2026-03-09 08:31:28', '2026-03-09 14:51:58');
INSERT INTO `banners` (`id`, `title`, `image_url`, `link_url`, `link_text`, `description`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(2, 'Skincare Consultation', 'https://i.pinimg.com/736x/bb/f3/c9/bbf3c9831c9e0b0af98d7501c6c11ebd.jpg', '/chat', NULL, 'Chat dengan AI skincare expert', 1, 2, '2026-03-09 08:31:28', '2026-03-09 14:52:07');
INSERT INTO `banners` (`id`, `title`, `image_url`, `link_url`, `link_text`, `description`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(3, 'Product Recommendations', 'https://i.pinimg.com/736x/4a/1f/1f/4a1f1f4e0dbb3e9d4860996e42b99432.jpg', '/products', NULL, 'Temukan produk yang cocok untuk kulit Anda', 1, 3, '2026-03-09 08:31:28', '2026-03-09 14:52:14');









INSERT INTO `products` (`id`, `name`, `brand`, `category`, `description`, `price`, `image_url`, `ingredients`, `skin_type`, `concerns`, `rating`, `is_active`, `is_featured`, `created_at`, `updated_at`) VALUES
(2, 'Gentle Cleanser', 'CeraVe', 'Cleanser', 'Gentle foaming cleanser for all skin types', '150000.00', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Ceramides, Hyaluronic Acid, Niacinamide', 'All Types', 'Cleansing, Hydration', '4.50', 1, 0, '2026-03-09 08:31:28', '2026-03-09 14:38:46');
INSERT INTO `products` (`id`, `name`, `brand`, `category`, `description`, `price`, `image_url`, `ingredients`, `skin_type`, `concerns`, `rating`, `is_active`, `is_featured`, `created_at`, `updated_at`) VALUES
(3, 'Vitamin C Serum', 'The Ordinary', 'Serum', 'Brightening serum with pure vitamin C', '200000.00', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800', 'Ascorbic Acid, Vitamin E, Ferulic Acid', 'All Types', 'Brightening, Anti-aging', '4.70', 1, 0, '2026-03-09 08:31:28', '2026-03-09 14:38:46');
INSERT INTO `products` (`id`, `name`, `brand`, `category`, `description`, `price`, `image_url`, `ingredients`, `skin_type`, `concerns`, `rating`, `is_active`, `is_featured`, `created_at`, `updated_at`) VALUES
(4, 'Hydrating Moisturizer', 'Neutrogena', 'Moisturizer', 'Oil-free hydrating gel moisturizer', '180000.00', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800', 'Hyaluronic Acid, Glycerin, Dimethicone', 'Oily, Combination', 'Hydration, Oil Control', '4.30', 1, 0, '2026-03-09 08:31:28', '2026-03-09 14:38:46');
INSERT INTO `products` (`id`, `name`, `brand`, `category`, `description`, `price`, `image_url`, `ingredients`, `skin_type`, `concerns`, `rating`, `is_active`, `is_featured`, `created_at`, `updated_at`) VALUES
(5, 'Sunscreen SPF 50+', 'La Roche-Posay', 'Sunscreen', 'Broad spectrum UV protection', '250000.00', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800', 'Zinc Oxide, Titanium Dioxide, Vitamin E', 'All Types', 'UV Protection, Anti-aging', '4.80', 1, 0, '2026-03-09 08:31:28', '2026-03-09 14:38:46'),
(6, 'Gentle Cleanser', 'CeraVe', 'Cleanser', 'Gentle foaming cleanser for all skin types', '150000.00', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', 'Ceramides, Hyaluronic Acid, Niacinamide', NULL, NULL, '4.50', 1, 0, '2026-03-09 08:33:16', '2026-03-09 08:33:16'),
(7, 'Vitamin C Serum', 'The Ordinary', 'Serum', 'Brightening serum with pure vitamin C', '200000.00', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', 'Ascorbic Acid, Vitamin E, Ferulic Acid', NULL, NULL, '4.70', 1, 0, '2026-03-09 08:33:16', '2026-03-09 08:33:16'),
(8, 'Hydrating Moisturizer', 'Neutrogena', 'Moisturizer', 'Oil-free hydrating gel moisturizer', '180000.00', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', 'Hyaluronic Acid, Glycerin, Dimethicone', NULL, NULL, '4.30', 1, 0, '2026-03-09 08:33:16', '2026-03-09 08:33:16'),
(9, 'Sunscreen SPF 50+', 'La Roche-Posay', 'Sunscreen', 'Broad spectrum UV protection', '250000.00', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', 'Zinc Oxide, Titanium Dioxide, Vitamin E', NULL, NULL, '4.80', 1, 0, '2026-03-09 08:33:16', '2026-03-09 08:33:16'),
(10, 'BEAUTYLATORY - Urban Shield Serum 20 ml', 'beautylatory', 'Serum', 'PHYTOSYNC Urban Shield Serum adalah solusi cerdas untuk melindungi kulit dari efek buruk polusi, radikal bebas, dan stres lingkungan perkotaan. Diperkaya dengan kombinasi niacinamide, ceramide, antioksidan kuat, serta botox-like peptide, serum ini bekerja untuk memperkuat skin barrier, mencegah penuaan dini, menjaga kelembapan, sekaligus membuat kulit tampak sehat, cerah, dan elastis.', '133910.00', 'https://beautylatory.com/storage/54/7.-URBAN-SHIELD.png', 'Niacinamide, Argireline Peptide Solution C, Phyrosaccharide APP, Aquaceria Basic (Ceramide), Vitamin E, Baba GN 2.0, Grape & Blackcurrant Extract, Pomegranate Extract, White Strawberry Extract, Rose & Honey Extract', 'all type', '', '5.00', 1, 0, '2026-03-09 14:08:10', '2026-03-09 14:16:04'),
(11, 'ADHWA - Serenity Body Lotion 30 gr', 'adhwa', 'Body Lotion', 'Lotion tubuh multifungsi yang diformulasikan memberikan kelembapan intensif, perlindungan dari sinar UV, efek mencerahkan, dan menenangkan kulit. Sangat cocok digunakan oleh jemaah haji dan umrah yang menghadapi kondisi ekstrem seperti sinar matahari langsung, dehidrasi kulit, dan iritasi karena gesekan pakaian atau udara panas.', '52000.00', 'https://beautylatory.com/storage/20/1759675224_68e283588783f.webp', 'uv filter, niacinamide, goat milk', 'all type', 'whitening', '3.00', 1, 0, '2026-03-09 14:13:55', '2026-03-09 14:13:55');

INSERT INTO `users` (`id`, `email`, `name`, `password`, `password_hash`, `age`, `gender`, `skin_type`, `auth_provider`, `google_id`, `avatar_url`, `email_verified`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'test1773219775512@example.com', 'Test User', '', '$2a$10$aHv6wwvYtpovJTlQZdEYC.CV3gBgDKoaMr1Nz2PjjE/Q22gnad8le', 25, 'female', 'combination', 'email', NULL, NULL, 1, '2026-03-11 16:02:56', '2026-03-11 16:02:55', '2026-03-11 16:02:56');
INSERT INTO `users` (`id`, `email`, `name`, `password`, `password_hash`, `age`, `gender`, `skin_type`, `auth_provider`, `google_id`, `avatar_url`, `email_verified`, `last_login`, `created_at`, `updated_at`) VALUES
(2, 'poetraarromadhon56@gmail.com', 'Rizki putra Ramadhan edit', '', '', 21, 'male', 'oily', 'google', '117259235972069989337', 'https://lh3.googleusercontent.com/a/ACg8ocKWXbttNpXR_H6SYaI2EcXl0vkjcrj_YSzjyT9vqoCBOue-5Wtj=s96-c', 1, '2026-03-11 16:37:28', '2026-03-11 16:37:28', '2026-03-11 16:42:17');



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;