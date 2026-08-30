/**
 * fileMigrationLogs.js — Database table setup for file migration tracking
 */

export const ensureFileMigrationLogsTable = async (pool) => {
  const sql = `
    CREATE TABLE IF NOT EXISTS file_migration_logs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      local_path VARCHAR(767) NOT NULL,
      file_hash VARCHAR(64) DEFAULT NULL,
      file_size BIGINT UNSIGNED DEFAULT 0,
      file_modified_at TIMESTAMP NULL DEFAULT NULL,
      cloudinary_public_id VARCHAR(255) DEFAULT NULL,
      cloudinary_url TEXT DEFAULT NULL,
      resource_type ENUM('image', 'video', 'raw') DEFAULT 'image',
      status ENUM('UPLOADED', 'DB_UPDATED', 'SUCCESS', 'FAILED', 'SKIPPED') DEFAULT 'UPLOADED',
      error TEXT DEFAULT NULL,
      migrated_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_local_path (local_path),
      KEY idx_file_hash (file_hash),
      KEY idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `;

  await pool.query(sql);
};

export default ensureFileMigrationLogsTable;
