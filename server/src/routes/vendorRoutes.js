import express from 'express';
import { getReferralDashboard, getReferralsList } from '../controllers/vendorReferralController.js';
import { 
  updateKyc, updateBusinessProfile, getDashboard, subscribeToPlan,
  suggestCategory, submitCategoryRequest,
  createProduct, getVendorProducts, updateProduct, deleteProduct,
  getModelsByProduct, createModel, updateModel, deleteModel,
  getVariantsByModel, createVariant, updateVariant, deleteVariant, saveVariantsBatch,
  getMyPayouts, getVendorOrders, updateVendorOrderStatus
} from '../controllers/vendorController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { uploadVendorDocs, uploadProductImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);
router.use(authorize('VENDOR'));

router.put('/kyc', uploadVendorDocs, updateKyc);
router.put('/business-profile', uploadVendorDocs, updateBusinessProfile);
router.post('/suggest-category', suggestCategory);
router.post('/submit-category', submitCategoryRequest);
router.get('/dashboard', getDashboard);
// Vendor Subscription
router.post('/subscribe', subscribeToPlan);

// Product Management (Groups)
router.get('/products', getVendorProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Model Management
router.get('/products/:productId/models', getModelsByProduct);
router.post('/products/:productId/models', createModel);
router.put('/models/:id', updateModel);
router.delete('/models/:id', deleteModel);

// Variant Management
router.get('/models/:modelId/variants', getVariantsByModel);
router.post('/models/:modelId/variants', createVariant);
router.post('/models/:modelId/variants/batch', saveVariantsBatch);
router.put('/variants/:id', updateVariant);
router.delete('/variants/:id', deleteVariant);

// Referrals
router.get('/referral-dashboard', getReferralDashboard);
router.get('/referral-list', getReferralsList);

// Payouts
router.get('/payouts', getMyPayouts);

// Vendor Orders
router.get('/orders', getVendorOrders);
router.put('/orders/:itemId/status', updateVendorOrderStatus);

export default router;
