import { getPool } from './src/database/connection.js';
import { initializeDatabase } from './src/database/databaseInitializer.js';

async function check() {
  await initializeDatabase();
  const pool = getPool();
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM service_categories');
  const [activeRows] = await pool.query('SELECT COUNT(*) as active_count FROM service_categories WHERE status = "ACTIVE"');
  console.log('Total categories:', rows[0].count);
  console.log('Active categories:', activeRows[0].active_count);
  
  const [allRows] = await pool.query('SELECT * FROM service_categories LIMIT 5');
  console.log('Sample:', allRows);
  process.exit(0);
}
check();
