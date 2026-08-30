/**
 * CloudinaryProvider
 *
 * Uploads files to Cloudinary CDN using the official Cloudinary Node.js SDK (v2).
 *
 * Config (via .env):
 *   CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   CLOUDINARY_API_KEY=your_api_key
 *   CLOUDINARY_API_SECRET=your_api_secret
 *
 * Set STORAGE_PROVIDER=cloudinary in .env to activate.
 */

import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

/**
 * Detect Cloudinary resource_type based on file extension and MIME type.
 * Returns 'image', 'video', or 'raw'.
 *
 * @param {string} fileName
 * @param {string} [mimeType]
 * @returns {'image'|'video'|'raw'}
 */
export const detectResourceType = (fileName = '', mimeType = '') => {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary treats audio as video resource_type
  }

  const ext = path.extname(fileName).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp', '.ico', '.tiff'];
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.mp3', '.wav'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';

  return 'raw';
};

class CloudinaryProvider {
  constructor(options = {}) {
    const isDryRun = options.isDryRun || process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || (isDryRun ? 'demo_cloud' : null);
    const apiKey = process.env.CLOUDINARY_API_KEY || (isDryRun ? 'demo_key' : null);
    const apiSecret = process.env.CLOUDINARY_API_SECRET || (isDryRun ? 'demo_secret' : null);

    if (!cloudName || !apiKey || !apiSecret) {
      const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
      const missing = required.filter((key) => !process.env[key]);
      throw new Error(`CloudinaryProvider: Missing required env variable(s): ${missing.join(', ')}`);
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  /**
   * Upload a file buffer to Cloudinary.
   *
   * @param {Buffer} buffer      - Raw file buffer
   * @param {object} options
   *   @param {string} [options.module='general'] - Used as folder name prefix in Cloudinary
   *   @param {string} options.fileName            - Desired filename or public_id prefix
   *   @param {string} [options.mimeType]          - MIME type
   *   @param {string} [options.resourceType]      - Explicit resource_type ('image'|'video'|'raw')
   * @returns {Promise<{ storageKey: string, publicUrl: string, resourceType: string }>}
   */
  async upload(buffer, { module = 'general', fileName, mimeType = '', resourceType = null }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new TypeError('[CloudinaryProvider] upload() requires a Buffer');
    }
    if (!fileName) {
      throw new Error('[CloudinaryProvider] upload() requires options.fileName');
    }

    const targetResourceType = resourceType || detectResourceType(fileName, mimeType);

    // Sanitize folder and public_id
    const folderPath = module ? module.replace(/^\/+|\/+$/g, '') : 'general';
    const baseNameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const publicId = `${folderPath}/${baseNameWithoutExt}`;

    return new Promise((resolve, reject) => {
      const uploadOptions = {
        public_id: publicId,
        resource_type: targetResourceType,
        overwrite: true,
        invalidate: true,
      };

      // For raw files, keep original extension in public_id if missing
      if (targetResourceType === 'raw' && !publicId.endsWith(path.extname(fileName))) {
        uploadOptions.public_id = `${publicId}${path.extname(fileName)}`;
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(new Error(`[CloudinaryProvider] Upload failed: ${error.message}`));
          }
          resolve({
            storageKey: result.public_id,
            publicUrl: result.secure_url,
            resourceType: result.resource_type || targetResourceType,
            format: result.format || path.extname(fileName).slice(1),
          });
        }
      );

      stream.end(buffer);
    });
  }

  /**
   * Delete a file from Cloudinary.
   *
   * @param {string} storageKey          - Cloudinary public_id
   * @param {object} [options]
   *   @param {string} [options.resourceType='image'] - Cloudinary resource_type ('image'|'video'|'raw')
   * @returns {Promise<void>}
   */
  async delete(storageKey, options = {}) {
    if (!storageKey) return;

    try {
      const resType = options.resourceType || detectResourceType(storageKey);
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: resType,
        invalidate: true,
      });
    } catch (err) {
      console.warn(`[CloudinaryProvider] Could not delete "${storageKey}":`, err.message);
    }
  }

  /**
   * Reconstruct or format the delivery URL for a Cloudinary public_id.
   *
   * @param {string} storageKey
   * @param {object} [options]
   *   @param {string} [options.resourceType='image']
   * @returns {string|null}
   */
  getUrl(storageKey, options = {}) {
    if (!storageKey) return null;
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }

    const cleanKey = storageKey.replace(/\\/g, '/').replace(/^\/?uploads\//, '');
    const resType = options.resourceType || detectResourceType(cleanKey);
    return cloudinary.url(cleanKey, {
      secure: true,
      resource_type: resType,
    });
  }

  get name() {
    return 'cloudinary';
  }
}

export default CloudinaryProvider;
