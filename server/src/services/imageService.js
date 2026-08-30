/**
 * imageService.js — Pure Image Processing Pipeline
 *
 * This module handles ONLY image processing (crop, resize, optimize, format conversion).
 * It is completely decoupled from storage — it never writes to disk or calls any cloud API.
 * All functions accept buffers and return buffers.
 *
 * Storage is handled exclusively by StorageService (src/storage/StorageService.js).
 */

import sharp from 'sharp';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// SIZE PRESETS PER MODULE
// ─────────────────────────────────────────────────────────────
const SIZE_PRESETS = {
  products: [
    { name: 'thumb', width: 300, height: 300, fit: 'cover' },
    { name: 'small', width: 600, height: 600, fit: 'cover' },
    { name: 'medium', width: 1200, height: 1200, fit: 'inside' },
    { name: 'large', width: 2000, height: 2000, fit: 'inside' },
  ],
  categories: [
    { name: 'small', width: 400, height: 400, fit: 'cover' },
    { name: 'large', width: 1200, height: 1200, fit: 'inside' },
  ],
  banners: [
    { name: 'mobile', width: 720, height: null, fit: 'inside' },
    { name: 'tablet', width: 1200, height: null, fit: 'inside' },
    { name: 'desktop', width: 1920, height: null, fit: 'inside' },
  ],
  profiles: [
    { name: 'small', width: 100, height: 100, fit: 'cover' },
    { name: 'large', width: 300, height: 300, fit: 'cover' },
  ],
  stores: [
    { name: 'logo_small', width: 200, height: 200, fit: 'cover' },
    { name: 'banner', width: 1920, height: 600, fit: 'cover' },
  ],
  advertisements: [
    { name: 'mobile', width: 720, height: null, fit: 'inside' },
    { name: 'desktop', width: 1920, height: null, fit: 'inside' },
  ],
  vendors: [
    { name: 'thumb', width: 300, height: 300, fit: 'cover' },
    { name: 'large', width: 1200, height: 1200, fit: 'inside' },
  ],
  services: [
    { name: 'thumb', width: 300, height: 300, fit: 'cover' },
    { name: 'large', width: 800, height: 800, fit: 'inside' },
  ],
};

// Fall-through default
const DEFAULT_SIZES = [
  { name: 'thumb', width: 300, height: 300, fit: 'cover' },
  { name: 'medium', width: 800, height: 800, fit: 'inside' },
  { name: 'large', width: 1600, height: 1600, fit: 'inside' },
];

/**
 * Generate a unique filename prefix.
 * @param {string} prefix
 * @returns {string}
 */
