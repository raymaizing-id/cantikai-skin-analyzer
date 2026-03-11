/**
 * MySQL Database Configuration
 * Replaces SQLite3 with MySQL connection
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection configuration
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skin_analyzer',
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully');
        console.log(`📍 Database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ MySQL Database connection error:', error.message);
        return false;
    }
};

// Helper functions to maintain compatibility with SQLite code
const dbGet = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows[0] || null;
    } catch (error) {
        throw error;
    }
};

const dbAll = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
};

const dbRun = async (sql, params = []) => {
    try {
        const [result] = await pool.execute(sql, params);
        return {
            lastID: result.insertId,
            changes: result.affectedRows
        };
    } catch (error) {
        throw error;
    }
};

// Export pool and helper functions
export {
    pool,
    dbGet,
    dbAll,
    dbRun,
    testConnection
};

export default pool;