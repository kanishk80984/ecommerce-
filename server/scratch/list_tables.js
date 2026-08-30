import { getPool } from '../src/database/connection.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = getPool();
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log('Tables in DB:', tables.map(r => Object.values(r)[0]));
    
    // Also let's inspect columns of users and vendor_profiles
    const [usersCols] = await pool.query('SHOW COLUMNS FROM users');
    console.log('users Columns:', usersCols.map(c => `${c.Field} (${c.Type})`));

    const [vendorCols] = await pool.query('SHOW COLUMNS FROM vendor_profiles');
    console.log('vendor_profiles Columns:', vendorCols.map(c => `${c.Field} (${c.Type})`));

  } catch (err) {
    console.error('Error listing tables:', err);
  }
  process.exit(0);
}
run();
