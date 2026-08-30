import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, Link, useSearchParams, useNavigationType, useNavigate, useLocation } = rrdPkg;
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useSsrData } from '../ssr/SsrDataContext';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { MapPin, Phone, Mail, Globe, Clock, MessageCircle, X, Sparkles, Briefcase, Award, Plus, Check, Share2, MoreVertical, ShieldCheck, Star, FileText, ChevronDown, ChevronUp, PhoneCall, AtSign, Link as LinkIcon, CalendarClock, Contact, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const slugify = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const WorkingHoursDisplay = ({ hoursStr, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (!hoursStr) return null;

  if (!hoursStr.includes('|')) {
    return <p className={`font-medium text-gray-800 mt-0.5 ${compact ? 'text-xs truncate max-w-[150px]' : 'text-sm'}`}>{hoursStr}</p>;
  }

  const daysArr = hoursStr.split('|').map(s => s.trim());
  const todayIndex = new Date().getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = dayNames[todayIndex];

  const todaySchedule = daysArr.find(d => d.startsWith(todayStr)) || daysArr[0];
  const otherDays = daysArr.filter(d => d !== todaySchedule);
  const todayTime = todaySchedule.substring(todaySchedule.indexOf(':') + 1).trim();

  if (compact) {
    return <p className="text-xs text-gray-500 mt-1 font-medium truncate max-w-[150px]">{todayTime}</p>;
  }

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

const checkIsBusinessLive = (hoursStr) => {
  if (!hoursStr) return false;

  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayStr = dayNames[now.getDay()];

  let todaySchedule = '';
  if (hoursStr.includes('|')) {
    const daysArr = hoursStr.split('|').map(s => s.trim());
    todaySchedule = daysArr.find(d => d.startsWith(todayStr)) || daysArr[0];
    todaySchedule = todaySchedule.substring(todaySchedule.indexOf(':') + 1).trim();
  } else {
    todaySchedule = hoursStr;
  }

  if (todaySchedule.toLowerCase().includes('closed')) return false;
  if (todaySchedule.toLowerCase().includes('24 hours')) return true;

  const parts = todaySchedule.split('-');
  if (parts.length !== 2) return true;

  const parseTo24 = (timeStr) => {
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)$/i);
    if (!match) return -1;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const p = match[3].toUpperCase();
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const openTime = parseTo24(parts[0]);
  const closeTime = parseTo24(parts[1]);
  if (openTime === -1 || closeTime === -1) return true;

  const currentMins = now.getHours() * 60 + now.getMinutes();

  if (closeTime <= openTime) {
    return currentMins >= openTime || currentMins <= closeTime;
  }

  return currentMins >= openTime && currentMins <= closeTime;
};

const BusinessProfile = () => {
  const { slug } = useParams();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const navType = useNavigationType();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: ssrData } = useSsrData() || {};
  const isSsrMatch = ssrData?.pageType === 'businessProfile' && ssrData?.business?.slug === slug;

  const [business, setBusiness] = useState(() => {
    if (isSsrMatch) return ssrData.business;
    try {
      const cached = sessionStorage.getItem(`biz_profile_${slug}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [services, setServices] = useState(() => {
    if (isSsrMatch) return ssrData.services || [];
    try {
      const cached = sessionStorage.getItem(`biz_services_${slug}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    if (isSsrMatch) return false;
    try {
      const cached = sessionStorage.getItem(`biz_profile_${slug}`);
      return !cached;
    } catch {
      return true;
    }
  });
  const [selectedService, setSelectedService] = useState(null);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isKeywordsExpanded, setIsKeywordsExpanded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProfileTab = searchParams.get('tab') || 'images_gallery';
  const setActiveProfileTab = (tab) => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab && tab !== 'images_gallery') {
      nextParams.set('tab', tab);
    } else {
      nextParams.delete('tab');
    }
    setSearchParams(nextParams);
  };

  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const [isImagesGalleryExpanded, setIsImagesGalleryExpanded] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);

  useEffect(() => {
    const key = `scroll_pos_${window.location.pathname}${window.location.search}`;
    const saved = sessionStorage.getItem(key);
    if (navType === 'POP' && saved && !loading && business) {
      let attempts = 0;
      console.log('Restoring scroll to:', saved);
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
  }, [location.pathname, location.search, loading, business]);

  const handleShareService = async (e, serviceId, serviceName) => {
    e.preventDefault();
    e.stopPropagation();
    const citySlug = (business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categorySlug = (business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const shareUrl = `${window.location.origin}/${citySlug}/${categorySlug}/${serviceId}/${business?.slug || business?.id}`;
    const shareData = {
      title: serviceName || 'Service Details',
      text: 'Check out this service!',
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Service link copied to clipboard!');
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard');
      console.error('Error sharing service:', err);
    }
  };



  // Service Enquiry/Booking modal states
  const [modalTab, setModalTab] = useState('enquiry'); // 'enquiry' or 'booking'

  // Enquiry form fields
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryText, setEnquiryText] = useState('');

  // Booking contact details
  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');

  // Booking address selection states
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // New address form fields
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newZip, setNewZip] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBusinessAndServices = async () => {
      try {
        const res = await api.get(`/public/business/${slug}`);
        if (res.data.success || res.data.business) {
          const fetchedBusiness = res.data.business;
          setBusiness(fetchedBusiness);

          // Auto-redirect to the clean 5-segment SEO URL if the user landed on an old link
          const citySlug = (fetchedBusiness?.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const categorySlug = (fetchedBusiness?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const kwSlug = fetchedBusiness?.keywords ? fetchedBusiness.keywords.split(/[,/_\-]+/).map(k => k.trim()).filter(Boolean).slice(0, 2).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'keywords';
          const idealPath = `/${citySlug}/shop/${fetchedBusiness?.slug || fetchedBusiness?.id}/${categorySlug}`;

          if (location.pathname !== idealPath && !location.pathname.endsWith('/gallery')) {
            navigate(idealPath, { replace: true });
          }

          try {
            sessionStorage.setItem(`biz_profile_${slug}`, JSON.stringify(fetchedBusiness));
          } catch (e) { }

          const servicesRes = await api.get(`/services/vendor/${slug}`);
          setServices(servicesRes.data.services || []);
          try {
            sessionStorage.setItem(`biz_services_${slug}`, JSON.stringify(servicesRes.data.services || []));
          } catch (e) { }
        }
      } catch (error) {
        console.error('Failed to fetch business or services', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinessAndServices();
  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && selectedService) {
      fetchSavedAddresses();
      if (user) {
        setBookingName(user.name || '');
        setBookingPhone(user.phone || '');
      }
    }
  }, [isAuthenticated, selectedService, user]);

  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await api.get('/addresses');
      setSavedAddresses(res.data.addresses || []);
      if (res.data.addresses?.length > 0) {
        setSelectedAddressId(res.data.addresses[0].id);
        setUseNewAddress(false);
      } else {
        setUseNewAddress(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Business Profile...</div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Business Not Found</h2>
        <p>This business may be inactive or does not exist.</p>
        <Link to="/" className="mt-4 text-blue-500 hover:underline">Return Home</Link>
      </div>
    );
  }

  const getRating = () => {
    return business?.rating ? Number(business.rating).toFixed(1) : "0.0";
  };

  const getReviews = () => {
    return business?.review_count || 0;
  };

  const getBusinessExperience = () => {
    if (Array.isArray(services) && services.length > 0) {
      const experiences = services
        .map(s => parseInt(s.experience, 10))
        .filter(e => !isNaN(e) && e > 0);
      if (experiences.length > 0) {
        return `${Math.max(...experiences)}+ Years`;
      }
    }
    return '3+ Years';
  };

  const getImageUrl = (path) => {
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  const getLogoUrl = (path) => {
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  // Submit General Enquiry
  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!/^[0-9]{10}$/.test(enquiryPhone)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/services/enquire', {
        serviceId: selectedService.id,
        vendorId: business.user_id,
        customerName: enquiryName,
        customerPhone: enquiryPhone,
        enquiryText: enquiryText,
        type: 'ENQUIRY',
        status: 'ENQUIRY_SUBMITTED',
        customerId: user?.id || null
      });
      toast.success('Your enquiry has been submitted successfully!');
      setEnquiryName('');
      setEnquiryPhone('');
      setEnquiryText('');
      setSelectedService(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Booking Request
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingName.trim()) {
      toast.error('Please enter your name for booking');
      return;
    }
    if (!/^[0-9]{10}$/.test(bookingPhone)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      let finalAddressId = selectedAddressId;

      // 1. If using a new address, save it first
      if (useNewAddress) {
        if (!/^[0-9]{10}$/.test(newPhone)) {
          toast.error('Mobile number must be exactly 10 digits');
          setSubmitting(false);
          return;
        }

        const addRes = await api.post('/addresses', {
          name: newFullName,
          phone: newPhone,
          street: newStreet,
          city: newCity,
          state: newState,
          zip: newZip,
          country: 'India',
          is_default: false
        });

        if (addRes.data.success && addRes.data.address) {
          finalAddressId = addRes.data.address.id;
        } else {
          throw new Error('Failed to save booking address.');
        }
      }

      if (!finalAddressId) {
        toast.error('Please select or add a delivery address.');
        setSubmitting(false);
        return;
      }

      // 2. Submit booking request
      // Get selected/new details for logs
      const addressDetails = useNewAddress
        ? `${newStreet}, ${newCity}, ${newState} - ${newZip}`
        : (() => {
          const addr = savedAddresses.find(a => a.id === finalAddressId);
          return addr ? `${addr.street}, ${addr.city}, ${addr.state} - ${addr.zip}` : '';
        })();

      await api.post('/services/enquire', {
        serviceId: selectedService.id,
        vendorId: business.user_id,
        customerName: bookingName,
        customerPhone: bookingPhone,
        enquiryText: `Wants Service Booking. Address: ${addressDetails}`,
        type: 'BOOKING',
        status: 'SERVICE_REQUESTED',
        addressId: finalAddressId,
        customerId: user?.id || null
      });

      toast.success('Service booking request placed successfully!');
      setSelectedService(null);
      // Reset address form
      setNewFullName('');
      setNewPhone('');
      setNewStreet('');
      setNewCity('');
      setNewState('');
      setNewZip('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit service booking request');
    } finally {
      setSubmitting(false);
    }
  };

  let socialLinks = {};
  try {
    if (business.social_links) {
      socialLinks = typeof business.social_links === 'string'
        ? JSON.parse(business.social_links)
        : business.social_links;
    }
  } catch (e) {
    console.error('Failed to parse social links');
  }
  const youtubeUrl = socialLinks?.youtube || business?.youtube_link;

  return (
    <div className="min-h-screen bg-gray-50 md:bg-[#fafafa] pb-12">
      {/* Desktop Hero Section */}
      <div className="w-full bg-white relative hidden md:block">
        <div className="w-full h-48 md:h-80 bg-gray-200">
          <img
            src={getImageUrl(business.store_banner)}
            alt="Cover"
            className="w-full h-full object-fill"
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex flex-col md:flex-row gap-6 pb-6 relative -mt-16 md:-mt-20">
            {/* Logo */}
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-xl shadow-md p-1 flex-shrink-0 relative z-10 border-4 border-white">
              <img
                src={getLogoUrl(business.business_logo)}
                alt="Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            {/* Main Info */}
            <div className="flex-grow pt-4 md:pt-24 relative z-0">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#0f172a] flex items-center gap-3">
                    {business.business_name}
                    <span className="bg-green-100 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 mt-1">
                      Verified <ShieldCheck size={12} className="fill-green-600 text-white" />
                    </span>
                  </h1>
                  <p className="text-gray-500 font-medium mt-1 text-lg">
                    {business.category} {business.subcategory && `• ${business.subcategory}`}
                  </p>

                  {business?.keywords && (
                    <div className="mt-2 text-sm text-gray-500 max-w-2xl">
                      <p className="inline m-0 leading-relaxed">
                        {!isKeywordsExpanded && business.keywords.length > 80
                          ? `${business.keywords.substring(0, 80)}...`
                          : business.keywords}
                      </p>
                      {business.keywords.length > 80 && (
                        <button
                          onClick={() => setIsKeywordsExpanded(!isKeywordsExpanded)}
                          className="text-[#cc0000] hover:underline text-xs font-bold inline ml-1.5 focus:outline-none"
                        >
                          {isKeywordsExpanded ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-4 flex items-start gap-2 max-w-2xl">
                    <MapPin size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
                    <span>
                      {business.business_address}, {business.city}, {business.state} - {business.pincode}
                      <a href={`https://maps.google.com/?q=${business.business_address},${business.city}`} target="_blank" rel="noreferrer" className="text-blue-600 ml-2 hover:underline">
                        View on map
                      </a>
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 min-w-[200px]">
                  {business.whatsapp_number && (
                    <div className="relative">
                      <div className="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 mr-5 whitespace-nowrap">
                        {checkIsBusinessLive(business.working_hours) ? (
                          <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> Live Now
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-red-500 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Currently Offline
                          </p>
                        )}
                      </div>
                      <a
                        href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, '').length === 10 ? '91' + business.whatsapp_number.replace(/\D/g, '') : business.whatsapp_number.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-green-600 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm w-full"
                      >
                        <MessageCircle size={20} />
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {(business.phone_number || business.phone) && (
                    <div className="relative">
                      {!business.whatsapp_number && (
                        <div className="hidden md:flex absolute right-full top-1/2 -translate-y-1/2 mr-5 whitespace-nowrap">
                          {checkIsBusinessLive(business.working_hours) ? (
                            <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> Live Now
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-red-500 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Currently Offline
                            </p>
                          )}
                        </div>
                      )}
                      <a
                        href={`tel:${business.phone_number || business.phone}`}
                        className="flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-sm w-full"
                      >
                        <Phone size={20} />
                        Call Now
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Custom Hero Section */}
      <div className="block md:hidden bg-white pb-4 relative">
        {/* Top Banner Image */}
        <div className="w-full h-38 sm:h-56 bg-gray-50 border-b border-gray-100 flex overflow-hidden">
          <img src={getImageUrl(business?.store_banner)} alt="Cover" className="w-full h-full object-fill" />
        </div>

        {/* Content Wrapper */}
        <div className="px-4 relative">
          {/* Logo overlapping banner */}
          <div className="flex items-end justify-between mb-3 -mt-12 relative z-10">
            <div className="w-24 h-24 bg-white rounded-xl shadow-md p-1 border-4 border-white">
              <img src={getLogoUrl(business?.business_logo)} alt="Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <div className="pb-1">
              {checkIsBusinessLive(business?.working_hours) ? (
                <p className="text-[12px] font-bold text-blue-600 flex items-center gap-1.5 pr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="animate-pulse">Live Now</span>
                </p>
              ) : (
                <p className="text-[12px] font-bold text-red-500 flex items-center gap-1.5 pr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Offline
                </p>
              )}
            </div>
          </div>

          {/* Title Row */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl leading-tight font-bold text-gray-900">{business?.business_name}</h1>
              <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                Verified ✓
              </span>
            </div>
          </div>

          {/* Category */}
          <p className="text-sm text-gray-600 mb-1.5 font-medium">
            {business?.category} {business?.subcategory && `• ${business.subcategory}`}
          </p>

          {/* Keywords */}
          {business?.keywords && (
            <div className="mb-2 text-xs text-gray-500">
              <p className="inline m-0 leading-relaxed">
                {!isKeywordsExpanded && business.keywords.length > 38
                  ? `${business.keywords.substring(0, 38)}...`
                  : business.keywords}
              </p>
              {business.keywords.length > 38 && (
                <button
                  onClick={() => setIsKeywordsExpanded(!isKeywordsExpanded)}
                  className="text-[#cc0000] hover:underline text-[11px] font-bold inline ml-1 focus:outline-none"
                >
                  {isKeywordsExpanded ? 'Read less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1 font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">
              <Star size={12} className="fill-orange-500" />
              {getRating()}
            </span>
            <Link to={`/shop/${slug}/reviews`} className="text-blue-600 hover:underline cursor-pointer">({getReviews()} reviews)</Link>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5 mb-5 text-sm text-gray-600 leading-relaxed font-medium">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <p>{business?.business_address}, {business?.city}, {business?.state} - {business?.pincode}</p>
          </div>

          {/* Buttons */}
          <div className="flex items-start gap-3 mb-6">
            {business?.whatsapp_number ? (
              <div className="flex-1 flex flex-col">
                <a href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, '').length === 10 ? '91' + business.whatsapp_number.replace(/\D/g, '') : business.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 border-2 border-green-500 text-green-600 py-2.5 rounded-xl text-sm font-extrabold bg-white shadow-sm hover:bg-green-50">
                  <MessageCircle size={14} className="text-green-500" /> WhatsApp
                </a>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center gap-1.5 border-2 border-green-200 text-green-400 py-2.5 rounded-xl text-sm font-extrabold bg-white shadow-sm cursor-not-allowed">
                  <MessageCircle size={14} className="text-green-400" /> WhatsApp
                </div>
              </div>
            )}

            {(business?.phone_number || business?.phone) ? (
              <div className="flex-1 flex flex-col">
                <a href={`tel:${business.phone_number || business.phone}`} className="flex-1 flex items-center justify-center gap-1.5 border-2 border-blue-500 text-blue-600 py-2.5 rounded-xl text-sm font-extrabold bg-white shadow-sm hover:bg-blue-50">
                  <Phone size={14} className="text-blue-500" /> Call Now
                </a>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex items-center justify-center gap-1.5 border-2 border-blue-200 text-blue-400 py-2.5 rounded-xl text-sm font-extrabold bg-white shadow-sm cursor-not-allowed">
                  <Phone size={14} className="text-blue-400" /> Call Now
                </div>
              </div>
            )}
          </div>

          {/* Trust Badges - Fixed Width without scrolling */}
          <div className="flex items-center justify-between border border-gray-100 rounded-xl px-2 py-3 mb-6 bg-white shadow-sm w-full gap-1">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-600">
                <Calendar size={10} className="text-blue-500 shrink-0" /> <span className="truncate">Estd. {business.year_established || 'N/A'}</span>
              </div>
            </div>
            <div className="w-px h-4 bg-gray-200 shrink-0"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-600">
                <ShieldCheck size={10} className="text-green-500 shrink-0" /> <span>Verified</span>
              </div>
            </div>
            <div className="w-px h-4 bg-gray-200 shrink-0"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-600">
                <Award size={10} className="text-orange-500 shrink-0" /> <span>Trusted</span>
              </div>
            </div>
            <div className="w-px h-4 bg-gray-200 shrink-0"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></div> <span>Active</span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-50 p-2 rounded-full text-red-400">
                <FileText size={16} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">About Us</h2>
            </div>
            <p className={`text-sm font-medium text-gray-600 leading-relaxed ${isAboutExpanded ? '' : 'line-clamp-4'}`}>
              {business?.store_description || 'No description provided by this business.'}
            </p>
            {(business?.store_description && business.store_description.length > 150) && (
              <button
                onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                className="text-[10px] font-bold text-red-500 mt-3 flex items-center gap-1"
              >
                {isAboutExpanded ? 'Read Less' : 'Read More'}
                {isAboutExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>
        </div> {/* Close Content Wrapper */}
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 mt-4 md:mt-5">

        {/* Desktop Stats Bar */}
        <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5 items-center justify-between divide-x divide-gray-100">
          <div className="flex flex-col items-center flex-1 px-4 text-center">
            <div className="flex items-center gap-1.5 font-extrabold text-gray-900 text-lg">
              <Star size={22} className="fill-yellow-400 text-yellow-400" /> {getRating()}
            </div>
            <Link to={`/shop/${slug}/reviews`} className="text-xs text-blue-600 hover:underline mt-1 font-medium cursor-pointer">({getReviews()} Reviews)</Link>
          </div>
          <div className="flex flex-col items-center flex-1 px-4 text-center">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
              <ShieldCheck size={20} className="text-green-500" /> Verified
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Business</p>
          </div>
          <div className="flex flex-col items-center flex-1 px-4 text-center">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
              <Calendar size={20} className="text-gray-400" /> Estd. Year
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium truncate max-w-[150px]">{business.year_established || 'Not Specified'}</p>
          </div>
          <div className="flex flex-col items-center flex-1 px-4 text-center">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
              <Clock size={20} className="text-gray-400" /> Working Hours
            </div>
            {business.working_hours ? (
              <WorkingHoursDisplay hoursStr={business.working_hours} compact={true} />
            ) : (
              <p className="text-xs text-gray-500 mt-1 font-medium truncate max-w-[150px]">Not Specified</p>
            )}
          </div>
          <div className="flex flex-col items-center flex-1 px-4 text-center">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
              <Briefcase size={20} className="text-gray-400" /> Experience
            </div>
            <p className="text-xs text-gray-500 mt-1 font-medium">{getBusinessExperience()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

          {/* Left Column: About & Services */}
          <div className="lg:col-span-2 space-y-4 md:space-y-5">
            <div className="hidden md:block bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-red-50 p-2.5 rounded-xl text-red-500">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">About Us</h2>
              </div>
              <p className={`text-[14px] text-gray-600 leading-relaxed ${isAboutExpanded ? '' : 'line-clamp-6'}`}>
                {business.store_description || 'No description provided by this business.'}
              </p>
              {(business?.store_description && business.store_description.length > 250) && (
                <button
                  onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                  className="text-[13px] font-bold text-red-500 mt-5 flex items-center gap-1 hover:text-red-600 transition-colors"
                >
                  {isAboutExpanded ? 'Read Less' : 'Read More'}
                  {isAboutExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            {/* Services & Gallery Section */}
            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100">

              {/* Tab Header Selector */}
              {(() => {
                let gallery = [];
                try {
                  if (business?.gallery_images) {
                    gallery = typeof business.gallery_images === 'string' ? JSON.parse(business.gallery_images) : business.gallery_images;
                  }
                } catch (e) {
                  console.error(e);
                }
                const galleryLength = Array.isArray(gallery) ? gallery.length : 0;

                let galleryOnly = [];
                try {
                  if (business?.gallery_only) {
                    galleryOnly = typeof business.gallery_only === 'string' ? JSON.parse(business.gallery_only) : business.gallery_only;
                  }
                } catch (e) {
                  console.error(e);
                }
                const galleryOnlyLength = Array.isArray(galleryOnly) ? galleryOnly.length : 0;

                return (
                  <div className="flex justify-between items-center border-b border-gray-100 mb-6">
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab('images_gallery')}
                        className={`pb-3 text-base font-bold transition-all relative whitespace-nowrap shrink-0 ${activeProfileTab === 'images_gallery' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        Gallery <span className="hidden sm:inline">({galleryOnlyLength})</span>
                        {activeProfileTab === 'images_gallery' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab('gallery')}
                        className={`pb-3 text-base font-bold transition-all relative whitespace-nowrap shrink-0 ${activeProfileTab === 'gallery' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        Products <span className="hidden sm:inline">({galleryLength})</span>
                        {activeProfileTab === 'gallery' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveProfileTab('services')}
                        className={`pb-3 text-base font-bold transition-all relative whitespace-nowrap shrink-0 ${activeProfileTab === 'services' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                          }`}
                      >
                        Services <span className="hidden sm:inline">({services.length})</span>
                        {activeProfileTab === 'services' && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
                        )}
                      </button>
                    </div>

                    {activeProfileTab === 'services' && services.length > 2 && (
                      <button
                        onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                        className="hidden md:flex pb-3 text-xs md:text-sm font-bold text-red-650 items-center gap-1 hover:text-red-700 transition-colors"
                      >
                        <span>{isServicesExpanded ? 'Show Less' : `View All (${services.length - 2} More)`}</span>
                        {isServicesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}

                    {activeProfileTab === 'gallery' && galleryLength > 2 && (
                      <button
                        onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                        className="hidden md:flex pb-3 text-xs md:text-sm font-bold text-red-650 items-center gap-1 hover:text-red-700 transition-colors"
                      >
                        <span>{isGalleryExpanded ? 'Show Less' : `View All (${galleryLength - 2} More)`}</span>
                        {isGalleryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}

                    {activeProfileTab === 'images_gallery' && galleryOnlyLength > 0 && (
                      <Link
                        to={`/shop/${slug}/gallery`}
                        className="hidden md:flex pb-3 text-xs md:text-sm font-bold text-red-650 items-center gap-1 hover:text-red-700 transition-colors"
                      >
                        <span>View All</span>
                        <ChevronDown size={16} />
                      </Link>
                    )}
                  </div>
                );
              })()}

              {activeProfileTab === 'images_gallery' ? (
                (() => {
                  let galleryOnly = [];
                  try {
                    if (business.gallery_only) {
                      galleryOnly = typeof business.gallery_only === 'string' ? JSON.parse(business.gallery_only) : business.gallery_only;
                    }
                  } catch (e) {
                    console.error('Failed to parse gallery_only', e);
                  }

                  if (!Array.isArray(galleryOnly) || galleryOnly.length === 0) {
                    return <p className="text-gray-500 text-sm">No gallery photos uploaded yet.</p>;
                  }

                  const displayedGalleryOnly = isImagesGalleryExpanded ? galleryOnly : galleryOnly.slice(0, 8);

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {displayedGalleryOnly.map((item, idx) => {
                          const imgPath = typeof item === 'string' ? item : (item.image_path || item);
                          const title = typeof item === 'string' ? '' : (item.title || '');
                          return (
                            <div
                              key={idx}
                              onClick={() => setActiveLightboxImage(imgPath)}
                              className={`border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white aspect-square relative group cursor-zoom-in ${idx >= 4 ? 'hidden sm:block' : ''}`}
                            >
                              <img
                                src={getImageUrl(imgPath)}
                                alt={title || `Gallery ${idx}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {title && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[2px] text-white text-[10px] sm:text-xs font-semibold px-2 py-1.5 truncate text-center">
                                  {title}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {galleryOnly.length > 0 && (
                        <div className="flex justify-center md:hidden mt-4">
                          <Link
                            to={`/${(business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${(business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/gallery/${business?.slug || business?.id}`}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <span>View All</span>
                            <ChevronDown size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : activeProfileTab === 'services' ? (
                services.length === 0 ? (
                  <p className="text-gray-500 text-sm">No services listed by this business yet.</p>
                ) : (
                  (() => {
                    const displayedServices = isServicesExpanded ? services : services.slice(0, 2);
                    return (
                      <>
                        {/* Desktop View (Original Vertical Cards) */}
                        <div className="hidden md:grid md:grid-cols-2 gap-4 md:gap-5">
                          {displayedServices.map((service) => (
                            <Link
                              to={`/${(business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${business?.slug || business?.id}/${(business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${slugify(service.name)}/`}
                              key={service.slug || service.id}
                              className="group border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white flex flex-col relative"
                            >
                              <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => handleShareService(e, service.slug || service.id, service.name)}
                                  className="absolute top-3 left-3 p-1.5 rounded-full bg-white/95 hover:bg-white text-gray-500 hover:text-gray-800 shadow-sm border border-gray-100 transition-all z-20 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
                                  title="Share Service"
                                >
                                  <Share2 size={12} />
                                </button>
                                <img
                                  src={getImageUrl(service.image_path || service.mobile_image)}
                                  alt={service.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-3 right-3 bg-[#cc0000] text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">
                                  ₹{Number(service.amount).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-base line-clamp-1">{service.name}</h3>
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <Briefcase size={12} />
                                    Experience: {service.experience} Yrs
                                  </p>
                                </div>
                                <button className="w-full text-center text-sm font-bold text-black border border-red-500 rounded-lg py-2 mt-4 hover:bg-red-100 transition-colors">
                                  View details & Contact
                                </button>
                              </div>
                            </Link>
                          ))}
                        </div>

                        {/* Mobile View (Horizontal Cards) */}
                        <div className="grid md:hidden grid-cols-1 gap-4">
                          {services.map((service) => (
                            <Link
                              to={`/${(business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${business?.slug || business?.id}/${(business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${slugify(service.name)}/`}
                              key={service.slug || service.id}
                              className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white flex flex-row p-2.5 gap-3 items-stretch"
                            >
                              {/* Image Block */}
                              <div className="w-[125px] sm:w-[140px] shrink-0 bg-gray-100 relative rounded-xl overflow-hidden">
                                <button
                                  type="button"
                                  onClick={(e) => handleShareService(e, service.slug || service.id, service.name)}
                                  className="absolute top-2 left-2 p-1.5 rounded-full bg-white/90 text-gray-600 shadow-sm z-20 flex items-center justify-center hover:bg-white"
                                >
                                  <Share2 size={12} />
                                </button>
                                <img
                                  src={getImageUrl(service.mobile_image || service.image_path)}
                                  alt={service.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2 right-2 bg-[#cc0000] text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm">
                                  ₹{Number(service.amount).toLocaleString('en-IN')}
                                </div>
                              </div>

                              {/* Content Block */}
                              <div className="flex-1 flex flex-col justify-between py-1 pr-1 overflow-hidden">
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-base line-clamp-2 mb-1.5">
                                    {service.name}
                                  </h3>
                                  <div className="space-y-1.5">
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                      <Briefcase size={12} className="shrink-0 text-gray-400" />
                                      <span className="truncate">Experience: {service.experience} Yrs</span>
                                    </p>
                                    <div className="text-xs text-gray-500 flex items-start gap-1.5 leading-relaxed">
                                      <MapPin size={12} className="shrink-0 mt-0.5 text-gray-400" />
                                      <span className="line-clamp-3">
                                        {business.business_address}, {business.city}, {business.state} - {business.pincode}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button className="w-[90%] mx-auto text-center text-xs font-medium text-gray-800 border border-red-500 rounded-lg py-2 mt-2.5 hover:bg-red-50 transition-colors">
                                  View details & Contact
                                </button>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </>
                    );
                  })()
                )
              ) : (
                // Gallery View
                (() => {
                  let gallery = [];
                  try {
                    if (business.gallery_images) {
                      gallery = typeof business.gallery_images === 'string' ? JSON.parse(business.gallery_images) : business.gallery_images;
                    }
                  } catch (e) {
                    console.error('Failed to parse gallery_images on details page', e);
                  }

                  if (!Array.isArray(gallery) || gallery.length === 0) {
                    return <p className="text-gray-500 text-sm">No products uploaded yet.</p>;
                  }

                  const displayedGallery = isGalleryExpanded ? gallery : gallery.slice(0, 2);

                  const renderGalleryCard = (item, idx, isMobile = false) => {
                    const imgPath = typeof item === 'string' ? item : ((isMobile && item.mobile_image) ? item.mobile_image : item.image_path);
                    const price = typeof item === 'string' ? null : item.price;
                    const warranty = typeof item === 'string' ? null : item.warranty;
                    const pName = typeof item === 'string' ? 'Product' : (item.name || 'Product');
                    const targetUrl = `/${(business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${business?.slug || business?.id}/${(business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${slugify(pName)}/`;

                    return (
                      <Link
                        to={targetUrl}
                        key={idx}
                        className="group border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all bg-white flex flex-col cursor-pointer"
                      >
                        <div className="w-full aspect-[3/2] md:aspect-auto md:h-48 bg-gray-100 overflow-hidden relative">
                          <img
                            src={getImageUrl(imgPath)}
                            alt={`Gallery ${idx}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50/20 flex-grow flex flex-col justify-between space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm line-clamp-1">
                              {typeof item === 'string' ? 'Product' : (item.name || 'Product')}
                            </h4>
                            {price && (
                              <div className="text-sm font-extrabold text-[#cc0000]">
                                ₹{Number(price).toLocaleString('en-IN')}
                              </div>
                            )}
                            {warranty && (
                              <div className="hidden md:block text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100 self-start">
                                🛡️ Warranty: {warranty}
                              </div>
                            )}
                          </div>
                          <button className="w-full text-center text-xs font-bold text-black border border-red-500 rounded-xl py-2 hover:bg-red-50 transition-colors flex items-center justify-center">
                            View Details
                          </button>
                        </div>
                      </Link>
                    );
                  };

                  return (
                    <>
                      {/* Desktop Gallery Grid */}
                      <div className="hidden md:grid grid-cols-2 gap-4 md:gap-5">
                        {displayedGallery.map((item, idx) => renderGalleryCard(item, idx, false))}
                      </div>

                      {/* Mobile Gallery Grid */}
                      <div className="grid md:hidden grid-cols-2 gap-4">
                        {gallery.map((item, idx) => renderGalleryCard(item, idx, true))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Right Column: Contact & Info */}
          <div className="space-y-4 md:space-y-5 mb-8 lg:sticky lg:top-24 lg:h-max self-start">
            {/* Contact Information Card */}
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
              {/* Header */}
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900">Contact Information</h2>
                <p className="text-xs text-gray-500 mt-0.5">Get in touch with this business</p>
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {(business.phone_number || business.phone) && (
                  <div className="flex items-start gap-4 py-3 border-b border-gray-100 border-dashed last:border-0 last:pb-0 first:pt-0">
                    <div className="bg-green-50 w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl text-green-600 flex items-center justify-center shrink-0">
                      <PhoneCall className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                    </div>
                    <div className="mt-0.5">
                      <p className="text-sm font-bold text-gray-900">Phone</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{business.phone_number || business.phone}</p>
                    </div>
                  </div>
                )}

                {(business.business_email || business.email) && (
                  <div className="flex items-start gap-4 py-3 border-b border-gray-100 border-dashed last:border-0 last:pb-0 first:pt-0">
                    <div className="bg-blue-50 w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl text-blue-600 flex items-center justify-center shrink-0">
                      <AtSign className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                    </div>
                    <div className="mt-0.5">
                      <p className="text-sm font-bold text-gray-900">Email</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{business.business_email || business.email}</p>
                    </div>
                  </div>
                )}

                {business.website && (
                  <div className="flex items-start gap-4 py-3 border-b border-gray-100 border-dashed last:border-0 last:pb-0 first:pt-0">
                    <div className="bg-purple-50 w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl text-purple-600 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                    </div>
                    <div className="mt-0.5">
                      <p className="text-sm font-bold text-gray-900">Website / Link</p>
                      <p className="text-sm font-medium text-blue-700 mt-0.5 break-all line-clamp-1">
                        <a href={business.website.startsWith('http') ? business.website : `https://${business.website}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {business.website}
                        </a>
                      </p>
                    </div>
                  </div>
                )}

                {business.working_hours && (
                  <div className="flex items-start gap-4 py-3 border-b border-gray-100 border-dashed last:border-0 last:pb-0 first:pt-0">
                    <div className="bg-orange-50 w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-2xl text-orange-600 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                    </div>
                    <div className="mt-0.5 w-full">
                      <p className="text-sm font-bold text-gray-900">Working Hours</p>
                      <WorkingHoursDisplay hoursStr={business.working_hours} />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer banner */}
              <div className="mt-2 bg-green-50/50 border border-green-100 rounded-xl p-3 flex items-center justify-center gap-2">
                <div className="bg-white p-1 rounded-full shadow-sm text-green-500">
                  <ShieldCheck size={14} />
                </div>
                <p className="text-[10px] text-gray-600 font-medium">We typically reply within a few minutes</p>
              </div>
            </div>

            {/* Social Media Mobile Card */}
            {(socialLinks.facebook || socialLinks.instagram || youtubeUrl) && (
              <div className="bg-white p-1 md:p-5 rounded-2xl shadow-sm border border-gray-100">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-red-50 p-2.5 rounded-xl text-red-500">
                    <Share2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Social Media</h2>
                    <p className="text-[11px] text-gray-500">Follow us on social media</p>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="bg-blue-50/50 border border-blue-50 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-blue-50">
                      <div className="bg-blue-600 text-white rounded-full p-1.5 mb-1 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                      </div>
                      <span className="text-[11px] md:text-[12px] lg:text-[11px] xl:text-[13px] font-bold text-blue-600">Facebook</span>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-medium text-center">Follow us</span>
                    </a>
                  )}
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="bg-pink-50/50 border border-pink-50 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-pink-50">
                      <div className="bg-pink-600 text-white rounded-full p-1.5 mb-1 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                      </div>
                      <span className="text-[11px] md:text-[12px] lg:text-[11px] xl:text-[13px] font-bold text-pink-600">Instagram</span>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-medium text-center">Follow us</span>
                    </a>
                  )}
                  {youtubeUrl && (
                    <a href={youtubeUrl} target="_blank" rel="noreferrer" className="bg-red-50/50 border border-red-50 rounded-2xl p-2 md:p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-red-50">
                      <div className="bg-red-600 text-white rounded-full p-1.5 mb-1 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white" /></svg>
                      </div>
                      <span className="text-[11px] md:text-[12px] lg:text-[11px] xl:text-[13px] font-bold text-red-600">YouTube</span>
                      <span className="text-[9px] md:text-[10px] text-gray-500 font-medium text-center">Watch videos</span>
                    </a>
                  )}
                </div>

                {/* Share button */}
                <button onClick={async () => {
                  const citySlug = (business?.city || 'location').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  const categorySlug = (business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  const kwSlug = business?.keywords ? business.keywords.split(/[,/_\-]+/).map(k => k.trim()).filter(Boolean).slice(0, 2).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'keywords';
                  const shareUrl = `${window.location.origin}/${citySlug}/shop/${business?.slug || business?.id}/${categorySlug}`;

                  if (navigator.share && window.isSecureContext) {
                    navigator.share({
                      title: business.business_name,
                      text: `Check out ${business.business_name} on IBCMart!`,
                      url: shareUrl
                    }).catch(err => console.log('Error sharing:', err));
                  } else {
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        toast.success('Business link copied to clipboard!');
                      }).catch(() => {
                        toast.error('Failed to copy link.');
                      });
                    } else {
                      // Fallback for non-secure contexts (e.g., local IP testing)
                      const textArea = document.createElement("textarea");
                      textArea.value = shareUrl;
                      textArea.style.position = "fixed";
                      textArea.style.left = "-999999px";
                      textArea.style.top = "-999999px";
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        toast.success('Business link copied to clipboard!');
                      } catch (err) {
                        toast.error('Failed to copy link.');
                      }
                      document.body.removeChild(textArea);
                    }
                  }
                }} className="w-full py-3.5 rounded-xl border border-red-200 flex items-center justify-center gap-2 text-red-500 font-bold text-[13px] hover:bg-red-50 transition-colors">
                  <Share2 size={16} /> Share Business
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {activeLightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 md:p-8 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setActiveLightboxImage(null)}
        >
          <button
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all border border-white/20 z-[10000]"
          >
            <X size={24} strokeWidth={2.5} className="text-white" />
          </button>
          <div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={getImageUrl(activeLightboxImage)}
              alt="Enlarged View"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfile;
