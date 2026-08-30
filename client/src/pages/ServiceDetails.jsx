import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, useNavigate, Link, useNavigationType , useLocation } = rrdPkg;
import { useSelector } from 'react-redux';
import api from '../services/api';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { Briefcase, Award, Sparkles, Share2, Clipboard, MapPin, Phone, Mail, User, Info, ArrowLeft, ShieldCheck, CheckCircle2, Globe, CalendarClock, Calendar, Lock, Clock, Headphones, Star, MessageCircle, X, Contact, PhoneCall, AtSign, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const WorkingHoursDisplay = ({ hoursStr }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!hoursStr) return null;
  
  if (!hoursStr.includes('|')) {
    return <p className="font-medium text-gray-800 mt-0.5 text-sm">{hoursStr}</p>;
  }

  const daysArr = hoursStr.split('|').map(s => s.trim());
  const todayIndex = new Date().getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = dayNames[todayIndex];

  const todaySchedule = daysArr.find(d => d.startsWith(todayStr)) || daysArr[0];
  const otherDays = daysArr.filter(d => d !== todaySchedule);
  const todayTime = todaySchedule.substring(todaySchedule.indexOf(':') + 1).trim();

  return (
    <div className="mt-0.5 w-full">
      <div 
        className="flex items-center gap-1.5 cursor-pointer group select-none w-max"
        onClick={() => setExpanded(!expanded)}
      >
        <p className="text-sm font-medium text-gray-800">
          <span className="font-bold text-blue-600 mr-1">Today:</span> 
          <span className={todayTime.toLowerCase().includes('closed') ? 'text-red-500 font-semibold' : ''}>{todayTime}</span>
        </p>
        <div className="text-gray-400 group-hover:text-blue-500 transition-colors bg-gray-50 rounded-full p-0.5 flex items-center justify-center">
          {expanded ? <ChevronUp size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} />}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-2.5 pl-3 border-l-2 border-gray-100 flex flex-col gap-2">
          {otherDays.map((schedule, idx) => {
            const colonIdx = schedule.indexOf(':');
            const day = schedule.substring(0, colonIdx).trim();
            const time = schedule.substring(colonIdx + 1).trim();
            const isClosed = time.toLowerCase().includes('closed');
            return (
              <div key={idx} className="flex items-center text-sm">
                <span className="w-[42px] font-bold text-gray-400 uppercase text-[10px] tracking-wider">{day}</span>
                <span className={`font-medium ${isClosed ? 'text-red-400 text-xs bg-red-50 px-1.5 py-0.5 rounded' : 'text-gray-700'}`}>{time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ServiceDetails = () => {
  const params = useParams();
  const slug = params.serviceTitle || params.slug;
  const navigate = useNavigate();
  const navType = useNavigationType();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Interaction form states
  const [modalTab, setModalTab] = useState('enquiry');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  // Enquiry state
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryCity, setEnquiryCity] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryText, setEnquiryText] = useState('');

  // Booking state
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);

  // New Address state
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');

  const getImageUrl = (path) => {
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  useEffect(() => {
    fetchServiceDetails();
  }, [slug]);

  const fetchServiceDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/services/${slug}`);
      setService(res.data.service);
    } catch (err) {
      console.error(err);
      setError('Service not found or failed to load service details.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll position preservation
  useEffect(() => {
    const key = `scroll_pos_${location.pathname}${location.search}`;
    const saved = sessionStorage.getItem(key);
    const isReload = window.performance.getEntriesByType('navigation')[0]?.type === 'reload';
    if (navType === 'POP' && !isReload && saved && !loading && service) {
      let attempts = 0;
      const scrollInterval = setInterval(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' });
        attempts++;
        if (attempts >= 5) {
          clearInterval(scrollInterval);
        }
      }, 80);
    }

    const handleScroll = () => {
      if (window.scrollY > 0) {
        sessionStorage.setItem(key, window.scrollY.toString());
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, location.search, loading, service]);
  useEffect(() => {
    if (isAuthenticated && user) {
      setEnquiryName(user.name || '');
      setEnquiryPhone(user.phone || '');
      setBookingName(user.name || '');
      setBookingPhone(user.phone || '');
      fetchAddresses();
    }
  }, [isAuthenticated, user]);

  const fetchAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      const shippingAddrs = res.data.addresses?.filter(a => a.type === 'SHIPPING') || [];
      setSavedAddresses(shippingAddrs);
      if (shippingAddrs.length > 0) {
        setSelectedAddressId(shippingAddrs[0].id);
      } else {
        setUseNewAddress(true);
      }
    } catch (err) {
      console.error('Failed to load addresses', err);
    }
  };

  const handleShare = async () => {
    const title = service?.name || 'Service Details';
    const priceStr = service ? `₹${Number(service.amount).toLocaleString('en-IN')}` : '';
    const desc = service?.description || '';
    const exp = service?.experience || '0';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://www.ibcmart.com' + location.pathname;
    const imageUrl = service?.image_path ? getImageUrl(service.image_path) : (service?.mobile_image ? getImageUrl(service.mobile_image) : '');

    const shareText = `🛠️ *${title}*\n💼 *Experience:* ${exp} Yrs\n💰 *Price:* ${priceStr}\n📝 *Description:* ${desc}\n🖼️ *Image:* ${imageUrl}\n\nLink: ${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Service details, image link, and URL copied to clipboard!');
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard');
      console.error('Error sharing:', err);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryPhone || enquiryPhone.trim().length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/services/enquire', {
        serviceId: service.id,
        vendorId: service.vendor_id,
        customerId: isAuthenticated ? user?.id : null,
        customerName: enquiryName.trim(),
        customerPhone: enquiryPhone.trim(),
        enquiryText: [enquiryText.trim(), enquiryEmail.trim() ? `(Email: ${enquiryEmail.trim()})` : '', enquiryCity.trim() ? `(City: ${enquiryCity.trim()})` : ''].filter(Boolean).join(' ')
      });
      toast.success('Your enquiry has been sent successfully! The service provider will contact you soon.');
      setEnquiryText('');
      setIsEnquiryModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingPhone || bookingPhone.trim().length !== 10) {
      toast.error('Please enter a valid 10-digit booking phone number.');
      return;
    }

    try {
      setSubmitting(true);
      let addressDetails = '';
      let targetAddressId = null;

      if (useNewAddress) {
        if (!newFullName || !newPhone || !newStreet || !newCity || !newState || !newZip) {
          toast.error('Please fill out all address fields.');
          return;
        }
        addressDetails = `${newFullName}, ${newPhone}, ${newStreet}, ${newCity}, ${newState} - ${newZip}`;

        // Save address to address table for future use
        const addrRes = await api.post('/addresses', {
          type: 'SHIPPING',
          street: newStreet.trim(),
          city: newCity.trim(),
          state: newState.trim(),
          zip: newZip.trim(),
          country: 'India',
          name: newFullName.trim(),
          phone: newPhone.trim()
        });
        targetAddressId = addrRes.data.addressId;
      } else {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        if (!addr) {
          toast.error('Please select or add an address.');
          return;
        }
        addressDetails = `${addr.name}, ${addr.phone}, ${addr.street}, ${addr.city}, ${addr.state} - ${addr.zip}`;
        targetAddressId = addr.id;
      }

      await api.post('/services/enquire', {
        serviceId: service.id,
        vendorId: service.vendor_id,
        customerId: user?.id,
        customerName: bookingName.trim(),
        customerPhone: bookingPhone.trim(),
        enquiryText: `Wants Service Booking. Address: ${addressDetails}`,
        type: 'BOOKING',
        status: 'SERVICE_REQUESTED',
        addressId: targetAddressId
      });

      toast.success('Service booking request placed successfully!');
      setIsEnquiryModalOpen(false);
      if (useNewAddress) {
        fetchAddresses();
        setUseNewAddress(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit service booking request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderEnquiryForm = () => (
    <div className="space-y-4">
      <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
        <Mail size={16} className="text-red-650" />
        Send Enquiry Message
      </h4>
      <p className="text-[11px] text-gray-500 -mt-2 mb-2">Fill in the details below and we will get back to you.</p>

      <form onSubmit={handleEnquirySubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Your Name</label>
          <input
            type="text"
            required
            value={enquiryName}
            onChange={(e) => setEnquiryName(e.target.value)}
            placeholder="Enter your name"
            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Mobile Number</label>
          <input
            type="tel"
            required
            value={enquiryPhone}
            onChange={(e) => setEnquiryPhone(e.target.value)}
            placeholder="Enter 10-digit mobile number"
            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Your Email (Optional)</label>
          <input
            type="email"
            value={enquiryEmail}
            onChange={(e) => setEnquiryEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5">City</label>
          <input
            type="text"
            value={enquiryCity}
            onChange={(e) => setEnquiryCity(e.target.value)}
            placeholder="Enter your city"
            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Your Message</label>
          <textarea
            required
            rows={3}
            value={enquiryText}
            onChange={(e) => setEnquiryText(e.target.value)}
            placeholder="What details or specifications are you looking for?"
            className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#cc0000] text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors text-[13px] shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
        >
          <Mail size={16} /> {submitting ? 'Sending...' : 'Send Enquiry'}
        </button>
      </form>

      {/* Trust Indicators */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-[10px] font-semibold text-gray-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-gray-400" /> Quick Response
        </div>
        <div className="flex items-center gap-1.5">
          <Lock size={12} className="text-gray-400" /> Your Data is Safe
        </div>
        <div className="flex items-center gap-1.5">
          <Headphones size={12} className="text-gray-400" /> 24/7 Support
        </div>
      </div>
    </div>
  );

  const renderBookingForm = () => (
    <div className="space-y-4">
      {!isAuthenticated ? (
        <div className="py-8 text-center space-y-4">
          <p className="text-sm text-gray-500">Please log in to submit a service booking request.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl shadow hover:bg-blue-700 text-xs uppercase tracking-wider"
          >
            Login Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={16} className="text-red-650" />
            Book Service Address
          </h4>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 pb-3 border-b border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={bookingName}
                  onChange={(e) => setBookingName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  value={bookingPhone}
                  onChange={(e) => setBookingPhone(e.target.value)}
                  placeholder="10-digit number"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                />
              </div>
            </div>

            {!useNewAddress && savedAddresses.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                  {savedAddresses.map(address => (
                    <label key={address.id} className={`flex items-start gap-2.5 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${selectedAddressId === address.id ? 'border-red-500 bg-red-50/10' : 'border-gray-200'}`}>
                      <input
                        type="radio"
                        name="bookingAddress"
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="mt-0.5 accent-red-600"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-gray-800">{address.name}</p>
                        <p className="text-gray-500 mt-0.5">{address.street}, {address.city}, {address.state} - {address.zip}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setUseNewAddress(true)}
                  className="text-xs text-red-650 font-bold hover:underline"
                >
                  + Use a different address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(false)}
                    className="text-xs font-bold text-red-650 hover:underline mb-1 block"
                  >
                    ← Choose from saved addresses
                  </button>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required={useNewAddress}
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Alternative Phone Number *</label>
                    <input
                      type="tel"
                      required={useNewAddress}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="10-digit number"
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Street Address *</label>
                  <textarea
                    required={useNewAddress}
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">City *</label>
                    <input
                      type="text"
                      required={useNewAddress}
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">State *</label>
                    <input
                      type="text"
                      required={useNewAddress}
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">ZIP *</label>
                    <input
                      type="text"
                      required={useNewAddress}
                      value={newZip}
                      onChange={(e) => setNewZip(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-red-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#cc0000] text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors text-[13px] shadow-md disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <Sparkles size={16} /> {submitting ? 'Placing Request...' : 'Book Service'}
            </button>
          </form>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-md mx-auto my-32 text-center space-y-4">
        <div className="inline-block w-8 h-8 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-semibold text-sm">Loading service details...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-md mx-auto my-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Oops!</h2>
        <p className="text-gray-500">{error || 'Something went wrong.'}</p>
        <Link to="/" className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">
          Go Back Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-3 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start lg:items-stretch">
          {/* Back link */}
          <div className="hidden md:flex col-span-1 lg:col-span-12 mb-1 lg:mb-2 justify-between items-center w-full">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors font-semibold"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <span className="text-gray-900 text-sm font-bold">Service</span>
          </div>

          {/* Left Column: Service Details (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="w-full relative h-[240px] sm:h-[300px] md:h-[360px] bg-gray-50 flex items-center justify-center overflow-hidden">
              <img
                src={getImageUrl(service.image_path || service.mobile_image)}
                alt={service.name}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              />
              {/* Mobile Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="md:hidden absolute top-4 left-4 bg-white/95 text-gray-700 p-3 rounded-full shadow-md flex items-center justify-center transition-all border border-gray-100 active:scale-95 z-20"
              >
                <ArrowLeft size={18} />
              </button>
              {/* Share float button on image */}
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 bg-white/95 hover:bg-white text-gray-700 p-3 rounded-full shadow-md flex items-center justify-center transition-all border border-gray-100 hover:scale-105 active:scale-95"
                title="Share Service"
              >
                {copied ? <Clipboard size={18} className="text-green-600" /> : <Share2 size={18} />}
              </button>
            </div>

            <div className="p-4 md:p-6 bg-white relative z-10 rounded-t-[1.5rem] -mt-6 md:-mt-8">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h1 className={`text-xl md:text-2xl font-semibold md:font-bold text-gray-900 leading-tight break-all w-full ${!isTitleExpanded ? 'line-clamp-2 md:line-clamp-none' : ''}`}>{service.name}</h1>

                  {service.name && service.name.length > 40 && (
                    <button
                      onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                      className="text-[#cc0000] text-[11px] font-bold md:hidden block mt-0.5 hover:underline"
                    >
                      {isTitleExpanded ? 'Read Less' : 'Read More'}
                    </button>
                  )}

                  <div className="flex items-center flex-wrap gap-2">
                    <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-green-100 shrink-0">
                      <ShieldCheck size={10} /> Verified
                    </span>
                  </div>
                  <div className="text-xs md:text-[13px] font-semibold text-gray-600">
                    Provider: <Link to={`/business/${service.vendor_id}`} className="text-gray-900 font-bold hover:underline">{service.business_name}</Link>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs md:text-[13px] font-semibold text-gray-700">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-yellow-600">{Number(service.rating || 0).toFixed(1)}</span>
                    <Link to={`/shop/${service.vendor_slug || service.vendor_id}/reviews?type=service`} className="text-blue-600 hover:underline cursor-pointer transition-colors">
                      ({service.review_count || 0} Reviews)
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-xs md:text-[13px] font-semibold text-gray-600">
                    <MapPin size={12} className="text-red-500" />
                    <span>{service.city || 'Erode, Tamil Nadu'}</span>
                  </div>
                </div>
                <div className="text-right pl-2 shrink-0">
                  <div className="text-lg md:text-xl font-extrabold text-red-600">₹{Number(service.amount).toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-gray-400 font-semibold mt-0.5">Starting Price</div>
                </div>
              </div>

              {/* Quick Contact Buttons (Mobile: Call/WhatsApp/Enquire-Book; Desktop: Call/WhatsApp) */}
              <div className="grid grid-cols-3 md:grid-cols-2 gap-2 mt-5">
                <a
                  href={`tel:${service.vendor_profile_phone || service.vendor_phone || '1234567890'}`}
                  className="flex items-center justify-center gap-1 border border-red-600 text-red-600 py-2.5 rounded-xl text-[10px] font-bold hover:bg-red-50 transition-colors"
                >
                  <Phone size={12} /> Call Now
                </a>
                <a
                  href={`https://wa.me/${(service.vendor_profile_whatsapp || service.vendor_profile_phone || service.vendor_phone || '1234567890').replace(/\D/g, '').length === 10 ? '91' + (service.vendor_profile_whatsapp || service.vendor_profile_phone || service.vendor_phone || '1234567890').replace(/\D/g, '') : (service.vendor_profile_whatsapp || service.vendor_profile_phone || service.vendor_phone || '1234567890').replace(/\D/g, '')}?text=Hi, I am interested in your service: ${service.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 bg-[#22c55e] hover:bg-[#1ebd5b] text-white py-2.5 rounded-xl text-[10px] font-bold shadow-sm transition-colors"
                >
                  <MessageCircle size={12} /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="md:hidden flex items-center justify-center gap-1 bg-[#007bff] hover:bg-[#0069d9] text-white py-2.5 rounded-xl text-[10px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Enquire / Book
                </button>
              </div>

              {/* Stats: Experience, Price, Type, Location */}
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm min-w-0">
                  <div className="bg-blue-50 p-2 rounded-full text-blue-600 shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Experience</span>
                    <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                      {service.experience}{String(service.experience).toLowerCase().match(/yr|year/) ? '' : ' Years'}
                    </span>
                  </div>
                </div>

                <div className="flex md:hidden border border-gray-100 rounded-xl p-3 items-center gap-3 shadow-sm min-w-0">
                  <div className="bg-green-50 p-2 rounded-full text-green-600 shrink-0">
                    <Award size={16} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Pricing</span>
                    <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                      ₹{Number(service.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex border border-gray-100 rounded-xl p-3 items-center gap-3 shadow-sm min-w-0">
                  <div className="bg-purple-50 p-2 rounded-full text-purple-600 shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Service Type</span>
                    <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                      E-commerce
                    </span>
                  </div>
                </div>

                <div className="hidden md:flex border border-gray-100 rounded-xl p-3 items-center gap-3 shadow-sm min-w-0">
                  <div className="bg-orange-50 p-2 rounded-full text-orange-600 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Location</span>
                    <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                      {service.city || 'Erode, Tamil Nadu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* About / Description */}
              <div className="mt-6 space-y-3 pt-2">
                <h3 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                  <Clipboard size={16} className="text-red-600" />
                  About Service
                </h3>
                <p className={`text-[13px] md:text-sm font-medium text-gray-700 leading-relaxed ${isAboutExpanded ? '' : 'line-clamp-4'}`}>
                  {service.description || `Here is a professional description you can use as a prompt or project description: Building a scalable platform requires a flexible and maintainable architecture. The application should support multiple storage providers without changing the core business logic. All file uploads must pass through a centralized Storage Service that abstracts the underlying provider.`}
                </p>
                <button
                  onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                  className="text-red-600 text-[13px] font-bold mt-1 flex items-center gap-1 hover:underline"
                >
                  {isAboutExpanded ? 'Read Less' : 'Read More'}
                  <ArrowLeft size={12} className={isAboutExpanded ? 'rotate-[90deg]' : 'rotate-[270deg]'} />
                </button>
              </div>

              <hr className="border-gray-100 mt-4 md:mt-3" />

              {/* Provider Details Block */}
              <div id="provider-contact" className="mt-8 md:mt-6 bg-white rounded-xl">
                <h3 className="text-[15px] md:text-base font-bold text-gray-900 mb-5">
                  Business Location & Contact
                </h3>

                <div className="space-y-0 text-[13px] md:text-sm font-medium text-gray-700">
                  {/* Address (using Contact icon as in screenshot) */}
                  <div className="flex items-start gap-4 border-b border-dashed border-gray-200 py-3.5 first:pt-0">
                    <div className="bg-red-50 p-2.5 rounded-xl text-red-500 shrink-0">
                      <Contact size={18} />
                    </div>
                    <div className="mt-0.5">
                      <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Address</span>
                      <span className="text-gray-900 font-semibold leading-snug">{service.business_address || '147, Erode - Nasiyanur Road, Sampath Nagar, Erode, Tamil Nadu, 638011'}</span>
                    </div>
                  </div>



                  {/* Email */}
                  <div className="flex items-center gap-4 border-b border-dashed border-gray-200 py-3.5">
                    <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500 shrink-0">
                      <AtSign size={18} />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Email</span>
                      <span className="text-gray-900 font-semibold">{service.business_email || service.vendor_email || 'info@ibc.in'}</span>
                    </div>
                  </div>

                  {/* Website */}
                  {service.website && (
                    <div className="flex items-center gap-4 border-b border-dashed border-gray-200 py-3.5">
                      <div className="bg-purple-50 p-2.5 rounded-xl text-purple-500 shrink-0">
                        <LinkIcon size={18} />
                      </div>
                      <div className="w-full min-w-0">
                        <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Website</span>
                        <a href={service.website.startsWith('http') ? service.website : `https://${service.website}`} className="text-gray-900 font-semibold hover:text-purple-600 hover:underline truncate block" target="_blank" rel="noopener noreferrer">
                          {service.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Working Hours */}
                  {service.working_hours && (
                    <div className="flex items-start gap-4 pt-3.5">
                      <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                        <CalendarClock size={18} />
                      </div>
                      <div className="mt-0.5 w-full">
                        <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Working Hours</span>
                        <WorkingHoursDisplay hoursStr={service.working_hours} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interaction Form & Tabs (5 cols) */}
          <div className="hidden lg:flex lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex-col space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setModalTab('enquiry')}
                className={`flex-1 text-center pb-3 font-bold text-sm border-b-2 transition-colors ${modalTab === 'enquiry' ? 'border-red-655 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Enquiry
              </button>
              <button
                onClick={() => setModalTab('booking')}
                className={`flex-1 text-center pb-3 font-bold text-sm border-b-2 transition-colors ${modalTab === 'booking' ? 'border-red-655 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Book Service
              </button>
            </div>

            {modalTab === 'enquiry' ? renderEnquiryForm() : renderBookingForm()}

            {/* Why Choose Us */}
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 lg:p-10 shadow-sm !mt-auto">
              <h4 className="text-sm lg:text-base font-extrabold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                <Award className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Why Choose Us?
              </h4>
              <div className="space-y-3 lg:space-y-5">
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Trusted & Verified Business
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Quality Service Guaranteed
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Customer Satisfaction Priority
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> On-time Support
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors z-50"
            onClick={() => setIsImageModalOpen(false)}
          >
            <X size={24} />
          </button>
          <img
            src={getImageUrl(service.image_path || service.mobile_image)}
            alt={service.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Mobile Enquiry & Booking Modal */}
      {isEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 relative w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsEnquiryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setModalTab('enquiry')}
                className={`flex-1 text-center pb-3 font-bold text-sm border-b-2 transition-colors ${modalTab === 'enquiry' ? 'border-red-655 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Enquiry
              </button>
              <button
                onClick={() => setModalTab('booking')}
                className={`flex-1 text-center pb-3 font-bold text-sm border-b-2 transition-colors ${modalTab === 'booking' ? 'border-red-655 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Book Service
              </button>
            </div>

            <div className="mt-2">
              {modalTab === 'enquiry' ? renderEnquiryForm() : renderBookingForm()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceDetails;

