import express from 'express';
import { 
  createReturnRequest, 
  getCustomerReturns, 
  getVendorReturns, 
  updateReturnStatus, 
  getAllReturns,
  adminUpdateReturnStatus,
  submitCustomerReturnTracking
} from '../controllers/returnController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Customer Routes
router.post('/request', protect, createReturnRequest);
router.get('/my-returns', protect, getCustomerReturns);
router.post('/:returnId/tracking', protect, submitCustomerReturnTracking);

// Vendor Routes
router.get('/vendor', protect, authorize('VENDOR'), getVendorReturns);
router.post('/vendor/:returnId/action', protect, authorize('VENDOR'), updateReturnStatus);

// Admin Routes
router.get('/admin', protect, authorize('ADMIN', 'SUPER_ADMIN'), getAllReturns);
router.post('/admin/:returnId/action', protect, authorize('ADMIN', 'SUPER_ADMIN'), adminUpdateReturnStatus);

export default router;
