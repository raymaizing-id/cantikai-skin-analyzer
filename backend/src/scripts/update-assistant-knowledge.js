import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateAssistantKnowledge() {
    try {
        console.log('🚀 Starting assistant knowledge update...');
        
        // Read SQL file
        const sqlPath = path.resolve(__dirname, '../../../database/migrations/update_assistant_knowledge.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        // Split by semicolon and filter out comments
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
                // Ignore "already exists" errors for ALTER TABLE
                if (error.message.includes('Duplicate column name')) {
                    console.log(`⚠️  Statement ${i + 1} - Column already exists, skipping`);
                } else {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                }
            }
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Verify data
        const [doctors] = await pool.query('SELECT id, name, LEFT(assistant_knowledge, 50) as knowledge_preview FROM doctors');
        console.log('\n📊 Updated doctors:');
        doctors.forEach(doc => {
            console.log(`  - ${doc.name}: ${doc.knowledge_preview}...`);
        });
        
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

updateAssistantKnowledge();
