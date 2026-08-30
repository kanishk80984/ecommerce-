import React from 'react';
import * as rrdPkg from 'react-router-dom';
const { Outlet, Link, useNavigate, useLocation } = rrdPkg;
import { LayoutDashboard, Users, CreditCard, LogOut, Image as ImageIcon, Store, Settings, FileText, Percent, TrendingUp, Truck, RefreshCcw, ChevronDown, ChevronRight, Gift, Briefcase } from 'lucide-react';

import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [openSubMenus, setOpenSubMenus] = React.useState({
    'Vendors': ['/admin/vendors', '/superadmin/vendors', '/admin/referral-bonus', '/superadmin/referral-bonus', '/admin/vendor-payouts', '/superadmin/vendor-payouts'].some(path => location.pathname.startsWith(path)),
    'IBC Business Network': location.pathname.includes('/business-network')
  });

  const toggleSubMenu = (label) => {
    setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', icon: ImageIcon },
    { label: 'Advertisements', path: '/admin/advertisements', icon: ImageIcon },
    { 
      label: 'Vendors', 
      path: '/admin/vendors-menu', 
      icon: Store,
      subItems: [
        { label: 'Vendor List', path: '/admin/vendors', icon: Store },
        { label: 'Vendor Payout', path: '/admin/vendor-payouts', icon: CreditCard },
        { label: 'Referral Bonus', path: '/admin/referral-bonus', icon: Gift, superAdminOnly: true }
      ]
    },
    {
      label: 'IBC Business Network',
      path: '/admin/business-network-menu',
      icon: Users,
      subItems: [
        { label: 'Network Dashboard', path: '/admin/business-network', icon: LayoutDashboard },
        { label: 'Chapters Setup', path: '/admin/business-network/chapters', icon: Store },
        { label: 'Join Applications', path: '/admin/business-network/applications', icon: FileText },
        { label: 'Categories & Specialties', path: '/admin/business-network/categories', icon: Settings },
        { label: 'Referrals Audit', path: '/admin/business-network/referrals', icon: CreditCard },
        { label: 'Chapter Meetings', path: '/admin/business-network/meetings', icon: Percent },
        { label: 'Visitor Registry', path: '/admin/business-network/visitors', icon: Users },
        { label: 'Performance Reports', path: '/admin/business-network/reports', icon: TrendingUp }
      ]
    },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Support Requests', path: '/admin/support-requests', icon: Users },
    { label: 'Payment Settings', path: '/admin/payment-settings', icon: Settings },
    { label: 'Returns', path: '/admin/returns', icon: RefreshCcw },
    { label: 'Refund Requests', path: '/admin/refund-requests', icon: CreditCard },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
    { label: 'HSN & SKU Settings', path: '/admin/hsn-sku', icon: FileText },
    { label: 'Categories', path: '/admin/categories', icon: Store },
    { label: 'Service Categories', path: '/admin/service-categories', icon: Store },
    { label: 'Category Margins', path: '/admin/category-margins', icon: Percent },
    { label: 'Job Management', path: '/admin/job-categories', icon: Briefcase },
    { label: 'Delivery Integration', path: '/admin/delivery-settings', icon: Truck },
    { label: 'API Docs', path: '/admin/api-docs', icon: FileText },
    { label: 'User Analytics', path: '/admin/analytics', icon: TrendingUp },
  ];

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const prefix = isSuperAdmin ? '/superadmin' : '/admin';

  const rawItems = isSuperAdmin ? allNavItems : allNavItems.filter(item =>
    ['Dashboard', 'Products', 'Advertisements', 'Vendors', 'Users', 'Support Requests', 'Categories', 'Service Categories', 'User Analytics', 'Payment Settings', 'Refund Requests', 'Job Management', 'IBC Business Network'].includes(item.label)
  );

  const navItems = rawItems.map(item => {
    const newItem = {
      ...item,
      path: item.path === '/admin' ? prefix : item.path.replace('/admin/', prefix + '/')
    };
    if (item.subItems) {
      newItem.subItems = item.subItems
        .filter(sub => isSuperAdmin || !sub.superAdminOnly)
        .map(sub => ({
          ...sub,
          path: sub.path.replace('/admin/', prefix + '/')
        }));
    }
    return newItem;
  });

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-gray-200 hidden md:flex flex-col shrink-0 h-full">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <Link to={prefix} className="flex items-center hover:opacity-90 transition-opacity">
            <img src="/ibc-logo.png" alt="IBC Mart" className="h-12 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto min-h-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              if (item.subItems) {
                const Icon = item.icon;
                const isAnyChildActive = item.subItems.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path));
                const isSubMenuOpen = !!openSubMenus[item.label];
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleSubMenu(item.label)}
                      className={`w-full flex items-center justify-between px-6 py-3 text-base font-medium transition-colors ${isAnyChildActive ? 'bg-blue-50 text-primary border-r-4 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} />
                        {item.label}
                      </div>
                      {isSubMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {isSubMenuOpen && (
                      <ul className="pl-12 space-y-1 bg-gray-50/50 py-1">
                        {item.subItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = location.pathname === sub.path || location.pathname.startsWith(sub.path);
                          return (
                            <li key={sub.path}>
                              <Link
                                to={sub.path}
                                className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${isSubActive ? 'text-primary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                              >
                                <SubIcon size={16} />
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const Icon = item.icon;
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== prefix);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-6 py-3 text-base font-medium transition-colors ${isActive ? 'bg-blue-50 text-primary border-r-4 border-primary' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-gray-800">
            {isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'}
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-danger bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-100" title="Logout">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <Link to={`${prefix}/users`} className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold hover:bg-primary-dark transition cursor-pointer" title="Go to Profile Settings">
              {isSuperAdmin ? 'SA' : 'A'}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-background admin-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default AdminLayout;
