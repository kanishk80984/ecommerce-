/**
 * S3Provider
 *
 * Uploads files to AWS S3 or DigitalOcean Spaces (both use the S3 API).
 * Install the SDK before activating: npm install @aws-sdk/client-s3
 *
 * Config (via .env):
 *   S3_BUCKET=your-bucket-name
 *   S3_REGION=us-east-1
 *   S3_ACCESS_KEY=AKIAXXXXXXXXXXXXXXXX
 *   S3_SECRET_KEY=your+secret+key
 *
 *   # For DigitalOcean Spaces, also set:
 *   S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
 *   S3_CDN_BASE=https://your-bucket.nyc3.cdn.digitaloceanspaces.com  (optional CDN URL)
 *
 * Set STORAGE_PROVIDER=s3 (AWS) or STORAGE_PROVIDER=spaces (DO Spaces) in .env to activate.
 * Both values use this same provider class.
 *
 * ─────────────────────────────────────────────────────────────
 * IMPLEMENTATION STATUS: STUB
 * Uncomment SDK code below once credentials are ready and you've run:
 *   npm install @aws-sdk/client-s3
 * ─────────────────────────────────────────────────────────────
 */

// import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

class S3Provider {
  constructor() {
    const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`S3Provider: Missing required env variable "${key}"`);
      }
    }

    this.bucket = process.env.S3_BUCKET;
    this.region = process.env.S3_REGION;
    this.endpoint = process.env.S3_ENDPOINT || null;
    this.cdnBase = process.env.S3_CDN_BASE || null;

    // TODO: Uncomment when SDK is installed
    // this.client = new S3Client({
    //   region: this.region,
    //   endpoint: this.endpoint || undefined,
    //   credentials: {
    //     accessKeyId:     process.env.S3_ACCESS_KEY,
    //     secretAccessKey: process.env.S3_SECRET_KEY,
    //   },
    //   forcePathStyle: !!this.endpoint, // needed for DO Spaces and MinIO
    // });

    console.warn('[S3Provider] Stub implementation — install @aws-sdk/client-s3 and uncomment code.');
  }

  /**
   * Upload a buffer to S3 / Spaces.
   *
   * @param {Buffer} buffer
   * @param {object} options
   *   @param {string} options.module    - Used as key prefix (folder)
   *   @param {string} options.fileName  - Object key filename
   *   @param {string} [options.mimeType]
   * @returns {Promise<{ storageKey: string, publicUrl: string }>}
   */
  async upload(buffer, { module = 'general', fileName, mimeType = 'image/webp' }) {
    // TODO: Implement when SDK is installed
    //
    // const key = `${module}/${fileName}`;
    // await this.client.send(new PutObjectCommand({
    //   Bucket: this.bucket,
    //   Key: key,
    //   Body: buffer,
    //   ContentType: mimeType,
    //   ACL: 'public-read',
    // }));
    // const publicUrl = this.getUrl(key);
    // return { storageKey: key, publicUrl };

    throw new Error('S3Provider.upload: SDK not installed. Run: npm install @aws-sdk/client-s3');
  }

  /**
   * Delete an object from S3 / Spaces.
   *
   * @param {string} storageKey - S3 object key (e.g. "products/img_main.webp")
   */
  async delete(storageKey) {
    // TODO: Implement when SDK is installed
    //
    // await this.client.send(new DeleteObjectCommand({
    //   Bucket: this.bucket,
    //   Key: storageKey,
    // }));

    console.warn('[S3Provider] delete stub — not yet implemented');
  }

  /**
   * Build the public URL for an S3 object.
   *
   * @param {string} storageKey
   * @returns {string}
   */
  getUrl(storageKey) {
    if (!storageKey) return null;
    // CDN base takes priority (e.g. CloudFront distribution or DO Spaces CDN)
    if (this.cdnBase) {
      return `${this.cdnBase.replace(/\/$/, '')}/${storageKey}`;
    }
    if (this.endpoint) {
      // DigitalOcean Spaces format
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${storageKey}`;
    }
    // Standard AWS S3 format
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${storageKey}`;
  }

  get name() {
    return 's3';
  }
}

export default S3Provider;
