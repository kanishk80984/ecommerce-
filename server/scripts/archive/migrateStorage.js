/**
 * Storage Migration Script
 * ════════════════════════════════════════════════════════════════
 * Migrates existing uploaded files from one storage provider to another.
 * Updates the database records with new storage metadata.
 *
 * Usage:
 *   node scripts/migrateStorage.js
 *
 * Required environment variables (set in .env or inline):
 *   STORAGE_PROVIDER=<target_provider>   — where files will be moved TO
 *   SOURCE_PROVIDER=<source_provider>    — where files currently live (defaults to 'local')
 *   BASE_URL=http://localhost:5001       — for local source URL construction
 *   (+ any provider-specific vars like S3_BUCKET, CLOUDINARY_CLOUD_NAME, etc.)
 *
 * Example — migrate from local disk to S3:
 *   SOURCE_PROVIDER=local STORAGE_PROVIDER=s3 node scripts/migrateStorage.js
 *
 * The script is:
 *   - Non-destructive: source files are NOT deleted automatically (review first)
 *   - Resumable: rows that already have the target provider are skipped
 *   - Transaction-safe: DB record is only updated after successful upload
 *   - Idempotent: safe to run multiple times
 * ════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import { createReadStream } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server root (one level up from scripts/)
dotenv.config({ path: resolve(__dirname, '..', '.env') });

import pool from '../src/config/db.js';
import StorageService from '../src/storage/StorageService.js';

// ─── Configuration ────────────────────────────────────────────────────────────

const SOURCE_PROVIDER = (process.env.SOURCE_PROVIDER || 'local').toLowerCase();
const TARGET_PROVIDER = (process.env.STORAGE_PROVIDER || '').toLowerCase();
const BATCH_SIZE = parseInt(process.env.MIGRATE_BATCH_SIZE || '50', 10);
const DRY_RUN = process.env.DRY_RUN === 'true';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const log = (...args) => console.log(`[migrate]`, new Date().toISOString(), ...args);
const warn = (...args) => console.warn(`[migrate:warn]`, ...args);
const err = (...args) => console.error(`[migrate:error]`, ...args);

let stats = { processed: 0, migrated: 0, skipped: 0, failed: 0 };

/**
 * Fetch a file as a Buffer from a source storage key.
 * Handles local files and HTTP URLs.
 *
 * @param {string} storageKey  - e.g. "uploads/products/img_main.webp"
 * @param {string} provider    - "local" or a URL-based provider
 * @returns {Promise<Buffer|null>}
 */
