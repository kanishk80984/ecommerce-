import React from 'react';
import * as rrdPkg from 'react-router-dom';
const { Outlet, Link, useNavigate, useLocation } = rrdPkg;
import { LayoutDashboard, LogOut, LifeBuoy } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';

const SupportLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { label: 'Support Dashboard', path: '/support-portal', icon: LayoutDashboard },
  ];

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-gray-200 hidden md:flex flex-col shrink-0 h-full">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <Link to="/support-portal" className="flex items-center hover:opacity-90 transition-opacity">
            <img src="/ibc-logo.png" alt="IBC Mart" className="h-12 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto min-h-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
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
          <h2 className="text-lg font-semibold text-gray-800">Support Agent Portal</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-danger bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-100" title="Logout">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">S</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-background support-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SupportLayout;
