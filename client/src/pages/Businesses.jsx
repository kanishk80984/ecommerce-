import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { Link, useSearchParams, useNavigationType, useNavigate, useOutletContext, useLocation, useParams } = rrdPkg;
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';
import { fuzzyMatch, extractCityFromText, getCleanKeyword } from '../utils/fuzzyMatch';
import {
  Search, MapPin, Star, Tag, RotateCcw, Filter, Users, MoreVertical,
  ShieldCheck, ChevronRight, Store, Check, X, ChevronDown, ThumbsUp, CheckCircle, Phone, MessageCircle, Layers, Share2
} from 'lucide-react';
import locationService from '../services/locationService';
import CategoryNav from '../components/CategoryNav';


const ICON_TO_DB_CATEGORY = { 'AC Service': 'AC Sales & Service', 'Car Service': 'Car Service Centers', 'Bike Service': 'Bike Service Centers', 'Movies': 'Cinema Halls' };

const LANDING_CATEGORIES = [
  { name: 'Restaurants', image: '/cat-restaurants.png' },
  { name: 'Hospitals', image: '/cat-hospitals.png' },
  { name: 'Education', image: '/cat-education.png' },
  { name: 'Hotels', image: '/cat-hotels.png' },
  { name: 'Theatres', image: '/cat-theatres.png' },
  { name: 'Banks', image: '/cat-banks.png' },
  { name: 'Auditors', image: '/cat-auditors.png' },
  { name: 'Cafes', image: '/cat-cafes.png' },
  { name: 'Dentists', image: '/cat-dentists.png' },
  { name: 'Temples', image: '/cat-temples.png' },
  { name: 'Gym', image: '/cat-gym.png' },
  { name: 'Loans', image: '/cat-loans.png' },
  { name: 'Contractors', image: '/cat-contractors.png' },
  { name: 'Pharmacies', image: '/cat-pharmacies.png' },
  { name: 'Event Organisers', image: '/cat-event-organisers.png' },
  { name: 'Beauty Spa', image: '/cat-beauty-spa.png' },
  { name: 'Home Decor', image: '/cat-home-decor.png' },
  { name: 'Wedding Planning', image: '/cat-wedding-planning.png' },
  { name: 'Rent & Hire', image: '/cat-rent-hire.png' },
  { name: 'Pet Shops', image: '/cat-pet-shops.png' }
];

const CATEGORY_SECTIONS = [
  {
    title: 'Wedding Requisites',
    services: [
      { name: 'Banquet Halls', image: 'uploads/banquet-hall.png' },
      { name: 'Bridal Requisite', image: 'uploads/bridal.png' },
      { name: 'Caterers', image: 'uploads/caterers.png' }
    ]
  },
  {
    title: 'Beauty & Spa',
    services: [
      { name: 'Beauty Parlours', image: 'uploads/beauty-parlour.png' },
      { name: 'Spa & Massages', image: 'uploads/spa.png' },
      { name: 'Salons', image: 'uploads/salon.png' }
    ]
  },
  {
    title: 'Repairs & Services',
    services: [
      { name: 'AC Service', image: 'uploads/ac-service.png' },
      { name: 'Car Service', image: 'uploads/car-service.png' },
      { name: 'Bike Service', image: 'uploads/bike-service.png' }
    ]
  },
  {
    title: 'Daily Needs',
    services: [
      { name: 'Movies', image: 'uploads/movies.png' },
      { name: 'Grocery', image: 'uploads/grocery.png' },
      { name: 'Electricians', image: 'uploads/electrician.png' }
    ]
  }
];

