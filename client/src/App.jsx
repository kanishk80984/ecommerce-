import React, { useEffect, useRef } from 'react';
import * as rrdPkg from 'react-router-dom';
const { Routes, Route, Navigate, useLocation, useNavigationType } = rrdPkg;
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';
import VendorLayout from './layouts/VendorLayout';
import SupportLayout from './layouts/SupportLayout';

// Support Pages
import SupportDashboard from './pages/support/SupportDashboard';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import BusinessProfile from './pages/BusinessProfile';
import BusinessReviews from './pages/BusinessReviews';
import Businesses from './pages/Businesses';
import Categories from './pages/Categories';
import Products from './pages/Products';
import ServiceDetails from './pages/ServiceDetails';
import GalleryDetails from './pages/GalleryDetails';
import BusinessGalleryPage from './pages/BusinessGalleryPage';
import ServiceCategoryPage from './pages/ServiceCategoryPage';
import DynamicDetailDispatcher from './pages/DynamicDetailDispatcher';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import VendorManagement from './pages/admin/VendorManagement';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import BannerManagement from './pages/admin/BannerManagement';
import AdminProductManagement from './pages/admin/ProductManagement';
import AdvertisementManagement from './pages/admin/AdvertisementManagement';
import UserManagement from './pages/admin/UserManagement';
import AdminPaymentSettings from './pages/admin/PaymentSettings';
import HsnSkuManagement from './pages/admin/HsnSkuManagement';
import CategoryMarginManagement from './pages/admin/CategoryMarginManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import CategoryRequests from './pages/admin/CategoryRequests';
import AttributeManagement from './pages/admin/AttributeManagement';
import SearchAnalytics from './pages/admin/SearchAnalytics';
import SupportManagement from './pages/admin/SupportManagement';
import AuditLogs from './pages/admin/AuditLogs';
import PayoutsManagement from './pages/admin/PayoutsManagement';
import RefundsManagement from './pages/admin/RefundsManagement';
import AdminReturns from './pages/admin/AdminReturns';
import AddressManagement from './pages/AddressManagement';
import VendorReturns from './pages/vendor/VendorReturns';
import VendorCommunications from './pages/vendor/VendorCommunications';
import VendorChat from './pages/vendor/VendorChat';

import VendorJobs from './pages/vendor/VendorJobs';
import VendorJobForm from './pages/vendor/VendorJobForm';
import VendorJobApplications from './pages/vendor/VendorJobApplications';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';

import DeliveryIntegrationSettings from './pages/admin/DeliveryIntegrationSettings';
import ApiDocumentation from './pages/admin/ApiDocumentation';

// Vendor Pages
import VendorDashboard from './pages/vendor/Dashboard';
import VendorSubscription from './pages/vendor/Subscription';
import ProductUpload from './pages/vendor/ProductUpload';
import CommunityBusiness from './pages/vendor/CommunityBusiness';
import PaymentSettings from './pages/vendor/PaymentSettings';
import VendorOnboarding from './pages/VendorOnboarding';
import VendorEnquiries from './pages/vendor/VendorEnquiries';
import VendorStatus from './pages/vendor/VendorStatus';
import VendorPayouts from './pages/vendor/VendorPayouts';
import VendorOrders from './pages/vendor/VendorOrders';

// IBC Business Network Pages
import AdminBNDashboard from './pages/admin/businessNetwork/Dashboard';
import AdminBNChapters from './pages/admin/businessNetwork/Chapters';
import AdminBNApplications from './pages/admin/businessNetwork/ChapterApplications';
import AdminBNCategories from './pages/admin/businessNetwork/Categories';
import AdminBNReferrals from './pages/admin/businessNetwork/Referrals';
import AdminBNMeetings from './pages/admin/businessNetwork/Meetings';
import AdminBNVisitors from './pages/admin/businessNetwork/Visitors';
import AdminBNReports from './pages/admin/businessNetwork/Reports';

