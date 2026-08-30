/**
 * LocalStorageProvider
 *
 * Stores uploaded files on the local filesystem under `uploads/<module>/`.
 * This is the default provider and is fully functional with no external dependencies.
 *
 * Config (via .env):
 *   BASE_URL=http://localhost:5001   → used to build public URLs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the server root (3 levels up: providers → storage → src → server root)
const SERVER_ROOT = path.resolve(__dirname, '..', '..', '..');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

class LocalStorageProvider {
  constructor() {
    this.uploadsBase = path.join(SERVER_ROOT, 'uploads');
    this.baseUrl = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`).replace(/\/$/, '');
    ensureDir(this.uploadsBase);
  }

  /**
   * Upload a file buffer to local disk.
   *
   * @param {Buffer} buffer      - File content
   * @param {object} options
   *   @param {string} options.module      - Subdirectory (e.g. 'products', 'banners')
   *   @param {string} options.fileName    - Desired filename including extension
   *   @param {string} [options.mimeType]  - MIME type (informational)
   * @returns {Promise<{ storageKey: string, publicUrl: string }>}
   */
  async upload(buffer, { module = 'general', fileName }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('LocalStorageProvider.upload: buffer must be a Buffer');
    }
    if (!fileName) {
      throw new Error('LocalStorageProvider.upload: fileName is required');
    }

    const moduleDir = path.join(this.uploadsBase, module);
    ensureDir(moduleDir);

    const absolutePath = path.join(moduleDir, fileName);
    fs.writeFileSync(absolutePath, buffer);

    // storageKey is the relative path that can be reconstructed into a full URL
    const storageKey = `uploads/${module}/${fileName}`;
    const publicUrl = `${this.baseUrl}/${storageKey}`;

    return { storageKey, publicUrl };
  }

  /**
   * Delete a file from local disk.
   *
   * @param {string} storageKey - Relative path, e.g. "uploads/products/img_main.webp"
   * @returns {Promise<void>}
   */
  async delete(storageKey) {
    if (!storageKey) return;

    try {
      const absolutePath = path.join(SERVER_ROOT, storageKey.startsWith('/') ? storageKey.slice(1) : storageKey);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      // Non-fatal — log but don't throw; the DB record will still be cleaned up
      console.warn(`[LocalStorage] Could not delete file "${storageKey}":`, err.message);
    }
  }

  /**
   * Reconstruct the public URL from a storage key.
   * Useful for serving existing files after the provider is switched.
   *
   * @param {string} storageKey
   * @returns {string} publicUrl
   */
  getUrl(storageKey) {
    if (!storageKey) return null;
    // If it's already a full URL, return as-is
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }
    const key = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Provider name identifier (stored in DB)
   */
  get name() {
    return 'local';
  }
}

export default LocalStorageProvider;
