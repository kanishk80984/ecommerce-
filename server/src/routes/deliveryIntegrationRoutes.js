import express from 'express';
import { 
  getSettings, updateSettings, testConnection, getLogs, 
  healthCheck, getDeliveryInfo, createDeliveryRequest, 
  updateDeliveryStatus, retryDeliveryRequest 
} from '../controllers/deliveryIntegrationController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Super Admin Settings Routes
router.get('/settings', protect, authorize('SUPER_ADMIN'), getSettings);
router.put('/settings', protect, authorize('SUPER_ADMIN'), updateSettings);
router.post('/settings/test', protect, authorize('SUPER_ADMIN'), testConnection);
router.get('/logs', protect, authorize('SUPER_ADMIN'), getLogs);

// Delivery Integration Execution Routes (Can be accessed by vendor/admin depending on action)
router.get('/health', healthCheck);
router.get('/orders/:orderId', protect, getDeliveryInfo);
router.post('/request', protect, authorize('VENDOR', 'SUPER_ADMIN', 'ADMIN'), createDeliveryRequest);
router.put('/status', protect, updateDeliveryStatus);
router.post('/retry', protect, authorize('VENDOR', 'SUPER_ADMIN', 'ADMIN'), retryDeliveryRequest);

export default router;
