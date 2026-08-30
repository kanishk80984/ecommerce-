import { connectDB } from '../src/config/db.js';
import { getPool } from '../src/database/connection.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    console.log('Running connectDB()...');
    await connectDB();
    console.log('connectDB() complete. Checking tables...');
    
    const pool = getPool();
    const [rows] = await pool.query("SHOW TABLES LIKE 'business_network_%'");
    console.log('Created tables count:', rows.length);
    console.log('Tables list:', rows.map(r => Object.values(r)[0]));
  } catch (err) {
    console.error('Error during execution:', err);
  }
  process.exit(0);
}
run();
