import express from 'express';
import { login, register, getProfile, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadProfileImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, uploadProfileImage, updateProfile);

export default router;
