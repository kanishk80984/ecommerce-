import React from 'react';
import * as rrdPkg from 'react-router-dom';
const { Outlet, Link, useNavigate, useLocation, useSearchParams } = rrdPkg;
import { Search, ShoppingCart, User, Users, Home, Grid, Menu, LogOut, Heart, Filter, X, MapPin, Check, Briefcase } from 'lucide-react';
import { GridTwoTone, SearchTwoTone } from '../components/TwoToneIcons';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { clearCart } from '../store/cartSlice';
import api from '../services/api';
import { getImageUrl } from '../utils/imageUrl';
import { fuzzyMatch, getMatchScore, extractCityFromText } from '../utils/fuzzyMatch';
import { productMatchesUserCategory } from '../utils/categoryMap';

const TAMIL_NADU_CITIES = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Tiruppur',
  'Thanjavur', 'Dindigul', 'Karur', 'Namakkal', 'Nagapattinam',
  'Kanchipuram', 'Chengalpattu', 'Tambaram', 'Avadi', 'Tiruvallur',
  'Tiruvannamalai', 'Viluppuram', 'Kallakurichi', 'Cuddalore',
  'Chidambaram', 'Mayiladuthurai', 'Sirkazhi', 'Thiruvarur',
  'Pudukottai', 'Sivagangai', 'Ramanathapuram', 'Paramakudi',
  'Sivakasi', 'Virudhunagar', 'Rajapalayam', 'Srivilliputhur',
  'Tenkasi', 'Sankarankovil', 'Nagercoil', 'Kanyakumari',
  'Marthandam', 'Kuzhithurai', 'Theni', 'Bodinayakanur',
  'Cumbum', 'Periyakulam', 'Palani', 'Oddanchatram',
  'Kodaikanal', 'Pollachi', 'Mettupalayam', 'Coonoor',
  'Udhagamandalam', 'Gobichettipalayam', 'Bhavani', 'Sathyamangalam',
  'Mettur', 'Attur', 'Rasipuram', 'Kulithalai',
  'Ariyalur', 'Perambalur', 'Arakkonam', 'Ranipet',
  'Walajapet', 'Gudiyatham', 'Ambur', 'Vaniyambadi',
  'Tirupattur', 'Arani', 'Cheyyar', 'Tiruttani',
  'Palladam', 'Dharapuram', 'Udumalaipettai', 'Kovilpatti',
  'Tiruchendur', 'Neyveli', 'Panruti', 'Vriddhachalam',
  'Pattukkottai', 'Mannargudi', 'Vedaranyam', 'Karaikudi'
];

