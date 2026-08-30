import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import pool from '../src/config/db.js';

async function checkImage() {
  const searchTerm = 'images_1786694912183_c3a2ffc5';
  console.log(`Checking DB for search term: "${searchTerm}"`);

  // 1. Check file_migration_logs
  try {
    const [logRows] = await pool.query(
      `SELECT * FROM file_migration_logs WHERE local_path LIKE ?`,
      [`%${searchTerm}%`]
    );
    console.log('\n--- file_migration_logs matches ---');
    console.log(logRows);
  } catch (err) {
    console.log('file_migration_logs error:', err.message);
  }

  // 2. Check uploaded_images
  try {
    const [imgRows] = await pool.query(
      `SELECT id, module, storage_provider, storage_key, public_url, sizes FROM uploaded_images WHERE storage_key LIKE ? OR public_url LIKE ? OR sizes LIKE ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    console.log('\n--- uploaded_images matches ---');
    console.log(imgRows);
  } catch (err) {
    console.log('uploaded_images error:', err.message);
  }

  // 3. Check vendor_profiles (gallery_images / store_banner / logo)
  try {
    const [vendorRows] = await pool.query(
      `SELECT id, business_name, business_logo, store_banner, gallery_images FROM vendor_profiles WHERE business_logo LIKE ? OR store_banner LIKE ? OR gallery_images LIKE ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    console.log('\n--- vendor_profiles matches ---');
    console.log(vendorRows);
  } catch (err) {
    console.log('vendor_profiles error:', err.message);
  }

  // 4. Check all tables with LIKE search
  const tables = ['products', 'model_images', 'variant_images', 'categories', 'brands', 'banners', 'advertisements', 'users', 'vendor_services', 'documents'];
  for (const t of tables) {
    try {
      const [rows] = await pool.query(`SELECT * FROM \`${t}\` WHERE JSON_SEARCH(CONCAT_WS(' ', LOWER(CAST(CONVERT(CONCAT_WS(' ', *) USING utf8mb4) AS CHAR))), 'one', ?)` , [`%${searchTerm.toLowerCase()}%`]);
      if (rows.length > 0) {
        console.log(`\n--- ${t} matches ---`, rows);
      }
    } catch {
      // Fallback query
      try {
        const [rows] = await pool.query(`SELECT * FROM \`${t}\``);
        const matches = rows.filter(r => JSON.stringify(r).includes(searchTerm));
        if (matches.length > 0) {
          console.log(`\n--- ${t} matches ---`, matches);
        }
      } catch {}
    }
  }

  process.exit(0);
}

checkImage().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
