import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as rrdPkg from 'react-router-dom';
const { Link, useParams, useNavigate } = rrdPkg;
import api from '../services/api';
import { updateUser, logout } from '../store/authSlice';
import { getImageUrl } from '../utils/imageUrl';
import { MapPin, Clock, Star, Edit, Edit2, Trash2, CheckCircle, Check, Package, Truck, Wrench, Calendar, FileText, ChevronDown, ChevronUp, ChevronRight, User, Settings, Save, Home, Navigation, ShoppingBag, Briefcase, LifeBuoy, Send, RefreshCcw, Landmark, X, LogOut, Video, ExternalLink } from 'lucide-react';
import EnterpriseImageUploader from '../components/EnterpriseImageUploader';
import LocationPickerModal from '../components/location/LocationPickerModal';
import UserBankAccounts from '../components/user/UserBankAccounts';
import UserRefunds from '../components/user/UserRefunds';
import UserReturns from '../components/user/UserReturns';
import CustomerOrders from '../components/returns/CustomerOrders';
import UserReviews from '../components/user/UserReviews';

const AddressManagement = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();

  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || 'profile'; // 'profile', 'addresses', 'history', 'bank', 'refunds', 'support'
  const setActiveTab = (newTab) => navigate(`/account/${newTab}`);

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // History states
  const [orders, setOrders] = useState([]);
  const [serviceEnquiries, setServiceEnquiries] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [historySubTab, setHistorySubTab] = useState('orders'); // 'orders' or 'services'
  const [expandedServiceId, setExpandedServiceId] = useState(null);

  const toggleService = (id) => {
    setExpandedServiceId(prev => prev === id ? null : id);
  };

  // Profile states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileImages, setProfileImages] = useState([]);

  useEffect(() => {
    if (user?.profile_photo && profileImages.length === 0) {
      setProfileImages([{ id: 'profile', imageUrl: getImageUrl(user.profile_photo), isPrimary: true }]);
    }
  }, [user?.profile_photo]);

  const [profileSaving, setProfileSaving] = useState(false);

  // Address form states
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('India');
  const [isDefault, setIsDefault] = useState(false);

  // Location & Map states
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [locationData, setLocationData] = useState(null);

  // Support states
  const [tickets, setTickets] = useState([]);
  const [enquiryTab, setEnquiryTab] = useState('service_enquiries');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [ticketRaising, setTicketRaising] = useState(false);

  // Return & Replacement states
  const [returnModalState, setReturnModalState] = useState({ isOpen: false, items: [], orderId: null, type: 'REFUND', reason: '', description: '' });
  const [selectedReturnItems, setSelectedReturnItems] = useState({});

  const toggleReturnItemSelection = (orderId, item) => {
    setSelectedReturnItems(prev => {
      const current = prev[orderId] || [];
      const exists = current.find(i => i.id === item.id);
      if (exists) {
        return { ...prev, [orderId]: current.filter(i => i.id !== item.id) };
      } else {
        return { ...prev, [orderId]: [...current, item] };
      }
    });
  };

  // Review states
  const [reviewModalState, setReviewModalState] = useState({ isOpen: false, item: null, product_id: null, rating: 5, title: '', body: '', images: [], message: null, isError: false });
  const [serviceReviewModalState, setServiceReviewModalState] = useState({ isOpen: false, service_id: null, enquiry_id: null, service_name: '', rating: 5, title: '', body: '', isReadOnly: false, message: null, isError: false });

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'support') {
      fetchSupportTickets();
    }
  }, [activeTab]);

  // Polling chat messages
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

  const fetchHistory = async () => {
    setLoading(true);

    // Fetch product orders
    try {
      const ordersRes = await api.get('/orders');
      setOrders(ordersRes.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch product orders', error);
      setOrders([]);
    }

    // Fetch service enquiries & bookings
    try {
      const servicesRes = await api.get('/services/customer');
      setServiceEnquiries(servicesRes.data.enquiries || []);
    } catch (error) {
      console.error('Failed to fetch service enquiries', error);
      setServiceEnquiries([]);
    }

    // Fetch applied jobs history
    try {
      const jobsRes = await api.get('/jobs/user/applications');
      setAppliedJobs(jobsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch applied jobs history', error);
      setAppliedJobs([]);
    }

    setLoading(false);
  };

  const handleDeliveryReceived = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/received`);
      fetchHistory(); // Refresh orders
      alert('Order marked as delivered successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update order status.');
    }
  };

  const submitReturnRequest = async (e) => {
    e.preventDefault();
    try {
      const isRefund = returnModalState.type === 'REFUND';
      const payloadItems = returnModalState.items.map(item => ({
        order_item_id: item.id,
        return_type: isRefund ? 'RETURN' : 'REPLACEMENT',
        reason: returnModalState.reason,
        description: returnModalState.description || ''
      }));

      await api.post('/returns/request', {
        order_id: returnModalState.orderId,
        items: payloadItems
      });
      alert('Request submitted successfully!');

      const targetTab = isRefund ? 'refunds' : 'returns';
      setHistorySubTab(targetTab);

      setReturnModalState({ isOpen: false, items: [], orderId: null, type: 'REFUND', reason: '', description: '' });
      setSelectedReturnItems(prev => ({ ...prev, [returnModalState.orderId]: [] }));
      fetchHistory(); // Refresh to update the UI
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit request.');
    }
  };

  const submitReviewRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', {
        product_id: reviewModalState.product_id,
        order_item_id: reviewModalState.item.id,
        rating: reviewModalState.rating,
        title: reviewModalState.title,
        body: reviewModalState.body,
        images: reviewModalState.images
      });
      setReviewModalState(prev => ({ ...prev, message: 'Review submitted successfully!', isError: false }));
      setTimeout(() => {
        setReviewModalState({ isOpen: false, item: null, product_id: null, rating: 5, title: '', body: '', images: [], message: null, isError: false });
        fetchHistory();
      }, 1500);
    } catch (error) {
      setReviewModalState(prev => ({ ...prev, message: error.response?.data?.message || 'Failed to submit review.', isError: true }));
    }
  };

  const submitServiceReviewRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews/service', {
        service_id: serviceReviewModalState.service_id,
        enquiry_id: serviceReviewModalState.enquiry_id,
        rating: serviceReviewModalState.rating,
        title: serviceReviewModalState.title,
        body: serviceReviewModalState.body
      });
      setServiceReviewModalState(prev => ({ ...prev, message: 'Service Review submitted successfully!', isError: false }));
      setTimeout(() => {
        setServiceReviewModalState({ isOpen: false, service_id: null, enquiry_id: null, service_name: '', rating: 5, title: '', body: '', message: null, isError: false });
        fetchHistory();
      }, 1500);
    } catch (error) {
      setServiceReviewModalState(prev => ({ ...prev, message: error.response?.data?.message || 'Failed to submit service review.', isError: true }));
    }
  };



  const fetchAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      setAddresses(res.data.addresses || []);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(profilePhone)) {
      alert('Mobile number must be exactly 10 digits');
      return;
    }
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', profileName);
      formData.append('email', profileEmail);
      formData.append('phone', profilePhone);

      if (profileImages.length > 0) {
        const imgPath = profileImages[0].imageUrl || profileImages[0].image_url || profileImages[0].mainPath;
        if (imgPath && !imgPath.startsWith('data:') && !imgPath.startsWith('blob:')) {
          formData.append('profile_photo', imgPath.replace(/^.*\/\/[^\/]+/, '')); // Send relative path just in case
        } else if (imgPath) {
          const resp = await fetch(imgPath);
          const blob = await resp.blob();
          formData.append('profile_image', blob, 'profile.webp');
        }
      }

      const res = await api.put('/auth/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data.success) {
        dispatch(updateUser(res.data.user));
        alert('Profile details updated successfully!');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update profile details');
    } finally {
      setProfileSaving(false);
    }
  };

  const resetForm = () => {
    setStreet('');
    setCity('');
    setState('');
    setZip('');
    setCountry('India');
    setIsDefault(false);
    setIsEditing(false);
    setEditId(null);
    setLocationData(null);
  };

  const handleEdit = (address) => {
    setStreet(address.street);
    setCity(address.city);
    setState(address.state);
    setZip(address.zip);
    setCountry(address.country);
    setIsDefault(!!address.is_default);
    setEditId(address.id);
    setIsEditing(true);
    if (address.latitude && address.longitude) {
      setLocationData({
        latitude: address.latitude,
        longitude: address.longitude,
        house_no: address.house_no,
        area: address.area,
        district: address.district,
        formatted_address: address.formatted_address
      });
    } else {
      setLocationData(null);
    }
  };

  const handleLocationSave = (loc) => {
    setStreet(loc.formatted_address || `${loc.house_no ? loc.house_no + ', ' : ''}${loc.street}`);
    setCity(loc.city);
    setState(loc.state);
    setZip(loc.pincode);
    setCountry(loc.country || 'India');
    setLocationData(loc);
    setMapModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const addressData = {
      street, city, state, zip, country, is_default: isDefault,
      latitude: locationData?.latitude,
      longitude: locationData?.longitude,
      house_no: locationData?.house_no,
      area: locationData?.area,
      district: locationData?.district,
      formatted_address: locationData?.formatted_address || street
    };

    try {
      if (editId) {
        await api.put(`/addresses/${editId}`, addressData);
      } else {
        await api.post('/addresses', addressData);
      }
      resetForm();
      fetchAddresses();
    } catch (error) {
      alert('Failed to save address');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      fetchAddresses();
    } catch (error) {
      alert('Failed to delete address');
    }
  };

  const handleSetDefault = async (address) => {
    try {
      await api.put(`/addresses/${address.id}`, { ...address, is_default: true });
      fetchAddresses();
    } catch (error) {
      alert('Failed to set default address');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
      <div className="flex justify-between items-center mb-4 md:mb-8 border-b border-gray-100 pb-3 md:pb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-red-500" />
          Account & Settings
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Left Sidebar Menu */}
        <div className={`md:col-span-1 flex-col gap-3 ${tab ? 'hidden md:flex' : 'flex'} ${activeTab === 'history' ? 'md:mt-[76px]' : ''}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex flex-col gap-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">Settings Menu</p>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors ${activeTab === 'profile' ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <User className="w-4 h-4" />
              Profile Details
            </button>

            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors ${activeTab === 'addresses' ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <MapPin className="w-4 h-4" />
              Manage Addresses
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors ${activeTab === 'history' ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Clock className="w-4 h-4" />
              History
            </button>

            <button
              onClick={() => setActiveTab('bank')}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors ${activeTab === 'bank' ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Landmark className="w-4 h-4" />
              Bank Accounts
            </button>



            <button
              onClick={() => { setActiveTab('support'); setSelectedTicket(null); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors ${activeTab === 'support' ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <LifeBuoy className="w-4 h-4" />
              Help & Support
            </button>
            <button
              onClick={() => {
                dispatch(logout());
                navigate('/');
              }}
              className="w-full md:hidden text-left px-3 py-2.5 rounded-lg flex items-center gap-3 font-semibold text-sm transition-colors text-gray-600 hover:bg-gray-50 hover:text-red-600 mt-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className={`md:col-span-3 ${!tab ? 'hidden md:block' : 'block'}`}>
          {tab && (
            <button
              onClick={() => navigate('/account')}
              className="md:hidden mb-4 flex items-center gap-1.5 text-gray-800 font-bold text-sm hover:text-red-600 transition-colors w-fit px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          )}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 max-w-2xl">
              <h3 className="font-semibold text-lg mb-6 text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
                <User className="w-5 h-5 text-gray-500" />
                Personal Information
              </h3>
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Profile Photo</label>
                  <EnterpriseImageUploader
                    images={profileImages}
                    onChange={setProfileImages}
                    module="profiles"
                    single={true}
                    aspectRatio="1:1"
                    allowedRatios={['1:1']}
                    maxFileSizeMB={2}
                    showAltText={false}
                    showImageType={false}
                    showSeoTitle={false}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                    placeholder="Enter Name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                    placeholder="Enter Email"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Mobile Number</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-red-500 shadow-sm"
                    placeholder="Enter Mobile Number"
                  />
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-fit px-8 py-3 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold rounded-lg  transition-opacity text-sm shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <Save className="w-4 h-4" />
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Address Form */}
              <div className="order-2 lg:order-1 lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-100 p-6 h-fit">
                <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-gray-500" />
                    {isEditing ? 'Edit Address' : 'Add New Address'}
                  </span>
                </h3>

                {/* Map Location Picker Trigger */}
                <button
                  type="button"
                  onClick={() => setMapModalOpen(true)}
                  className="w-full mb-4 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <MapPin className="w-5 h-5 text-white" />
                  {locationData ? '📍 Location Pinned on Map (OpenStreetMap)' : '📍 Pick Location on Map (OpenStreetMap)'}
                </button>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Street Address</label>
                    <textarea
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-red-500"
                      rows={2}
                      placeholder="e.g. 123 Main St, Apartment 4B"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-red-500"
                      placeholder="e.g. Chennai"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-red-500"
                      placeholder="e.g. Tamil Nadu"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Pincode / ZIP</label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-red-500"
                      placeholder="e.g. 600001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-red-500"
                      placeholder="e.g. India"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="is_default"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded accent-red-500"
                    />
                    <label htmlFor="is_default" className="text-xs font-semibold text-gray-600 cursor-pointer">
                      Set as Default Address
                    </label>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold rounded-lg  transition-opacity text-sm shadow-sm"
                    >
                      {isEditing ? 'Update' : 'Save'} Address
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Addresses List */}
              <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col gap-4">
                <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  Saved Delivery Addresses
                </h3>

                {loading ? (
                  <div className="p-10 text-center text-gray-500 bg-white rounded-lg border border-gray-100">Loading addresses...</div>
                ) : addresses.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 bg-white rounded-lg border border-gray-100 flex flex-col items-center justify-center gap-2 min-h-[300px]">
                    <Home className="w-8 h-8 text-gray-300" />
                    <span>No addresses saved yet. Use the form on the left to add one.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(address => (
                      <div key={address.id} className={`bg-white rounded-lg shadow-sm border p-5 flex flex-col justify-between gap-4 transition-shadow hover:shadow-md ${address.is_default ? 'border-red-500' : 'border-gray-100'}`}>
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="flex justify-between items-start">
                            {address.is_default ? (
                              <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Default
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSetDefault(address)}
                                className="text-[10px] font-bold text-red-500 hover:underline"
                              >
                                Set as Default
                              </button>
                            )}

                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEdit(address)}
                                className="p-1.5 border border-gray-100 rounded hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(address.id)}
                                className="p-1.5 border border-gray-100 rounded hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-800 font-medium text-sm leading-relaxed mt-2">{address.street}</p>
                          <p className="text-gray-500 text-xs">
                            {address.city}, {address.state} - {address.zip}
                          </p>
                          <p className="text-gray-400 text-xs font-semibold">{address.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Account History Sub Tabs - Enterprise Level Design */}
              <div className="mb-6 w-full border-b border-gray-200">
                <div className="flex overflow-x-auto hide-scrollbar gap-4 md:gap-6 lg:gap-8 -mb-px">
                  {[
                    { id: 'orders', label: 'Order History', icon: ShoppingBag },
                    { id: 'bookings', label: 'Bookings', icon: Calendar },
                    { id: 'enquiries', label: 'Enquiries', icon: FileText },
                    { id: 'returns', label: 'Returns', icon: RefreshCcw },
                    { id: 'refunds', label: 'Refunds', icon: Landmark },
                    { id: 'reviews', label: 'Reviews', icon: Star },
                    { id: 'jobs', label: 'Jobs', icon: Briefcase }
                  ].map((tab) => {
                    const isActive = historySubTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setHistorySubTab(tab.id)}
                        className={`flex items-center justify-center gap-2 py-3 px-2 whitespace-nowrap transition-colors duration-200 border-b-2
                          ${isActive
                            ? 'border-red-500 text-red-500 font-bold'
                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 font-semibold'
                          }`}
                        style={{ fontSize: '14px' }}
                      >
                        <tab.icon size={18} className={`transition-colors ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Product Orders Section */}
              {historySubTab === 'orders' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <ShoppingBag className="w-5 h-5 text-red-500" />
                    Product Purchase History
                  </h3>

                  <CustomerOrders
                    orders={orders}
                    handleDeliveryReceived={handleDeliveryReceived}
                    selectedReturnItems={selectedReturnItems}
                    toggleReturnItemSelection={toggleReturnItemSelection}
                    setReturnModalState={setReturnModalState}
                    setReviewModalState={setReviewModalState}
                  />
                </div>
              )}

              {/* Job Applications Section */}
              {historySubTab === 'jobs' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <Briefcase className="w-5 h-5 text-red-500" />
                    Job Applied History
                  </h3>

                  {appliedJobs.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-150">
                      <Briefcase size={36} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No job applications submitted yet.</p>
                      <Link to="/jobs" className="mt-3 inline-block px-4 py-2 bg-[#cc0000] hover:bg-red-750 text-white text-xs font-bold rounded-lg transition-colors">
                        Browse Jobs
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appliedJobs.map((app) => (
                        <div key={app.id} className="border border-gray-100 rounded-xl p-4 shadow-sm bg-gray-50/20 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-3.5 items-center">
                            {/* Company Logo */}
                            <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-1 shrink-0">
                              {app.business_logo ? (
                                <img
                                  src={getImageUrl(app.business_logo)}
                                  alt={app.business_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Briefcase size={20} className="text-gray-300" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm leading-snug">
                                <Link to={`/jobs/${app.job_slug}`} className="hover:text-red-600 transition-colors">
                                  {app.job_title}
                                </Link>
                              </h4>
                              <p className="text-xs text-gray-500 font-semibold mt-1">
                                {app.business_name} • <span className="text-gray-400 font-normal">{app.job_city}, {app.job_state}</span>
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                Applied on {new Date(app.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              {app.status === 'INTERVIEWING' && app.interview_date && (
                                <div className="mt-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2 text-xs text-indigo-900 max-w-md shadow-sm">
                                  <p className="flex items-center gap-2">
                                    <Calendar size={14} className="text-indigo-600 shrink-0" />
                                    <span className="font-bold">Interview Scheduled:</span> {new Date(app.interview_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </p>
                                  {app.interview_link && (
                                    <p className="flex items-center gap-2">
                                      <Video size={14} className="text-indigo-600 shrink-0" />
                                      <span className="font-bold">Google Meet Link:</span>{' '}
                                      <a 
                                        href={app.interview_link} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="underline text-indigo-700 hover:text-indigo-900 font-bold transition-colors inline-flex items-center gap-1"
                                      >
                                        Join Meeting <ExternalLink size={10} />
                                      </a>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 justify-between md:justify-end">
                            {/* Application Status Badge */}
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border shrink-0 ${app.status === 'SELECTED' || app.status === 'HIRED'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : app.status === 'REJECTED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : app.status === 'REVIEWING'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : app.status === 'INTERVIEWING'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : 'bg-gray-50 text-gray-600 border-gray-200'
                              }`}>
                              {app.status === 'REVIEWING' ? 'Viewing your application' :
                               app.status === 'INTERVIEWING' ? 'Interview Scheduled' :
                               app.status === 'SELECTED' || app.status === 'HIRED' ? 'Selected' :
                               app.status === 'REJECTED' ? 'Rejected' : 'Applied'}
                            </span>

                            <Link
                              to={`/jobs/${app.job_slug}`}
                              className="px-3.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-250 font-bold rounded-lg transition-colors text-xs shrink-0 cursor-pointer flex items-center justify-center"
                            >
                              View Job
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Service Bookings Section */}
              {historySubTab === 'bookings' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-3">
                    <Calendar className="w-5 h-5 text-red-500" />
                    Service Bookings
                  </h3>

                  {serviceEnquiries.filter(e => e.type === 'BOOKING').length === 0 ? (
                    <p className="text-gray-500 text-sm">No service bookings sent yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {serviceEnquiries.filter(e => e.type === 'BOOKING').map((enquiry) => {
                        const isExpanded = expandedServiceId === enquiry.id;
                        return (
                          <div key={enquiry.id} className="border border-gray-100 rounded-xl shadow-sm bg-gray-50/30 flex flex-col overflow-hidden">
                            {/* Mobile Header */}
                            <div className={`md:hidden flex flex-col p-3 bg-white ${isExpanded ? 'border-b border-gray-100' : ''}`}>
                              <div
                                className="flex flex-row gap-3 items-center cursor-pointer mb-2"
                                onClick={() => toggleService(enquiry.id)}
                              >
                                <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white flex-shrink-0">
                                  <img
                                    src={enquiry.image_path ? getImageUrl(enquiry.image_path) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                                    alt={enquiry.service_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{enquiry.service_name}</h4>
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                                    <span>{new Date(enquiry.created_at).toLocaleDateString('en-IN')}</span>
                                    <span>•</span>
                                    <span>₹{Number(enquiry.amount).toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${enquiry.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                    enquiry.status === 'COMPLETED' ? 'bg-green-200 text-green-900' :
                                      enquiry.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                        enquiry.status === 'SERVICE_REQUESTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {enquiry.status === 'SERVICE_REQUESTED' ? 'Requested' :
                                      enquiry.status === 'ACCEPTED' ? 'Accepted' :
                                        enquiry.status === 'REJECTED' ? 'Rejected' : 'Completed'}
                                  </span>
                                  <div className={`transition-colors ${isExpanded ? 'text-gray-800' : 'text-gray-400'}`}>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Action Buttons */}
                              {enquiry.status === 'COMPLETED' && !isExpanded && (
                                <div className="flex justify-end border-t border-dashed border-gray-100 pt-2 mt-1">
                                  {!enquiry.has_reviewed ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: enquiry.service_name, rating: 5, title: '', body: '', isReadOnly: false }); }}
                                      className="text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                    >
                                      <Star size={12} className="text-yellow-500" fill="currentColor" />
                                      Write a Review
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Review Written</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: enquiry.service_name, rating: Number(enquiry.review_rating) || 5, title: enquiry.review_title || '', body: enquiry.review_body || '', isReadOnly: true }); }}
                                        className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                      >
                                        View Review
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Accordion Body */}
                            <div className={`md:grid md:grid-rows-[1fr] md:opacity-100 md:p-4 grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className={`overflow-hidden flex flex-col md:flex-row md:gap-4 md:p-0 md:border-t-0 ${isExpanded ? 'px-4 pb-4 pt-3 gap-4' : 'px-0 py-0 gap-0 border-transparent'} border-gray-100`}>
                                <div className="hidden md:block w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-white flex-shrink-0">
                                  <img
                                    src={enquiry.image_path ? getImageUrl(enquiry.image_path) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                                    alt={enquiry.service_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div className="hidden md:block">
                                      <h4 className="font-bold text-gray-900 text-base">{enquiry.service_name}</h4>
                                      <div className="flex gap-2 items-center text-xs text-gray-400">
                                        <span>Supplier: <strong className="text-gray-600">{enquiry.business_name}</strong></span>
                                        <span>•</span>
                                        <span className="font-mono text-[11px] font-bold text-red-500">ID: #{1000 + enquiry.id}</span>
                                      </div>
                                    </div>

                                    <div className="md:hidden text-xs text-gray-500 w-full mb-1">
                                      Supplier: <strong className="text-gray-700">{enquiry.business_name}</strong>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                                        {enquiry.type}
                                      </span>
                                      <span className="hidden md:flex text-xs text-gray-400 mt-1 items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(enquiry.created_at).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-xs text-gray-500 py-1 mb-1">
                                    <p>Price: <strong className="text-gray-800 font-bold">₹{Number(enquiry.amount).toLocaleString('en-IN')}</strong></p>
                                  </div>

                                  <div className="flex justify-between items-center gap-2 pt-1 w-full">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-500">Status:</span>
                                      <span className={`text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${enquiry.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                        enquiry.status === 'COMPLETED' ? 'bg-green-200 text-green-900 border border-green-300' :
                                          enquiry.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' :
                                            enquiry.status === 'SERVICE_REQUESTED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                        {enquiry.status === 'SERVICE_REQUESTED' ? 'Service Requested' :
                                          enquiry.status === 'ACCEPTED' ? 'Accepted' :
                                            enquiry.status === 'REJECTED' ? 'Rejected' : 'Service Completed'}
                                      </span>
                                      {enquiry.status === 'COMPLETED' && enquiry.completed_at && (
                                        <span className="hidden md:inline-block text-xs text-gray-800 ml-2">
                                          Completed: {new Date(enquiry.completed_at).toLocaleString('en-IN')}
                                        </span>
                                      )}
                                    </div>
                                    {enquiry.status === 'COMPLETED' && !enquiry.has_reviewed && (
                                      <button
                                        onClick={() => setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: enquiry.service_name, rating: 5, title: '', body: '', isReadOnly: false })}
                                        className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                      >
                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                        Write a Review
                                      </button>
                                    )}
                                    {enquiry.status === 'COMPLETED' && enquiry.has_reviewed === 1 && (
                                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Review Written</span>
                                        <button
                                          onClick={() => setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: enquiry.service_name, rating: Number(enquiry.review_rating) || 5, title: enquiry.review_title || '', body: enquiry.review_body || '', isReadOnly: true })}
                                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                        >
                                          View Review
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {enquiry.status === 'REJECTED' && enquiry.reject_reason && (
                                    <div className="mt-2 p-2.5 bg-red-50/50 rounded-lg border border-red-100 text-[11px] md:text-xs text-red-800">
                                      <strong>Reason for rejection:</strong> {enquiry.reject_reason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Service Enquiries Section */}
              {historySubTab === 'enquiries' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-6 lg:max-h-[75vh] lg:overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-red-500" />
                      My Enquiries
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full sm:w-auto">
                      <button
                        onClick={() => setEnquiryTab('service_enquiries')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${enquiryTab === 'service_enquiries'
                          ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Service Enquiries
                      </button>
                      <button
                        onClick={() => setEnquiryTab('product_enquiries')}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${enquiryTab === 'product_enquiries'
                          ? 'bg-white text-purple-600 shadow-sm border border-gray-200/50'
                          : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Product Enquiries
                      </button>
                    </div>
                  </div>

                  {serviceEnquiries.filter(e => e.type === 'ENQUIRY' && (
                    enquiryTab === 'product_enquiries' ? e.enquiry_text.includes('Enquiry about Gallery Product:') : !e.enquiry_text.includes('Enquiry about Gallery Product:')
                  )).length === 0 ? (
                    <p className="text-gray-500 text-sm">No {enquiryTab === 'service_enquiries' ? 'service' : 'product'} enquiries sent yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {serviceEnquiries.filter(e => e.type === 'ENQUIRY' && (
                        enquiryTab === 'product_enquiries' ? e.enquiry_text.includes('Enquiry about Gallery Product:') : !e.enquiry_text.includes('Enquiry about Gallery Product:')
                      )).map((enquiry) => {
                        const isExpanded = expandedServiceId === enquiry.id;

                        let displayTitle = enquiry.service_name;
                        let displayPrice = `₹${Number(enquiry.amount).toLocaleString('en-IN')}`;

                        if (enquiryTab === 'product_enquiries') {
                          const productMatch = enquiry.enquiry_text.match(/Enquiry about Gallery Product: "([^"]+)"/);
                          const priceMatch = enquiry.enquiry_text.match(/\(Price: ₹([^)]+)\)/);
                          if (productMatch) displayTitle = productMatch[1];
                          if (priceMatch) displayPrice = `₹${priceMatch[1]}`;
                        }

                        return (
                          <div key={enquiry.id} className="border border-gray-100 rounded-xl shadow-sm bg-gray-50/30 flex flex-col overflow-hidden">
                            {/* Mobile Header */}
                            <div
                              className="md:hidden p-3 flex flex-row gap-3 items-center cursor-pointer hover:bg-gray-100/50 transition-colors"
                              onClick={() => toggleService(enquiry.id)}
                            >
                              <div className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-white flex-shrink-0">
                                <img
                                  src={enquiry.image_path ? getImageUrl(enquiry.image_path) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 flex flex-col justify-center min-w-0">
                                <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{displayTitle}</h4>
                                <div className="flex justify-between items-center mt-1">
                                  <span className={`font-mono text-[10px] font-bold ${enquiryTab === 'product_enquiries' ? 'text-purple-500' : 'text-red-500'}`}>ID: #{1000 + enquiry.id}</span>
                                  <span className="text-[10px] text-gray-500">{new Date(enquiry.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="ml-1 flex-shrink-0">
                                <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-gray-200 text-gray-800' : 'bg-transparent text-gray-400'}`}>
                                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                              </div>
                            </div>

                            {/* Mobile Action Buttons */}
                            {enquiryTab === 'product_enquiries' && enquiry.status === 'COMPLETED' && !isExpanded && (
                              <div className="md:hidden flex justify-end border-t border-dashed border-gray-100 pt-2 px-3 pb-2 bg-white">
                                {!enquiry.has_reviewed ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: displayTitle, rating: 5, title: '', body: '', isReadOnly: false }); }}
                                    className="text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                  >
                                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                                    Write a Review
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Review Written</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: displayTitle, rating: Number(enquiry.review_rating) || 5, title: enquiry.review_title || '', body: enquiry.review_body || '', isReadOnly: true }); }}
                                      className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                    >
                                      View Review
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Accordion Body */}
                            <div className={`md:grid md:grid-rows-[1fr] md:opacity-100 md:p-4 grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                              <div className="overflow-hidden flex flex-col md:flex-row gap-4 px-4 pb-4 md:p-0 border-t border-gray-150 md:border-t-0 pt-3 md:pt-0">
                                <div className="hidden md:block w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-white flex-shrink-0">
                                  <img
                                    src={enquiry.image_path ? getImageUrl(enquiry.image_path) : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>'}
                                    alt={displayTitle}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap justify-between items-start gap-2">
                                    <div className="hidden md:block">
                                      <h4 className="font-bold text-gray-900 text-base">{displayTitle}</h4>
                                      <div className="flex gap-2 items-center text-xs text-gray-400">
                                        <span>Supplier: <strong className="text-gray-600">{enquiry.business_name}</strong></span>
                                        <span>•</span>
                                        <span className={`font-mono text-[11px] font-bold ${enquiryTab === 'product_enquiries' ? 'text-purple-500' : 'text-red-500'}`}>ID: #{1000 + enquiry.id}</span>
                                      </div>
                                    </div>

                                    <div className="md:hidden text-xs text-gray-500 w-full mb-1">
                                      Supplier: <strong className="text-gray-700">{enquiry.business_name}</strong>
                                    </div>

                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto">
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-150 text-gray-600 border border-gray-200">
                                        {enquiry.type}
                                      </span>
                                      <span className="hidden md:flex text-xs text-gray-400 mt-1 items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(enquiry.created_at).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 border-t border-b border-dashed border-gray-150 py-2">
                                    <p>Price: <strong className="text-gray-800 font-bold">{displayPrice}</strong></p>
                                    {!enquiry.enquiry_text.includes('Enquiry about Gallery Product:') && (<p>Experience: <strong className="text-gray-800">{enquiry.experience}</strong></p>)}
                                  </div>

                                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs text-gray-500">Status:</span>
                                      <span className={`text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${enquiry.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                        enquiry.status === 'COMPLETED' ? 'bg-green-200 text-green-900 border border-green-300' :
                                          enquiry.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' :
                                            enquiry.status === 'SERVICE_REQUESTED' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}>
                                        {enquiry.status === 'ENQUIRY_SUBMITTED' ? 'Enquiry Submitted' : 'Enquiry Completed'}
                                      </span>
                                    </div>
                                    {enquiryTab === 'product_enquiries' && enquiry.status === 'COMPLETED' && !enquiry.has_reviewed && (
                                      <button
                                        onClick={() => setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: displayTitle, rating: 5, title: '', body: '', isReadOnly: false })}
                                        className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                      >
                                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                                        Write a Review
                                      </button>
                                    )}
                                    {enquiryTab === 'product_enquiries' && enquiry.status === 'COMPLETED' && enquiry.has_reviewed === 1 && (
                                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Review Written</span>
                                        <button
                                          onClick={() => setServiceReviewModalState({ isOpen: true, service_id: enquiry.service_id, enquiry_id: enquiry.id, service_name: displayTitle, rating: Number(enquiry.review_rating) || 5, title: enquiry.review_title || '', body: enquiry.review_body || '', isReadOnly: true })}
                                          className="text-xs bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1"
                                        >
                                          View Review
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Returns Section */}
              {historySubTab === 'returns' && (
                <UserReturns />
              )}

              {/* Refunds Section */}
              {historySubTab === 'refunds' && (
                <UserRefunds />
              )}

              {/* Reviews Section */}
              {historySubTab === 'reviews' && (
                <UserReviews />
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-lg mb-6 text-gray-800 flex items-center gap-2 border-b border-gray-50 pb-3">
                <LifeBuoy className="w-5 h-5 text-gray-500" />
                Help & Support Portal
              </h3>

              {!selectedTicket ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 bg-transparent"
                          placeholder="e.g. Refund not received"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Detailed Message</label>
                        <textarea
                          rows="4"
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 bg-transparent"
                          placeholder="Please describe your issue in detail..."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={ticketRaising}
                        className="w-full py-3 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold rounded-xl shadow-md  transition-opacity disabled:opacity-50 text-sm flex justify-center items-center gap-2"
                      >
                        {ticketRaising ? 'Submitting request...' : 'Raise Ticket'}
                      </button>
                    </form>
                  </div>

                  {/* Right: Ticket list / history */}
                  <div className="lg:col-span-2">
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
                            className="p-4 rounded-xl border border-gray-150 hover:border-red-500 hover:bg-gray-50/30 transition-all cursor-pointer flex justify-between items-center"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">
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
                                ticket.status === 'IN_PROGRESS' ? 'bg-red-100 text-red-700 border border-red-200' :
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
                <div className="flex flex-col h-[550px] border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/30">
                  {/* Chat header */}
                  <div className="bg-white border-b border-gray-150 p-4 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="text-xs text-red-500 font-bold hover:underline mr-1"
                        >
                          ← Back to list
                        </button>
                        <span className="font-mono text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-200">
                          #{selectedTicket.ticket_number}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">{selectedTicket.subject}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${selectedTicket.status === 'RESOLVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      selectedTicket.status === 'IN_PROGRESS' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-yellow-100 text-yellow-800 border border-yellow-250'
                      }`}>
                      {selectedTicket.status}
                    </span>
                  </div>

                  {/* Message history */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-100/50">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
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
                        className="flex-grow border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 rounded-xl shadow-sm  transition-opacity"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  ) : (
                    <div className="bg-white border-t border-gray-150 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">This ticket has been resolved and closed.</span>
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
                        className="px-4 py-2 bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-red-600 transition-colors"
                      >
                        Reopen Ticket
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bank' && <UserBankAccounts />}

          {activeTab === 'refunds' && <UserRefunds />}

        </div>

      </div>
      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={mapModalOpen}
        initialLocation={locationData}
        onSave={handleLocationSave}
        onCancel={() => setMapModalOpen(false)}
        title="Pin Delivery Location on OpenStreetMap"
      />

      {/* Return/Replacement Modal */}
      {returnModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800">
                Request {returnModalState.type === 'REFUND' ? 'Return & Refund' : 'Replacement'}
              </h3>
              <button onClick={() => setReturnModalState({ isOpen: false, items: [], orderId: null, type: 'REFUND', reason: '', description: '' })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitReturnRequest} className="p-4 space-y-4 overflow-y-auto">
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 max-h-[150px] overflow-y-auto">
                <p className="text-xs font-bold text-gray-500 uppercase">Selected Items ({returnModalState.items.length})</p>
                {returnModalState.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded shadow-sm">
                    <img src={item.thumbnail ? getImageUrl(item.thumbnail) : ''} alt="" className="w-8 h-8 object-contain mix-blend-multiply" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Reason for Request</label>
                <select
                  required
                  value={returnModalState.reason}
                  onChange={e => setReturnModalState({ ...returnModalState, reason: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-3"
                >
                  <option value="">Select a reason</option>
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                  <option value="Missing Parts">Missing Parts</option>
                  <option value="Defective">Defective</option>
                  <option value="Not as Described">Not as Described</option>
                  <option value="Other">Other</option>
                </select>

                <label className="block text-xs font-bold text-gray-600 mb-1">Additional Remarks (Optional)</label>
                <textarea
                  rows="3"
                  value={returnModalState.description}
                  onChange={e => setReturnModalState({ ...returnModalState, description: e.target.value })}
                  placeholder="Please provide any extra details..."
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>

              <div className="pt-2 shrink-0">
                <button type="submit" className="w-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold py-3 rounded-xl transition-colors">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">Write a Review</h3>
              <button onClick={() => setReviewModalState({ isOpen: false, item: null, product_id: null, rating: 5, title: '', body: '', images: [] })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitReviewRequest} className="p-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <img src={reviewModalState.item?.thumbnail ? getImageUrl(reviewModalState.item.thumbnail) : ''} alt="" className="w-10 h-10 object-contain mix-blend-multiply" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-800 line-clamp-1">{reviewModalState.item?.name}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModalState({ ...reviewModalState, rating: star })}
                      className={`p-1 ${reviewModalState.rating >= star ? 'text-yellow-400' : 'text-gray-200'} hover:scale-110 transition-transform`}
                    >
                      <Star size={28} fill={reviewModalState.rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={reviewModalState.title}
                  onChange={e => setReviewModalState({ ...reviewModalState, title: e.target.value })}
                  placeholder="Summarize your review"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Detailed Review</label>
                <textarea
                  rows="3"
                  value={reviewModalState.body}
                  onChange={e => setReviewModalState({ ...reviewModalState, body: e.target.value })}
                  placeholder="What did you like or dislike?"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                />
              </div>

              {reviewModalState.message && (
                <div className={`p-3 rounded-xl text-sm font-bold text-center ${reviewModalState.isError ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                  {reviewModalState.message}
                </div>
              )}

              <div className="pt-2">
                <button type="submit" disabled={!!reviewModalState.message && !reviewModalState.isError} className="w-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {reviewModalState.message && !reviewModalState.isError ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Service Review Modal */}
      {serviceReviewModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">{serviceReviewModalState.isReadOnly ? 'Your Service Review' : 'Review Service Booking'}</h3>
              <button onClick={() => setServiceReviewModalState({ isOpen: false, service_id: null, enquiry_id: null, service_name: '', rating: 5, title: '', body: '', isReadOnly: false })} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitServiceReviewRequest} className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">You are reviewing:</p>
                <p className="text-sm font-bold text-gray-800">{serviceReviewModalState.service_name}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      disabled={serviceReviewModalState.isReadOnly}
                      onClick={() => !serviceReviewModalState.isReadOnly && setServiceReviewModalState({ ...serviceReviewModalState, rating: star })}
                      className={`p-1 ${serviceReviewModalState.rating >= star ? 'text-yellow-400' : 'text-gray-200'} ${serviceReviewModalState.isReadOnly ? 'cursor-default' : 'hover:scale-110 transition-transform'}`}
                    >
                      <Star size={28} fill={serviceReviewModalState.rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={serviceReviewModalState.title}
                  readOnly={serviceReviewModalState.isReadOnly}
                  onChange={e => !serviceReviewModalState.isReadOnly && setServiceReviewModalState({ ...serviceReviewModalState, title: e.target.value })}
                  placeholder="Summarize your experience"
                  className={`w-full border border-gray-200 rounded-xl p-3 text-sm outline-none ${serviceReviewModalState.isReadOnly ? 'bg-gray-50 text-gray-700' : 'focus:ring-2 focus:ring-red-500/20 focus:border-red-500'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Detailed Review</label>
                <textarea
                  rows="3"
                  value={serviceReviewModalState.body}
                  readOnly={serviceReviewModalState.isReadOnly}
                  onChange={e => !serviceReviewModalState.isReadOnly && setServiceReviewModalState({ ...serviceReviewModalState, body: e.target.value })}
                  placeholder="Tell us about the service..."
                  className={`w-full border border-gray-200 rounded-xl p-3 text-sm outline-none ${serviceReviewModalState.isReadOnly ? 'bg-gray-50 text-gray-700' : 'focus:ring-2 focus:ring-red-500/20 focus:border-red-500'}`}
                />
              </div>

              {serviceReviewModalState.message && (
                <div className={`p-3 rounded-xl text-sm font-bold text-center ${serviceReviewModalState.isError ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                  {serviceReviewModalState.message}
                </div>
              )}

              {!serviceReviewModalState.isReadOnly && (
                <div className="pt-2">
                  <button type="submit" disabled={!!serviceReviewModalState.message && !serviceReviewModalState.isError} className="w-full bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:text-red-600 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {serviceReviewModalState.message && !serviceReviewModalState.isError ? 'Submitting...' : 'Submit Service Review'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressManagement;
