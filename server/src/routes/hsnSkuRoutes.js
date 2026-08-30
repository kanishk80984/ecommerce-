import express from 'express';
import { 
  getHsnByCategory, getHsnByProductType, generateSellerSku, validateSellerSku,
  getHsnCodes, addHsnCode, editHsnCode, deleteHsnCode, 
  updateHsnMapping, updateSkuSettings, getSkuSettings
} from '../controllers/hsnSkuController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// HSN Routes
router.get('/hsn/category/:categoryId', getHsnByCategory);
router.get('/hsn/product-type/:productTypeId', getHsnByProductType);
router.get('/hsn/codes', getHsnCodes);

// SKU Routes
router.get('/sku/generate', generateSellerSku);
router.post('/sku/validate', validateSellerSku);

// Admin Routes (Protect with ADMIN middleware)
router.post('/admin/hsn/add', protect, authorize('ADMIN'), addHsnCode);
router.put('/admin/hsn/edit/:id', protect, authorize('ADMIN'), editHsnCode);
router.delete('/admin/hsn/delete/:id', protect, authorize('ADMIN'), deleteHsnCode);
router.post('/admin/hsn/mapping', protect, authorize('ADMIN'), updateHsnMapping);
router.post('/admin/sku/settings', protect, authorize('ADMIN'), updateSkuSettings);
router.get('/admin/sku/settings/list', protect, authorize('ADMIN'), getSkuSettings);

// Super Admin Routes (Protect with SUPER_ADMIN middleware)
router.post('/superadmin/hsn/add', protect, authorize('SUPER_ADMIN'), addHsnCode);
router.put('/superadmin/hsn/edit/:id', protect, authorize('SUPER_ADMIN'), editHsnCode);
router.delete('/superadmin/hsn/delete/:id', protect, authorize('SUPER_ADMIN'), deleteHsnCode);
router.post('/superadmin/hsn/mapping', protect, authorize('SUPER_ADMIN'), updateHsnMapping);
router.post('/superadmin/sku/settings', protect, authorize('SUPER_ADMIN'), updateSkuSettings);
router.get('/superadmin/sku/settings/list', protect, authorize('SUPER_ADMIN'), getSkuSettings);

export default router;
