/**
 * MySQL Database Initialization Script
 * Creates all required tables and inserts default data
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skin_analyzer',
    charset: 'utf8mb4'
};

console.log('🔧 Initializing MySQL database...');
console.log(`📍 Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

// SQL Schema for MySQL
const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    age INT,
    gender VARCHAR(50),
    skin_type VARCHAR(100),
    auth_provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255),
    avatar_url TEXT,
    email_verified TINYINT(1) DEFAULT 0,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    image_url TEXT,
    visualization_url TEXT,
    overall_score DECIMAL(5,2) DEFAULT 0,
    skin_type VARCHAR(100),
    fitzpatrick_type VARCHAR(10),
    predicted_age INT,
    analysis_version VARCHAR(50),
    engine VARCHAR(100),
    processing_time_ms INT,
    cv_metrics JSON,
    vision_analysis JSON,
    ai_insights JSON,
    product_recommendations JSON,
    skincare_routine JSON,
    client_session_id VARCHAR(255),
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_analyses_user_id (user_id),
    INDEX idx_analyses_created_at (created_at),
    UNIQUE INDEX idx_analyses_user_session_unique (user_id, client_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100),
    description TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    ingredients TEXT,
    skin_type VARCHAR(100),
    concerns TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    is_featured TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_category (category),
    INDEX idx_products_brand (brand),
    INDEX idx_products_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) UNIQUE,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT,
    excerpt TEXT,
    image_url TEXT,
    featured_image TEXT,
    author VARCHAR(255),
    category VARCHAR(100),
    tags TEXT,
    status VARCHAR(50) DEFAULT 'published',
    published_at TIMESTAMP NULL,
    is_featured TINYINT(1) DEFAULT 0,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_articles_slug (slug),
    INDEX idx_articles_category (category),
    INDEX idx_articles_status (status),
    INDEX idx_articles_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_text VARCHAR(255),
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_banners_is_active (is_active),
    INDEX idx_banners_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT 'New Chat',
    session_uuid VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_chat_sessions_user_id (user_id),
    INDEX idx_chat_sessions_uuid (session_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    INDEX idx_chat_messages_session_id (session_id),
    INDEX idx_chat_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kiosk sessions table
CREATE TABLE IF NOT EXISTS kiosk_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_uuid VARCHAR(255) UNIQUE NOT NULL,
    device_id VARCHAR(255),
    visitor_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    status VARCHAR(50) DEFAULT 'started',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    UNIQUE INDEX idx_kiosk_sessions_uuid (session_uuid),
    INDEX idx_kiosk_sessions_status (status),
    INDEX idx_kiosk_sessions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kiosk analyses table
CREATE TABLE IF NOT EXISTS kiosk_analyses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    result_token VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    visualization_url TEXT,
    overall_score DECIMAL(5,2) DEFAULT 0,
    skin_type VARCHAR(100),
    fitzpatrick_type VARCHAR(10),
    predicted_age INT,
    analysis_version VARCHAR(50),
    engine VARCHAR(100),
    processing_time_ms INT,
    cv_metrics JSON,
    vision_analysis JSON,
    ai_insights JSON,
    product_recommendations JSON,
    skincare_routine JSON,
    result_summary TEXT,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    delivery_channel VARCHAR(50),
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (session_id) REFERENCES kiosk_sessions(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_kiosk_analyses_token (result_token),
    UNIQUE INDEX idx_kiosk_analyses_session_unique (session_id),
    INDEX idx_kiosk_analyses_created_at (created_at),
    INDEX idx_kiosk_analyses_delivery_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admins_username (username),
    INDEX idx_admins_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
    \`key\` VARCHAR(255) PRIMARY KEY,
    \`value\` TEXT NOT NULL,
    value_type VARCHAR(50) DEFAULT 'string',
    category VARCHAR(100) DEFAULT 'general',
    description TEXT,
    is_public TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_app_settings_category (category),
    INDEX idx_app_settings_is_public (is_public)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

async function initializeDatabase() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ MySQL Database connected successfully');

        // Split SQL statements and execute them
        const statements = createTablesSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Table/Index ${i + 1}/${statements.length} created`);
                } catch (error) {
                    if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_KEYNAME') {
                        console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
                    }
                }
            }
        }

        // Insert default admin if not exists
        const [adminRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM admins WHERE username = ?',
            ['admin']
        );

        if (adminRows[0].count === 0) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await connection.execute(
                'INSERT INTO admins (username, password, hashed_password, email) VALUES (?, ?, ?, ?)',
                ['admin', 'admin123', hashedPassword, 'admin@cantikai.com']
            );
            console.log('✅ Default admin created (username: admin, password: admin123)');
        }

        // Insert default app settings
        const defaultSettings = [
            ['app.name', 'Cantik AI Skin Analyzer', 'string', 'general', 'Nama aplikasi', 1],
            ['app.tagline', 'cantik.ai asisten kulit sehatmu', 'string', 'general', 'Tagline aplikasi', 1],
            ['feature.allow_guest', 'true', 'boolean', 'feature', 'Izinkan mode guest', 1],
            ['feature.enable_google_login', 'true', 'boolean', 'feature', 'Aktifkan login Google', 1],
            ['theme.primary_color', '#9d5a76', 'string', 'design', 'Warna utama', 1],
            ['theme.primary_hover', '#8c4f69', 'string', 'design', 'Warna hover utama', 1],
            ['theme.primary_light', '#c084a0', 'string', 'design', 'Warna gradient sekunder', 1],
            ['kiosk.auto_reset_seconds', '90', 'number', 'kiosk', 'Auto reset halaman hasil kiosk (detik)', 0],
            ['kiosk.idle_timeout_seconds', '180', 'number', 'kiosk', 'Timeout idle kiosk untuk reset sesi (detik)', 0]
        ];

        for (const setting of defaultSettings) {
            try {
                await connection.execute(`
                    INSERT INTO app_settings (\`key\`, \`value\`, value_type, category, description, is_public)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, setting);
            } catch (error) {
                if (error.code !== 'ER_DUP_ENTRY') {
                    console.warn(`⚠️  Setting insert warning:`, error.message);
                }
            }
        }

        console.log('✅ Database initialization complete!');
        console.log('📊 MySQL database ready for use');
        
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the initialization
initializeDatabase();