import VendorBNDashboard from './pages/vendor/businessNetwork/Dashboard';
import VendorBNFindChapters from './pages/vendor/businessNetwork/FindChapters';
import VendorBNMyChapter from './pages/vendor/businessNetwork/MyChapter';
import VendorBNReferrals from './pages/vendor/businessNetwork/Referrals';
import VendorBNRequirements from './pages/vendor/businessNetwork/Requirements';
import VendorBNMeetings from './pages/vendor/businessNetwork/Meetings';
import VendorBNVisitors from './pages/vendor/businessNetwork/Visitors';
import VendorBNPerformance from './pages/vendor/businessNetwork/Performance';

const PrivateRoute = ({ children, roleRequired, allowUnapproved = false }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If user is suspended, they can only access the vendor status page (unless impersonated by admin)
  const isAdminImpersonating = !!localStorage.getItem('adminSession');
  if (user?.is_suspended && !allowUnapproved && !isAdminImpersonating) {
    return <Navigate to="/vendor/status" replace />;
  }

  // If user is a VENDOR/TECHNICAL_SUPPORT and not approved, they can only view status page (unless impersonated by admin)
  const isUnapprovedVendor = user?.role === 'VENDOR' && (!user?.is_approved || user?.kyc_status !== 'APPROVED');
  const isUnapprovedSupport = user?.role === 'TECHNICAL_SUPPORT' && !user?.is_approved;
  if ((isUnapprovedVendor || isUnapprovedSupport) && !allowUnapproved && !isAdminImpersonating) {
    return <Navigate to="/vendor/status" replace />;
  }

  // If user is approved and active but tries to go to status page, redirect back
  if (allowUnapproved && !user?.is_suspended) {
    if (user?.role === 'VENDOR' && user?.is_approved && user?.kyc_status === 'APPROVED') {
      return <Navigate to="/vendor" replace />;
    }
    if (user?.role === 'TECHNICAL_SUPPORT' && user?.is_approved) {
      return <Navigate to="/" replace />;
    }
  }
  
  // Role check
  if (roleRequired) {
    const roles = Array.isArray(roleRequired) ? roleRequired : [roleRequired];
    if (!roles.includes(user?.role) && user?.role !== 'SUPER_ADMIN') {
      return <Navigate to="/" replace />; // Or unauthorized page
    }
  }
  
  return children;
};

import { ImpersonationBar } from './components/ImpersonationBar';
import AdminReferralBonus from './pages/admin/AdminReferralBonus';
import AdminVendorPayoutDetails from './pages/admin/AdminVendorPayoutDetails';
import VendorReferral from './pages/vendor/VendorReferral';
import JobCategoryManagement from './pages/admin/JobCategoryManagement';

let initialAppLoad = true;

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const key = `scroll_pos_${pathname}${search}`;
    
    // Detect page refresh/reload using modern and fallback Performance APIs (only on initial load)
    const isReload = 
      initialAppLoad && (
        performance.getEntriesByType('navigation')[0]?.type === 'reload' || 
        performance.navigation?.type === 1
      );

    if (isReload) {
      sessionStorage.removeItem(key);
    }
    initialAppLoad = false;

    const saved = sessionStorage.getItem(key);

    const restoreScroll = () => {
      if (navType === 'POP' && saved && !isReload) {
        window.scrollTo({
          top: parseInt(saved, 10),
          behavior: 'instant'
        });
      } else if (prevPathnameRef.current !== pathname) {
        // Only scroll to top if we navigated to a DIFFERENT page (pathname changed)
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        });
      }
    };

    // Restore immediately
    restoreScroll();

    // Fallback retries to handle asynchronous API loading times
    const timer1 = setTimeout(restoreScroll, 100);
    const timer2 = setTimeout(restoreScroll, 300);

    const handleScroll = () => {
      sessionStorage.setItem(key, window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      prevPathnameRef.current = pathname;
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, search, navType]);

  return null;
};

