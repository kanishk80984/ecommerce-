import express from 'express';
import { createOrder, getCustomerOrders, raiseRefundRequest, getMyRefundRequests, markDeliveryReceived, handleReturnStatusCallback } from '../controllers/orderController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { dispatchFlowAuth } from '../middlewares/dispatchFlowAuth.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/', protect, getCustomerOrders);
router.put('/:id/received', protect, markDeliveryReceived);

// Callback from Delivery Application (DispatchFlow)
router.patch('/:orderId/return-status', dispatchFlowAuth, handleReturnStatusCallback);
router.post('/:orderId/return-status', dispatchFlowAuth, handleReturnStatusCallback);

// Refunds
router.post('/refunds', protect, raiseRefundRequest);
router.get('/refunds', protect, getMyRefundRequests);

export default router;
