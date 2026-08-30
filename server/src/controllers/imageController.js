/**
 * imageController.js
 *
 * Handles the generic image upload/delete/meta endpoints.
 * All storage operations go through StorageService — the controller
 * is completely provider-agnostic.
 *
 * Routes:
 *   POST   /api/images/upload           → uploadImage
 *   POST   /api/images/upload-multiple  → uploadMultipleImages
 *   DELETE /api/images/:id              → deleteImage
 *   GET    /api/images/meta/:id         → getImageMeta
 */

import { processUploadedImage, getImageMetadata } from '../services/imageService.js';
import StorageService from '../storage/StorageService.js';
import pool from '../config/db.js';

/**
 * POST /api/images/upload
 * Accepts: multipart/form-data with field 'image' (single file)
 * Body fields: module, cropData (JSON string), altText, seoTitle, entityId, sortOrder, isPrimary
 */
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    const {
      module = 'products',
      cropData: cropDataStr,
      altText = '',
      seoTitle = '',
      entityId = null,
      sortOrder = 0,
      isPrimary = false,
    } = req.body;

    let cropData = null;
    if (cropDataStr) {
      try {
        cropData = JSON.parse(cropDataStr);
      } catch {
        // ignore invalid crop data — will process without crop
      }
    }

    // Get source metadata for validation / response
    const srcMeta = await getImageMetadata(req.file.buffer);

    // 1. Process: crop → generate all size variant buffers (no disk I/O)
    const processed = await processUploadedImage(req.file.buffer, {
      module,
      cropData,
      originalName: (req.file.originalname || 'image').split('.')[0],
    });

    // 2. Upload main image via StorageService
    const mainUpload = await StorageService.upload(processed.mainBuffer, {
      module,
      fileName: processed.mainFileName,
      mimeType: processed.mimeType,
    });

    // 3. Upload all size variants
    const sizesMap = { main: { storageKey: mainUpload.storageKey, publicUrl: mainUpload.publicUrl } };
    const sizeUploadResults = {};

    for (const sizeVariant of processed.sizes) {
      const sizeUpload = await StorageService.upload(sizeVariant.buffer, {
        module,
        fileName: sizeVariant.fileName,
        mimeType: processed.mimeType,
      });
      sizesMap[sizeVariant.name] = {
        storageKey: sizeUpload.storageKey,
        publicUrl:  sizeUpload.publicUrl,
        width:      sizeVariant.width,
        height:     sizeVariant.height,
        size:       sizeVariant.size,
      };
      // Backwards-compatible flat URL map for clients expecting { main: url, thumb: url, ... }
      sizeUploadResults[sizeVariant.name] = sizeUpload.publicUrl;
    }

    const isPrimaryBool = isPrimary === 'true' || isPrimary === true;

    // 4. Persist metadata to DB — only storage-agnostic fields
    const [dbResult] = await pool.query(
      `INSERT INTO uploaded_images
       (module, entity_id, original_name, optimized_name, alt_text, seo_title,
        image_width, image_height, file_size, mime_type,
        storage_provider, storage_key, public_url, sizes,
        is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module,
        entityId || null,
        req.file.originalname || 'image',
        processed.mainFileName,
        altText,
        seoTitle,
        processed.mainWidth,
        processed.mainHeight,
        processed.mainSize,
        processed.mimeType,
        mainUpload.provider,
        mainUpload.storageKey,
        mainUpload.publicUrl,
        JSON.stringify(sizesMap),
        isPrimaryBool ? 1 : 0,
        parseInt(sortOrder) || 0,
      ]
    );

    res.status(201).json({
      success: true,
      image: {
        id:            dbResult.insertId,
        publicUrl:     mainUpload.publicUrl,
        mainPath:      mainUpload.publicUrl, // backwards compatibility
        provider:      mainUpload.provider,
        originalName:  req.file.originalname,
        optimizedName: processed.mainFileName,
        altText,
        seoTitle,
        width:         processed.mainWidth,
        height:        processed.mainHeight,
        fileSize:      processed.mainSize,
        mimeType:      processed.mimeType,
        // Flat URL map for client (e.g. { main: '...', thumb: '...', medium: '...' })
        sizes: {
          main: mainUpload.publicUrl,
          ...sizeUploadResults,
        },
        isPrimary:     isPrimaryBool,
        sortOrder:     parseInt(sortOrder) || 0,
        sourceWidth:   srcMeta.width,
        sourceHeight:  srcMeta.height,
      },
    });
  } catch (error) {
    console.error('[imageController] uploadImage error:', error);
    next(error);
  }
};

/**
 * POST /api/images/upload-multiple
 * Accepts: multipart/form-data with field 'images' (multiple files)
 * Body fields: module, cropDataList (JSON array string)
 */
export const uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files provided.' });
    }

    const { module = 'products' } = req.body;
    let cropDataList = [];
    try {
      if (req.body.cropDataList) cropDataList = JSON.parse(req.body.cropDataList);
    } catch { /* ignore */ }

    const results = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const cropData = cropDataList[i] || null;

      const processed = await processUploadedImage(file.buffer, {
        module,
        cropData,
        originalName: (file.originalname || 'image').split('.')[0],
      });

      // Upload main
      const mainUpload = await StorageService.upload(processed.mainBuffer, {
        module,
        fileName: processed.mainFileName,
        mimeType: processed.mimeType,
      });

      // Upload size variants
      const sizesMap = { main: { storageKey: mainUpload.storageKey, publicUrl: mainUpload.publicUrl } };
      const sizeUrls = {};

      for (const sv of processed.sizes) {
        const su = await StorageService.upload(sv.buffer, {
          module,
          fileName: sv.fileName,
          mimeType: processed.mimeType,
        });
        sizesMap[sv.name] = { storageKey: su.storageKey, publicUrl: su.publicUrl };
        sizeUrls[sv.name] = su.publicUrl;
      }

      const [dbResult] = await pool.query(
        `INSERT INTO uploaded_images
         (module, original_name, optimized_name, image_width, image_height, file_size, mime_type,
          storage_provider, storage_key, public_url, sizes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          module,
          file.originalname || 'image',
          processed.mainFileName,
          processed.mainWidth,
          processed.mainHeight,
          processed.mainSize,
          processed.mimeType,
          mainUpload.provider,
          mainUpload.storageKey,
          mainUpload.publicUrl,
          JSON.stringify(sizesMap),
          i,
        ]
      );

      results.push({
        id:            dbResult.insertId,
        publicUrl:     mainUpload.publicUrl,
        mainPath:      mainUpload.publicUrl,
        provider:      mainUpload.provider,
        originalName:  file.originalname,
        optimizedName: processed.mainFileName,
        width:         processed.mainWidth,
        height:        processed.mainHeight,
        fileSize:      processed.mainSize,
        mimeType:      processed.mimeType,
        sizes: { main: mainUpload.publicUrl, ...sizeUrls },
        sortOrder: i,
      });
    }

    res.status(201).json({ success: true, images: results });
  } catch (error) {
    console.error('[imageController] uploadMultipleImages error:', error);
    next(error);
  }
};

