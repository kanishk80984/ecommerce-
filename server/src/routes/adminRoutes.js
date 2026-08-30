import express from 'express';
import { getReferralBonus, updateReferralBonus } from '../controllers/adminReferralController.js';
import { 
  getVendors, updateVendorStatus, createSubscriptionPlan, getSubscriptionPlans, 
  getAnalytics, getBanners, uploadBanner, deleteBanner, 
  getAdminProducts, createAdminProduct, updateAdminProduct, deleteAdminProduct, 
  getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
  suspendVendor, unsuspendVendor,
  getUsers, deleteUser, suspendUser, unsuspendUser, loginAsUser,
  getCategoriesWithMargins, updateCategoryMargin,
  getAttributeGroups, createAttributeGroup, updateAttributeGroup, deleteAttributeGroup, createAttributeValue, deleteAttributeValue,
  getSearchAnalytics, deleteSearchAnalytics,
  getSupportRequests, updateSupportRequestStatus,
  updateMyCredentials,
  getAdminCategories, createCategory, deleteCategory, deleteServiceCategory, updateCategory,
  getPayouts, updatePayoutStatus, getVendorPayoutDetails,
  getRefundRequests, updateRefundRequestStatus,
  getCategoryRequests, decideCategoryRequest
} from '../controllers/adminController.js';
import { getCategorySeo, saveCategorySeo, deleteCategoryKeyword, getLocations, addLocation,
  getServiceCategorySeo, saveServiceCategorySeo, deleteServiceCategoryKeyword, uploadServiceCategoryBanner
} from '../controllers/seoController.js';
import { getAllCategories as getAllJobCategories, createCategory as createJobCategory, updateCategory as updateJobCategory, toggleStatus as toggleJobCategoryStatus, deleteCategory as deleteJobCategory } from '../controllers/jobCategoryController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { uploadBanner as uploadBannerMiddleware, uploadProductImage, uploadAdvertisement, uploadSingleImage } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// User Management (ADMIN)
router.get('/users', authorize('ADMIN'), getUsers);
router.delete('/users/:id', authorize('ADMIN'), deleteUser);
router.put('/users/:id/suspend', authorize('ADMIN'), suspendUser);
router.put('/users/:id/unsuspend', authorize('ADMIN'), unsuspendUser);
router.post('/users/:id/login-as', authorize('ADMIN'), loginAsUser);

// Vendor Management (ADMIN)
router.get('/vendors', authorize('ADMIN'), getVendors);
router.put('/vendors/:id/status', authorize('ADMIN'), updateVendorStatus);
router.put('/vendors/:id/suspend', authorize('ADMIN'), suspendVendor);
router.put('/vendors/:id/unsuspend', authorize('ADMIN'), unsuspendVendor);

// Vendor Referral Management (ADMIN)
router.get('/vendor-referral-bonus', authorize('ADMIN'), getReferralBonus);
router.put('/vendor-referral-bonus', authorize('ADMIN'), updateReferralBonus);

// Technical Support Management (ADMIN)
router.get('/support-requests', authorize('ADMIN'), getSupportRequests);
router.put('/support-requests/:id/status', authorize('ADMIN'), updateSupportRequestStatus);

// Analytics Dashboard (ADMIN)
router.get('/analytics', authorize('ADMIN'), getAnalytics);

// Category Management (ADMIN)
router.get('/categories', authorize('ADMIN'), getAdminCategories);
router.post('/categories', authorize('ADMIN'), createCategory);
router.put('/categories/:id', authorize('ADMIN'), updateCategory);
router.delete('/categories/:id', authorize('ADMIN'), deleteCategory);
router.get('/service-categories', authorize('ADMIN'), getCategoryRequests);
router.post('/service-categories/:id/decide', authorize('ADMIN'), decideCategoryRequest);
router.delete('/service-categories/:name', authorize('ADMIN'), deleteServiceCategory);

// Service Category SEO Keyword & Target Location Routes (ADMIN)
router.get('/service-categories/:categoryId/seo', authorize('ADMIN'), getServiceCategorySeo);
router.post('/service-categories/:categoryId/seo', authorize('ADMIN'), saveServiceCategorySeo);
router.post('/service-categories/:categoryId/banner', authorize('ADMIN'), uploadSingleImage, uploadServiceCategoryBanner);
router.put('/service-categories/:categoryId/seo', authorize('ADMIN'), saveServiceCategorySeo);
router.delete('/service-categories/:categoryId/seo/keywords/:keywordId', authorize('ADMIN'), deleteServiceCategoryKeyword);
router.get('/locations', authorize('ADMIN'), getLocations);
router.post('/locations', authorize('ADMIN'), addLocation);

// Banners Management (ADMIN)
router.get('/banners', authorize('ADMIN'), getBanners);
router.post('/banners', authorize('ADMIN'), uploadBannerMiddleware, uploadBanner);
router.delete('/banners/:id', authorize('ADMIN'), deleteBanner);

// Product Management (ADMIN)
router.get('/products', authorize('ADMIN'), getAdminProducts);
router.post('/products', authorize('ADMIN'), uploadProductImage, createAdminProduct);
router.put('/products/:id', authorize('ADMIN'), uploadProductImage, updateAdminProduct);
router.delete('/products/:id', authorize('ADMIN'), deleteAdminProduct);

// Advertisement Management (ADMIN)
router.get('/advertisements', authorize('ADMIN'), getAdvertisements);
router.post('/advertisements', authorize('ADMIN'), uploadAdvertisement, createAdvertisement);
router.put('/advertisements/:id', authorize('ADMIN'), uploadAdvertisement, updateAdvertisement);
router.delete('/advertisements/:id', authorize('ADMIN'), deleteAdvertisement);

// Dynamic Attribute Groups & Values Management (ADMIN)
router.get('/attributes/groups', authorize('ADMIN'), getAttributeGroups);
router.post('/attributes/groups', authorize('ADMIN'), createAttributeGroup);
router.put('/attributes/groups/:id', authorize('ADMIN'), updateAttributeGroup);
router.delete('/attributes/groups/:id', authorize('ADMIN'), deleteAttributeGroup);
router.post('/attributes/values', authorize('ADMIN'), createAttributeValue);
router.delete('/attributes/values/:id', authorize('ADMIN'), deleteAttributeValue);

// ─── Extended Admin Features ──────────────────────────────────────────────────

// Payouts
router.get('/payouts', authorize('ADMIN'), getPayouts);
router.get('/payouts/vendor/:vendorId', authorize('ADMIN'), getVendorPayoutDetails);
router.put('/payouts/:id/status', authorize('ADMIN'), updatePayoutStatus);

// Refund Requests
router.get('/refund-requests', authorize('ADMIN'), getRefundRequests);
router.put('/refund-requests/:id/status', authorize('ADMIN'), updateRefundRequestStatus);

// Search & Behaviour Analytics (ADMIN)
router.get('/analytics/search', authorize('ADMIN'), getSearchAnalytics);
router.delete('/analytics/search', authorize('ADMIN'), deleteSearchAnalytics);

// Admin can update their OWN credentials
router.put('/my-credentials', authorize('ADMIN'), updateMyCredentials);

// Job Category Management (ADMIN)
router.get('/job-categories', authorize('ADMIN'), getAllJobCategories);
router.post('/job-categories', authorize('ADMIN'), createJobCategory);
router.put('/job-categories/:id', authorize('ADMIN'), updateJobCategory);
router.patch('/job-categories/:id/status', authorize('ADMIN'), toggleJobCategoryStatus);
router.delete('/job-categories/:id', authorize('ADMIN'), deleteJobCategory);

export default router;
