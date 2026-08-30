import express from 'express';
import { 
  getVendorServices, 
  saveVendorServices, 
  createServiceEnquiry, 
  getVendorEnquiries, 
  getUnreadEnquiriesCount,
  getCustomerEnquiries,
  acceptEnquiry,
  rejectEnquiry,
  completeService,
  getServiceById
} from '../controllers/serviceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { uploadServiceImages } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Customer-only routes
router.get('/customer', protect, getCustomerEnquiries);

// Public routes (Dynamic routes at bottom)
router.get('/vendor/:vendorId', getVendorServices);
router.post('/enquire', createServiceEnquiry);

// Vendor-only routes — uploadServiceImages uses multer.any() to accept service_image_N fields
router.post('/vendor', protect, authorize('VENDOR'), uploadServiceImages, saveVendorServices);
router.get('/enquiries/unread-count', protect, authorize('VENDOR'), getUnreadEnquiriesCount);
router.get('/enquiries', protect, authorize('VENDOR'), getVendorEnquiries);
router.put('/enquiry/:id/accept', protect, authorize('VENDOR'), acceptEnquiry);
router.put('/enquiry/:id/reject', protect, authorize('VENDOR'), rejectEnquiry);
router.put('/enquiry/:id/complete', protect, authorize('VENDOR'), completeService);

// Dynamic routes MUST be at the bottom
router.get('/:id', getServiceById);

export default router;