const CustomerLayout = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart?.items) || [];
  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  const wishlistItems = useSelector(state => state.wishlist?.items) || [];
  const wishlistCount = wishlistItems.length;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = React.useState([]);
  const [serviceCategories, setServiceCategories] = React.useState([]);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isJobsPage = location.pathname.startsWith('/jobs');
  
  const isBusinessesPage = location.pathname.startsWith('/businesses') ||
    location.pathname.endsWith('/businesses') ||
    location.pathname.startsWith('/shop/') ||
    location.state?.fromBusinessSearch ||
    (location.pathname.split('/').filter(Boolean).length > 0 &&
      serviceCategories.some(c => c.slug === location.pathname.split('/').filter(Boolean).pop()));

  const getAccountLink = () => {
    if (!isMounted || !isAuthenticated) return '/login';
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return '/admin';
    if (user.role === 'VENDOR') return '/vendor';
    if (user.role === 'TECHNICAL_SUPPORT') return '/support-portal';
    return '/account';
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.get('q') || '';

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getActiveCitySlug = () => {
    let cityVal = searchParams.get('city');
    if (!cityVal && isMounted) {
      try {
        const saved = localStorage.getItem('selectedLocation');
        if (saved) {
          cityVal = JSON.parse(saved)?.city || '';
        }
      } catch (e) { }
    }
    return cityVal ? cityVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
  };

  const [productSearchValue, setProductSearchValue] = React.useState(isBusinessesPage ? '' : currentQuery);
  const [businessSearchValue, setProductSearchValue2] = React.useState(isBusinessesPage ? currentQuery : '');
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [detectedCity, setDetectedCity] = React.useState('');

  const searchValue = isBusinessesPage ? businessSearchValue : productSearchValue;
  const setSearchValue = isBusinessesPage ? setProductSearchValue2 : setProductSearchValue;



  React.useEffect(() => {
    const updateTitleAndMeta = async () => {
      try {
        const fullUrl = window.location.pathname + window.location.search;
        const res = await api.get(`/public/ssr-data?url=${encodeURIComponent(fullUrl)}`);
        if (res.data && res.data.success && res.data.ssrData && res.data.ssrData.seoData) {
          const { title, description, keywords } = res.data.ssrData.seoData;
          if (title) {
            document.title = title;
          }
          
          const updateMetaTag = (nameAttr, value, isProperty = false) => {
            if (!value) return;
            const selector = isProperty ? `meta[property="${nameAttr}"]` : `meta[name="${nameAttr}"]`;
            let element = document.querySelector(selector);
            if (!element) {
              element = document.createElement('meta');
              if (isProperty) {
                element.setAttribute('property', nameAttr);
              } else {
                element.setAttribute('name', nameAttr);
              }
              document.head.appendChild(element);
            }
            element.setAttribute('content', value);
          };

          updateMetaTag('description', description);
          updateMetaTag('keywords', keywords);
          updateMetaTag('og:title', title, true);
          updateMetaTag('og:description', description, true);
          updateMetaTag('twitter:title', title, false);
          updateMetaTag('twitter:description', description, false);
        }
      } catch (err) {
        console.error('Failed to update page title and metadata:', err);
      }
    };

    updateTitleAndMeta();
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    const fetchIPLocation = async () => {
      const saved = localStorage.getItem('selectedLocation');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.city) {
            setDetectedCity(parsed.city);
            return;
          }
        } catch (e) { }
      }

      try {
        const res = await api.get('/location');
        if (res.data && res.data.success && res.data.data && res.data.data.city) {
          const detected = res.data.data;
          setDetectedCity(detected.city);
          localStorage.setItem('selectedLocation', JSON.stringify({
            city: detected.city,
            state: detected.state,
            country: detected.country,
            latitude: detected.latitude,
            longitude: detected.longitude
          }));
        }
      } catch (err) {
        console.error('CustomerLayout IP location fetch failed', err);
      }
    };

    fetchIPLocation();
  }, []);


  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const [selectedCat, setSelectedCat] = React.useState('all');
  const [suggestions, setSuggestions] = React.useState([]);
  const [allBusinesses, setAllBusinesses] = React.useState([]);
  const [serviceKeywords, setServiceKeywords] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isScrollingDown, setIsScrollingDown] = React.useState(false);

  React.useEffect(() => {
    let q = searchParams.get('q') || '';
    if (location.state?.originalQuery) {
      q = location.state.originalQuery;
    } else {
      // if we are on a category page, try to extract the category from the URL
      // e.g. /erode/ac-sales-service -> ac-sales-service
      const pathParts = location.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart && serviceCategories && serviceCategories.length > 0) {
        const matched = serviceCategories.find(c => c.slug === lastPart);
        if (matched) {
          q = matched.name;
        }
      }
    }
    setSearchValue(q);
  }, [searchParams, isBusinessesPage, location.pathname, serviceCategories, location.state]);

  // Search History states
  const [searchHistory, setSearchHistory] = React.useState([]);

  const historyKey = isBusinessesPage ? 'ibc_businesses_search_history' : 'ibc_search_history';

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      } else {
        setSearchHistory([]);
      }
    } catch (e) {
      console.error('Error loading search history', e);
    }
  }, [isBusinessesPage, historyKey]);

  const saveToSearchHistory = (query) => {
    if (!query || !query.trim()) return;
    const trimmed = query.trim();
    try {
      const stored = localStorage.getItem(historyKey);
      let history = stored ? JSON.parse(stored) : [];
      // Remove duplicates
      history = history.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      // Insert to front
      history.unshift(trimmed);
      // Limit to last 4 searches
      history = history.slice(0, 4);
      localStorage.setItem(historyKey, JSON.stringify(history));
      setSearchHistory(history);
    } catch (e) {
      console.error('Error saving search history', e);
    }
  };

  React.useEffect(() => {
    let lastScrollY = window.pageYOffset;
    const handleScroll = () => {
      const scrollY = window.pageYOffset;
      if (scrollY < 50) {
        setIsScrollingDown(false);
        document.body.classList.remove('is-scrolling-down');
      } else if (Math.abs(scrollY - lastScrollY) > 5) {
        const down = scrollY > lastScrollY;
        setIsScrollingDown(down);
        if (down) {
          document.body.classList.add('is-scrolling-down');
        } else {
          document.body.classList.remove('is-scrolling-down');
        }
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.classList.remove('is-scrolling-down');
    };
  }, []);

  React.useEffect(() => {
    setSearchValue(currentQuery);
  }, [currentQuery]);

  React.useEffect(() => {
    api.get('/public/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(() => { });
    api.get('/public/service-categories')
      .then(res => {
        setServiceCategories(res.data.categories || []);
        setServiceKeywords(res.data.keywords || []);
      })
      .catch(() => { });
    
    // Fetch businesses once on mount so search always has data
    api.get('/public/businesses')
      .then(res => setAllBusinesses(res.data.businesses || []))
      .catch(() => { });
  }, []);

  // Fetch matching suggestions as user types
  React.useEffect(() => {
    if (searchValue.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (isBusinessesPage) {
      const q = searchValue.trim();
      const mainCatNamesSet = new Set(serviceCategories.map(c => (c.name || '').toLowerCase().trim()));

      // 1. Main Service Category Matches (Category)
      const mainCatMatches = serviceCategories
        .map(c => {
          const score = getMatchScore(c.name, q);
          return { type: 'category', subType: 'Category', text: c.name, slug: c.slug, score: score + 300 };
        })
        .filter(c => c.score > 300);

      // 2. Related Search Phrases / Subcategories / Keyword Matches (Subcategory)
      const subcatMatches = [];
      serviceKeywords.forEach(k => {
        const kText = (k.keyword || '').trim();
        if (!mainCatNamesSet.has(kText.toLowerCase())) {
          const score = getMatchScore(kText, q);
          if (score > 0) {
            subcatMatches.push({ type: 'category', subType: 'Subcategory', text: kText, categorySlug: k.category_slug, isKeyword: true, score: score + 100 });
          }
        }
      });

      allBusinesses.forEach(b => {
        if (b.subcategory) {
          const subText = b.subcategory.trim();
          if (!mainCatNamesSet.has(subText.toLowerCase())) {
            const score = getMatchScore(subText, q);
            if (score > 0) {
              subcatMatches.push({ type: 'category', subType: 'Subcategory', text: subText, score: score + 100 });
            }
          }
        }
        if (b.keywords) {
          const kwList = b.keywords.split(/[,/_\-]+/).map(s => s.trim()).filter(Boolean);
          kwList.forEach(kw => {
            if (kw.length >= 2 && !mainCatNamesSet.has(kw.toLowerCase())) {
              const score = getMatchScore(kw, q);
              if (score > 0) {
                subcatMatches.push({ type: 'category', subType: 'Subcategory', text: kw, score: score + 100 });
              }
            }
          });
        }
      });

      // 3. Specific Business Matches (Business)
      const activeCitySlug = getActiveCitySlug();
      const bizMatches = allBusinesses
        .map(b => {
          if (!activeCitySlug) {
            const score = Math.max(getMatchScore(b.business_name, q), getMatchScore(b.category || '', q));
            return {
              type: 'business',
              text: b.business_name,
              slug: b.slug,
              city: b.city,
              category: b.category || b.vendor_type,
              location: b.city || b.area || b.address || 'Business',
              image: b.business_logo || b.profile_photo || b.image,
              score
            };
          }
          const bCitySlug = (b.city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          if (bCitySlug !== activeCitySlug) return null;
          const score = Math.max(getMatchScore(b.business_name, q), getMatchScore(b.category || '', q));
          return {
            type: 'business',
            text: b.business_name,
            slug: b.slug,
            city: b.city,
            category: b.category || b.vendor_type,
            location: b.city || b.area || b.address || 'Business',
            image: b.business_logo || b.profile_photo || b.image,
            score
          };
        })
        .filter(b => b && b.score > 0);

      // Combine and sort by matchScore descending!
      const combined = [...mainCatMatches, ...subcatMatches, ...bizMatches];
      combined.sort((a, b) => b.score - a.score);

      const unique = [];
      const seen = new Set();
      for (const item of combined) {
        const normKey = (item.text || '').toLowerCase().trim();
        if (normKey && !seen.has(normKey)) {
          seen.add(normKey);
          unique.push(item);
        }
      }
      setSuggestions(unique.slice(0, 10));
    } else if (isJobsPage) {
      setSuggestions([]); // Jobs autocomplete not yet implemented
    } else {
      api.get(`/public/home-products`)
        .then(res => {
          const list = res.data.products || [];
          const matches = list
            .filter(p => {
              const matchesText = fuzzyMatch(p.name, searchValue) || fuzzyMatch(p.category_name, searchValue);
              const matchesCat = selectedCat === 'all' ||
                String(p.category_name || '').toLowerCase() === selectedCat.toLowerCase() ||
                productMatchesUserCategory(p.category_name, selectedCat);
              return matchesText && matchesCat;
            })
            .map(p => ({ type: 'product', text: p.name }));
            
          const unique = [];
          const seen = new Set();
          for (const item of matches) {
            if (!seen.has(item.text)) {
              seen.add(item.text);
              unique.push(item);
            }
          }
          setSuggestions(unique.slice(0, 8));
        })
        .catch(() => { });
    }
  }, [searchValue, selectedCat, isBusinessesPage, allBusinesses, serviceCategories]);

  const trackSearch = (query) => {
    if (query) {
      api.post('/public/track-search', { query, eventType: 'SEARCH' }).catch(() => { });
    }
  };

  const executeSearch = (query) => {
    trackSearch(query);
    saveToSearchHistory(query);

    let cityVal = searchParams.get('city');
    if (!cityVal) {
      try {
        const saved = localStorage.getItem('selectedLocation');
        if (saved) {
          cityVal = JSON.parse(saved)?.city || '';
        }
      } catch (e) { }
    }

    const cityParam = cityVal ? `&city=${encodeURIComponent(cityVal)}` : '';
    const catParam = selectedCat !== 'all' ? `&category=${encodeURIComponent(selectedCat)}` : '';

    if (!query && !cityVal) {
      if (isJobsPage) navigate('/jobs');
      else if (isBusinessesPage) {
        const citySlug = getActiveCitySlug();
        navigate(citySlug ? `/${citySlug}/businesses` : '/businesses');
      }
      else navigate('/products');
      return;
    }

    if (isJobsPage) {
      const qParam = query ? `q=${encodeURIComponent(query)}` : '';
      const params = [qParam, cityVal ? `city=${encodeURIComponent(cityVal)}` : ''].filter(Boolean).join('&');
      navigate(`/jobs${params ? '?' + params : ''}`);
      return;
    }

    if (isBusinessesPage && query) {
      const activeCitySlug = getActiveCitySlug();
      const extractedCityInQuery = extractCityFromText(query);
      const queryCitySlug = extractedCityInQuery ? extractedCityInQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
      const citySlug = queryCitySlug || (cityVal ? cityVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : (activeCitySlug || ''));

      // 1. Check exact or high-confidence service category match (>= 750 relevance score)
      const matchedService = serviceCategories.find(c => {
        const cName = (c.name || '').toLowerCase().trim();
        const qName = query.toLowerCase().trim();
        return cName === qName || getMatchScore(c.name, query) >= 750;
      });

      if (matchedService) {
        navigate(`/${citySlug ? citySlug + '/' : ''}${matchedService.slug}?kw=${encodeURIComponent(query)}`, { state: { fromBusinessSearch: true, originalQuery: query } });
        return;
      }

      // 2. Check exact or high-confidence keyword match (>= 750 relevance score)
      const matchedKeyword = serviceKeywords.find(k => {
        const kText = (k.keyword || '').toLowerCase().trim();
        const qName = query.toLowerCase().trim();
        return kText === qName || getMatchScore(k.keyword, query) >= 750;
      });

      if (matchedKeyword) {
        navigate(`/${citySlug ? citySlug + '/' : ''}${matchedKeyword.category_slug}?kw=${encodeURIComponent(matchedKeyword.keyword)}`, { state: { fromBusinessSearch: true, originalQuery: query } });
        return;
      }

      // 3. Check exact business name match
      let matchedBusiness = allBusinesses.find(b => {
        const isNameMatch = (b.business_name || '').toLowerCase().trim() === query.toLowerCase().trim();
        if (!isNameMatch) return false;
        if (!activeCitySlug) return true;
        const bCitySlug = (b.city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return bCitySlug === activeCitySlug;
      });

      if (matchedBusiness) {
        const cSlug = (cityVal || matchedBusiness.city || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const catSlug = (matchedBusiness.category || matchedBusiness.vendor_type || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        navigate(`/${cSlug ? cSlug + '/' : ''}shop/${matchedBusiness.slug}/${catSlug}`, { state: { fromBusinessSearch: true, originalQuery: query } });
        return;
      }

      // 4. Default search result navigation
      if (citySlug) {
        navigate(`/${citySlug}/businesses?q=${encodeURIComponent(query)}`, { state: { fromBusinessSearch: true, originalQuery: query } });
      } else {
        navigate(`/businesses?q=${encodeURIComponent(query)}`, { state: { fromBusinessSearch: true, originalQuery: query } });
      }
      return;
    }

    if (isBusinessesPage) {
      const citySlug = getActiveCitySlug();
      if (citySlug) {
        navigate(`/${citySlug}/businesses`);
      } else {
        navigate(`/businesses`);
      }
    } else {
      navigate(`/products?q=${encodeURIComponent(query)}${catParam}`);
    }
  };

  const handleLocationChange = (city) => {
    const citySlug = city ? city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0];
    const isFirstPartCity = firstPart && TAMIL_NADU_CITIES.some(c => c.toLowerCase().replace(/[^a-z0-9]+/g, '-') === firstPart);
    
    if (isFirstPartCity) {
      if (citySlug) {
        pathParts[0] = citySlug;
        navigate(`/${pathParts.join('/')}${location.search}`);
      } else {
        pathParts.shift();
        navigate(`/${pathParts.join('/')}${location.search}`);
      }
    } else {
      if (location.pathname === '/businesses') {
        if (citySlug) {
          navigate(`/${citySlug}/businesses${location.search}`);
        }
      } else {
        const isServiceCategory = serviceCategories.some(c => c.slug === firstPart);
        if (isServiceCategory) {
          if (citySlug) {
            navigate(`/${citySlug}/${firstPart}${location.search}`);
          }
        }
      }
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    const query = searchValue.trim();
    executeSearch(query);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchValue.trim();
    executeSearch(query);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleCategoryToggle = () => {
    if (location.pathname === '/categories') {
      navigate('/');
    } else {
      navigate('/categories');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-background)] pb-16 md:pb-0">
      {/* Top Header */}
      <header className={`bg-white text-gray-800 sticky z-50 md:border-b border-gray-200 shadow-none md:shadow-sm transition-all duration-300 ${isScrollingDown ? '-top-[40px] md:top-0' : 'top-0'}`}>
        <div className="w-full bg-white">
          <div className="max-w-7xl w-full mx-auto px-2 md:px-4 py-1 md:py-3">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              {/* Logo and Menu */}
              <div className="flex items-center gap-2 md:gap-4">
                <Link to="/" className="flex items-center hover:opacity-90 transition-opacity ml-1 md:ml-2">
                  <img src="/ibc-logo.png" alt="IBC Mart" className="h-[36px] md:h-[60px] w-auto object-contain" />
                </Link>
              </div>

              {/* Search Bar - hidden on very small screens, visible on md+ */}
              <div className="hidden md:flex flex-col flex-1 max-w-2xl relative">
                <form onSubmit={handleSearchSubmit} className="flex flex-1 relative items-center gap-3 w-full">
                  <div className="flex flex-1 h-[42px] relative items-center border border-[#cc0000] rounded-[10px] bg-white transition-shadow focus-within:shadow-sm">
                    {isMounted && (isBusinessesPage || isJobsPage) ? (
                      <button
                        type="button"
                        onClick={() => setShowLocationModal(true)}
                        className="flex items-center gap-1.5 px-4 h-full border-r border-gray-200 text-gray-800 hover:bg-gray-50 transition-colors shrink-0 text-sm font-semibold rounded-l-[10px] focus:outline-none"
                      >
                        <MapPin size={16} strokeWidth={2.5} className="text-[#cc0000]" />
                        <span className="max-w-[120px] truncate">{searchParams.get('city') || detectedCity || 'Your Location'}</span>
                        <span className="text-[9px] text-gray-500">▼</span>
                      </button>
                    ) : (
                      <div className="pl-4 pr-2 text-gray-400 flex items-center">
                        <Search size={18} strokeWidth={2} />
                      </div>
                    )}
                    <input
                      type="text"
                      value={searchValue}
                      autoComplete="off"
                      onChange={(e) => {
                        setSearchValue(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder={isMounted ? (isJobsPage ? "Search for jobs..." : isBusinessesPage ? "Search for community businesses..." : "Search for products, brands and more") : "Search for products, brands and more"}
                      className={`flex-1 text-sm text-black bg-transparent focus:outline-none border-none placeholder-gray-500 h-full ${isMounted && (isBusinessesPage || isJobsPage) ? 'pl-4 pr-0' : 'pl-4 pr-0'}`}
                    />

                    {/* Suggestions and Search History Popover Dropdown */}
                    {showSuggestions && ((searchValue.trim().length >= 2 && suggestions.length > 0) || (searchValue.trim().length < 2 && searchHistory.length > 0)) && (
                      <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-200 shadow-lg rounded-lg z-[100] text-black overflow-hidden">
                        {/* Matching Autocomplete Suggestions */}
                        {searchValue.trim().length >= 2 && suggestions.length > 0 && (
                          <div>
                            {suggestions.map((sObj, idx) => {
                              const isObj = typeof sObj === 'object';
                              const text = isObj ? sObj.text : sObj;
                              const type = isObj ? sObj.type : 'product';
                              const location = isObj ? sObj.location : '';
                              const image = isObj ? sObj.image : '';

                              return (
                                <div
                                  key={idx}
                                  onMouseDown={() => {
                                    setSearchValue(text);
                                    setShowSuggestions(false);
                                    if (isBusinessesPage && type === 'business' && sObj.slug) {
                                      const cSlug = (sObj.city || getActiveCitySlug() || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                      const catSlug = (sObj.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                      navigate(`/${cSlug ? cSlug + '/' : ''}shop/${sObj.slug}/${catSlug}`);
                                    } else {
                                      executeSearch(text);
                                    }
                                  }}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {isBusinessesPage && type === 'business' ? (
                                    <>
                                      {image ? (
                                        <img src={getImageUrl(image)} alt={text} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-100" />
                                      ) : (
                                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                          <MapPin size={16} className="text-gray-400" />
                                        </div>
                                      )}
                                      <div className="flex flex-col flex-1 truncate">
                                        <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{text}</span>
                                        <span className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                          <MapPin size={12} className="text-gray-400" />
                                          {location}
                                        </span>
                                      </div>
                                    </>
                                  ) : isBusinessesPage && type === 'category' ? (
                               <>
                                 <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                                   <Search size={16} className="text-gray-400" />
                                 </div>
                                 <div className="flex flex-col flex-1 truncate">
                                   <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{text}</span>
                                   <span className="text-[11px] text-gray-500 mt-0.5 truncate">{sObj.subType || 'Category'}</span>
                                 </div>
                               </>
                                  ) : (
                                    <span className="text-sm font-semibold text-gray-800">🔍 {text}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Search History */}
                        {searchValue.trim().length < 2 && searchHistory.length > 0 && (
                          <div>
                            <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 border-b border-gray-100 flex items-center justify-between">
                              <span>RECENT SEARCHES</span>
                            </div>
                            {searchHistory.map((sh, idx) => {
                              let type = 'product';
                              let image = '';
                              let location = '';

                              if (isBusinessesPage) {
                                const bizMatch = allBusinesses.find(b => b.business_name.toLowerCase() === sh.toLowerCase());
                                const catMatch = serviceCategories.find(c => c.name.toLowerCase() === sh.toLowerCase());
                                
                                if (bizMatch) {
                                  type = 'business';
                                  image = bizMatch.business_logo || bizMatch.profile_photo || bizMatch.image;
                                  location = bizMatch.city || bizMatch.area || bizMatch.address || 'Business';
                                } else if (catMatch) {
                                  type = 'category';
                                }
                              }

                              return (
                                <div
                                  key={idx}
                                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 flex items-center gap-3"
                                >
                                  <div
                                    className="flex-1 flex items-center gap-3 overflow-hidden"
                                    onMouseDown={() => {
                                      setSearchValue(sh);
                                      setShowSuggestions(false);
                                      executeSearch(sh);
                                    }}
                                  >
                                    {isBusinessesPage && type === 'business' ? (
                                      <>
                                        {image ? (
                                          <img src={getImageUrl(image)} alt={sh} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-100" />
                                        ) : (
                                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                            <MapPin size={16} className="text-gray-400" />
                                          </div>
                                        )}
                                        <div className="flex flex-col flex-1 truncate">
                                          <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{sh}</span>
                                          <span className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                            <MapPin size={12} className="text-gray-400" />
                                            {location}
                                          </span>
                                        </div>
                                      </>
                                    ) : isBusinessesPage && type === 'category' ? (
                                      <>
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                                          <Search size={16} className="text-gray-400" />
                                        </div>
                                        <div className="flex flex-col flex-1 truncate">
                                          <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{sh}</span>
                                          <span className="text-[11px] text-gray-500 mt-0.5 truncate">Category</span>
                                        </div>
                                      </>
                                    ) : (
                                      <span className="text-sm font-semibold text-gray-800">🕒 {sh}</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const updated = searchHistory.filter(item => item !== sh);
                                      localStorage.setItem(historyKey, JSON.stringify(updated));
                                      setSearchHistory(updated);
                                    }}
                                    className="text-gray-400 hover:text-red-500 flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0 ml-2"
                                  >
                                    <X size={16} strokeWidth={3} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="w-[1px] h-[24px] bg-gray-200 mx-1"></div>
                    <button type="submit" className="bg-transparent text-[#cc0000] px-5 h-full rounded-r-[10px] flex items-center justify-center hover:bg-red-50 transition-colors">
                      <Search size={22} strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              </div>


              {/* Actions */}
              <div className="flex items-center gap-3 md:gap-5">

                {/* Mobile Cart */}
                <Link to="/cart" className="md:hidden flex items-center gap-1 font-semibold hover:text-red-600 text-gray-800 transition-colors">
                  <div className="relative">
                    <ShoppingCart size={24} />
                    {isMounted && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center shadow-sm">
                        {cartCount}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Mobile Account */}
                <Link to={getAccountLink()} className="md:hidden flex items-center text-gray-800 hover:text-red-600 transition-colors">
                  {isMounted && isAuthenticated && user?.profile_photo ? (
                    <img
                      src={getImageUrl(user.profile_photo)}
                      alt="Profile"
                      className="w-[24px] h-[24px] rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <User size={24} />
                  )}
                </Link>

                {/* Community Businesses Toggle - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 bg-transparent border border-[#cc0000]/20 rounded-full px-3 py-1.5 md:mr-1">
                  <Users size={18} className="text-gray-800" strokeWidth={2} />
                  <span className="text-[10px] md:text-sm font-bold text-gray-800 whitespace-nowrap">Directory</span>
                  <button
                    onClick={() => {
                      const citySlug = getActiveCitySlug();
                      navigate(isBusinessesPage ? '/' : (citySlug ? `/${citySlug}/businesses` : '/businesses'));
                    }}
                    className={`w-8 h-4 md:w-10 md:h-5 rounded-full relative transition-colors duration-300 focus:outline-none ${isMounted && isBusinessesPage ? 'bg-green-500' : 'bg-gray-300'}`}
                    suppressHydrationWarning
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${isMounted && isBusinessesPage ? 'left-[18px] md:left-[22px]' : 'left-0.5'}`}
                      suppressHydrationWarning
                    />
                  </button>
                </div>

                {/* Jobs Toggle - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2 bg-transparent border border-[#cc0000]/20 rounded-full px-3 py-1.5 md:mr-1">
                  <Briefcase size={18} className="text-gray-800" strokeWidth={2} />
                  <span className="text-[10px] md:text-sm font-bold text-gray-800 whitespace-nowrap">Jobs</span>
                  <button
                    onClick={() => navigate(isJobsPage ? '/' : '/jobs')}
                    className={`w-8 h-4 md:w-10 md:h-5 rounded-full relative transition-colors duration-300 focus:outline-none ${isMounted && isJobsPage ? 'bg-green-500' : 'bg-gray-300'}`}
                    suppressHydrationWarning
                  >
                    <div
                      className={`absolute top-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${isMounted && isJobsPage ? 'left-[18px] md:left-[22px]' : 'left-0.5'}`}
                      suppressHydrationWarning
                    />
                  </button>
                </div>

                <div className="hidden md:block h-8 border-r border-gray-200"></div>

                {!isMounted || !isAuthenticated ? (
                  <Link to="/login" className="hidden md:flex flex-col items-center gap-0.5 hover:text-red-600 text-gray-800 transition-colors group">
                    <User size={22} strokeWidth={1.5} className="group-hover:text-red-600 text-gray-800" />
                    <span className="text-xs font-semibold text-gray-800">Account</span>
                  </Link>
                ) : (
                  <>
                    <Link to={user.role === 'ADMIN' ? '/admin' : user.role === 'VENDOR' ? '/vendor' : '/account'} className="hidden md:flex flex-col items-center gap-0.5 hover:text-red-600 text-gray-800 transition-colors group">
                      {user.profile_photo ? (
                        <img
                          src={getImageUrl(user.profile_photo)}
                          alt="Profile Avatar"
                          className="w-[22px] h-[22px] rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <User size={22} strokeWidth={1.5} className="group-hover:text-red-600 text-gray-800" />
                      )}
                      <span className="text-xs font-semibold text-gray-800">Account</span>
                    </Link>

                    <div className="hidden md:block h-8 border-r border-gray-200"></div>

                    <button onClick={handleLogout} className="hidden md:flex flex-col items-center gap-0.5 hover:text-red-600 text-gray-800 transition-colors group">
                      <LogOut size={22} strokeWidth={1.5} className="group-hover:text-red-600 text-gray-800" />
                      <span className="text-xs font-semibold text-gray-800">Logout</span>
                    </button>
                  </>
                )}

                <div className="hidden md:block h-8 border-r border-gray-200"></div>

                <Link to="/wishlist" className="hidden md:flex flex-col items-center gap-0.5 hover:text-red-600 text-gray-800 transition-colors group">
                  <div className="relative">
                    <Heart size={22} strokeWidth={1.5} className="group-hover:text-red-600 text-gray-800" />
                    {isMounted && wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center shadow-sm">
                        {wishlistCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">Wishlist</span>
                </Link>

                <div className="hidden md:block h-8 border-r border-gray-200"></div>

                <Link to="/cart" className="hidden md:flex flex-col items-center gap-0.5 hover:text-red-600 text-gray-800 transition-colors group">
                  <div className="relative">
                    <ShoppingCart size={22} strokeWidth={1.5} className="group-hover:text-red-600 text-gray-800" />
                    {isMounted && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center shadow-sm">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">Cart</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-white md:bg-transparent md:hidden">
          <div className="max-w-7xl w-full mx-auto px-2 py-2">
            {isMounted && (isBusinessesPage || isJobsPage) && (
              <div className="flex items-center gap-1 px-1 pb-1.5 text-sm font-semibold text-gray-800">
                <MapPin size={16} strokeWidth={2.5} className="text-[#cc0000]" />
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="text-gray-900 font-bold hover:underline flex items-center gap-1 text-[13px] bg-transparent border-none p-0 focus:outline-none"
                >
                  {searchParams.get('city') || detectedCity || 'Your Location'}
                  <span className="text-[9px] text-gray-500">▼</span>
                </button>
              </div>
            )}
            {/* Mobile Search Bar */}
            <form onSubmit={handleSearch} className="w-full m-0 relative flex items-center bg-white rounded-[10px] border border-[#cc0000] p-0 shadow-sm">
              <div className="pl-3 pr-2 text-gray-400">
                <Search size={18} strokeWidth={2} />
              </div>
              <input
                id="mobile-search-input"
                type="text"
                value={searchValue}
                autoComplete="off"
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={isMounted ? (isJobsPage ? "Search for jobs..." : isBusinessesPage ? "Search for community businesses..." : "Search for products...") : "Search for products..."}
                className="flex-1 h-[38px] py-1.5 text-gray-700 bg-transparent focus:outline-none border-none text-[14px] placeholder-gray-500 rounded-l-[10px]"
              />
              <div className="w-[1px] h-[24px] bg-gray-200"></div>
              <button
                type="submit"
                className="w-[44px] h-[38px] flex items-center justify-center bg-transparent rounded-r-[10px] text-[#cc0000] hover:bg-red-50 transition-colors"
              >
                <Search size={20} strokeWidth={2.5} />
              </button>

              {/* Mobile Suggestions and Search History Popover Dropdown */}
              {showSuggestions && ((searchValue.trim().length >= 2 && suggestions.length > 0) || (searchValue.trim().length < 2 && searchHistory.length > 0)) && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-200 shadow-lg rounded-none z-[100] text-black overflow-hidden">
                  {/* Matching Autocomplete Suggestions */}
                  {searchValue.trim().length >= 2 && suggestions.length > 0 && (
                    <div>
                      {suggestions.map((sObj, idx) => {
                        const isObj = typeof sObj === 'object';
                        const text = isObj ? sObj.text : sObj;
                        const type = isObj ? sObj.type : 'product';
                        const location = isObj ? sObj.location : '';
                        const image = isObj ? sObj.image : '';

                        return (
                          <div
                            key={idx}
                            onMouseDown={() => {
                              setSearchValue(text);
                              setShowSuggestions(false);
                              if (isBusinessesPage && type === 'business' && sObj.slug) {
                                const cSlug = (sObj.city || getActiveCitySlug() || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                const catSlug = (sObj.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                                navigate(`/${cSlug ? cSlug + '/' : ''}shop/${sObj.slug}/${catSlug}`);
                              } else {
                                executeSearch(text);
                              }
                            }}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 flex items-center gap-3"
                          >
                            {isBusinessesPage && type === 'business' ? (
                              <>
                                {image ? (
                                  <img src={getImageUrl(image)} alt={text} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-100" />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <MapPin size={16} className="text-gray-400" />
                                  </div>
                                )}
                                <div className="flex flex-col flex-1 truncate">
                                  <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{text}</span>
                                  <span className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                    <MapPin size={12} className="text-gray-400" />
                                    {location}
                                  </span>
                                </div>
                              </>
                            ) : isBusinessesPage && type === 'category' ? (
                              <>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                                  <Search size={16} className="text-gray-400" />
                                </div>
                                <div className="flex flex-col flex-1 truncate">
                                  <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{text}</span>
                                  <span className="text-[11px] text-gray-500 mt-0.5 truncate">{sObj.subType || 'Category'}</span>
                                </div>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-800">🔍 {text}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Recent Search History */}
                  {searchValue.trim().length < 2 && searchHistory.length > 0 && (
                    <div>
                      {searchHistory.map((sh, idx) => {
                        let type = 'product';
                        let image = '';
                        let location = '';

                        if (isBusinessesPage) {
                          const bizMatch = allBusinesses.find(b => b.business_name.toLowerCase() === sh.toLowerCase());
                          const catMatch = serviceCategories.find(c => c.name.toLowerCase() === sh.toLowerCase());
                          
                          if (bizMatch) {
                            type = 'business';
                            image = bizMatch.business_logo || bizMatch.profile_photo || bizMatch.image;
                            location = bizMatch.city || bizMatch.area || bizMatch.address || 'Business';
                          } else if (catMatch) {
                            type = 'category';
                          }
                        }

                        return (
                          <div
                            key={idx}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-0 border-gray-100 flex items-center gap-3"
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const updated = searchHistory.filter(item => item !== sh);
                                localStorage.setItem(historyKey, JSON.stringify(updated));
                                setSearchHistory(updated);
                              }}
                              className="text-gray-400 hover:text-red-500 font-extrabold flex items-center justify-center p-0.5 text-[16px] leading-none flex-shrink-0"
                            >
                              ✕
                            </button>
                            <div
                              className="flex-1 flex items-center gap-3 overflow-hidden"
                              onMouseDown={() => {
                                setSearchValue(sh);
                                setShowSuggestions(false);
                                executeSearch(sh);
                              }}
                            >
                              {isBusinessesPage && type === 'business' ? (
                                <>
                                  {image ? (
                                    <img src={getImageUrl(image)} alt={sh} className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-100" />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                                      <MapPin size={16} className="text-gray-400" />
                                    </div>
                                  )}
                                  <div className="flex flex-col flex-1 truncate">
                                    <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{sh}</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                      <MapPin size={12} className="text-gray-400" />
                                      {location}
                                    </span>
                                  </div>
                                </>
                              ) : isBusinessesPage && type === 'category' ? (
                                <>
                                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                                    <Search size={16} className="text-gray-400" />
                                  </div>
                                  <div className="flex flex-col flex-1 truncate">
                                    <span className="text-sm font-semibold text-gray-800 leading-tight truncate">{sh}</span>
                                    <span className="text-[11px] text-gray-500 mt-0.5 truncate">Category</span>
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm font-semibold text-gray-800">🕒 {sh}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {(() => {
        const isSearchOrCategoryPage =
          location.pathname === '/products' ||
          location.pathname.startsWith('/category/') ||
          location.pathname.startsWith('/brand/');
        const isProductPage = location.pathname.startsWith('/product/') || location.pathname.endsWith('/product');

        let mainClass = "flex-1 w-full max-w-7xl mx-auto px-0 md:px-4 pb-2 pt-0 md:py-4 bg-white";
        if (isSearchOrCategoryPage) {
          mainClass = "flex-1 w-full px-0 md:px-8 pb-2 pt-0 md:py-4 bg-white";
        } else if (isProductPage) {
          mainClass = "flex-1 w-full max-w-[1600px] mx-auto px-0 md:px-4 py-2 md:py-4 bg-white";
        }

        return (
          <main className={mainClass}>
            <Outlet context={{ serviceCategories, allBusinesses, searchValue, setSearchValue, executeSearch }} />
          </main>
        );
      })()}

      {/* Mobile Sidebar Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] md:hidden" onClick={closeMenu} />
      )}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white z-[70] transform transition-transform duration-300 md:hidden flex flex-col shadow-xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-[var(--color-primary)] text-white p-6 flex flex-col justify-end h-32">
          {isMounted && isAuthenticated ? (
            <>
              <h3 className="font-bold text-lg">{user?.name || 'User'}</h3>
              <p className="text-sm opacity-90">{user?.email}</p>
            </>
          ) : (
            <h3 className="font-bold text-lg">Welcome to IBCMart</h3>
          )}
        </div>
        <div className="flex flex-col py-2 flex-grow overflow-y-auto text-gray-700 font-medium">
          <Link to="/" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
            <Home size={20} className="text-gray-400" /> Home
          </Link>
          <Link to="/categories" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
            <Grid size={20} className="text-gray-400" /> Categories
          </Link>
          <Link to={getActiveCitySlug() ? `/${getActiveCitySlug()}/businesses` : '/businesses'} onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">B</span> Community Businesses
          </Link>
          <Link to="/jobs" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
            <Briefcase size={20} className="text-gray-400" /> Jobs
          </Link>
          <hr className="my-2" />
          {isMounted && isAuthenticated ? (
            <>
              <Link to={getAccountLink()} onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                <User size={20} className="text-gray-400" /> Account
              </Link>
              <button onClick={() => { handleLogout(); closeMenu(); }} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3 text-left w-full text-red-500">
                <LogOut size={20} className="text-red-400" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                <User size={20} className="text-gray-400" /> Login / Signup
              </Link>
              <Link to="/register?role=VENDOR" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">V</span> Register as Vendor
              </Link>
              <Link to="/register?role=TECHNICAL_SUPPORT" onClick={closeMenu} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">T</span> Register as Technical Support
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white flex justify-between items-center px-6 py-2 z-50 border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`flex flex-col items-center group ${location.pathname === '/' ? 'text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'} transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center relative mb-0.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] transition-all duration-200">
              {/* Outer house outline */}
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={location.pathname === '/' ? '#ef4444' : '#6b7280'} />
              {/* Orange inner door */}
              <path d="M9 22V12h6v10" stroke="#f97316" strokeWidth="2.2" />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </Link>

        <Link to="/categories" className={`flex flex-col items-center group ${location.pathname === '/categories' ? 'text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'} transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center relative mb-0.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] transition-all duration-200">
              {/* Four rounded grid squares */}
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#f97316" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={location.pathname === '/categories' ? '#ef4444' : '#6b7280'} />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={location.pathname === '/categories' ? '#ef4444' : '#6b7280'} />
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#f97316" />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Categories</span>
        </Link>

        <Link to="/jobs" className={`flex flex-col items-center group ${location.pathname === '/jobs' ? 'text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'} transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center relative mb-0.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] transition-all duration-200">
              {/* Lens circle */}
              <circle cx="11" cy="11" r="7" stroke={location.pathname === '/jobs' ? '#ef4444' : '#6b7280'} className="group-hover:stroke-[#ef4444] transition-colors" />
              {/* Orange handle */}
              <line x1="16" y1="16" x2="21" y2="21" stroke="#f97316" strokeWidth="3" />
            </svg>
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Job Search</span>
        </Link>

        <Link to="/wishlist" className={`flex flex-col items-center group ${location.pathname === '/wishlist' ? 'text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'} transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center relative mb-0.5">
            <div className="relative flex items-center justify-center w-6 h-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[26px] h-[26px] transition-all duration-200">
                {/* Heart body */}
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={location.pathname === '/wishlist' ? '#ef4444' : '#6b7280'} />
                {/* Orange top-right accent */}
                <path d="M16 6c1.1 0 2 .9 2 2" stroke="#f97316" strokeWidth="2.2" />
              </svg>
              {isMounted && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#ef4444] text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center shadow-sm z-10">
                  {wishlistCount}
                </span>
              )}
            </div>
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Wishlist</span>
        </Link>

        <Link to={getActiveCitySlug() ? `/${getActiveCitySlug()}/businesses` : '/businesses'} className={`flex flex-col items-center group ${location.pathname === '/businesses' || location.pathname.endsWith('/businesses') ? 'text-[#ef4444]' : 'text-gray-500 hover:text-[#ef4444]'} transition-colors`}>
          <div className="w-6 h-6 flex items-center justify-center relative mb-0.5">
            <img
              src="/info-directory-icon.png"
              alt="Directory"
              className={`absolute w-[46px] h-[46px] translate-y-[2px] max-w-none object-contain transition-all duration-200 ${location.pathname === '/businesses' || location.pathname.endsWith('/businesses') ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
            />
          </div>
          <span className="text-[10px] mt-0.5 font-medium whitespace-nowrap">Directory</span>
        </Link>
      </nav>

      {/* Location Selector Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative max-h-[75vh] flex flex-col text-black">
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="text-[#cc0000]" /> Select Your Location
            </h3>
            <div className="overflow-y-auto pr-1 flex-1 space-y-1">
              <button
                onClick={() => {
                  searchParams.delete('city');
                  setSearchParams(searchParams);
                  setShowLocationModal(false);
                  localStorage.removeItem('selectedLocation');
                  setDetectedCity('');
                  handleLocationChange('');
                  executeSearch(searchValue);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${!searchParams.get('city') ? 'bg-red-50 text-[#cc0000]' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <span>All Tamil Nadu</span>
                {!searchParams.get('city') && <Check size={16} />}
              </button>
              {TAMIL_NADU_CITIES.map(city => (
                <button
                  key={city}
                  onClick={() => {
                    searchParams.set('city', city);
                    setSearchParams(searchParams);
                    setShowLocationModal(false);
                    const loc = { city, state: 'Tamil Nadu', country: 'India', latitude: null, longitude: null };
                    localStorage.setItem('selectedLocation', JSON.stringify(loc));
                    setDetectedCity(city);
                    handleLocationChange(city);
                    executeSearch(searchValue);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between ${searchParams.get('city') === city ? 'bg-red-50 text-[#cc0000]' : 'hover:bg-gray-50 text-gray-700'}`}
                >
                  <span>{city}</span>
                  {searchParams.get('city') === city && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLayout;