export const uniqueName = (prefix = 'img') => {
  const ts = Date.now();
  const rand = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${ts}_${rand}`;
};

/**
 * Get image metadata from a buffer.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ width, height, format, size, hasAlpha, orientation }>}
 */
export const getImageMetadata = async (buffer) => {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    size: buffer.length,
    hasAlpha: metadata.hasAlpha,
    orientation: metadata.orientation,
  };
};

/**
 * Apply crop/rotation/flip to an image buffer.
 * cropData: { x, y, width, height, rotation, flipH, flipV }
 * All crop values are in SOURCE image pixels (post-EXIF-correction).
 *
 * @param {Buffer} buffer
 * @param {object|null} cropData
 * @returns {Promise<Buffer>}
 */
export const applyCrop = async (buffer, cropData) => {
  let pipeline = sharp(buffer).rotate(); // Auto-fix EXIF orientation first

  if (cropData) {
    const { rotation, flipH, flipV } = cropData;

    if (rotation && rotation !== 0) {
      pipeline = pipeline.rotate(rotation);
    }

    if (flipH) pipeline = pipeline.flop();
    if (flipV) pipeline = pipeline.flip();

    if (cropData.x != null && cropData.y != null && cropData.width && cropData.height) {
      const rotatedBuf = await pipeline.toBuffer();
      const rotatedMeta = await sharp(rotatedBuf).metadata();

      const x = Math.max(0, Math.round(cropData.x));
      const y = Math.max(0, Math.round(cropData.y));
      const w = Math.min(Math.round(cropData.width), rotatedMeta.width - x);
      const h = Math.min(Math.round(cropData.height), rotatedMeta.height - y);

      if (w > 0 && h > 0) {
        pipeline = sharp(rotatedBuf).extract({ left: x, top: y, width: w, height: h });
      } else {
        pipeline = sharp(rotatedBuf);
      }
    }
  } else {
    pipeline = sharp(buffer).rotate();
  }

  return pipeline.toBuffer();
};

/**
 * Optimize a single image: strip EXIF, compress, convert to WebP.
 * Returns a Buffer — does NOT write to disk.
 *
 * @param {Buffer} buffer
 * @param {object} [opts]
 *   @param {number}  [opts.quality=82]
 *   @param {number}  [opts.maxWidth]
 *   @param {number}  [opts.maxHeight]
 *   @param {string}  [opts.fit='inside']
 * @returns {Promise<Buffer>}
 */
export const optimizeImage = async (buffer, { quality = 82, maxWidth, maxHeight, fit = 'inside' } = {}) => {
  let pipeline = sharp(buffer)
    .rotate()
    .withMetadata({ orientation: undefined })
    .webp({ quality, effort: 4 });

  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize({
      width: maxWidth || undefined,
      height: maxHeight || undefined,
      fit: fit || 'inside',
      withoutEnlargement: true,
    });
  }

  return pipeline.toBuffer();
};

/**
 * Generate all size variant buffers for a given module.
 * Returns an array of objects — does NOT write to disk.
 *
 * @param {Buffer} croppedBuffer
 * @param {string} module
 * @param {string} baseFilename  - Filename prefix (no extension)
 * @returns {Promise<Array<{ name: string, fileName: string, buffer: Buffer, width: number, height: number, size: number }>>}
 */
export const generateSizeBuffers = async (croppedBuffer, module, baseFilename) => {
  const sizes = SIZE_PRESETS[module] || DEFAULT_SIZES;
  const results = [];

  for (const sizeConfig of sizes) {
    const outputFilename = `${baseFilename}_${sizeConfig.name}.webp`;

    const outputBuffer = await sharp(croppedBuffer)
      .rotate()
      .resize({
        width: sizeConfig.width || undefined,
        height: sizeConfig.height || undefined,
        fit: sizeConfig.fit || 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const meta = await sharp(outputBuffer).metadata();

    results.push({
      name: sizeConfig.name,
      fileName: outputFilename,
      buffer: outputBuffer,
      width: meta.width,
      height: meta.height,
      size: outputBuffer.length,
    });
  }

  return results;
};

/**
 * Full processing pipeline: crop → optimize → generate all size variant buffers.
 * Returns processed buffers ready to be passed to StorageService.upload().
 * Does NOT write to disk or call any storage API.
 *
 * @param {Buffer} buffer          - Raw uploaded file buffer
 * @param {object} [opts]
 *   @param {string} [opts.module='products']
 *   @param {object} [opts.cropData=null]
 *   @param {string} [opts.originalName='image']
 * @returns {Promise<{
 *   baseFilename: string,
 *   mainBuffer: Buffer,
 *   mainFileName: string,
 *   mainWidth: number,
 *   mainHeight: number,
 *   mainSize: number,
 *   mimeType: string,
 *   originalName: string,
 *   sizes: Array<{ name, fileName, buffer, width, height, size }>
 * }>}
 */
export const processUploadedImage = async (buffer, {
  module = 'products',
  cropData = null,
  originalName = 'image',
} = {}) => {
  // 1. Apply crop/rotation/flip
  const croppedBuffer = await applyCrop(buffer, cropData);

  // 2. Generate unique base filename
  const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const baseFilename = uniqueName(safeName);

  // 3. Process "main" image buffer (full size, WebP, stripped EXIF)
  const mainBuffer = await sharp(croppedBuffer)
    .rotate()
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
  const mainMeta = await sharp(mainBuffer).metadata();
  const mainFileName = `${baseFilename}_main.webp`;

  // 4. Generate all size variant buffers
  const sizes = await generateSizeBuffers(croppedBuffer, module, baseFilename);

  return {
    baseFilename,
    mainBuffer,
    mainFileName,
    mainWidth: mainMeta.width,
    mainHeight: mainMeta.height,
    mainSize: mainBuffer.length,
    mimeType: 'image/webp',
    originalName,
    sizes,
  };
};

/**
 * Quick single-buffer optimize — no size variants.
 * Use for non-product uploads (banners, profile photos, etc.) where only
 * one file is needed and the caller manages storage.
 *
 * @param {Buffer} buffer
 * @param {object} [opts]
 *   @param {number}  [opts.quality=82]
 *   @param {number}  [opts.maxWidth]
 *   @param {number}  [opts.maxHeight]
 *   @param {string}  [opts.fit='inside']
 *   @param {string}  [opts.originalName='file']
 * @returns {Promise<{ buffer: Buffer, fileName: string, mimeType: string, width: number, height: number, size: number }>}
 */
export const optimizeToSingleBuffer = async (buffer, {
  quality = 82,
  maxWidth,
  maxHeight,
  fit = 'inside',
  originalName = 'file',
} = {}) => {
  const safeName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const fileName = `${uniqueName(safeName)}.webp`;

  let pipeline = sharp(buffer)
    .rotate()
    .withMetadata({ orientation: undefined })
    .webp({ quality, effort: 4 });

  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize({
      width: maxWidth || undefined,
      height: maxHeight || undefined,
      fit: fit || 'inside',
      withoutEnlargement: true,
    });
  }

  const outputBuffer = await pipeline.toBuffer();
  const meta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    fileName,
    mimeType: 'image/webp',
    width: meta.width,
    height: meta.height,
    size: outputBuffer.length,
  };
};
