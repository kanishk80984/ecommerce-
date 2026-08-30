/**
 * Cloudinary Migration Script
 * ════════════════════════════════════════════════════════════════
 * Migrates local uploads from `server/uploads/` to Cloudinary.
 * Updates database references across all tables & columns (including JSON fields).
 *
 * Features:
 *   - Non-destructive: source files in server/uploads/ are preserved.
 *   - Resumable: state machine tracks progress via `file_migration_logs`.
 *   - Hash-verified: SHA-256 content hashing detects changed files.
 *   - Resource-type aware: handles images, videos, and raw documents (PDF, DOCX, ZIP).
 *   - Safe DB updates: handles flat URLs, relative paths, and nested JSON structures.
 *   - Dry Run mode: preview actions without uploading or altering DB data.
 *
 * Usage:
 *   DRY RUN:  node scripts/migrateCloudinary.js --dry-run
 *   ACTUAL:   STORAGE_PROVIDER=cloudinary node scripts/migrateCloudinary.js
 * ════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from server root
dotenv.config({ path: resolve(__dirname, '..', '.env') });

import pool from '../src/config/db.js';
import CloudinaryProvider, { detectResourceType } from '../src/storage/providers/CloudinaryProvider.js';
import { ensureFileMigrationLogsTable } from '../src/database/migrations/fileMigrationLogs.js';

// ─── CLI & Configuration ──────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const SERVER_ROOT = resolve(__dirname, '..');
const UPLOADS_ROOT = path.join(SERVER_ROOT, 'uploads');
const BASE_URL = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`).replace(/\/$/, '');

const log = (...args) => console.log(`[migrate-cloudinary]`, new Date().toISOString(), ...args);
const warn = (...args) => console.warn(`[migrate-cloudinary:WARN]`, ...args);
const err = (...args) => console.error(`[migrate-cloudinary:ERROR]`, ...args);

// ─── Known Database Tables and Image/File Columns ─────────────────────────────
// Note: uploaded_images main entry handles storage_key, public_url, and storage_provider in ONE query.

const TARGET_DB_COLUMNS = [
  { table: 'uploaded_images', column: 'storage_key', isJson: false, isUploadedImagesMain: true },
  { table: 'uploaded_images', column: 'sizes', isJson: true },
  { table: 'products', column: 'images', isJson: true },
  { table: 'products', column: 'thumbnail', isJson: false },
  { table: 'model_images', column: 'image_url', isJson: false },
  { table: 'variant_images', column: 'image_url', isJson: false },
  { table: 'categories', column: 'image', isJson: false },
  { table: 'brands', column: 'logo', isJson: false },
  { table: 'banners', column: 'image_url', isJson: false },
  { table: 'advertisements', column: 'image', isJson: false },
  { table: 'advertisements', column: 'mobile_image', isJson: false },
  { table: 'advertisement_campaigns', column: 'banner_url', isJson: false },
  { table: 'users', column: 'profile_photo', isJson: false },
  { table: 'vendor_profiles', column: 'business_logo', isJson: false },
  { table: 'vendor_profiles', column: 'store_banner', isJson: false },
  { table: 'vendor_profiles', column: 'gallery_images', isJson: true },
  { table: 'vendor_profiles', column: 'gallery_only', isJson: true },
  { table: 'vendor_profiles', column: 'kyc_documents', isJson: true },
  { table: 'vendor_services', column: 'image_path', isJson: false },
  { table: 'vendor_services', column: 'mobile_image', isJson: false },
  { table: 'service_categories', column: 'banner_image', isJson: false },
  { table: 'service_enquiries', column: 'image_path', isJson: false },
  { table: 'job_applications', column: 'resume_url', isJson: false },
  { table: 'documents', column: 'file_path', isJson: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculate SHA-256 hash of a file.
 */
const calculateFileHash = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
};

/**
 * Recursively find all files in a directory.
 */
const getFilesRecursively = (dir) => {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === '.DS_Store' || file.startsWith('.')) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
};

/**
 * Normalize local path variations for matching.
 * e.g., "uploads/products/a.jpg", "/uploads/products/a.jpg", "http://localhost:5001/uploads/products/a.jpg"
 */
