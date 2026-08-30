import express from 'express';
import { 
  healthCheck, 
  getOrders, 
  getOrderById, 
  updateOrderStatus, 
  addTracking 
} from '../controllers/dispatchFlowController.js';
import { dispatchFlowAuth } from '../middlewares/dispatchFlowAuth.js';
import { validateStatusUpdate, validateTrackingUpdate } from '../utils/dispatchFlowValidation.js';

const router = express.Router();

// Middleware to skip this router if it's not a DispatchFlow request (missing x-api-key)
// This ensures we don't block existing internal routes on /api/delivery
router.use((req, res, next) => {
  if (req.headers['x-api-key']) {
    return next();
  }
  next('router');
});

// Apply DispatchFlow authentication to all routes below
router.use(dispatchFlowAuth);

// Endpoints
router.get('/health', healthCheck);
router.get('/orders', getOrders);
router.get('/orders/:orderId', getOrderById);
router.post('/orders/:orderId/status', validateStatusUpdate, updateOrderStatus);
router.post('/orders/:orderId/tracking', validateTrackingUpdate, addTracking);

export default router;
