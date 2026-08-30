import express from 'express';
import { searchLocation, reverseGeocode, getVendorMapPoints, detectLocation } from '../controllers/locationController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public / Authenticated Location APIs
router.get('/', detectLocation);
router.get('/search', searchLocation);
router.get('/reverse', reverseGeocode);
router.get('/vendor-map-points', protect, getVendorMapPoints);


export default router;
