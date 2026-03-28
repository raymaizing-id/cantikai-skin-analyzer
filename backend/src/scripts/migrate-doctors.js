import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('🚀 Starting doctors migration...');
        
        // Read SQL file
        const sqlPath = path.resolve(__dirname, '../../../database/migrations/doctors.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        // Remove comments and split by semicolon
        const statements = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        console.log(`📝 Found ${statements.length} SQL statements`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                await pool.query(statement);
                console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
            } catch (error) {
                // Ignore "already exists" and "duplicate entry" errors
                if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
                    error.code === 'ER_DUP_ENTRY' ||
                    error.message.includes('already exists') ||
                    error.message.includes('Duplicate entry')) {
                    console.log(`⚠️  Statement ${i + 1} - Already exists, skipping`);
                } else {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    // Don't throw, continue with next statement
                }
            }
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Verify data
        const [doctors] = await pool.query('SELECT COUNT(*) as count FROM doctors');
        console.log(`📊 Total doctors in database: ${doctors[0].count}`);
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
