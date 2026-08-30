import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { Outlet, Link, useNavigate, useLocation } = rrdPkg;
import { LayoutDashboard, Package, CreditCard, LogOut, MessageSquare, X, Store, Phone, FileText, CheckCircle, AlertCircle, ShoppingCart, ChevronDown, ChevronRight, ShoppingBag, BookOpen, Headset, LifeBuoy, Send, Sparkles, RefreshCcw, Users, Briefcase, Calendar, TrendingUp } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice';
import api from '../services/api';

const VendorLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const [enquiriesCount, setEnquiriesCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [vendorName, setVendorName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Help & Support States
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [ticketRaising, setTicketRaising] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (isSupportOpen) {
      fetchSupportTickets();
    }
  }, [isSupportOpen]);

  useEffect(() => {
    if (!selectedTicket) return;
    fetchChatMessages(selectedTicket.id);
    const interval = setInterval(() => {
      fetchChatMessages(selectedTicket.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const fetchSupportTickets = async () => {
    try {
      const res = await api.get('/support/tickets');
      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error('Failed to fetch support tickets', error);
    }
  };

  const fetchChatMessages = async (ticketId) => {
    try {
      const res = await api.get(`/support/tickets/${ticketId}/messages`);
      setChatMessages(res.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch chat messages', error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) {
      alert('Subject and Message are required');
      return;
    }
    setTicketRaising(true);
    try {
      await api.post('/support/tickets', {
        subject: newTicketSubject,
        message: newTicketMessage
      });
      setNewTicketSubject('');
      setNewTicketMessage('');
      fetchSupportTickets();
      alert('Support Ticket Raised Successfully!');
    } catch (error) {
      alert('Failed to raise ticket');
    } finally {
      setTicketRaising(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedTicket) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        message: chatInput
      });
      setChatInput('');
      fetchChatMessages(selectedTicket.id);
    } catch (error) {
      alert('Failed to send message');
    }
  };

  useEffect(() => {
    fetchEnquiriesCount();
    const interval = setInterval(fetchEnquiriesCount, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchEnquiriesCount = async () => {
    try {
      const res = await api.get('/services/enquiries/unread-count');
      setEnquiriesCount(res.data.count || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenProfile = async () => {
    setShowProfileModal(true);
    if (!profileData) {
      setProfileLoading(true);
      try {
        const res = await api.get('/vendor/dashboard');
        if (res.data.profile) {
          setProfileData(res.data.profile);
          setVendorName(res.data.vendorName || '');
        }
      } catch (error) {
        console.error('Error fetching vendor profile', error);
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const [ecommerceOpen, setEcommerceOpen] = useState(() => {
    return ['/vendor/products', '/vendor/orders', '/vendor/returns'].some(path => location.pathname.startsWith(path));
  });
  const [infoDirectoryOpen, setInfoDirectoryOpen] = useState(() => {
    return ['/vendor/community-profile', '/vendor/enquiries'].some(path => location.pathname.startsWith(path));
  });
  const [communicateOpen, setCommunicateOpen] = useState(() => {
    return ['/vendor/communicate', '/vendor/referral'].some(path => location.pathname.startsWith(path));
  });
  const [mobileEcommerceOpen, setMobileEcommerceOpen] = useState(false);
  const [businessNetworkOpen, setBusinessNetworkOpen] = useState(() => {
    return location.pathname.includes('/vendor/business-network');
  });

  const mobileNavItems = [
    { label: 'Dashboard', path: '/vendor', icon: LayoutDashboard },
    { 
      label: 'Ecommerce', 
      icon: ShoppingBag, 
      subItems: [
        { label: 'Orders', path: '/vendor/orders', icon: ShoppingCart },
        { label: 'Returns', path: '/vendor/returns', icon: RefreshCcw }
      ]
    },
    { 
      label: 'Communicate', 
      icon: Users, 
      subItems: [
        { label: 'Communicate', path: '/vendor/communicate', icon: Users },
        { label: 'Referral & Earn', path: '/vendor/referral', icon: Sparkles }
      ]
    },
    { label: 'Payouts', path: '/vendor/payouts', icon: CreditCard },
    { label: 'Service Enquiries', path: '/vendor/enquiries', icon: MessageSquare },
  ];

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-gray-200 hidden md:flex flex-col shrink-0 h-full">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <Link to="/vendor" className="flex items-center hover:opacity-90 transition-opacity">
            <img src="/ibc-logo.png" alt="IBC Mart" className="h-12 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto min-h-0">
          <ul className="space-y-1">
            {/* Dashboard */}
            <li>
              <Link 
                to="/vendor"
                className={`flex items-center justify-between px-6 py-3 text-base font-medium transition-colors ${location.pathname === '/vendor' ? 'bg-orange-50 text-secondary border-r-4 border-secondary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={18} />
                  Dashboard
                </div>
              </Link>
            </li>

            {/* Ecommerce Dropdown */}
            <li>
              <button
                onClick={() => setEcommerceOpen(!ecommerceOpen)}
                className={`w-full flex items-center justify-between px-6 py-3 text-base font-medium transition-colors text-gray-600 hover:bg-gray-50`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag size={18} />
                  Ecommerce
                </div>
                {ecommerceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {ecommerceOpen && (
                <ul className="pl-12 space-y-1 bg-gray-50/50 py-1">
                  <li>
                    <Link
                      to="/vendor/products"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/products') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Package size={16} />
                      Products
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/orders"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/orders') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <ShoppingCart size={16} />
                      Orders
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/returns"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/returns') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Package size={16} />
                      Returns
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Info Directory Dropdown */}
            <li>
              <button
                onClick={() => setInfoDirectoryOpen(!infoDirectoryOpen)}
                className={`w-full flex items-center justify-between px-6 py-3 text-base font-medium transition-colors text-gray-600 hover:bg-gray-50`}
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} />
                  Info Directory
                </div>
                {infoDirectoryOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {infoDirectoryOpen && (
                <ul className="pl-12 space-y-1 bg-gray-50/50 py-1">
                  <li>
                    <Link
                      to="/vendor/community-profile"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/community-profile') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <LayoutDashboard size={16} />
                      Profile / Info
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/enquiries"
                      className={`flex items-center justify-between px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/enquiries') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} />
                        Service Enquiries
                      </div>
                      {enquiriesCount > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[15px] text-center shadow-sm">
                          {enquiriesCount}
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Payouts */}
            <li>
              <Link 
                to="/vendor/payouts"
                className={`flex items-center justify-between px-6 py-3 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/payouts') ? 'bg-orange-50 text-secondary border-r-4 border-secondary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} />
                  Payouts
                </div>
              </Link>
            </li>

            {/* Communicate Dropdown */}
            <li>
              <button
                onClick={() => setCommunicateOpen(!communicateOpen)}
                className={`w-full flex items-center justify-between px-6 py-3 text-base font-medium transition-colors text-gray-600 hover:bg-gray-50`}
              >
                <div className="flex items-center gap-3">
                  <Users size={18} />
                  Communicate
                </div>
                {communicateOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {communicateOpen && (
                <ul className="pl-12 space-y-1 bg-gray-50/50 py-1">
                  <li>
                    <Link
                      to="/vendor/communicate"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/communicate') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Users size={16} />
                      Communicate
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/referral"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/referral') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Sparkles size={16} />
                      Referral & Earn
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Jobs */}
            <li>
              <Link 
                to="/vendor/jobs"
                className={`flex items-center justify-between px-6 py-3 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/jobs') ? 'bg-orange-50 text-secondary border-r-4 border-secondary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase size={18} />
                  Job Management
                </div>
              </Link>
            </li>

            {/* IBC Business Network */}
            <li>
              <button
                onClick={() => setBusinessNetworkOpen(!businessNetworkOpen)}
                className={`w-full flex items-center justify-between px-6 py-3 text-base font-medium transition-colors text-gray-600 hover:bg-gray-50`}
              >
                <div className="flex items-center gap-3">
                  <Users size={18} />
                  Community
                </div>
                {businessNetworkOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {businessNetworkOpen && (
                <ul className="pl-12 space-y-1 bg-gray-50/50 py-1">
                  <li>
                    <Link
                      to="/vendor/business-network"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname === '/vendor/business-network' ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/find-chapters"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/find-chapters') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <BookOpen size={16} />
                      Find Chapters
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/my-chapter"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/my-chapter') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Users size={16} />
                      My Chapter
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/referrals"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/referrals') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Sparkles size={16} />
                      Referrals
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/requirements"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/requirements') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Briefcase size={16} />
                      Requirements Feed
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/meetings"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/meetings') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Calendar size={16} />
                      Chapter Meetings
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/visitors"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/visitors') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <Users size={16} />
                      Guest Visits
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/vendor/business-network/performance"
                      className={`flex items-center gap-3 px-6 py-2 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/business-network/performance') ? 'text-secondary font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      <TrendingUp size={16} />
                      Performance Card
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Payment Settings */}
            <li>
              <Link 
                to="/vendor/payment-settings"
                className={`flex items-center justify-between px-6 py-3 text-base font-medium transition-colors ${location.pathname.startsWith('/vendor/payment-settings') ? 'bg-orange-50 text-secondary border-r-4 border-secondary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} />
                  Payment Settings
                </div>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Need Help Card */}
        <div className="p-6 mb-4 shrink-0">
          <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0">
                <Headset size={20} />
              </div>
              <div>
                <h4 className="text-gray-800 font-bold text-sm leading-tight">Need Help?</h4>
                <p className="text-gray-500 text-xs mt-0.5">We're here to help you</p>
              </div>
            </div>
             <button 
               onClick={() => setIsSupportOpen(true)}
               className="w-full bg-white text-blue-600 font-bold text-xs py-2.5 rounded-xl shadow-sm border border-blue-50 hover:bg-blue-50 transition-colors"
             >
               Contact Support
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-gray-800">Vendor Portal</h2>
          <div className="flex items-center gap-4">
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-danger bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-100" title="Logout">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button 
              onClick={handleOpenProfile} 
              className="w-8 h-8 bg-secondary hover:bg-secondary-dark rounded-full flex items-center justify-center text-white font-bold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md flex-shrink-0"
              title="View Vendor Profile"
            >
              V
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 bg-background vendor-layout-main">
          <Outlet />
        </main>
      </div>
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] pb-safe">
        {mobileNavItems.map((item) => {
          if (item.subItems) {
            const Icon = item.icon;
            const isActive = item.subItems.some(sub => location.pathname.startsWith(sub.path));
            return (
              <div key={item.label} className="relative w-full h-full">
                <button 
                  onClick={() => setMobileEcommerceOpen(!mobileEcommerceOpen)}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-secondary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium text-center leading-tight px-0.5">{item.label}</span>
                </button>
                {mobileEcommerceOpen && (
                  <div className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 w-40 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden py-2 z-[60] animate-[fadeIn_0.15s_ease-out]">
                    {item.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      const isSubActive = location.pathname.startsWith(sub.path);
                      return (
                        <Link 
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setMobileEcommerceOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-base transition-colors ${isSubActive ? 'bg-orange-50 text-secondary font-bold' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <SubIcon size={16} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/vendor');
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-secondary' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium text-center leading-tight px-0.5">{item.label === 'Service Enquiries' ? 'Enquiries' : item.label}</span>
              {item.label === 'Service Enquiries' && enquiriesCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full shadow-sm">
                  {enquiriesCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Vendor Profile Info Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary text-white rounded-xl shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Vendor Information</h3>
                  <p className="text-xs text-gray-500">Official business profile and account status</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-150 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold text-gray-500">Fetching profile details...</p>
                </div>
              ) : profileData ? (
                <div className="space-y-4">
                  {/* Business Name and Type */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Business Name</h4>
                      <p className="text-lg font-bold text-gray-900 mt-0.5">{profileData.business_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Type: {profileData.vendor_type || 'N/A'}</p>
                      {vendorName && (
                        <p className="text-xs font-semibold text-blue-600 mt-1">Owner: {vendorName}</p>
                      )}
                    </div>
                    {/* KYC Badge */}
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">KYC Status</span>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        profileData.kyc_status === 'APPROVED' ? 'bg-green-50 text-green-700 border border-green-200' :
                        profileData.kyc_status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {profileData.kyc_status === 'APPROVED' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {profileData.kyc_status || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Business Category Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-gray-100 rounded-xl p-3 bg-white">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Category</span>
                      <span className="text-sm font-bold text-gray-800 mt-1 block">{profileData.category || 'N/A'}</span>
                    </div>
                    <div className="border border-gray-100 rounded-xl p-3 bg-white">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Subcategory</span>
                      <span className="text-sm font-bold text-gray-800 mt-1 block">{profileData.subcategory || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Registration IDs */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                      <span className="font-medium text-gray-500">GST Number</span>
                      <span className="font-bold text-gray-800 font-mono">{profileData.gst_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                      <span className="font-medium text-gray-500">PAN Number</span>
                      <span className="font-bold text-gray-800 font-mono">{profileData.pan_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-500">Aadhaar Number</span>
                      <span className="font-bold text-gray-800 font-mono">{profileData.aadhaar_number || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-2.5">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>WhatsApp: <strong className="text-gray-800">{profileData.whatsapp_number || 'N/A'}</strong></span>
                    </div>
                    {profileData.website && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Website: <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">{profileData.website}</a></span>
                      </div>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="border border-gray-100 rounded-xl p-4 bg-white space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Business Address</span>
                      <span className="text-xs text-gray-700 mt-1 block leading-relaxed">{profileData.business_address || 'N/A'}</span>
                    </div>
                    {profileData.pickup_address && (
                      <div className="border-t border-gray-50 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pickup Address</span>
                        <span className="text-xs text-gray-700 mt-1 block leading-relaxed">{profileData.pickup_address}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to fetch vendor information.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Portal Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-150 w-full max-w-4xl h-[90vh] lg:h-[80vh] flex flex-col overflow-hidden animate-[zoomIn_0.15s_ease-out]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">Help & Support Portal</h3>
                  <p className="text-xs text-gray-500">Raise support requests and chat with technical help representatives</p>
                </div>
              </div>
              <button
                onClick={() => { setIsSupportOpen(false); setSelectedTicket(null); }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-150 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-background">
              {!selectedTicket ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                  {/* Left: Raise a request */}
                  <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-8">
                    <h4 className="font-bold text-gray-700 text-sm mb-4">Raise a Support Request</h4>
                    <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Issue Subject</label>
                        <input
                          type="text"
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 bg-white"
                          placeholder="e.g. Settlement issue"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Detailed Message</label>
                        <textarea
                          rows="4"
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 bg-white"
                          placeholder="Please describe your issue in detail..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={ticketRaising}
                        className="w-full py-3 bg-blue-50 text-blue-500 border border-blue-200 hover:bg-blue-100 hover:text-blue-600 font-bold rounded-xl shadow-md transition-opacity disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                      >
                        {ticketRaising ? 'Submitting request...' : 'Raise Ticket'}
                      </button>
                    </form>
                  </div>

                  {/* Right: Ticket list / history */}
                  <div className="lg:col-span-2 overflow-y-auto max-h-[50vh] lg:max-h-[60vh] custom-scrollbar">
                    <h4 className="font-bold text-gray-700 text-sm mb-4">Your Support Tickets</h4>
                    {tickets.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 text-sm">
                        No support tickets raised yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {tickets.map(ticket => (
                          <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-4 rounded-xl border border-gray-150 hover:border-blue-500 hover:bg-gray-50/30 transition-all cursor-pointer flex justify-between items-center bg-white shadow-sm"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">
                                  #{ticket.ticket_number}
                                </span>
                                <h5 className="font-bold text-gray-900 text-sm">{ticket.subject}</h5>
                              </div>
                              <p className="text-xs text-gray-400">
                                Raised on: {new Date(ticket.created_at).toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-250'
                                }`}>
                                {ticket.status}
                              </span>
                              <span className="text-gray-400 text-sm font-bold">→</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Chat view */
                <div className="flex flex-col h-[50vh] lg:h-[55vh] border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/30">
                  {/* Chat header */}
                  <div className="bg-white border-b border-gray-150 p-4 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="text-xs text-blue-500 font-bold hover:underline mr-1"
                        >
                          ← Back to list
                        </button>
                        <span className="font-mono text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">
                          #{selectedTicket.ticket_number}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">{selectedTicket.subject}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-yellow-100 text-yellow-800 border border-yellow-250'
                      }`}>
                      {selectedTicket.status}
                    </span>
                  </div>

                  {/* Message history */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-100/50">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                            }`}>
                            <p>{msg.message}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 px-1">
                            {!isMe && <span className="font-semibold text-gray-600 mr-1">{msg.sender_name} ({msg.sender_role})</span>}
                            {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat input footer */}
                  {selectedTicket.status !== 'RESOLVED' ? (
                    <form onSubmit={handleSendChatMessage} className="bg-white border-t border-gray-150 p-3 flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type your message here..."
                        className="flex-grow border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-sm transition-opacity"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  ) : (
                    <div className="bg-white border-t border-gray-150 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">This ticket has been marked as RESOLVED</span>
                      <button
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to reopen this ticket?')) {
                            try {
                              await api.put(`/support/tickets/${selectedTicket.id}/reopen`);
                              alert('Ticket Reopened successfully!');
                              setSelectedTicket(prev => ({ ...prev, status: 'IN_PROGRESS' }));
                              fetchSupportTickets();
                              fetchChatMessages(selectedTicket.id);
                            } catch (e) {
                              alert('Failed to reopen ticket');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        Reopen Ticket
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default VendorLayout;
