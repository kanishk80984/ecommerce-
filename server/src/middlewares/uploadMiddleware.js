/**
 * uploadMiddleware.js — Universal Memory-Storage Multer Configuration
 *
 * All uploads use multer memoryStorage. Files arrive as req.file.buffer (or req.files[n].buffer)
 * and are never written to the temporary OS temp directory. The buffer is passed directly to
 * StorageService, which handles persistence (local disk, cloud, etc.).
 *
 * This design is provider-agnostic: switching from local disk to S3 requires only a .env change.
 */

import multer from 'multer';

// ─── Shared Configuration ─────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/** 10 MB — generous limit; sharp will downscale/compress anyway */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * File filter — rejects non-image MIME types and extensions.
 */
const imageFileFilter = (req, file, cb) => {
  const ext = `.${(file.originalname || '').toLowerCase().split('.').pop()}`;

  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type "${file.mimetype}". Only JPG, JPEG, PNG, and WEBP are allowed.`),
      false
    );
  }
};

/**
 * Base multer instance — memory storage, image filter, 10 MB limit.
 */
const baseMulter = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ─── Named Upload Middleware Sets ─────────────────────────────────────────────
// Each export is an array of middleware to spread into router.post(path, ...middleware, handler).

/**
 * Generic single-image upload on field name 'image'.
 * Used by the /api/images/upload route.
 */
export const uploadSingleImage = baseMulter.single('image');

/**
 * Multiple images on field name 'images'.
 * Used by the /api/images/upload-multiple route.
 */
export const uploadMultipleImages = baseMulter.array('images', 20);

/**
 * Product images: primary image, front view, back view.
 */
export const uploadProductImage = baseMulter.fields([
  { name: 'image',      maxCount: 1 },
  { name: 'front_view', maxCount: 1 },
  { name: 'back_view',  maxCount: 1 },
]);

/**
 * Vendor KYC / profile documents: logo, store banner, KYC docs, gallery.
 */
export const uploadVendorDocs = baseMulter.fields([
  { name: 'business_logo',   maxCount: 1 },
  { name: 'store_banner',    maxCount: 1 },
  { name: 'kyc_documents',   maxCount: 5 },
  { name: 'gallery_images',  maxCount: 10 },
]);

/**
 * User profile photo.
 */
export const uploadProfileImage = baseMulter.single('profile_image');

/**
 * Banner image (admin).
 */
export const uploadBanner = baseMulter.single('banner');

/**
 * Category icon.
 */
export const uploadCategoryIcon = baseMulter.single('icon');

/**
 * Service image (vendor services).
 * Multiple fields named service_image_0, service_image_1, …
 */
export const uploadServiceImages = baseMulter.any();

/**
 * Advertisement desktop + mobile images.
 */
export const uploadAdvertisement = baseMulter.fields([
  { name: 'image',        maxCount: 1 },
  { name: 'mobile_image', maxCount: 1 },
]);

/**
 * Generic single upload — for any ad-hoc use.
 */
export const genericUpload = baseMulter;

const documentFileFilter = (req, file, cb) => {
  const ext = `.${(file.originalname || '').toLowerCase().split('.').pop()}`;
  const allowedExts = ['.pdf', '.doc', '.docx'];
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, DOC, and DOCX are allowed.'),
      false
    );
  }
};

const docMulter = multer({
  storage: multer.memoryStorage(),
  fileFilter: documentFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadResumeFile = docMulter.single('resume');
