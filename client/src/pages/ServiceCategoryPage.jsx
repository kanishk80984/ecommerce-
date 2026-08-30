import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, Link, useNavigate, useSearchParams, useOutletContext } = rrdPkg;
import api from '../services/api';
import { useSsrData } from '../ssr/SsrDataContext';
import { MapPin, Phone, Star, ShieldCheck, ExternalLink, BookOpen, Layers, ChevronDown, ChevronUp, ThumbsUp, CheckCircle, Search, MessageCircle, AlertTriangle, Share2, Check } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';
import { extractCityFromText, getCleanKeyword } from '../utils/fuzzyMatch';

const ServiceCategoryPage = () => {
  const { categorySlug, locationSlug } = useParams();
  const navigate = useNavigate();
  const { searchValue, executeSearch } = useOutletContext() || {};
  const { data: ssrData } = useSsrData() || {};
  const isSsrMatch = ssrData?.pageType === 'serviceCategory' && ssrData?.category?.slug === categorySlug && (locationSlug ? ssrData?.location?.slug === locationSlug : true);

  const [data, setData] = useState(isSsrMatch ? ssrData : null);
  const [loading, setLoading] = useState(isSsrMatch ? false : true);
  const [error, setError] = useState(null);
  const [isPopularLocationsOpen, setIsPopularLocationsOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedKeyword = searchParams.get('kw') || null;
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

  const handleKeywordClick = (phrase) => {
    const next = new URLSearchParams(searchParams);
    if (selectedKeyword === phrase) {
      next.delete('kw');
    } else {
      next.set('kw', phrase);
    }
    setSearchParams(next);
  };

  const handleClearKeyword = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('kw');
    setSearchParams(next, { replace: true });
    if (executeSearch && searchValue && searchValue.trim()) {
      executeSearch(searchValue.trim());
    }
  };

  const servicesList = data?.services || [];
  const displayedServices = React.useMemo(() => {
    if (!servicesList || servicesList.length === 0) return [];
    if (!selectedKeyword) return servicesList;

    const kw = selectedKeyword.toLowerCase();
    const matched = [];
    const unmatched = [];

    servicesList.forEach(svc => {
      const vendorKeywords = (svc.vendor_keywords || '').toLowerCase();
      if (vendorKeywords.includes(kw)) {
        matched.push(svc);
      } else {
        unmatched.push(svc);
      }
    });

    return [...matched, ...unmatched];
  }, [servicesList, selectedKeyword]);

  const keywordCity = React.useMemo(() => {
    return extractCityFromText(selectedKeyword);
  }, [selectedKeyword]);

  const isLocationMismatch = React.useMemo(() => {
    if (!keywordCity || !locationSlug) return false;
    const kwCitySlug = keywordCity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const pageCitySlug = locationSlug.toLowerCase();
    return pageCitySlug !== 'all' && pageCitySlug !== 'india' && pageCitySlug !== kwCitySlug;
  }, [keywordCity, locationSlug]);

  const businessesList = data?.businesses || [];
  const displayedBusinesses = React.useMemo(() => {
    if (!businessesList || businessesList.length === 0) return [];
    if (!selectedKeyword) return businessesList;

    const kw = selectedKeyword.toLowerCase().trim();
    const kwCity = extractCityFromText(selectedKeyword);
    const currentPageCity = (locationSlug || '').toLowerCase();

    // Location Mismatch Detection:
    // If keyword specifies a city (e.g. "Chennai") that differs from current page location (e.g. "erode"):
    if (kwCity) {
      const kwCitySlug = kwCity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (currentPageCity && currentPageCity !== 'all' && currentPageCity !== 'india' && currentPageCity !== kwCitySlug) {
        // Mismatch! Filter businesses strictly to those in kwCity
        return businessesList.filter(biz => {
          const bCity = (biz.city || '').toLowerCase();
          const bAddr = (biz.formatted_address || biz.business_address || '').toLowerCase();
          return bCity.includes(kwCity.toLowerCase()) || bAddr.includes(kwCity.toLowerCase());
        });
      }
    }

    // Cleaned topic keyword (e.g. "software companies in Erode" -> "software companies")
    const cleanKw = getCleanKeyword(selectedKeyword, kwCity);

    const matched = [];
    businessesList.forEach(biz => {
      const bizKeywords = (biz.keywords || '').toLowerCase();
      const bizSubcat = (biz.subcategory || '').toLowerCase();
      const bizCat = (biz.category || '').toLowerCase();
      const bizName = (biz.business_name || '').toLowerCase();

      if (
        bizKeywords.includes(kw) || bizSubcat.includes(kw) || bizCat.includes(kw) || bizName.includes(kw) ||
        (cleanKw && (bizKeywords.includes(cleanKw) || bizSubcat.includes(cleanKw) || bizCat.includes(cleanKw) || bizName.includes(cleanKw)))
      ) {
        matched.push(biz);
      }
    });

    return matched.length > 0 ? matched : businessesList;
  }, [businessesList, selectedKeyword, locationSlug]);

  useEffect(() => {
    if (isSsrMatch && data) {
      updateMetaTags(data);
      injectJsonLd(data);
      return;
    }
    fetchPageDetails();
  }, [categorySlug, locationSlug]);

  useEffect(() => {
    if (data) {
      updateMetaTags(data);
    }
  }, [selectedKeyword, data]);

  const fetchPageDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call public endpoint with cache-busting timestamp parameter
      const cacheBuster = `t=${Date.now()}`;
      const url = `/public/seo-pages/${categorySlug}?${locationSlug ? 'location=' + locationSlug + '&' : ''}${cacheBuster}`;
      const res = await api.get(url);

      if (res.data.success) {
        setData(res.data);
        updateMetaTags(res.data);
        injectJsonLd(res.data);
      } else {
        setError('Page not found');
      }
    } catch (err) {
      if (err.response?.data?.isProductRedirect && err.response?.data?.targetUrl) {
        window.location.replace(err.response.data.targetUrl);
        return;
      }
      setError(err.response?.data?.message || 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const updateMetaTags = (pageData) => {
    if (!pageData) return;

    const currentKw = searchParams.get('kw');
    const locName = pageData.location?.name || (locationSlug ? locationSlug.replace(/-/g, ' ') : '');
    const displayLoc = locName ? locName.charAt(0).toUpperCase() + locName.slice(1) : '';

    const dynamicTitle = currentKw
      ? `${currentKw}${displayLoc ? ' in ' + displayLoc : ''} | IBC Mart`
      : pageData.seo_title || `Best ${pageData.category_name || 'Services'} ${displayLoc ? 'in ' + displayLoc : ''} | Local Services`;

    const dynamicDesc = currentKw
      ? `Find trusted ${currentKw} ${displayLoc ? 'in ' + displayLoc : 'in India'}. Compare reviews, contact details, locations, and business information on IBC Mart.`
      : pageData.meta_description || `Find top rated ${pageData.category_name || 'Services'} ${displayLoc ? 'in ' + displayLoc : ''}. Compare reviews, contact details, and locations on IBC Mart.`;

    const dynamicKeywords = [currentKw, pageData.category_name, displayLoc, `${pageData.category_name} in ${displayLoc || 'India'}`, 'Local Services', 'Directory', 'IBC Mart'].filter(Boolean).join(', ');

    // Title
    document.title = dynamicTitle;

    // Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = dynamicDesc;

    // Meta Keywords
    let metaKw = document.querySelector('meta[name="keywords"]');
    if (!metaKw) {
      metaKw = document.createElement('meta');
      metaKw.name = 'keywords';
      document.head.appendChild(metaKw);
    }
    metaKw.content = dynamicKeywords;

    // Robots
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = pageData.index_status === 'Noindex' ? 'noindex, nofollow' : 'index, follow';

    // Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    const currentUrl = window.location.origin + `/${locationSlug ? locationSlug + '/' : ''}${categorySlug}${currentKw ? '?kw=' + encodeURIComponent(currentKw) : ''}`;
    linkCanonical.href = currentUrl;

    // Open Graph Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = dynamicTitle;

    // Open Graph Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = dynamicDesc;

    // Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = linkCanonical.href;
  };

  const injectJsonLd = (pageData) => {
    const existing = document.getElementById('seo-json-ld');
    if (existing) {
      existing.remove();
    }

    if (!pageData.businesses || pageData.businesses.length === 0) return;

    const listItems = pageData.businesses.map((b, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "LocalBusiness",
        "name": b.business_name,
        "image": b.business_logo ? getImageUrl(b.business_logo) : undefined,
        "telephone": b.phone_number || b.whatsapp_number || undefined,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": b.business_address || '',
          "addressLocality": b.city || '',
          "addressRegion": b.state || '',
          "postalCode": b.pincode || '',
          "addressCountry": b.country || 'India'
        },
        "geo": b.latitude && b.longitude ? {
          "@type": "GeoCoordinates",
          "latitude": parseFloat(b.latitude),
          "longitude": parseFloat(b.longitude)
        } : undefined
      }
    }));

    const schema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": pageData.h1,
      "description": pageData.meta_description,
      "itemListElement": listItems
    };

    const script = document.createElement('script');
    script.id = 'seo-json-ld';
    script.type = 'application/ld+json';
    script.innerHTML = JSON.stringify(schema);
    document.head.appendChild(script);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        {/* Dynamic loading header */}
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse" />
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-500 font-semibold">Loading providers...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mt-4">Unable to load providers</h2>
        <p className="text-gray-500 mt-2 mb-6">No category, service category, or keyword matching this URL was found.</p>
        <button
          onClick={() => navigate('/businesses')}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const {
    category,
    category_name,
    category_slug,
    location,
    location_slug,
    h1,
    meta_description,
    seo_content,
    banner_image,
    target_locations = [],
    related_search_phrases = [],
    businesses = [],
    services = []
  } = data;

  return (
    <div className="w-full px-4 md:px-0 pt-0 pb-8 space-y-8">
      {/* ── Page Header ── */}
      {/* ── Page Header ── */}
      <div className={`rounded-3xl shadow-sm relative overflow-hidden bg-gradient-to-br from-[#fff0e6] to-[#ffe5d9] mb-6 min-h-[120px] ${banner_image ? 'md:min-h-[160px]' : ''} flex items-center p-4 md:px-8 md:py-5`}>

        {/* Background Image (Desktop Only, if exists) */}
        {banner_image && (
          <div
            className="hidden md:block absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getImageUrl(banner_image)})` }}
          >
            {/* Very subtle light gradient to ensure black text readability while preserving original image color */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />
          </div>
        )}

        {/* Abstract Background Shapes (Hidden on desktop if image exists) */}
        <div className={`absolute top-0 right-0 bottom-0 left-0 overflow-hidden pointer-events-none z-0 ${banner_image ? 'md:hidden' : ''}`}>
          {/* Dots Top Right */}
          <div className="absolute top-4 right-32 grid grid-cols-4 gap-2 opacity-40">
            {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f4a261]"></div>)}
          </div>
          {/* Dots Bottom Left */}
          <div className="absolute bottom-4 left-6 grid grid-cols-4 gap-2 opacity-40">
            {[...Array(12)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#f4a261]"></div>)}
          </div>

          {/* Diagonal Pill Shapes */}
          {/* Darker inner pill */}
          <div className="absolute -top-12 -right-8 w-24 h-64 bg-[#fcb9a0] rounded-full transform rotate-[35deg] opacity-80"></div>
          {/* Lighter outer pill/stripe */}
          <div className="absolute -bottom-24 right-12 w-20 h-80 bg-[#fde3d9] rounded-full transform rotate-[35deg] opacity-70"></div>
          {/* Background large stripe */}
          <div className="absolute -bottom-32 right-32 w-24 h-96 bg-[#fceae4] rounded-full transform rotate-[35deg] opacity-60"></div>
        </div>

        <div className="max-w-5xl space-y-1.5 relative z-10">
          {location && (
            <div className="flex items-center text-[#ff6b35] font-bold mb-1">
              <MapPin size={14} strokeWidth={2.5} className="mr-1.5" />
              <span className="text-xs tracking-wide">{location.name} Local Listing</span>
            </div>
          )}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-[#0f172a]">
            {h1}
          </h1>
          <p className="font-medium text-xs md:text-sm leading-relaxed max-w-3xl text-slate-700">
            {meta_description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── Left Column: Providers & About ── */}
        <div className="lg:col-span-3 space-y-8">
          {/* Main Content: Businesses List */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Layers className="text-indigo-600" size={20} />
                Listed Providers ({businesses.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(window.location.href, 'page-share')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-indigo-500 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:text-indigo-600 shadow-sm transition-all"
                >
                  {copiedKey === 'page-share' ? (
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
            </div>

            {displayedBusinesses.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 text-center text-gray-600 shadow-sm my-2">
                <MapPin size={44} className="text-[#cc0000] mx-auto mb-3 animate-bounce" />
                <h3 className="text-lg md:text-xl font-bold text-gray-900">
                  {selectedKeyword
                    ? `No Providers Found in ${location ? location.name : 'Selected Location'} for "${selectedKeyword}"`
                    : `No Providers Listed Yet in ${location ? location.name : 'Selected Location'}`}
                </h3>
                <p className="text-xs md:text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
                  {isLocationMismatch ? (
                    <>This search phrase specifies <span className="font-bold text-gray-800">{keywordCity}</span>. Please choose <span className="font-bold text-gray-800">{keywordCity}</span> as your location or switch location filter to view results.</>
                  ) : selectedKeyword ? (
                    <>No matching providers were found for this keyword in {location ? location.name : 'this location'}. Please choose a different location.</>
                  ) : (
                    <>There are currently no verified businesses registered in this category/location. Check back again later or explore nearby locations.</>
                  )}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                  {isLocationMismatch && keywordCity && (
                    <button
                      onClick={() => {
                        const cSlug = keywordCity.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const catSlug = category_slug || 'businesses';
                        navigate(`/${cSlug}/${catSlug}?kw=${encodeURIComponent(selectedKeyword)}`);
                      }}
                      className="inline-flex items-center gap-2 bg-[#cc0000] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <MapPin size={16} /> Switch Location to {keywordCity}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedBusinesses.map((biz) => {
                  const bSlug = biz.slug || `biz-${biz.id}`;
                  const targetUrl = `/${locationSlug || (biz.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${bSlug}/${categorySlug || (biz.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

                  return (
                    <div
                      key={biz.id}
                      className={`bg-white rounded-xl border p-3 md:p-4 hover:shadow-md transition flex flex-col gap-3 md:gap-0 cursor-pointer ${selectedKeyword && (biz.keywords || '').toLowerCase().includes(selectedKeyword.toLowerCase()) ? 'border-indigo-300 bg-indigo-50/10' : 'border-gray-200'}`}
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
                              <Link to={`/${locationSlug || (biz.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${bSlug}/${categorySlug || (biz.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{biz.business_name}</Link>
                            </h3>
                          </div>

                          <div className="md:hidden flex items-center mb-1">
                            <span className="text-blue-600 font-bold flex items-center gap-1 text-[12px]"><CheckCircle size={12} className="fill-blue-100" /> Verified</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[12px] md:text-sm text-gray-700 mb-2 md:mb-3">
                            <div className="bg-green-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1">
                              {parseFloat(biz.average_rating || 4.1).toFixed(1)} <Star size={10} className="fill-white" />
                            </div>
                            <span className="text-gray-500">{biz.review_count || 55} Ratings</span>
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
                            {(biz.phone_number || biz.whatsapp_number) && (
                              <a
                                href={`tel:${biz.phone_number || biz.whatsapp_number}`}
                                className="bg-[#f05a28] hover:bg-[#d94d20] text-white px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm"
                              >
                                <Phone size={16} className="fill-white" /> Call Now
                              </a>
                            )}
                            {biz.whatsapp_number && (
                              <a
                                href={`https://wa.me/${biz.whatsapp_number}`}
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
                                handleCopyLink(targetUrl, `biz-${biz.id}`);
                              }}
                              className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-3 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-1.5 shadow-sm transition-colors"
                              title="Share Business Profile Link"
                            >
                              {copiedKey === `biz-${biz.id}` ? (
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
                        {(biz.phone_number || biz.whatsapp_number) && (
                          <a
                            href={`tel:${biz.phone_number || biz.whatsapp_number}`}
                            className="flex-1 bg-[#f05a28] text-white py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Phone size={12} className="fill-white" /> Call
                          </a>
                        )}
                        {biz.whatsapp_number && (
                          <a
                            href={`https://wa.me/${biz.whatsapp_number}`}
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
                          Profile
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(targetUrl, `biz-${biz.id}`);
                          }}
                          className="border border-gray-300 text-gray-700 bg-white px-2 py-1.5 rounded-[4px] font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm"
                          title="Share Business Profile Link"
                        >
                          {copiedKey === `biz-${biz.id}` ? (
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
            )}
          </div>

          {/* Listed Services (If any) */}
          {services && services.length > 0 && (
            <div className="space-y-6 pt-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Layers className="text-indigo-600" size={20} />
                  Listed Services ({services.length})
                </h2>
                {selectedKeyword && (
                  <button
                    onClick={handleClearKeyword}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {displayedServices.map((svc) => (
                  <div key={svc.id} className={`bg-white rounded-xl border p-3 md:p-4 hover:shadow-md transition flex flex-col gap-3 md:gap-0 ${selectedKeyword && (svc.vendor_keywords || '').toLowerCase().includes(selectedKeyword.toLowerCase()) ? 'border-indigo-300 shadow-sm bg-indigo-50/10' : 'border-gray-200'}`}>
                    <div className="flex flex-row gap-3 md:gap-6">
                      <div className="w-[90px] h-[120px] md:w-[200px] md:h-[200px] rounded flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                        {(svc.mobile_image || svc.image_path) ? (
                          <img src={getImageUrl(svc.mobile_image || svc.image_path)} alt={svc.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded">
                            <span className="text-4xl text-gray-300">🛠️</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-1 md:mb-2">
                          <div className="bg-gray-800 text-white p-1 rounded-full w-5 h-5 md:w-6 md:h-6 flex-shrink-0 flex items-center justify-center">
                            <ThumbsUp size={10} className="fill-white md:w-3 md:h-3" />
                          </div>
                          <h3 className="font-bold text-gray-900 text-[18px] md:text-[22px] hover:text-indigo-600 transition leading-none line-clamp-2 md:line-clamp-1">
                            <Link to={`/${locationSlug || (svc.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${categorySlug || 'category'}/${svc.slug || svc.public_id || svc.id}/${svc.vendor_slug || svc.vendor_public_id || svc.vendor_id}`}>{svc.name}</Link>
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 md:gap-3 text-[11px] md:text-sm text-gray-700 mb-1 md:mb-3">
                          <span className="text-gray-500 font-medium">Provided by <Link to={`/${locationSlug || (svc.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${svc.vendor_slug || svc.vendor_public_id || svc.vendor_user_id || svc.vendor_id}/${categorySlug || 'category'}`} className="font-bold text-gray-700 hover:text-indigo-600">{svc.business_name}</Link></span>
                        </div>

                        <div className="md:hidden flex items-center mb-1">
                          <span className="text-blue-600 font-bold flex items-center gap-1 text-[12px]"><CheckCircle size={12} className="fill-blue-100" /> Verified</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[12px] md:text-sm text-gray-700 mb-2 md:mb-3">
                          <div className="bg-green-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            {parseFloat(svc.average_rating || 5.0).toFixed(1)} <Star size={10} className="fill-white" />
                          </div>
                          <span className="text-gray-500">{svc.review_count || 1} Ratings</span>
                          <span className="hidden md:flex text-blue-600 font-bold items-center gap-1"><CheckCircle size={12} className="fill-blue-100" /> Verified</span>
                        </div>

                        <div className="flex items-start gap-1.5 text-[13px] md:text-[15px] text-gray-700 mb-2 md:mb-3">
                          <span className="line-clamp-3">
                            {svc.description || svc.short_description || 'No description available for this service.'}
                          </span>
                        </div>

                        {svc.price && (
                          <div className="flex items-center gap-1.5 text-[14px] md:text-[15px] text-indigo-600 font-bold mb-2 md:mb-3">
                            ₹{svc.price}
                          </div>
                        )}

                        <div className="hidden md:block mb-4">
                          <span className="border border-gray-200 text-gray-700 bg-gray-50 px-3 py-1 rounded text-[12px] font-medium">
                            Service
                          </span>
                        </div>

                        <div className="hidden md:flex flex-wrap gap-3 mt-auto">
                          {(svc.phone_number || svc.whatsapp_number) && (
                            <a
                              href={`tel:${svc.phone_number || svc.whatsapp_number}`}
                              className="bg-[#f05a28] hover:bg-[#d94d20] text-white px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                              <Phone size={16} className="fill-white" /> Call Now
                            </a>
                          )}
                          {svc.whatsapp_number && (
                            <a
                              href={`https://wa.me/${svc.whatsapp_number}`}
                              target="_blank"
                              rel="noreferrer"
                              className="border border-gray-300 text-gray-800 hover:bg-gray-50 px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm bg-white"
                            >
                              <MessageCircle size={16} className="text-green-500 fill-green-500" /> WhatsApp
                            </a>
                          )}
                          <Link
                            to={`/${locationSlug || (svc.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${categorySlug || 'category'}/${svc.slug || svc.public_id || svc.id}/${svc.vendor_slug || svc.vendor_public_id || svc.vendor_id}`}
                            className="border border-[#f05a28] text-[#f05a28] bg-white hover:bg-orange-50 px-4 py-2.5 rounded-[4px] font-bold text-sm flex items-center gap-2 shadow-sm"
                          >
                            <ExternalLink size={16} className="text-[#f05a28]" /> View Service
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Buttons */}
                    <div className="flex md:hidden flex-row gap-2 w-full mt-1">
                      {(svc.phone_number || svc.whatsapp_number) && (
                        <a
                          href={`tel:${svc.phone_number || svc.whatsapp_number}`}
                          className="flex-1 bg-[#f05a28] text-white py-2 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Phone size={14} className="fill-white" /> Call Now
                        </a>
                      )}
                      <Link
                        to={`/${locationSlug || (svc.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${categorySlug || 'category'}/${svc.slug || svc.public_id || svc.id}/${svc.vendor_slug || svc.vendor_public_id || svc.vendor_id}`}
                        className="flex-1 border border-[#f05a28] text-[#f05a28] bg-white py-2 rounded-[4px] font-bold text-[13px] flex items-center justify-center shadow-sm"
                      >
                        View Service
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>

        {/* ── Right Column: Sidebar (Locations & Keywords) ── */}
        <div className="lg:col-span-1 space-y-6 sticky top-8 self-start">
          {/* Related search phrases widget */}
          {related_search_phrases && related_search_phrases.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                Related Search Phrases
              </h4>
              <ul className="space-y-2 pt-1 max-h-[400px] overflow-y-auto scrollbar-thin -mr-3 pr-3">
                {related_search_phrases.map((phrase, i) => (
                  <li
                    key={i}
                    onClick={() => handleKeywordClick(phrase)}
                    className={`text-sm transition cursor-pointer flex items-start gap-2 p-1.5 rounded-lg ${selectedKeyword === phrase ? 'bg-indigo-50 text-indigo-700 font-bold' : 'font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50'}`}
                  >
                    <span className="leading-relaxed">{phrase}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Target Locations widget */}
          {target_locations && target_locations.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                Popular Locations
              </h4>
              <div className="flex flex-col gap-2 pt-2 max-h-[400px] overflow-y-auto scrollbar-thin -mr-3 pr-3">
                {target_locations.map((loc, i) => (
                  <Link
                    key={i}
                    to={`/${loc.slug}/${category_slug}`}
                    className="text-gray-600 hover:text-blue-600 text-sm font-medium transition py-1"
                  >
                    {category_name} in {loc.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCategoryPage;
