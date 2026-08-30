/**
 * GCSProvider
 *
 * Uploads files to Google Cloud Storage.
 * Install the SDK before activating: npm install @google-cloud/storage
 *
 * Config (via .env):
 *   GCS_BUCKET=your-gcs-bucket-name
 *   GCS_PROJECT_ID=your-gcp-project-id
 *   GCS_KEY_FILE=/absolute/path/to/service-account-key.json
 *     OR
 *   GCS_CREDENTIALS_JSON={"type":"service_account","project_id":"...",...}  (JSON string)
 *
 * Set STORAGE_PROVIDER=gcs in .env to activate.
 *
 * ─────────────────────────────────────────────────────────────
 * IMPLEMENTATION STATUS: STUB
 * Uncomment SDK code below once credentials are ready and you've run:
 *   npm install @google-cloud/storage
 * ─────────────────────────────────────────────────────────────
 */

// import { Storage } from '@google-cloud/storage';

class GCSProvider {
  constructor() {
    const required = ['GCS_BUCKET', 'GCS_PROJECT_ID'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`GCSProvider: Missing required env variable "${key}"`);
      }
    }
    if (!process.env.GCS_KEY_FILE && !process.env.GCS_CREDENTIALS_JSON) {
      throw new Error('GCSProvider: Provide either GCS_KEY_FILE or GCS_CREDENTIALS_JSON');
    }

    this.bucket = process.env.GCS_BUCKET;
    this.projectId = process.env.GCS_PROJECT_ID;

    // TODO: Uncomment when SDK is installed
    //
    // let authOptions = {};
    // if (process.env.GCS_CREDENTIALS_JSON) {
    //   authOptions.credentials = JSON.parse(process.env.GCS_CREDENTIALS_JSON);
    // } else {
    //   authOptions.keyFilename = process.env.GCS_KEY_FILE;
    // }
    //
    // this.storage = new Storage({ projectId: this.projectId, ...authOptions });
    // this.gcs_bucket = this.storage.bucket(this.bucket);

    console.warn('[GCSProvider] Stub implementation — install @google-cloud/storage and uncomment code.');
  }

  /**
   * Upload a buffer to GCS.
   *
   * @param {Buffer} buffer
   * @param {object} options
   *   @param {string} options.module    - Used as key prefix (folder)
   *   @param {string} options.fileName  - Object name
   *   @param {string} [options.mimeType]
   * @returns {Promise<{ storageKey: string, publicUrl: string }>}
   */
  async upload(buffer, { module = 'general', fileName, mimeType = 'image/webp' }) {
    // TODO: Implement when SDK is installed
    //
    // const key = `${module}/${fileName}`;
    // const file = this.gcs_bucket.file(key);
    // await file.save(buffer, {
    //   metadata: { contentType: mimeType },
    //   public: true,
    //   resumable: false,
    // });
    // const publicUrl = this.getUrl(key);
    // return { storageKey: key, publicUrl };

    throw new Error('GCSProvider.upload: SDK not installed. Run: npm install @google-cloud/storage');
  }

  /**
   * Delete an object from GCS.
   *
   * @param {string} storageKey - GCS object path (e.g. "products/img_main.webp")
   */
  async delete(storageKey) {
    // TODO: Implement when SDK is installed
    //
    // await this.gcs_bucket.file(storageKey).delete({ ignoreNotFound: true });

    console.warn('[GCSProvider] delete stub — not yet implemented');
  }

  /**
   * Build the public URL for a GCS object.
   *
   * @param {string} storageKey
   * @returns {string}
   */
  getUrl(storageKey) {
    if (!storageKey) return null;
    return `https://storage.googleapis.com/${this.bucket}/${storageKey}`;
  }

  get name() {
    return 'gcs';
  }
}

export default GCSProvider;
