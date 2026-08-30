import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import pool from '../src/config/db.js';

async function scanAllUploads() {
  console.log('Scanning all database tables for any remaining /uploads/ or uploads/ references...');

  const [tables] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
  );

  let totalMatches = 0;
  let matchesByTable = {};

  for (const { TABLE_NAME } of tables) {
    const [columns] = await pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [TABLE_NAME]
    );

    for (const { COLUMN_NAME, DATA_TYPE } of columns) {
      if (['varchar', 'text', 'mediumtext', 'longtext', 'json'].includes(DATA_TYPE.toLowerCase())) {
        try {
          const [rows] = await pool.query(
            `SELECT id, \`${COLUMN_NAME}\` FROM \`${TABLE_NAME}\` WHERE \`${COLUMN_NAME}\` LIKE '%uploads/%'`,
          );
          if (rows.length > 0) {
            console.log(`\nMatch in table "${TABLE_NAME}", column "${COLUMN_NAME}" (${rows.length} rows):`);
            for (const r of rows.slice(0, 5)) {
              console.log(`  Row ID ${r.id}:`, r[COLUMN_NAME]);
            }
            if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more rows.`);

            totalMatches += rows.length;
            matchesByTable[`${TABLE_NAME}.${COLUMN_NAME}`] = rows.length;
          }
        } catch {}
      }
    }
  }

  console.log('\n====================================================');
  console.log(`Scan Complete. Total remaining /uploads/ references: ${totalMatches}`);
  console.log('Breakdown by Table.Column:', matchesByTable);
  console.log('====================================================\n');

  process.exit(0);
}

scanAllUploads().catch((err) => {
  console.error('Scan Error:', err);
  process.exit(1);
});
