import { getPool } from './database/connection.js';
import { initializeDatabase } from './database/databaseInitializer.js';

async function check() {
  await initializeDatabase();
  const pool = getPool();
  try {
    const [rows] = await pool.query("SELECT id, user_id, business_name, gallery_images FROM vendor_profiles");
    console.log("Profiles in DB:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

check();