const Businesses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { serviceCategories, searchValue, executeSearch } = useOutletContext() || { serviceCategories: [] };
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopyLink = (textToCopy, key) => {
    const fullUrl = textToCopy.startsWith('http') ? textToCopy : `${window.location.origin}${textToCopy}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      }).catch(() => {
        fallbackCopy(fullUrl, key);
      });
    } else {
      fallbackCopy(fullUrl, key);
    }
  };

  const fallbackCopy = (text, key) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  // Automatic & Manual Location States
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [customCity, setCustomCity] = useState('');
  const [customState, setCustomState] = useState('');

  useEffect(() => {
    const initLocation = async () => {
      const savedLocation = localStorage.getItem('selectedLocation');
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          setDetectedLocation(parsed);
          return;
        } catch (e) {
          console.error('Failed to parse saved location', e);
        }
      }

      setDetectingLocation(true);
      try {
        const res = await locationService.detectLocation();
        if (res && res.success && res.data) {
          const loc = {
            city: res.data.city,
            state: res.data.state,
            country: res.data.country,
            latitude: res.data.latitude,
            longitude: res.data.longitude
          };
          setDetectedLocation(loc);
        } else {
          setDetectedLocation(null);
        }
      } catch (err) {
        console.error('IP location detection failed', err);
        setDetectedLocation(null);
      } finally {
        setDetectingLocation(false);
      }
    };

    initLocation();
  }, []);

  const handleSaveManualLocation = (city, state = '') => {
    const loc = {
      city,
      state,
      country: 'India',
      latitude: null,
      longitude: null
    };
    localStorage.setItem('selectedLocation', JSON.stringify(loc));
    setDetectedLocation(loc);
    setShowLocationSelector(false);

    if (city) {
      setSelectedCity(city);
    }
  };

  const handleDetectIPLocation = async () => {
    setDetectingLocation(true);
    setShowLocationSelector(false);
    try {
      const res = await locationService.detectLocation();
      if (res && res.success && res.data) {
        const loc = {
          city: res.data.city,
          state: res.data.state,
          country: res.data.country,
          latitude: res.data.latitude,
          longitude: res.data.longitude
        };
        localStorage.setItem('selectedLocation', JSON.stringify(loc));
        setDetectedLocation(loc);
        if (loc.city) {
          setSelectedCity(loc.city);
        }
      } else {
        alert(res?.message || 'Could not detect location. Please set it manually.');
      }
    } catch (err) {
      console.error('IP location detection failed', err);
      alert('Error detecting location.');
    } finally {
      setDetectingLocation(false);
    }
  };


  useEffect(() => {
    const handleToggleFilters = () => setShowFiltersMobile(prev => !prev);
    window.addEventListener('toggleMobileFilters', handleToggleFilters);
    return () => window.removeEventListener('toggleMobileFilters', handleToggleFilters);
  }, []);


  const navType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter States synced with URL Search Params
  const locationSlug = params.locationSlug;
  const filterName = searchParams.get('q') || '';
  const selectedCity = locationSlug
    ? (locationSlug.charAt(0).toUpperCase() + locationSlug.slice(1).toLowerCase())
    : (searchParams.get('city') || 'all');
  const selectedCategory = searchParams.get('category') || 'all';
  const selectedRating = searchParams.get('rating') || 'all';

  const handleCategoryClick = async (catName) => {
    try {
      let cats = serviceCategories;
      if (!cats || cats.length === 0) {
        const res = await api.get('/public/service-categories');
        cats = res.data.categories || [];
      }

      const mappedName = ICON_TO_DB_CATEGORY[catName] || catName;
      const query = mappedName.toLowerCase();
      let matchedService = cats.find(c => c.name.toLowerCase() === query);

      const citySlug = selectedCity !== 'all' ? selectedCity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';

      if (matchedService) {
        navigate(`/${citySlug ? citySlug + '/' : ''}${matchedService.slug}`);
      } else {
        const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        navigate(`/${citySlug ? citySlug + '/' : ''}${catSlug}`);
      }
    } catch (e) {
      const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const citySlug = selectedCity !== 'all' ? selectedCity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      navigate(`/${citySlug ? citySlug + '/' : ''}${catSlug}`);
    }
  };

  const setFilterName = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val) {
      nextParams.set('q', val);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams);
  };

  const setSelectedCity = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('city', val);
    } else {
      nextParams.delete('city');
    }
    setSearchParams(nextParams);
  };

  const setSelectedCategory = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('category', val);
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams);
  };

  const setSelectedRating = (val) => {
    const nextParams = new URLSearchParams(searchParams);
    if (val && val !== 'all') {
      nextParams.set('rating', val);
    } else {
      nextParams.delete('rating');
    }
    setSearchParams(nextParams);
  };

  // Scroll position preservation
  useEffect(() => {
    const key = `scroll_pos_${location.pathname}${location.search}`;
    const saved = sessionStorage.getItem(key);
    const isReload = window.performance.getEntriesByType('navigation')[0]?.type === 'reload';
    if (navType === 'POP' && !isReload && saved && !loading && businesses.length > 0) {
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
  }, [location.pathname, location.search, loading, businesses]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await api.get('/public/businesses');
        if (res.data.success) {
          setBusinesses(res.data.businesses);
        }
      } catch (error) {
        console.error('Failed to fetch businesses', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBusinesses();
  }, []);

  // Mock Rating Generator based on ID/slug for high-end preview and functional filtering
  const getMockRating = (id) => {
    if (!id) return "4.5";
    const num = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (4.0 + (num % 10) * 0.1).toFixed(1);
  };

  const getMockReviews = (id) => {
    if (!id) return 25;
    const num = typeof id === 'number' ? id : String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 10 + (num * 17) % 150;
  };

  // Dynamically extract unique cities and categories from data
  const cities = [...new Set(businesses.map(b => b.city).filter(Boolean))].sort();
  const categories = [...new Set(businesses.map(b => b.category).filter(Boolean))].sort();

  // Reset Filters
  const handleResetFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    nextParams.delete('city');
    nextParams.delete('category');
    nextParams.delete('rating');
    setSearchParams(nextParams, { replace: true });
    if (executeSearch && searchValue && searchValue.trim()) {
      executeSearch(searchValue.trim());
    }
  };

  // Filter logic
  const filteredBusinesses = businesses.filter(business => {
    const query = filterName ? filterName.toLowerCase().trim() : '';
    const queryCity = extractCityFromText(filterName);

    // 1. If search query explicitly specifies a city (e.g. "software companies in Chennai"):
    if (queryCity) {
      const qCityLower = queryCity.toLowerCase();
      const selectedCityLower = (selectedCity && selectedCity !== 'all' ? selectedCity : (locationSlug ? locationSlug.replace(/-/g, ' ') : '')).toLowerCase().trim();

      // If user selected location (e.g. "Erode") does NOT match query city ("Chennai"):
      if (selectedCityLower && selectedCityLower !== 'all' && selectedCityLower !== 'india' && selectedCityLower !== qCityLower) {
        // Business must strictly be located in queryCity ("Chennai")
        const bCity = (business.city || '').toLowerCase();
        const bAddr = (business.formatted_address || business.business_address || '').toLowerCase();
        if (!bCity.includes(qCityLower) && !bAddr.includes(qCityLower)) {
          return false;
        }
      }
    }

    const cleanQuery = getCleanKeyword(filterName, queryCity);
    const targetQuery = cleanQuery || query;

    // 2. Search Query Filter (Checks name, category, subcategory, keywords, description, address)
    const nameMatch = !query ||
      (business.business_name && business.business_name.toLowerCase().includes(targetQuery)) ||
      (business.category && business.category.toLowerCase().includes(targetQuery)) ||
      (business.subcategory && business.subcategory.toLowerCase().includes(targetQuery)) ||
      (business.keywords && business.keywords.toLowerCase().includes(targetQuery)) ||
      (business.store_description && business.store_description.toLowerCase().includes(targetQuery)) ||
      (business.formatted_address && business.formatted_address.toLowerCase().includes(targetQuery)) ||
      fuzzyMatch(business.business_name || '', targetQuery) ||
      fuzzyMatch(business.keywords || '', targetQuery) ||
      fuzzyMatch(business.subcategory || '', targetQuery) ||
      fuzzyMatch(business.category || '', targetQuery);

    // 3. City / Location Filter
    const cityVal = (selectedCity && selectedCity !== 'all' ? selectedCity : (locationSlug ? locationSlug.replace(/-/g, ' ') : '')).toLowerCase().trim();
    const cityMatch = !cityVal || queryCity ||
      (business.city && business.city.toLowerCase().includes(cityVal)) ||
      (business.formatted_address && business.formatted_address.toLowerCase().includes(cityVal)) ||
      (business.district && business.district.toLowerCase().includes(cityVal));

    // 4. Category Filter
    const categoryMatch = selectedCategory === 'all' || !selectedCategory ||
      (business.category && business.category.toLowerCase() === selectedCategory.toLowerCase()) ||
      (business.subcategory && business.subcategory.toLowerCase() === selectedCategory.toLowerCase());

    // 5. Rating Filter
    const ratingValue = parseFloat(getMockRating(business.id || business.slug || business.user_id));
    const ratingMatch = selectedRating === 'all' || ratingValue >= parseFloat(selectedRating);

    return nameMatch && cityMatch && categoryMatch && ratingMatch;
  });

  // Dynamic Page Title & Meta Keywords tag for View Page Source
  useEffect(() => {
    const queryStr = filterName ? filterName.trim() : '';
    const cityStr = selectedCity && selectedCity !== 'all' ? selectedCity : (locationSlug ? locationSlug.replace(/-/g, ' ') : '');

    // Dynamic Document Title
    const locPart = cityStr ? ` in ${cityStr.charAt(0).toUpperCase() + cityStr.slice(1)}` : ' in India';
    const mainPart = queryStr || (selectedCategory !== 'all' ? selectedCategory : 'Best Local Businesses');
    document.title = `${mainPart}${locPart} - IBC Mart`;

    // Dynamic Meta Keywords Tag
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      document.head.appendChild(metaKeywords);
    }

    const collectedKeywords = new Set();
    if (queryStr) collectedKeywords.add(queryStr);
    if (cityStr) {
      collectedKeywords.add(`businesses in ${cityStr}`);
      if (queryStr) collectedKeywords.add(`${queryStr} in ${cityStr}`);
    }
    filteredBusinesses.slice(0, 15).forEach(b => {
      if (b.category) collectedKeywords.add(b.category);
      if (b.subcategory) collectedKeywords.add(b.subcategory);
      if (b.keywords) {
        b.keywords.split(/[,/_\-]+/).map(k => k.trim()).filter(Boolean).forEach(k => collectedKeywords.add(k));
      }
    });
    metaKeywords.content = Array.from(collectedKeywords).join(', ');
  }, [filterName, selectedCity, selectedCategory, locationSlug, filteredBusinesses.length]);

  const isLandingView = !filterName && selectedCity === 'all' && selectedCategory === 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-4 md:py-8 px-4 md:px-0 flex items-center justify-center">
        <div className="w-full max-w-6xl px-4 md:px-0 space-y-8">
          <div className="h-8 w-64 bg-gray-200/80 animate-pulse rounded-lg mx-auto"></div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-4 w-full">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 animate-pulse w-full">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gray-200/80 rounded-2xl"></div>
                <div className="h-3 w-14 bg-gray-200/80 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50/50 py-4 md:py-8 px-1 md:px-0">
        <div>
          {isLandingView ? (
            <div className="space-y-4">
              <h2 className="text-xxl md:text-3xl font-semibold text-[#0a7a8c] text-center w-full tracking-tight">
                Discover The Local Businesses
              </h2>
              <div className="space-y-6 p-0">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-x-2 md:gap-x-6 gap-y-4 md:gap-y-6">
                  {LANDING_CATEGORIES.map((cat, idx) => {
                    const alignClass = 'items-center text-center';

                    return (
                      <button
                        key={cat.name}
                        onClick={() => handleCategoryClick(cat.name)}
                        className={`flex flex-col gap-1.5 md:gap-3 transition-all duration-300 group hover:-translate-y-1 focus:outline-none w-full bg-transparent ${alignClass}`}
                      >
                        <div className="w-[54px] h-[54px] sm:w-[68px] sm:h-[68px] md:w-24 md:h-24 flex items-center justify-center bg-white border border-gray-100 rounded-xl md:rounded-2xl p-1.5 sm:p-2 md:p-2.5 shadow-sm group-hover:scale-105 group-hover:border-red-100 group-hover:shadow-md transition-all duration-300">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'block';
                              }
                            }}
                          />
                          <div style={{ display: 'none' }} className="text-[#cc0000]">
                            <Store className="w-6 h-6 md:w-11 md:h-11" />
                          </div>
                        </div>
                        <span className="text-[10px] md:text-sm font-bold text-gray-800 group-hover:text-[#cc0000] transition-colors line-clamp-1 md:line-clamp-none">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Service Group Sections */}
                <h2 className="text-xxl md:text-3xl font-semibold text-[#0a7a8c] text-center w-full tracking-tight mt-12 mb-4">
                  Discover The Local Services
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4 lg:mt-6">
                  {CATEGORY_SECTIONS.map((section) => (
                    <div
                      key={section.title}
                      className="bg-transparent md:bg-white border-0 md:border md:border-black rounded-2xl p-0 md:p-6 shadow-none md:shadow-sm hover:shadow-none md:hover:shadow-md transition-all duration-300 overflow-hidden"
                    >
                      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
                        {section.services.map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => handleCategoryClick(cat.name)}
                            className="flex flex-col items-center justify-between group focus:outline-none w-full bg-transparent text-center h-full"
                          >
                            <div className="w-full aspect-[4/5] md:aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center relative shadow-sm group-hover:shadow transition-all duration-300">
                              <img
                                src={getImageUrl(cat.image)}
                                alt={cat.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'block';
                                  }
                                }}
                              />
                              <div style={{ display: 'none' }} className="text-gray-400">
                                <Store className="w-8 h-8 md:w-12 md:h-12" />
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 group-hover:text-[#cc0000] transition-colors text-center mt-1.5 md:mt-2 w-full line-clamp-2">
                              {cat.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full px-1 md:px-0 pt-0 pb-8 space-y-8">
              {/* Banner Header exactly like ServiceCategoryPage */}
              <div className={`rounded-3xl shadow-sm relative overflow-hidden bg-gradient-to-br from-[#fff0e6] to-[#ffe5d9] mb-6 min-h-[120px] flex items-center p-4 md:px-8 md:py-5`}>
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 bottom-0 left-0 overflow-hidden pointer-events-none z-0">
                  <div className="absolute top-4 right-32 grid grid-cols-4 gap-2 opacity-40">
                    {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f4a261]"></div>)}
                  </div>
                  <div className="absolute bottom-4 left-6 grid grid-cols-4 gap-2 opacity-40">
                    {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f4a261]"></div>)}
                  </div>
                  <div className="absolute -top-12 -right-8 w-24 h-64 bg-[#fcb9a0] rounded-full transform rotate-[35deg] opacity-80"></div>
                  <div className="absolute -bottom-24 right-12 w-20 h-80 bg-[#fde3d9] rounded-full transform rotate-[35deg] opacity-70"></div>
                  <div className="absolute -bottom-32 right-32 w-24 h-96 bg-[#fceae4] rounded-full transform rotate-[35deg] opacity-60"></div>
                </div>

                <div className="max-w-5xl space-y-1.5 relative z-10">
                  {selectedCity !== 'all' && (
                    <div className="flex items-center text-[#ff6b35] font-bold mb-1">
                      <MapPin size={14} strokeWidth={2.5} className="mr-1.5" />
                      <span className="text-xs tracking-wide">{selectedCity} Local Search</span>
                    </div>
                  )}
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-[#0f172a]">
                    {filterName
                      ? `Search Results for "${filterName}"`
                      : selectedCategory !== 'all'
                        ? `Best ${selectedCategory} in ${selectedCity !== 'all' ? selectedCity : 'Your Area'}`
                        : `Local Businesses in ${selectedCity !== 'all' ? selectedCity : 'Your Area'}`}
                  </h1>
                  <p className="font-medium text-xs md:text-sm leading-relaxed max-w-3xl text-slate-700">
                    Find top rated businesses in {selectedCity !== 'all' ? selectedCity : 'your area'}. Get contact details, reviews, address, and map location of local professionals.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[#1e293b] flex items-center gap-2 border-b-2 border-transparent hover:border-indigo-600 transition-colors">
                    <Layers className="text-indigo-600" size={20} />
                    Listed Providers ({filteredBusinesses.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(window.location.href, 'header-page-share')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-indigo-500 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:text-indigo-600 shadow-sm transition-all"
                  >
                    {copiedKey === 'header-page-share' ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        <span className="text-green-600 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} className="text-indigo-600" />
                        <span>Share Results</span>
                      </>
                    )}
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-32 bg-white border border-gray-200 rounded-2xl animate-pulse shadow-sm"></div>
                    ))}
                  </div>
                ) : filteredBusinesses.length > 0 ? (
                  <div className="space-y-4">
                    {filteredBusinesses.map((biz, index) => {
                      const businessKey = biz.id ?? biz.business_id ?? biz.slug ?? biz.public_id ?? biz.user_id ?? `biz-${index}`;
                      const rating = biz.rating ? Number(biz.rating).toFixed(1) : '0.0';
                      const reviews = biz.review_count || 0;
                      const bSlug = biz.slug || biz.public_id || biz.id || biz.user_id || `biz-${index}`;
                      const targetUrl = `/${(biz.city || selectedCity !== 'all' ? selectedCity : 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${bSlug}/${(biz.category || selectedCategory !== 'all' ? selectedCategory : 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

                      return (
                        <div
                          key={businessKey}
                          className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 hover:shadow-md transition flex flex-col gap-3 md:gap-0 cursor-pointer"
                          onClick={(e) => {
                            if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.absolute')) {
                              return;
                            }
                            navigate(targetUrl);
                          }}
                        >
                          <div className="flex flex-row gap-3 md:gap-6">
                            <div className="w-[90px] h-[120px] md:w-[200px] md:h-[200px] rounded flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                              {biz.business_logo ? (
                                <img src={getImageUrl(biz.business_logo)} alt={biz.business_name} className="w-full h-full object-cover rounded" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded">
                                  <span className="text-4xl text-gray-300">🏢</span>
                                </div>
                              )}
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-l-full p-1 cursor-pointer">
                                <ChevronDown size={20} className="-rotate-90" />
                              </div>
                            </div>
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2 mb-1 md:mb-2">
                                <div className="bg-gray-800 text-white p-1 rounded-full w-5 h-5 md:w-6 md:h-6 flex-shrink-0 flex items-center justify-center">
                                  <ThumbsUp size={10} className="fill-white md:w-3 md:h-3" />
                                </div>
                                <h3 className="font-bold text-gray-900 text-[18px] md:text-[22px] hover:text-indigo-600 transition leading-none line-clamp-2 md:line-clamp-1">
                                  <Link to={`/${(biz.city || selectedCity !== 'all' ? selectedCity : 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${bSlug}/${(biz.category || selectedCategory !== 'all' ? selectedCategory : 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{biz.business_name}</Link>
                                </h3>
                              </div>

                              <div className="md:hidden flex items-center mb-1">
                                <span className="text-blue-600 font-bold flex items-center gap-1 text-[12px]"><CheckCircle size={12} className="fill-blue-100" /> Verified</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[12px] md:text-sm text-gray-700 mb-2 md:mb-3">
                                <div className="bg-green-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  {rating} <Star size={10} className="fill-white" />
                                </div>
                                <span className="text-gray-500">{reviews} Ratings</span>
                                <span className="hidden md:flex text-blue-600 font-bold items-center gap-1"><CheckCircle size={12} className="fill-blue-100" /> Verified</span>
                              </div>

                              <div className="flex items-start gap-1.5 text-[12px] md:text-[15px] text-gray-700 mb-2 md:mb-3">
                                <MapPin size={14} className="text-gray-500 hidden md:block mt-1 flex-shrink-0" />
                                <span className="line-clamp-3">
                                  {biz.business_address || biz.formatted_address || biz.city || 'Location not available'}
                                </span>
                              </div>

                              <div className="hidden md:block mb-4">
                                <span className="border border-gray-200 text-gray-700 bg-gray-50 px-3 py-1 rounded text-[12px] font-medium">
                                  {biz.category || 'General'}
                                </span>
                              </div>

                              <div className="hidden md:flex flex-wrap gap-3 mt-auto">
                                {(biz.phone_number || biz.phone) && (
                                  <a
                                    href={`tel:${biz.phone_number || biz.phone}`}
                                    className="bg-[#f05a28] hover:bg-[#d94d20] text-white px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm"
                                  >
                                    <Phone size={16} className="fill-white" /> Call Now
                                  </a>
                                )}
                                {biz.whatsapp_number && (
                                  <a
                                    href={`https://wa.me/${biz.whatsapp_number.replace(/\D/g, '').length === 10 ? '91' + biz.whatsapp_number.replace(/\D/g, '') : biz.whatsapp_number.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="border border-gray-300 text-gray-800 hover:bg-gray-50 px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm bg-white"
                                  >
                                    <MessageCircle size={16} className="text-green-500 fill-green-500" /> WhatsApp
                                  </a>
                                )}
                                <Link
                                  to={targetUrl}
                                  className="border border-[#f05a28] text-[#f05a28] bg-white hover:bg-orange-50 px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm"
                                >
                                  <MessageCircle size={16} className="text-[#f05a28] fill-[#f05a28]" /> View Profile
                                </Link>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyLink(targetUrl, businessKey);
                                  }}
                                  className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-1.5 shadow-sm transition-colors"
                                  title="Share Business Profile Link"
                                >
                                  {copiedKey === businessKey ? (
                                    <>
                                      <Check size={16} className="text-green-600" />
                                      <span className="text-green-600 font-bold">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 size={16} className="text-gray-600" />
                                      <span>Share</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Mobile Buttons */}
                          <div className="flex md:hidden flex-row gap-1 w-full mt-1">
                            {(biz.phone_number || biz.phone) && (
                              <a
                                href={`tel:${biz.phone_number || biz.phone}`}
                                className="flex-1 bg-[#f05a28] text-white py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                              >
                                <Phone size={12} className="fill-white" /> Call
                              </a>
                            )}
                            {biz.whatsapp_number && (
                              <a
                                href={`https://wa.me/${biz.whatsapp_number.replace(/\D/g, '').length === 10 ? '91' + biz.whatsapp_number.replace(/\D/g, '') : biz.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 border border-green-500 text-green-600 bg-white py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                              >
                                <MessageCircle size={12} className="fill-green-500 text-green-500" /> WhatsApp
                              </a>
                            )}
                            <Link
                              to={targetUrl}
                              className="flex-1 border border-[#f05a28] text-[#f05a28] bg-white py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center shadow-sm"
                            >
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(targetUrl, businessKey);
                              }}
                              className="border border-gray-300 text-gray-700 bg-white px-2 py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                              title="Share Business Profile Link"
                            >
                              {copiedKey === businessKey ? (
                                <>
                                  <Check size={12} className="text-green-600" />
                                  <span className="text-green-600 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Share2 size={12} className="text-gray-600" />
                                  <span>Share</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (() => {
                  const queryCity = extractCityFromText(filterName);
                  const currentCityDisplay = selectedCity && selectedCity !== 'all' ? selectedCity : (locationSlug ? locationSlug.replace(/-/g, ' ') : 'this location');
                  return (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 text-center text-gray-600 shadow-sm my-2">
                      <MapPin size={44} className="text-[#cc0000] mx-auto mb-3 animate-bounce" />
                      <h3 className="text-lg md:text-xl font-bold text-gray-900">
                        No Providers Found in {currentCityDisplay} for "{filterName || selectedCategory}"
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
                        {queryCity ? (
                          <>This search phrase specifies <span className="font-bold text-gray-800">{queryCity}</span>. Please choose <span className="font-bold text-gray-800">{queryCity}</span> as your location or switch location filter to view results.</>
                        ) : (
                          <>No matching providers were found in {currentCityDisplay}. Please choose a different location or reset your search filters.</>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                        {queryCity && (
                          <button
                            onClick={() => {
                              const cSlug = queryCity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                              navigate(`/${cSlug}/businesses?q=${encodeURIComponent(filterName)}`);
                            }}
                            className="inline-flex items-center gap-2 bg-[#cc0000] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-sm"
                          >
                            <MapPin size={16} /> Switch Location to {queryCity}
                          </button>
                        )}
                        <button
                          onClick={handleResetFilters}
                          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Businesses;