const fetchBuffer = async (storageKey, provider) => {
  if (!storageKey) return null;

  try {
    if (provider === 'local') {
      // Read from local filesystem
      const serverRoot = resolve(__dirname, '..');
      const filePath = resolve(serverRoot, storageKey.startsWith('/') ? storageKey.slice(1) : storageKey);
      const { readFile } = await import('fs/promises');
      return await readFile(filePath);
    } else {
      // Fetch via HTTP (for cloudinary, s3, gcs — which serve via public URL)
      const url = StorageService.getUrl(storageKey, provider);
      if (!url) return null;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (e) {
    warn(`Could not fetch storageKey="${storageKey}" from provider="${provider}":`, e.message);
    return null;
  }
};

/**
 * Migrate a single image row — fetches all its size variants, re-uploads each one,
 * then updates the DB record.
 *
 * @param {object} row - Row from uploaded_images
 */
const migrateRow = async (row) => {
  stats.processed++;

  if (row.storage_provider === TARGET_PROVIDER) {
    stats.skipped++;
    return;
  }

  const sizesMap = (() => {
    try {
      return typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes || {};
    } catch { return {}; }
  })();

  const newSizesMap = {};
  let newMainStorageKey = row.storage_key;
  let newMainPublicUrl = row.public_url;

  // Migrate main image (storage_key on the row)
  if (row.storage_key) {
    const buffer = await fetchBuffer(row.storage_key, SOURCE_PROVIDER);
    if (buffer) {
      const fileName = row.storage_key.split('/').pop();
      const module = row.module || 'general';

      if (!DRY_RUN) {
        const uploaded = await StorageService.upload(buffer, { module, fileName, mimeType: row.mime_type || 'image/webp' });
        newMainStorageKey = uploaded.storageKey;
        newMainPublicUrl = uploaded.publicUrl;
      } else {
        log(`[DRY RUN] Would upload: ${row.storage_key} → ${TARGET_PROVIDER}:${row.module}/${fileName}`);
      }
    } else {
      warn(`Row ${row.id}: could not fetch main file "${row.storage_key}" — skipping`);
      stats.failed++;
      return;
    }
  }

  // Migrate each size variant
  for (const [sizeName, sizeEntry] of Object.entries(sizesMap)) {
    const oldKey = typeof sizeEntry === 'object' ? sizeEntry.storageKey : sizeEntry;
    if (!oldKey) continue;

    const buffer = await fetchBuffer(oldKey, SOURCE_PROVIDER);
    if (!buffer) {
      warn(`Row ${row.id} size "${sizeName}": could not fetch "${oldKey}"`);
      newSizesMap[sizeName] = sizeEntry; // keep old entry on failure
      continue;
    }

    const fileName = oldKey.split('/').pop();
    const module = row.module || 'general';

    if (!DRY_RUN) {
      const uploaded = await StorageService.upload(buffer, { module, fileName, mimeType: row.mime_type || 'image/webp' });
      newSizesMap[sizeName] = { storageKey: uploaded.storageKey, publicUrl: uploaded.publicUrl };
      if (typeof sizeEntry === 'object' && sizeEntry.width) {
        newSizesMap[sizeName].width = sizeEntry.width;
        newSizesMap[sizeName].height = sizeEntry.height;
        newSizesMap[sizeName].size = sizeEntry.size;
      }
    } else {
      log(`[DRY RUN] Would upload size "${sizeName}": ${oldKey} → ${TARGET_PROVIDER}:${module}/${fileName}`);
      newSizesMap[sizeName] = sizeEntry;
    }
  }

  // Update the DB record
  if (!DRY_RUN) {
    await pool.query(
      `UPDATE uploaded_images
       SET storage_provider = ?, storage_key = ?, public_url = ?, sizes = ?
       WHERE id = ?`,
      [TARGET_PROVIDER, newMainStorageKey, newMainPublicUrl, JSON.stringify(newSizesMap), row.id]
    );
    log(`Migrated row ${row.id} (${row.module}) → ${TARGET_PROVIDER}`);
    stats.migrated++;
  } else {
    log(`[DRY RUN] Would update DB row ${row.id}`);
    stats.migrated++;
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  if (!TARGET_PROVIDER) {
    err('STORAGE_PROVIDER env variable is not set. Aborting.');
    process.exit(1);
  }

  if (SOURCE_PROVIDER === TARGET_PROVIDER) {
    log(`Source and target provider are both "${SOURCE_PROVIDER}". Nothing to migrate.`);
    process.exit(0);
  }

  log(`Migration: ${SOURCE_PROVIDER} → ${TARGET_PROVIDER}`);
  if (DRY_RUN) log('DRY RUN mode — no files or DB records will be changed');

  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.query(
      `SELECT * FROM uploaded_images WHERE storage_provider = ? ORDER BY id ASC LIMIT ? OFFSET ?`,
      [SOURCE_PROVIDER, BATCH_SIZE, offset]
    );

    if (rows.length === 0) break;

    log(`Processing batch: rows ${offset + 1}–${offset + rows.length}`);

    for (const row of rows) {
      try {
        await migrateRow(row);
      } catch (e) {
        err(`Failed to migrate row ${row.id}:`, e.message);
        stats.failed++;
      }
    }

    offset += rows.length;
    if (rows.length < BATCH_SIZE) break;
  }

  log('─'.repeat(60));
  log(`Migration complete!`);
  log(`  Processed : ${stats.processed}`);
  log(`  Migrated  : ${stats.migrated}`);
  log(`  Skipped   : ${stats.skipped}  (already on target provider)`);
  log(`  Failed    : ${stats.failed}`);
  log('─'.repeat(60));

  if (stats.failed > 0) {
    log('Some rows failed. Re-run the script to retry failed rows (they are not marked as migrated).');
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Ensure DB connection is established before running
const { connectDB } = await import('../src/config/db.js');
await connectDB();

main().catch((e) => {
  err('Unexpected error:', e);
  process.exit(1);
});
