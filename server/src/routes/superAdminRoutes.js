import express from 'express';
import { getReferralBonus, updateReferralBonus } from '../controllers/adminReferralController.js';
import { 
  getVendors, updateVendorStatus, createSubscriptionPlan, getSubscriptionPlans, 
  getAnalytics, getBanners, uploadBanner, deleteBanner, 
  getAdminProducts, createAdminProduct, updateAdminProduct, deleteAdminProduct, 
  getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
  suspendVendor, unsuspendVendor,
  getUsers, deleteUser, suspendUser, unsuspendUser, loginAsUser, toggleLoginAsDisabled,
  getCategoriesWithMargins, updateCategoryMargin,
  getAttributeGroups, createAttributeGroup, updateAttributeGroup, deleteAttributeGroup, createAttributeValue, deleteAttributeValue,
  getSearchAnalytics, deleteSearchAnalytics,
  getSupportRequests, updateSupportRequestStatus,
  createAdminUser, updateUserCredentials, updateMyCredentials,
  getAdminCategories, createCategory, deleteCategory,
  getAuditLogs, getBankAccounts, getPayouts, updatePayoutStatus, getVendorPayoutDetails, getRefundRequests, updateRefundRequestStatus,
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

// User Management (SUPER_ADMIN)
router.get('/users', authorize('SUPER_ADMIN'), getUsers);
router.delete('/users/:id', authorize('SUPER_ADMIN'), deleteUser);
router.put('/users/toggle-login-as', authorize('SUPER_ADMIN'), toggleLoginAsDisabled);
router.put('/users/:id/suspend', authorize('SUPER_ADMIN'), suspendUser);
router.put('/users/:id/unsuspend', authorize('SUPER_ADMIN'), unsuspendUser);
router.post('/users/:id/login-as', authorize('SUPER_ADMIN'), loginAsUser);

// Vendor Management (SUPER_ADMIN)
router.get('/vendors', authorize('SUPER_ADMIN'), getVendors);
router.put('/vendors/:id/status', authorize('SUPER_ADMIN'), updateVendorStatus);
router.put('/vendors/:id/suspend', authorize('SUPER_ADMIN'), suspendVendor);
router.put('/vendors/:id/unsuspend', authorize('SUPER_ADMIN'), unsuspendVendor);

// Vendor Referral Management (SUPER_ADMIN)
router.get('/vendor-referral-bonus', authorize('SUPER_ADMIN'), getReferralBonus);
router.put('/vendor-referral-bonus', authorize('SUPER_ADMIN'), updateReferralBonus);

// Technical Support Management (SUPER_ADMIN)
router.get('/support-requests', authorize('SUPER_ADMIN'), getSupportRequests);
router.put('/support-requests/:id/status', authorize('SUPER_ADMIN'), updateSupportRequestStatus);

// Analytics Dashboard (SUPER_ADMIN)
router.get('/analytics', authorize('SUPER_ADMIN'), getAnalytics);

// Banners Management (SUPER_ADMIN)
router.get('/banners', authorize('SUPER_ADMIN'), getBanners);
router.post('/banners', authorize('SUPER_ADMIN'), uploadBannerMiddleware, uploadBanner);
router.delete('/banners/:id', authorize('SUPER_ADMIN'), deleteBanner);

// Product Management (SUPER_ADMIN)
router.get('/products', authorize('SUPER_ADMIN'), getAdminProducts);
router.post('/products', authorize('SUPER_ADMIN'), uploadProductImage, createAdminProduct);
router.put('/products/:id', authorize('SUPER_ADMIN'), uploadProductImage, updateAdminProduct);
router.delete('/products/:id', authorize('SUPER_ADMIN'), deleteAdminProduct);

// Advertisement Management (SUPER_ADMIN)
router.get('/advertisements', authorize('SUPER_ADMIN'), getAdvertisements);
router.post('/advertisements', authorize('SUPER_ADMIN'), uploadAdvertisement, createAdvertisement);
router.put('/advertisements/:id', authorize('SUPER_ADMIN'), uploadAdvertisement, updateAdvertisement);
router.delete('/advertisements/:id', authorize('SUPER_ADMIN'), deleteAdvertisement);

// Dynamic Attribute Groups & Values Management (SUPER_ADMIN)
router.get('/attributes/groups', authorize('SUPER_ADMIN'), getAttributeGroups);
router.post('/attributes/groups', authorize('SUPER_ADMIN'), createAttributeGroup);
router.put('/attributes/groups/:id', authorize('SUPER_ADMIN'), updateAttributeGroup);
router.delete('/attributes/groups/:id', authorize('SUPER_ADMIN'), deleteAttributeGroup);
router.post('/attributes/values', authorize('SUPER_ADMIN'), createAttributeValue);
router.delete('/attributes/values/:id', authorize('SUPER_ADMIN'), deleteAttributeValue);

// Search & Behaviour Analytics (SUPER_ADMIN)
router.get('/analytics/search', authorize('SUPER_ADMIN'), getSearchAnalytics);
router.delete('/analytics/search', authorize('SUPER_ADMIN'), deleteSearchAnalytics);

// ─── Super Admin Exclusive Features ─────────────────────────────────────────

// Subscription Plans Management (SUPER_ADMIN)
router.get('/plans', authorize('SUPER_ADMIN'), getSubscriptionPlans); 
router.post('/plans', authorize('SUPER_ADMIN'), createSubscriptionPlan);

// Category Margin Management (SUPER_ADMIN)
router.get('/categories/margins', authorize('SUPER_ADMIN'), getCategoriesWithMargins);
router.put('/categories/:id/margin', authorize('SUPER_ADMIN'), updateCategoryMargin);

// Create a new ADMIN or SUPER_ADMIN user
router.post('/admin-users', authorize('SUPER_ADMIN'), createAdminUser);

// Update own credentials (name, email, password)
router.put('/my-credentials', authorize('SUPER_ADMIN'), updateMyCredentials);

// Update any user's credentials
router.put('/users/:id/credentials', authorize('SUPER_ADMIN'), updateUserCredentials);

// Category Creation & Management
router.get('/categories', authorize('SUPER_ADMIN'), getAdminCategories);
router.post('/categories', authorize('SUPER_ADMIN'), createCategory);
router.delete('/categories/:id', authorize('SUPER_ADMIN'), deleteCategory);
router.get('/service-categories', authorize('SUPER_ADMIN'), getCategoryRequests);
router.post('/service-categories/:id/decide', authorize('SUPER_ADMIN'), decideCategoryRequest);

// Service Category SEO Keyword & Target Location Routes (SUPER_ADMIN)
router.get('/service-categories/:categoryId/seo', authorize('SUPER_ADMIN'), getServiceCategorySeo);
router.post('/service-categories/:categoryId/seo', authorize('SUPER_ADMIN'), saveServiceCategorySeo);
router.post('/service-categories/:categoryId/banner', authorize('SUPER_ADMIN'), uploadSingleImage, uploadServiceCategoryBanner);
router.put('/service-categories/:categoryId/seo', authorize('SUPER_ADMIN'), saveServiceCategorySeo);
router.delete('/service-categories/:categoryId/seo/keywords/:keywordId', authorize('SUPER_ADMIN'), deleteServiceCategoryKeyword);
router.get('/locations', authorize('SUPER_ADMIN'), getLocations);
router.post('/locations', authorize('SUPER_ADMIN'), addLocation);

// ─── Extended Admin Features (SUPER_ADMIN) ──────────────────────────────────

// Audit Logs
router.get('/audit-logs', authorize('SUPER_ADMIN'), getAuditLogs);

// Bank Accounts
router.get('/bank-accounts', authorize('SUPER_ADMIN'), getBankAccounts);

// Payouts
router.get('/payouts', authorize('SUPER_ADMIN'), getPayouts);
router.get('/payouts/vendor/:vendorId', authorize('SUPER_ADMIN'), getVendorPayoutDetails);
router.put('/payouts/:id/status', authorize('SUPER_ADMIN'), updatePayoutStatus);

// Refund Requests
router.get('/refund-requests', authorize('SUPER_ADMIN'), getRefundRequests);
router.put('/refund-requests/:id/status', authorize('SUPER_ADMIN'), updateRefundRequestStatus);

// Job Category Management (SUPER_ADMIN)
router.get('/job-categories', authorize('SUPER_ADMIN'), getAllJobCategories);
router.post('/job-categories', authorize('SUPER_ADMIN'), createJobCategory);
router.put('/job-categories/:id', authorize('SUPER_ADMIN'), updateJobCategory);
router.patch('/job-categories/:id/status', authorize('SUPER_ADMIN'), toggleJobCategoryStatus);
router.delete('/job-categories/:id', authorize('SUPER_ADMIN'), deleteJobCategory);

export default router;
