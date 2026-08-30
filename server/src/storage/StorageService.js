/**
 * StorageService — Provider-Based Storage Abstraction
 *
 * The single entry point for all file storage operations across the application.
 * Controllers, services, and middlewares MUST use this class exclusively —
 * never import a provider directly or write to disk/cloud outside this class.
 *
 * Config (via .env):
 *   STORAGE_PROVIDER=local        → LocalStorageProvider  (default)
 *   STORAGE_PROVIDER=cloudinary   → CloudinaryProvider    (Cloudinary CDN)
 *   STORAGE_PROVIDER=s3           → S3Provider            (AWS S3)
 *   STORAGE_PROVIDER=spaces       → S3Provider            (DigitalOcean Spaces)
 *   STORAGE_PROVIDER=gcs          → GCSProvider           (Google Cloud Storage)
 */

import LocalStorageProvider from './providers/LocalStorageProvider.js';
import CloudinaryProvider from './providers/CloudinaryProvider.js';
import S3Provider from './providers/S3Provider.js';
import GCSProvider from './providers/GCSProvider.js';

// ─── Singleton & Provider Resolution ──────────────────────────────────────────
let _instance = null;

/**
 * Instantiate a provider by name identifier.
 *
 * @param {string} providerName
 * @returns {LocalStorageProvider|CloudinaryProvider|S3Provider|GCSProvider}
 */
const instantiateProvider = (providerName = 'local') => {
  const name = providerName.toLowerCase().trim();
  switch (name) {
    case 'local':
      return new LocalStorageProvider();

    case 'cloudinary':
      return new CloudinaryProvider();

    case 's3':
    case 'spaces':
      return new S3Provider();

    case 'gcs':
      return new GCSProvider();

    default:
      throw new Error(
        `[StorageService] Unknown provider "${providerName}". ` +
        'Valid options: local, cloudinary, s3, spaces, gcs'
      );
  }
};

/**
 * Get the active storage provider singleton based on process.env.STORAGE_PROVIDER.
 *
 * @returns {LocalStorageProvider|CloudinaryProvider|S3Provider|GCSProvider}
 */
const getProvider = () => {
  if (_instance) return _instance;
  const providerName = process.env.STORAGE_PROVIDER || 'local';
  _instance = instantiateProvider(providerName);
  console.log(`[StorageService] Active provider initialized: ${_instance.name}`);
  return _instance;
};

// ─── Public Storage API ───────────────────────────────────────────────────────

const StorageService = {
  /**
   * Upload a file buffer using the active provider.
   * Calls provider.upload() EXACTLY ONCE per invocation.
   *
   * @param {Buffer} buffer               - Raw file content (must be a Buffer)
   * @param {object} options
   *   @param {string} options.module      - Logical folder/module (e.g. 'products', 'banners')
   *   @param {string} options.fileName    - Desired filename including extension
   *   @param {string} [options.mimeType]  - MIME type (default: 'image/webp')
   *   @param {string} [options.resourceType] - Cloudinary resource_type ('image'|'video'|'raw')
   * @returns {Promise<{ storageKey: string, publicUrl: string, resourceType?: string, provider: string }>}
   */
  async upload(buffer, { module, fileName, mimeType = 'image/webp', resourceType = null, ...restOptions }) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('[StorageService] upload() requires a Buffer');
    }
    if (!module) throw new Error('[StorageService] upload() requires options.module');
    if (!fileName) throw new Error('[StorageService] upload() requires options.fileName');

    const provider = getProvider();

    // Call active provider.upload() EXACTLY ONCE
    const result = await provider.upload(buffer, { module, fileName, mimeType, resourceType, ...restOptions });

    return {
      storageKey: result.storageKey,
      publicUrl: result.publicUrl,
      resourceType: result.resourceType || resourceType || null,
      provider: provider.name,
    };
  },

  /**
   * Delete a file from the target provider.
   *
   * @param {string} storageKey        - Key returned during upload
   * @param {string} [storedProvider]  - Provider name stored in DB. Defaults to active provider.
   * @param {object} [options]         - Additional deletion options e.g. { resourceType }
   * @returns {Promise<void>}
   */
  async delete(storageKey, storedProvider, options = {}) {
    if (!storageKey) return;

    const activeProvider = getProvider();
    let targetProvider = activeProvider;

    if (storedProvider && storedProvider.toLowerCase() !== activeProvider.name.toLowerCase()) {
      try {
        targetProvider = instantiateProvider(storedProvider);
      } catch (err) {
        console.warn(`[StorageService] Fallback to active provider for deletion: ${err.message}`);
        targetProvider = activeProvider;
      }
    }

    await targetProvider.delete(storageKey, options);
  },

  /**
   * Reconstruct public delivery URL for a storage key.
   * Pass-through absolute URLs (http:// or https://) directly.
   *
   * @param {string} storageKey
   * @param {string} [storedProvider] - Provider name from DB. Defaults to active provider.
   * @param {object} [options]        - Additional options e.g. { resourceType }
   * @returns {string|null}
   */
  getUrl(storageKey, storedProvider, options = {}) {
    if (!storageKey) return null;
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
      return storageKey;
    }

    const activeProvider = getProvider();

    if (!storedProvider || storedProvider.toLowerCase() === activeProvider.name.toLowerCase()) {
      return activeProvider.getUrl(storageKey, options);
    }

    try {
      const targetProvider = instantiateProvider(storedProvider);
      return targetProvider.getUrl(storageKey, options);
    } catch {
      return activeProvider.getUrl(storageKey, options);
    }
  },

  /**
   * Return the name of the currently active provider.
   * @returns {string}
   */
  getProviderName() {
    return getProvider().name;
  },

  /**
   * Delete multiple files at once.
   *
   * @param {Array<{ storageKey: string, storage_provider?: string, resourceType?: string }>} files
   * @returns {Promise<void>}
   */
  async deleteMany(files) {
    if (!Array.isArray(files) || files.length === 0) return;

    await Promise.allSettled(
      files.map(({ storageKey, storage_provider, resourceType }) =>
        this.delete(storageKey, storage_provider, { resourceType })
      )
    );
  },

  /**
   * Reset the active singleton instance — used during testing.
   */
  _reset() {
    _instance = null;
  },
};

export default StorageService;