/**
 * DELETE /api/images/:id
 * Deletes all size variant files from the storage provider and the DB record.
 */
export const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM uploaded_images WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    const image = rows[0];

    // Delete all size variant files from storage
    try {
      const sizesMap = typeof image.sizes === 'string' ? JSON.parse(image.sizes) : image.sizes;
      if (sizesMap && typeof sizesMap === 'object') {
        const deleteJobs = Object.values(sizesMap).map((entry) => {
          // sizesMap values can be { storageKey, publicUrl } (new format) or a URL string (legacy)
          const key = (typeof entry === 'object' && entry !== null) ? entry.storageKey : entry;
          return StorageService.delete(key, image.storage_provider || 'local');
        });
        await Promise.allSettled(deleteJobs);
      }
    } catch (err) {
      console.warn('[imageController] deleteImage: could not parse sizes JSON:', err.message);
    }

    // Also delete the main file (storage_key on the row itself)
    if (image.storage_key) {
      await StorageService.delete(image.storage_key, image.storage_provider || 'local');
    }

    // Remove DB record
    await pool.query('DELETE FROM uploaded_images WHERE id = ?', [id]);

    res.status(200).json({ success: true, message: 'Image deleted successfully.' });
  } catch (error) {
    console.error('[imageController] deleteImage error:', error);
    next(error);
  }
};

/**
 * GET /api/images/meta/:id
 * Returns stored metadata for an image including the public URL.
 */
export const getImageMeta = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM uploaded_images WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    const image = rows[0];

    // Resolve publicUrl — may not be in DB for legacy rows
    const publicUrl = image.public_url
      || StorageService.getUrl(image.storage_key, image.storage_provider || 'local');

    res.status(200).json({
      success: true,
      image: {
        ...image,
        publicUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