const getPathVariants = (relativePath) => {
  const clean = relativePath.replace(/\\/g, '/').replace(/^\/+/, ''); // e.g. "uploads/products/a.jpg"
  const leadingSlash = `/${clean}`;
  const fullUrl = `${BASE_URL}/${clean}`;
  const ibcHttps = `https://www.ibcmart.com/${clean}`;
  const ibcHttp = `http://www.ibcmart.com/${clean}`;
  const ibcNoWwwHttps = `https://ibcmart.com/${clean}`;
  const ibcNoWwwHttp = `http://ibcmart.com/${clean}`;
  return { clean, leadingSlash, fullUrl, ibcHttps, ibcHttp, ibcNoWwwHttps, ibcNoWwwHttp };
};

/**
 * Recursively traverse a JSON object/array and replace local path references with new Cloudinary URL.
 */
const replaceJsonUrls = (data, pathVariants, newUrl) => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (
      data.includes(pathVariants.clean) ||
      data.includes(pathVariants.leadingSlash) ||
      data.includes(pathVariants.fullUrl) ||
      data.includes(pathVariants.ibcHttps) ||
      data.includes(pathVariants.ibcHttp) ||
      data.includes(pathVariants.ibcNoWwwHttps) ||
      data.includes(pathVariants.ibcNoWwwHttp)
    ) {
      return data
        .replace(pathVariants.ibcHttps, newUrl)
        .replace(pathVariants.ibcHttp, newUrl)
        .replace(pathVariants.ibcNoWwwHttps, newUrl)
        .replace(pathVariants.ibcNoWwwHttp, newUrl)
        .replace(pathVariants.fullUrl, newUrl)
        .replace(pathVariants.leadingSlash, newUrl)
        .replace(pathVariants.clean, newUrl);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => replaceJsonUrls(item, pathVariants, newUrl));
  }

  if (typeof data === 'object') {
    const updatedObj = {};
    for (const [key, value] of Object.entries(data)) {
      updatedObj[key] = replaceJsonUrls(value, pathVariants, newUrl);
    }
    return updatedObj;
  }

  return data;
};

// ─── Main Migration Logic ─────────────────────────────────────────────────────

