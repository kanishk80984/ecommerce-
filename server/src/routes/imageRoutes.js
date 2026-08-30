import express from 'express';
import {
  uploadSingleImage,
  uploadMultipleImages as uploadMultipleMiddleware,
} from '../middlewares/uploadMiddleware.js';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getImageMeta,
} from '../controllers/imageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All image routes require authentication
router.use(protect);

// Single image upload
router.post('/upload', uploadSingleImage, uploadImage);

// Multiple images upload
router.post('/upload-multiple', uploadMultipleMiddleware, uploadMultipleImages);

// Delete image (files + DB record)
router.delete('/:id', deleteImage);

// Get image metadata
router.get('/meta/:id', getImageMeta);

export default router;
