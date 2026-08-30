import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, useNavigate, Link, useNavigationType, useLocation } = rrdPkg;
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

const GalleryDetails = () => {
  const params = useParams();
  const vendorSlug = params.vendorSlug;
  const itemIndex = params.itemIndex;
  const itemTitle = params.serviceTitle || params.productTitle || params.slug;
  const navigate = useNavigate();
  const navType = useNavigationType();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [business, setBusiness] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  // Enquiry state
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryCity, setEnquiryCity] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryText, setEnquiryText] = useState('');

  const getImageUrl = (path) => {
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  useEffect(() => {
    fetchDetails();
  }, [vendorSlug, itemIndex, itemTitle]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/business/${vendorSlug}`);
      const biz = res.data.business;
      setBusiness(biz);

      if (biz && biz.gallery_images) {
        const gallery = typeof biz.gallery_images === 'string' ? JSON.parse(biz.gallery_images) : biz.gallery_images;
        if (Array.isArray(gallery)) {
          let resolvedIndex = -1;
          if (itemIndex !== undefined && itemIndex !== null) {
            resolvedIndex = parseInt(itemIndex, 10);
          } else if (itemTitle !== undefined) {
            const slugify = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const targetSlug = slugify(itemTitle);
            resolvedIndex = gallery.findIndex(item => {
              const name = typeof item === 'string' ? 'Product' : (item.name || 'Product');
              return slugify(name) === targetSlug;
            });
          }

          if (resolvedIndex !== -1 && gallery[resolvedIndex]) {
            const item = gallery[resolvedIndex];
            setProduct({
              name: typeof item === 'string' ? 'Product' : (item.name || 'Product'),
              price: typeof item === 'string' ? '0' : (item.price || '0'),
              warranty: typeof item === 'string' ? '' : (item.warranty || ''),
              description: typeof item === 'string' ? '' : (item.description || ''),
              image_path: typeof item === 'string' ? item : (item.image_path || ''),
              mobile_image: typeof item === 'string' ? item : (item.mobile_image || '')
            });
          } else {
            setError('Product not found in business gallery.');
          }
        } else {
          setError('Product not found in business gallery.');
        }
      } else {
        setError('Business profile or gallery not found.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load product details.');
    } finally {
      setLoading(false);
    }
  };

  // Scroll position preservation
  useEffect(() => {
    const key = `scroll_pos_${location.pathname}${location.search}`;
    const saved = sessionStorage.getItem(key);
    const isReload = window.performance.getEntriesByType('navigation')[0]?.type === 'reload';
    if (navType === 'POP' && !isReload && saved && !loading && product) {
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
  }, [location.pathname, location.search, loading, product]);
  useEffect(() => {
    if (isAuthenticated && user) {
      setEnquiryName(user.name || '');
      setEnquiryPhone(user.phone || '');
    }
  }, [isAuthenticated, user]);

  const handleShare = async () => {
    const title = product?.name || 'Product Details';
    const priceStr = product ? `₹${Number(product.price).toLocaleString('en-IN')}` : '';
    const desc = product?.description || '';
    const warrantyStr = product?.warranty || '';
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://www.ibcmart.com' + location.pathname;
    const imageUrl = product?.image_path ? getImageUrl(product.image_path) : (product?.mobile_image ? getImageUrl(product.mobile_image) : '');

    const shareText = `🛍️ *${title}*\n💰 *Price:* ${priceStr}\n🛡️ *Warranty:* ${warrantyStr}\n📝 *Description:* ${desc}\n🖼️ *Image:* ${imageUrl}\n\n`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}Link: ${shareUrl}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Product details shared successfully!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      toast.error('Failed to share');
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (enquiryPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/services/enquire', {
        serviceId: null,
        vendorId: business.user_id,
        customerId: isAuthenticated ? user?.id : null,
        customerName: enquiryName.trim(),
        customerPhone: enquiryPhone.trim(),
        enquiryText: `Enquiry about Gallery Product: "${product.name}" (Price: ₹${product.price}, Warranty: ${product.warranty}). Message: ${enquiryText.trim()} ${enquiryEmail.trim() ? `(Email: ${enquiryEmail.trim()})` : ''} ${enquiryCity.trim() ? `(City: ${enquiryCity.trim()})` : ''}`.trim(),
        type: 'ENQUIRY',
        status: 'ENQUIRY_SUBMITTED',
        imagePath: product.image_path
      });
      setEnquiryName('');
      setEnquiryPhone('');
      setEnquiryCity('');
      setEnquiryText('');
      toast.success('Your enquiry has been sent successfully! The provider will contact you soon.');
      setIsEnquiryModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Product Details...</div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <p>{error || 'This product does not exist.'}</p>
        <Link to="/" className="mt-4 text-blue-500 hover:underline">Return Home</Link>
      </div>
    );
  }

  let socialLinks = {};
  try {
    if (business.social_links) {
      socialLinks = typeof business.social_links === 'string' ? JSON.parse(business.social_links) : business.social_links;
    }
  } catch (e) {
    console.error(e);
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-2 md:px-4 py-3 md:py-8">
        {/* Back Link */}
        <div className="mb-4 flex justify-between items-center w-full">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors font-semibold"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="text-gray-900 text-sm font-bold">Product</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Left Column: Product Info (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Product Main Image */}
            <div className="w-full relative aspect-[3/2] sm:aspect-auto sm:h-[300px] md:h-[360px] bg-gray-50 flex items-center justify-center overflow-hidden">
              <img
                src={getImageUrl(product.image_path || product.mobile_image)}
                alt={product.name}
                className="w-full h-full object-cover cursor-pointer"
              />
              {/* Share float button on image */}
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 bg-white/95 hover:bg-white text-gray-700 p-3 rounded-full shadow-md flex items-center justify-center transition-all border border-gray-100 hover:scale-105 active:scale-95"
                title="Share Product"
              >
                {copied ? <Clipboard size={18} className="text-green-600" /> : <Share2 size={18} />}
              </button>
            </div>

            <div className="p-4 md:p-6 bg-white relative z-10 rounded-t-[1.5rem] -mt-6 md:-mt-8">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h1 className={`text-lg md:text-xl font-semibold md:font-bold text-gray-900 leading-tight break-all w-full ${!isTitleExpanded ? 'line-clamp-2 md:line-clamp-none' : ''}`}>{product.name}</h1>

                  {product.name && product.name.length > 40 && (
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
                    Provider: <Link to={`/${(business?.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${business?.slug || business?.id}/${(business?.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-gray-900 font-bold hover:underline">{business.business_name}</Link>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs md:text-[13px] font-semibold text-gray-700">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-yellow-600">{Number(business?.product_rating || 0).toFixed(1)}</span>
                    <Link to={`/shop/${business?.slug}/reviews?type=product`} className="text-blue-600 hover:underline cursor-pointer">
                      ({business?.product_review_count || 0} Reviews)
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-xs md:text-[13px] font-semibold text-gray-600">
                    <MapPin size={12} className="text-red-500" />
                    <span>{business.city || 'Erode'}, {business.state || 'Tamil Nadu'}</span>
                  </div>
                </div>
                <div className="text-right pl-2 shrink-0">
                  <div className="text-lg md:text-xl font-extrabold text-[#cc0000]">₹{Number(product.price).toLocaleString('en-IN')}</div>
                  <div className="text-[9px] text-gray-400 font-semibold mt-0.5">Starting Price</div>
                </div>
              </div>

              {/* Quick Contact Buttons */}
              <div className="grid grid-cols-3 md:grid-cols-2 gap-2 mt-5">
                <a
                  href={`tel:${business.phone_number || '1234567890'}`}
                  className="flex items-center justify-center gap-1.5 border border-red-600 text-red-600 py-2.5 rounded-xl text-[11px] font-bold hover:bg-red-50 transition-colors"
                >
                  <Phone size={13} /> Call Now
                </a>
                <a
                  href={`https://wa.me/91${business.whatsapp_number || business.phone_number || '1234567890'}?text=Hi, I am interested in your product: ${product.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-[#22c55e] hover:bg-[#1ebd5b] text-white py-2.5 rounded-xl text-[11px] font-bold shadow-sm transition-colors"
                >
                  <MessageCircle size={13} /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="md:hidden flex items-center justify-center gap-1.5 bg-[#007bff] hover:bg-[#0069d9] text-white py-2.5 rounded-xl text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Mail size={13} /> Enquire
                </button>
              </div>

              {/* Stats Cards */}
              <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
                {product.warranty && (
                  <div className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm min-w-0">
                    <div className="bg-green-50 p-2 rounded-full text-green-600 shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Warranty</span>
                      <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                        {product.warranty}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm min-w-0">
                  <div className="bg-orange-50 p-2 rounded-full text-orange-600 shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] md:text-xs font-bold text-gray-600 mb-0.5">Location</span>
                    <span className="text-[13px] md:text-sm font-extrabold text-gray-900 truncate">
                      {business.city || 'Erode'}, {business.state || 'Tamil Nadu'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              {product.description && (
                <div className="mt-6 space-y-3 pt-2">
                  <h3 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                    <Clipboard size={16} className="text-red-600" />
                    About Product
                  </h3>
                  <p className={`text-[13px] md:text-sm font-medium text-gray-700 leading-relaxed ${isAboutExpanded ? '' : 'line-clamp-4'}`}>
                    {product.description}
                  </p>
                  <button
                    onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                    className="text-red-600 text-[13px] font-bold mt-1 flex items-center gap-1 hover:underline"
                  >
                    {isAboutExpanded ? 'Read Less' : 'Read More'}
                    <ArrowLeft size={12} className={isAboutExpanded ? 'rotate-[90deg]' : 'rotate-[270deg]'} />
                  </button>
                </div>
              )}

              <hr className="border-gray-100 mt-4 md:mt-3" />

              {/* Location & Contact details */}
              <div id="provider-contact" className="mt-8 md:mt-6 bg-white rounded-xl">
                <h3 className="text-[15px] md:text-base font-bold text-gray-900 mb-5">
                  Business Location & Contact
                </h3>

                <div className="space-y-0 text-[13px] md:text-sm font-medium text-gray-700">
                  <div className="flex items-start gap-4 border-b border-dashed border-gray-200 py-3.5 first:pt-0">
                    <div className="bg-red-50 p-2.5 rounded-xl text-red-500 shrink-0">
                      <Contact size={18} />
                    </div>
                    <div className="mt-0.5">
                      <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Address</span>
                      <span className="text-gray-900 font-semibold leading-snug">
                        {business.business_address}, {business.city}, {business.state} - {business.pincode}
                      </span>
                    </div>
                  </div>

                  {(business.business_email || business.email) && (
                    <div className="flex items-center gap-4 border-b border-dashed border-gray-200 py-3.5">
                      <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500 shrink-0">
                        <AtSign size={18} />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Email</span>
                        <span className="text-gray-900 font-semibold">{business.business_email || business.email}</span>
                      </div>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-center gap-4 border-b border-dashed border-gray-200 py-3.5">
                      <div className="bg-purple-50 p-2.5 rounded-xl text-purple-500 shrink-0">
                        <LinkIcon size={18} />
                      </div>
                      <div className="w-full min-w-0">
                        <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Website</span>
                        <a href={business.website} target="_blank" rel="noreferrer" className="text-gray-900 font-semibold hover:text-purple-600 hover:underline truncate block">
                          {business.website}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4 pt-3.5">
                    <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500 shrink-0">
                      <CalendarClock size={18} />
                    </div>
                    <div className="mt-0.5 w-full">
                      <span className="block text-xs font-bold text-gray-500 mb-0.5 uppercase tracking-wide">Working Hours</span>
                      <WorkingHoursDisplay hoursStr={business.working_hours} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Interaction Form (5 cols) */}
          <div className="hidden lg:flex lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm flex-col space-y-6">
            <div className="flex border-b border-gray-200">
              <span className="flex-1 text-center pb-3 font-bold text-sm border-b-2 border-red-600 text-red-600">
                Enquiry
              </span>
            </div>

            <div className="space-y-4">
              <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                <Mail size={16} className="text-red-600" />
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
                    rows="4"
                    value={enquiryText}
                    onChange={(e) => setEnquiryText(e.target.value)}
                    placeholder="What details or specifications are you looking for?"
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#cc0000] hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={14} /> {submitting ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>

            {/* Why Choose Us */}
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 lg:p-10 shadow-sm !mt-auto">
              <h4 className="text-sm lg:text-base font-extrabold text-gray-900 mb-4 lg:mb-6 flex items-center gap-2">
                <Award className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Why Choose Us?
              </h4>
              <div className="space-y-3 lg:space-y-5">
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Top Rated Product
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Best Value for Money
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Long Lasting Performance
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> High Quality Materials
                </div>
                <div className="flex items-center gap-2.5 text-[12px] lg:text-[14px] font-semibold text-gray-600">
                  <CheckCircle2 className="text-red-500 w-4 h-4 lg:w-5 lg:h-5" /> Safe & Secure Packaging
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Enquiry Modal */}
      {isEnquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 relative w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setIsEnquiryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex border-b border-gray-200">
              <span className="flex-1 pb-3 font-bold text-sm border-b-2 border-red-655 text-red-600 text-center">
                Submit Enquiry
              </span>
            </div>

            <div className="space-y-4 mt-2">
              <h4 className="text-[13px] font-bold text-gray-900 flex items-center gap-2">
                <Mail size={16} className="text-red-600" />
                Send Enquiry Message
              </h4>
              <p className="text-[11px] text-gray-500 -mt-2">Fill in the details below and we will get back to you.</p>

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
                    rows="4"
                    value={enquiryText}
                    onChange={(e) => setEnquiryText(e.target.value)}
                    placeholder="What details or specifications are you looking for?"
                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:outline-none focus:border-red-500 shadow-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#cc0000] hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={14} /> {submitting ? 'Sending...' : 'Send Enquiry'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GalleryDetails;