const main = async () => {
  log('====================================================');
  log(`Starting Cloudinary Migration process ${DRY_RUN ? '[DRY RUN MODE — NO DATA MUTATION]' : '[LIVE MODE]'}`);
  log('====================================================');

  let dbAvailable = true;
  try {
    await ensureFileMigrationLogsTable(pool);
  } catch (dbInitErr) {
    if (DRY_RUN) {
      warn(`Database connection unavailable for dry-run analysis (${dbInitErr.message}). Continuing dry-run file scan preview without DB lookup.`);
      dbAvailable = false;
    } else {
      throw dbInitErr;
    }
  }

  const cloudinaryProvider = new CloudinaryProvider();

  const allFiles = getFilesRecursively(UPLOADS_ROOT);
  log(`Found ${allFiles.length} total files under ${UPLOADS_ROOT}`);

  let stats = {
    total: allFiles.length,
    uploaded: 0,
    dbUpdated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const filePath of allFiles) {
    const relativePath = path.relative(SERVER_ROOT, filePath).replace(/\\/g, '/'); // e.g. "uploads/products/xyz.webp"
    const pathVariants = getPathVariants(relativePath);
    const fileName = path.basename(filePath);

    // Determine module directory structure relative to uploads
    const relativeToUploads = path.relative(UPLOADS_ROOT, filePath).replace(/\\/g, '/');
    const folderParts = relativeToUploads.split('/');
    folderParts.pop(); // remove filename
    const module = folderParts.length > 0 ? folderParts.join('/') : 'general';

    const stat = fs.statSync(filePath);
    const fileHash = calculateFileHash(filePath);
    const resourceType = detectResourceType(fileName);

    log(`\nProcessing file: ${relativePath} [${resourceType}, ${stat.size} bytes]`);

    let existingLog = null;
    if (dbAvailable) {
      try {
        const [logRows] = await pool.query(
          `SELECT * FROM file_migration_logs WHERE local_path = ?`,
          [relativePath]
        );
        existingLog = logRows[0] || null;
      } catch {
        dbAvailable = false;
      }
    }

    let publicId = existingLog?.cloudinary_public_id;
    let cloudinaryUrl = existingLog?.cloudinary_url;

    // Step 1: Upload to Cloudinary if not already uploaded for current hash
    if (!publicId || !cloudinaryUrl || existingLog?.file_hash !== fileHash) {
      if (DRY_RUN) {
        publicId = `${module}/${fileName.replace(/\.[^/.]+$/, '')}`;
        cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name'}/${resourceType}/upload/${publicId} [PREVIEW URL]`;
        log(`  └─ [DRY RUN] Would upload "${relativePath}" -> Cloudinary folder "${module}" as resource_type "${resourceType}"`);
        log(`  └─ [DRY RUN PREVIEW URL]: ${cloudinaryUrl}`);
        stats.uploaded++;
      } else {
        try {
          const fileBuffer = fs.readFileSync(filePath);
          const uploadRes = await cloudinaryProvider.upload(fileBuffer, {
            module,
            fileName,
            resourceType,
          });

          publicId = uploadRes.storageKey;
          cloudinaryUrl = uploadRes.publicUrl;

          log(`  └─ [UPLOADED] Cloudinary Public ID: ${publicId} | URL: ${cloudinaryUrl}`);
          stats.uploaded++;

          // Record or update migration log with UPLOADED state
          await pool.query(
            `INSERT INTO file_migration_logs
             (local_path, file_hash, file_size, file_modified_at, cloudinary_public_id, cloudinary_url, resource_type, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOADED')
             ON DUPLICATE KEY UPDATE
             file_hash = VALUES(file_hash), file_size = VALUES(file_size), file_modified_at = VALUES(file_modified_at),
             cloudinary_public_id = VALUES(cloudinary_public_id), cloudinary_url = VALUES(cloudinary_url),
             resource_type = VALUES(resource_type), status = 'UPLOADED', error = NULL`,
            [relativePath, fileHash, stat.size, stat.mtime, publicId, cloudinaryUrl, resourceType]
          );
        } catch (uploadErr) {
          err(`  └─ [FAILED UPLOAD] ${relativePath}: ${uploadErr.message}`);
          stats.failed++;

          if (!DRY_RUN) {
            await pool.query(
              `INSERT INTO file_migration_logs (local_path, file_hash, status, error)
               VALUES (?, ?, 'FAILED', ?)
               ON DUPLICATE KEY UPDATE status = 'FAILED', error = VALUES(error)`,
              [relativePath, fileHash, uploadErr.message]
            );
          }
          continue; // Skip DB update for failed file
        }
      }
    } else {
      log(`  └─ Re-using existing Cloudinary upload: ${cloudinaryUrl}`);
    }

    // Step 2: DB URL Update Pass across all tables/columns
    let fileDbUpdates = 0;

    if (dbAvailable) {
      for (const { table, column, isJson, isUploadedImagesMain } of TARGET_DB_COLUMNS) {
        try {
          // Check if table exists first
          const [tables] = await pool.query(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [table]
          );
          if (tables.length === 0) continue;

          if (!isJson) {
            if (isUploadedImagesMain) {
              // 2A. Single unified UPDATE query for uploaded_images main record
              const matchQuery = `SELECT id, storage_key, public_url FROM uploaded_images WHERE storage_key LIKE ? OR storage_key LIKE ? OR storage_key LIKE ? OR storage_key LIKE ? OR public_url LIKE ? OR public_url LIKE ? OR public_url LIKE ? OR public_url LIKE ?`;
              const [matchingRows] = await pool.query(matchQuery, [
                `%${pathVariants.clean}%`,
                `%${pathVariants.leadingSlash}%`,
                `%${pathVariants.fullUrl}%`,
                `%${pathVariants.ibcHttps}%`,
                `%${pathVariants.clean}%`,
                `%${pathVariants.leadingSlash}%`,
                `%${pathVariants.fullUrl}%`,
                `%${pathVariants.ibcHttps}%`,
              ]);

              for (const row of matchingRows) {
                if (DRY_RUN) {
                  log(`  └─ [DRY RUN] Would update uploaded_images (ID ${row.id}): storage_key="${publicId}", public_url="${cloudinaryUrl}", storage_provider="cloudinary"`);
                } else {
                  await pool.query(
                    `UPDATE uploaded_images SET storage_key = ?, public_url = ?, storage_provider = 'cloudinary' WHERE id = ?`,
                    [publicId, cloudinaryUrl, row.id]
                  );
                  log(`  └─ [DB UPDATED] uploaded_images (ID ${row.id}) updated: storage_key, public_url, storage_provider='cloudinary'`);
                  fileDbUpdates++;
                }
              }
            } else {
              // 2B. Normal non-JSON column update for all other tables
              const matchQuery = `SELECT id, \`${column}\` FROM \`${table}\` WHERE \`${column}\` LIKE ? OR \`${column}\` LIKE ? OR \`${column}\` LIKE ? OR \`${column}\` LIKE ?`;
              const [matchingRows] = await pool.query(matchQuery, [
                `%${pathVariants.clean}%`,
                `%${pathVariants.leadingSlash}%`,
                `%${pathVariants.fullUrl}%`,
                `%${pathVariants.ibcHttps}%`,
              ]);

              for (const row of matchingRows) {
                if (DRY_RUN) {
                  log(`  └─ [DRY RUN] Would update ${table}.${column} (ID ${row.id}): "${row[column]}" -> "${cloudinaryUrl}"`);
                } else {
                  await pool.query(
                    `UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`,
                    [cloudinaryUrl, row.id]
                  );
                  log(`  └─ [DB UPDATED] ${table}.${column} (ID ${row.id}) updated to Cloudinary URL`);
                  fileDbUpdates++;
                }
              }
            }
          } else {
            // 3. JSON column recursive replacement
            const matchQuery = `SELECT id, \`${column}\` FROM \`${table}\` WHERE \`${column}\` LIKE ? OR \`${column}\` LIKE ? OR \`${column}\` LIKE ? OR \`${column}\` LIKE ?`;
            const [matchingRows] = await pool.query(matchQuery, [
              `%${pathVariants.clean}%`,
              `%${pathVariants.leadingSlash}%`,
              `%${pathVariants.fullUrl}%`,
              `%${pathVariants.ibcHttps}%`,
            ]);

            for (const row of matchingRows) {
              let jsonVal = row[column];
              if (!jsonVal) continue;

              let parsed = jsonVal;
              let isStringified = false;

              if (typeof jsonVal === 'string') {
                try {
                  parsed = JSON.parse(jsonVal);
                  isStringified = true;
                } catch (jsonErr) {
                  warn(`  └─ Invalid JSON in ${table}.${column} (ID ${row.id}): ${jsonErr.message}`);
                  continue;
                }
              }

              const updatedParsed = replaceJsonUrls(parsed, pathVariants, cloudinaryUrl);
              const finalVal = isStringified ? JSON.stringify(updatedParsed) : updatedParsed;

              // Only update database if the JSON value actually changed
              const rawOrig = isStringified ? jsonVal : JSON.stringify(jsonVal);
              const rawNew = typeof finalVal === 'string' ? finalVal : JSON.stringify(finalVal);

              if (rawOrig !== rawNew) {
                if (DRY_RUN) {
                  log(`  └─ [DRY RUN] Would update JSON ${table}.${column} (ID ${row.id})`);
                } else {
                  await pool.query(
                    `UPDATE \`${table}\` SET \`${column}\` = ? WHERE id = ?`,
                    [typeof finalVal === 'object' ? JSON.stringify(finalVal) : finalVal, row.id]
                  );
                  log(`  └─ [DB UPDATED] JSON ${table}.${column} (ID ${row.id}) updated`);
                  fileDbUpdates++;
                }
              }
            }
          }
        } catch (dbErr) {
          warn(`  └─ Error scanning DB table ${table}.${column}: ${dbErr.message}`);
        }
      }
    }

    if (fileDbUpdates > 0) stats.dbUpdated += fileDbUpdates;

    // Step 3: Mark migration log status SUCCESS
    if (!DRY_RUN && dbAvailable) {
      await pool.query(
        `UPDATE file_migration_logs
         SET status = 'SUCCESS', migrated_at = NOW(), error = NULL
         WHERE local_path = ?`,
        [relativePath]
      );
    }
  }

  log('\n====================================================');
  log('Cloudinary Migration Process Complete!');
  log(`  Total Files Found   : ${stats.total}`);
  log(`  Uploaded to Cloud   : ${stats.uploaded}`);
  log(`  DB Rows Updated     : ${stats.dbUpdated}`);
  log(`  Skipped (Unchanged) : ${stats.skipped}`);
  log(`  Failed              : ${stats.failed}`);
  log('====================================================\n');

  process.exit(stats.failed > 0 ? 1 : 0);
};

main().catch((e) => {
  err('Migration script fatal error:', e);
  process.exit(1);
});