const App = () => {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <ImpersonationBar />
      <Toaster position="top-right" />
      <ScrollToTop />
      <div className="flex flex-1 flex-col">
        <Routes>
      {/* Customer Facing Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/:category/product/:slug" element={<ProductDetails />} />
        <Route path="/:category/product/:variantSlug/:slug" element={<ProductDetails />} />
        <Route path="/service/:slug" element={<ServiceDetails />} />

        <Route path="/gallery-product/:vendorSlug/:itemIndex" element={<GalleryDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/products" element={<Products />} />
        <Route path="/category/:slug" element={<Products />} />
        <Route path="/brand/:slug" element={<Products />} />
        <Route path="/shop/:slug" element={<BusinessProfile />} />
        <Route path="/:locationSlug/shop/:slug/:categorySlug" element={<BusinessProfile />} />
        <Route path="/:locationSlug/shop/:slug/:categorySlug/:keywordsSlug" element={<BusinessProfile />} />
        <Route path="/shop/:slug/gallery" element={<BusinessGalleryPage />} />
        <Route path="/shop/:slug/reviews" element={<BusinessReviews />} />
        <Route path="/:locationSlug/:categorySlug/gallery/:slug" element={<BusinessGalleryPage />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/:locationSlug/businesses" element={<Businesses />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:slug" element={<JobDetails />} />
        <Route path="/jobs/:slug/:locationSlug" element={<JobDetails />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/account" element={<PrivateRoute><AddressManagement /></PrivateRoute>} />
        <Route path="/account/:tab" element={<PrivateRoute><AddressManagement /></PrivateRoute>} />

        {/* Dynamic SEO Routes (Must be at the Bottom of CustomerLayout) */}
        <Route path="/:locationSlug/:vendorSlug/:categorySlug/:serviceTitle" element={<DynamicDetailDispatcher />} />
        <Route path="/:locationSlug/:categorySlug/:slug/:vendorSlug" element={<DynamicDetailDispatcher />} />
        <Route path="/:locationSlug/:categorySlug" element={<ServiceCategoryPage />} />
        <Route path="/:categorySlug" element={<ServiceCategoryPage />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Admin Protected Routes */}
      <Route path="/admin" element={<PrivateRoute roleRequired="ADMIN"><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProductManagement />} />
        <Route path="advertisements" element={<AdvertisementManagement />} />
        <Route path="vendors" element={<VendorManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="support-requests" element={<SupportManagement />} />
        <Route path="banners" element={<BannerManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="service-categories" element={<CategoryRequests />} />
        <Route path="analytics" element={<SearchAnalytics />} />
        <Route path="payment-settings" element={<AdminPaymentSettings />} />
        <Route path="vendor-payouts" element={<PayoutsManagement />} />
        <Route path="vendor-payouts/:vendorId" element={<AdminVendorPayoutDetails />} />
        <Route path="refund-requests" element={<RefundsManagement />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="job-categories" element={<JobCategoryManagement />} />
        
        {/* Business Network routes */}
        <Route path="business-network" element={<AdminBNDashboard />} />
        <Route path="business-network/chapters" element={<AdminBNChapters />} />
        <Route path="business-network/applications" element={<AdminBNApplications />} />
        <Route path="business-network/categories" element={<AdminBNCategories />} />
        <Route path="business-network/referrals" element={<AdminBNReferrals />} />
        <Route path="business-network/meetings" element={<AdminBNMeetings />} />
        <Route path="business-network/visitors" element={<AdminBNVisitors />} />
        <Route path="business-network/reports" element={<AdminBNReports />} />
      </Route>

      {/* Super Admin Protected Routes */}
      <Route path="/superadmin" element={<PrivateRoute roleRequired="SUPER_ADMIN"><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProductManagement />} />
        <Route path="advertisements" element={<AdvertisementManagement />} />
        <Route path="vendors" element={<VendorManagement />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="support-requests" element={<SupportManagement />} />
        <Route path="subscriptions" element={<SubscriptionManagement />} />
        <Route path="referral-bonus" element={<AdminReferralBonus />} />
        <Route path="banners" element={<BannerManagement />} />
        <Route path="payment-settings" element={<AdminPaymentSettings />} />
        <Route path="hsn-sku" element={<HsnSkuManagement />} />
        <Route path="category-margins" element={<CategoryMarginManagement />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="service-categories" element={<CategoryRequests />} />
        <Route path="attributes" element={<AttributeManagement />} />
        <Route path="analytics" element={<SearchAnalytics />} />
        <Route path="vendor-payouts" element={<PayoutsManagement />} />
        <Route path="vendor-payouts/:vendorId" element={<AdminVendorPayoutDetails />} />
        <Route path="refund-requests" element={<RefundsManagement />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="delivery-settings" element={<DeliveryIntegrationSettings />} />
        <Route path="api-docs" element={<ApiDocumentation />} />
        <Route path="returns" element={<AdminReturns />} />
        <Route path="job-categories" element={<JobCategoryManagement />} />
        
        {/* Business Network routes */}
        <Route path="business-network" element={<AdminBNDashboard />} />
        <Route path="business-network/chapters" element={<AdminBNChapters />} />
        <Route path="business-network/applications" element={<AdminBNApplications />} />
        <Route path="business-network/categories" element={<AdminBNCategories />} />
        <Route path="business-network/referrals" element={<AdminBNReferrals />} />
        <Route path="business-network/meetings" element={<AdminBNMeetings />} />
        <Route path="business-network/visitors" element={<AdminBNVisitors />} />
        <Route path="business-network/reports" element={<AdminBNReports />} />
      </Route>


      {/* Support Protected Routes */}
      <Route path="/support-portal" element={<PrivateRoute roleRequired="TECHNICAL_SUPPORT"><SupportLayout /></PrivateRoute>}>
        <Route index element={<SupportDashboard />} />
      </Route>

      {/* Vendor Protected Routes */}
      <Route path="/vendor" element={<PrivateRoute roleRequired="VENDOR"><VendorLayout /></PrivateRoute>}>
        <Route index element={<VendorDashboard />} />
        <Route path="products" element={<ProductUpload />} />
        <Route path="community-profile" element={<CommunityBusiness />} />
        <Route path="enquiries" element={<VendorEnquiries />} />
        <Route path="subscription" element={<VendorSubscription />} />
        <Route path="payouts" element={<VendorPayouts />} />
        <Route path="referral" element={<VendorReferral />} />
        <Route path="payment-settings" element={<PaymentSettings />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="returns" element={<VendorReturns />} />
        <Route path="communicate" element={<VendorCommunications />} />
        <Route path="communicate/:id" element={<VendorChat />} />
        <Route path="jobs" element={<VendorJobs />} />
        <Route path="jobs/create" element={<VendorJobForm />} />
        <Route path="jobs/edit/:id" element={<VendorJobForm />} />
        <Route path="jobs/applications" element={<VendorJobApplications />} />
        
        {/* Business Network routes */}
        <Route path="business-network" element={<VendorBNDashboard />} />
        <Route path="business-network/find-chapters" element={<VendorBNFindChapters />} />
        <Route path="business-network/my-chapter" element={<VendorBNMyChapter />} />
        <Route path="business-network/referrals" element={<VendorBNReferrals />} />
        <Route path="business-network/requirements" element={<VendorBNRequirements />} />
        <Route path="business-network/meetings" element={<VendorBNMeetings />} />
        <Route path="business-network/visitors" element={<VendorBNVisitors />} />
        <Route path="business-network/performance" element={<VendorBNPerformance />} />
      </Route>

      {/* Vendor Status Route */}
      <Route path="/vendor/status" element={<PrivateRoute roleRequired={["VENDOR", "TECHNICAL_SUPPORT"]} allowUnapproved={true}><VendorStatus /></PrivateRoute>} />

      {/* Vendor Onboarding Route */}
      <Route path="/vendor/onboarding" element={<PrivateRoute roleRequired="VENDOR"><VendorOnboarding /></PrivateRoute>} />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
