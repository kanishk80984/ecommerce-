import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as rrdPkg from 'react-router-dom';
const { Link, useNavigate, useSearchParams } = rrdPkg;
import { useSelector } from 'react-redux';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Users, Star, Heart, LayoutGrid, ShoppingBag, Smartphone, Monitor as MonitorIcon, Home as HomeIcon, Tv, Puzzle, ShoppingBasket, Car, Dumbbell, Sofa, Book, Bike } from 'lucide-react';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { USER_CATEGORIES, getVendorCategoriesForUser, productMatchesUserCategory } from '../utils/categoryMap';

import {
  SparklesTwoTone,
  ShirtTwoTone,
  MobileTwoTone,
  MonitorTwoTone,
  BeautyTwoTone,
  HomeTwoTone,
  TvTwoTone,
  PuzzleTwoTone,
  BasketTwoTone,
  CarTwoTone,
  DumbbellTwoTone,
  SofaTwoTone,
  BooksTwoTone,
  BikeTwoTone,
  GridTwoTone
} from '../components/TwoToneIcons';

import CategoryNav from '../components/CategoryNav';

import ProductCard from '../components/ProductCard';
import { getImageUrl } from '../utils/imageUrl';

const PROMO_CATEGORIES = [
  { id: 1, name: 'Mobiles & Accessories', offer: 'Up to 40% off', image: '/categories/mobiles.png', gradient: 'bg-[#E0EFE0]', borderColor: '#A8C8A8' },
  { id: 2, name: 'Electronics', offer: 'Up to 60% off', image: '/categories/electronics.png', gradient: 'bg-[#D6E4F5]', borderColor: '#9BBCDF' },
  { id: 3, name: 'Fashion', offer: 'Up to 70% off', image: '/categories/fashion.png', gradient: 'bg-[#F2E5C9]', borderColor: '#D9C08A' },
  { id: 4, name: 'Home & Furniture', offer: 'Up to 50% off', image: '/categories/home.png', gradient: 'bg-[#F5D5CE]', borderColor: '#D9A89E' },
  { id: 5, name: 'Beauty & Personal Care', offer: 'Up to 40% off', image: '/categories/beauty.png', gradient: 'bg-[#F5D5D5]', borderColor: '#D9A0A0' },
  { id: 6, name: 'Grocery', offer: 'Up to 30% off', image: '/categories/grocery.png', gradient: 'bg-[#DCEAD0]', borderColor: '#A8C88A' },
  { id: 7, name: 'Sports & Fitness', offer: 'Up to 50% off', image: '/categories/sports.png', gradient: 'bg-[#E8DAE5]', borderColor: '#C4A8BC' },
  { id: 8, name: 'Books & Stationery', offer: 'Up to 40% off', image: '/categories/books.png', gradient: 'bg-[#D6E0EC]', borderColor: '#9AB0C8' },
];

const ProductCarousel = ({ title, products, reverse = false, isStatic = true, viewAllLink, mobileCards = 2, mobileGrid = false, cardsPerViewDesktop = 6, compactTitleSpace = false }) => {
  if (!products || products.length === 0) return null;

  const mobileWidthClass = mobileCards === 3 ? "w-[calc(33.333vw-11px)]" : "w-[calc(50vw-12px)]";
  const desktopWidthClass = cardsPerViewDesktop === 5 ? "lg:w-[calc((100%-64px)/5)]" : "lg:w-[calc((100%-80px)/6)]";

  const renderCard = (product, key, extraClass = "") => (
    <div key={key} className={`${mobileGrid ? 'w-full' : mobileWidthClass} md:w-[calc((100%-48px)/4)] ${desktopWidthClass} flex-shrink-0 h-full py-2 ${extraClass}`}>
      <ProductCard product={product} isCompact={mobileCards === 3} showOfferNextToRating={true} />
    </div>
  );

  return (
    <div className="bg-transparent shadow-none md:rounded-sm p-0 md:py-4 md:px-0 w-full lg:max-w-7xl md:mx-auto">
      <div className={`flex justify-between items-center mt-3 mb-1 md:mt-0 ${compactTitleSpace ? 'md:mb-1' : 'md:mb-4'} px-2 md:px-0`}>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex-shrink-0">
            <button className="bg-transparent md:bg-white text-red-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full flex items-center justify-center shadow-none md:shadow-sm border border-transparent md:border-gray-100 hover:opacity-90 transition-opacity">
              <ArrowRight size={22} strokeWidth={3} />
            </button>
          </Link>
        )}
      </div>
      <div className="overflow-hidden relative w-full">
        {isStatic ? (
          <div className={mobileGrid
            ? `grid grid-cols-2 ${mobileCards === 3 ? 'gap-[4px]' : 'gap-[8px]'} px-2 pb-2 md:flex md:gap-4 md:overflow-x-auto md:no-scrollbar md:pb-2 md:pt-2 md:px-0`
            : `flex ${mobileCards === 3 ? 'gap-[4px]' : 'gap-[8px]'} md:gap-4 overflow-x-auto no-scrollbar pb-2 pt-2 px-2 md:px-0`}>
            {products.map((product, index) => {
              const hiddenClass = mobileGrid && index >= 4 ? "hidden md:block" : "";
              const cardKey = product.id ?? product.product_id ?? product.slug ?? `prod-${index}`;
              return renderCard(product, cardKey, hiddenClass);
            })}
          </div>
        ) : (
          <div className={`animate-marquee flex ${mobileCards === 3 ? 'gap-[4px]' : 'gap-[8px]'} md:gap-4 py-2`} style={{ animationDirection: reverse ? 'reverse' : 'normal' }}>
            {[...products, ...products, ...products].map((product, index) => renderCard(product, `${product.id || 'prod'}-${index}`))}
          </div>
        )}
      </div>
    </div>
  );
};

const PlaceholderCarousel = ({ title, viewAllLink }) => {
  return (
    <div className="bg-transparent shadow-none md:rounded-sm p-0 md:py-4 md:px-0 w-full lg:max-w-7xl md:mx-auto mt-1 md:mt-2">
      <div className="flex justify-between items-center mb-2 md:mb-4 px-2 md:px-0">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex-shrink-0">
            <button className="bg-transparent md:bg-white text-red-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full flex items-center justify-center shadow-none md:shadow-sm border border-transparent md:border-gray-100 hover:opacity-90 transition-opacity">
              <ArrowRight size={22} strokeWidth={2.5} />
            </button>
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-2 md:px-0">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="min-w-[150px] md:min-w-[200px] h-32 bg-gray-100 animate-pulse rounded-md border border-gray-200"></div>
        ))}
      </div>
    </div>
  );
};

const MobilePromoGrid = ({ title, products, viewAllLink }) => {
  if (!products || products.length === 0) return null;
  const displayProducts = products.slice(0, 4);

  return (
    <div className="w-full bg-[#FFF0F2] p-3 md:hidden my-2">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[17px] font-bold text-gray-800">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex-shrink-0">
            <button className="bg-transparent text-red-600 p-1 rounded-full flex items-center justify-center shadow-none">
              <ChevronRight size={22} strokeWidth={3} />
            </button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 pb-1">
        {displayProducts.map((product) => (
          <Link key={product.id} to={`/${(product.category || product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/product/${product.slug || product.id}`} className="bg-white rounded-md p-2 flex flex-col shadow-sm">
            <div className="w-full h-[140px] bg-white flex items-center justify-center overflow-hidden mb-2">
              <img src={getImageUrl(product.thumbnail || product.image)} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <div className="text-[#0ea5e9] text-[12px] leading-tight truncate">
              {product.category || product.category_name || "Category"}
            </div>
            <div className="text-[#16a34a] font-medium text-[13px] leading-snug truncate mt-0.5">
              {product.name}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const FashionMostLovedGrid = ({ title, products, viewAllLink }) => {
  if (!products || products.length === 0) return null;
  const displayProducts = products.slice(0, 4);

  return (
    <div className="w-full bg-[#f8f9fa] p-3 md:hidden my-2">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex-shrink-0">
            <button className="bg-transparent text-red-600 p-1 rounded-full flex items-center justify-center shadow-none border-0">
              <ChevronRight size={22} strokeWidth={3} />
            </button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 pb-1">
        {displayProducts.map((product) => (
          <Link key={product.id} to={`/${(product.category || product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/product/${product.slug || product.id}`} className="bg-white rounded-none aspect-[4/5] flex items-center justify-center shadow-sm p-2 border border-gray-100">
            <img src={getImageUrl(product.thumbnail || product.image)} alt={product.name} className="w-full h-full object-cover rounded-none" />
          </Link>
        ))}
      </div>
    </div>
  );
};

const TrendingGadgetsGrid = ({ title, viewAllLink }) => {
  // Define standard static trending categories
  const TRENDING_ITEMS = [
    {
      id: 'trending-wireless',
      label: 'True Wireless',
      offer: 'Min. 50% Off',
      image: '/categories/true_wireless.png',
      redirectUrl: '/products?search=wireless'
    },
    {
      id: 'trending-neckband',
      label: 'Neckband',
      offer: 'Min. 50% Off',
      image: '/categories/neckband.png',
      redirectUrl: '/products?search=neckband'
    },
    {
      id: 'trending-watch',
      label: 'Smart Watches',
      offer: 'Min. 40% Off',
      image: '/categories/smartwatch.png',
      redirectUrl: '/products?search=watch'
    },
    {
      id: 'trending-trimmer',
      label: 'Trimmers',
      offer: 'Min. 50% Off',
      image: '/categories/trimmer.png',
      redirectUrl: '/products?search=trimmer'
    }
  ];

  return (
    <div className="w-full lg:max-w-7xl md:mx-auto mt-4 mb-6 px-2 md:px-0">
      <div className="bg-[#a5c2f5] rounded-2xl p-3 md:p-4 shadow-md">
        {/* Header inside the blue background */}
        <div className="flex justify-between items-center mb-3 md:mb-4 px-2">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          {viewAllLink && (
            <Link to={viewAllLink} className="flex-shrink-0">
              <button className="bg-black text-white p-1.5 md:p-2 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <ChevronRight size={18} strokeWidth={3} className="text-white" />
              </button>
            </Link>
          )}
        </div>

        {/* Content wrapper with white background */}
        <div className="bg-white rounded-xl p-3 md:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {TRENDING_ITEMS.map((item) => {
              return (
                <Link key={item.id} to={item.redirectUrl} className="group flex flex-col">
                  {/* Gray box surrounding the product thumbnail */}
                  <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Labels below the box */}
                  <div className="mt-2 px-1">
                    <div className="text-gray-800 text-xs md:text-sm font-medium truncate">
                      {item.label}
                    </div>
                    <div className="text-black text-sm md:text-base font-extrabold mt-0.5">
                      {item.offer}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const PeopleAlsoViewedGrid = ({ title, viewAllLink }) => {
  const VIEWED_ITEMS = [
    {
      id: 'viewed-earbuds',
      label: 'Most Loved',
      offer: 'Top Rated',
      image: '/categories/oneplus_earbuds.png',
      redirectUrl: '/products?search=earbuds'
    },
    {
      id: 'viewed-tanks',
      label: 'Trending',
      offer: 'Top Rated',
      image: '/categories/tank_tops.png',
      redirectUrl: '/products?search=tank'
    },
    {
      id: 'viewed-flashlight',
      label: 'Top Collection',
      offer: 'Top Rated',
      image: '/categories/flashlight.png',
      redirectUrl: '/products?search=flashlight'
    },
    {
      id: 'viewed-shirt',
      label: 'Casual Shirts',
      offer: 'Up to 20% Off',
      image: '/categories/casual_shirt.png',
      redirectUrl: '/products?search=shirt'
    }
  ];

  return (
    <div className="w-full lg:max-w-7xl md:mx-auto mt-4 mb-6 px-2 md:px-0">
      <div className="bg-[#f2a66b] rounded-2xl p-3 md:p-4 shadow-md relative overflow-hidden">
        {/* Floating circles on header banner right side */}
        <div className="absolute right-[-10px] top-[-10px] w-20 h-20 rounded-full bg-white/10 blur-md pointer-events-none" />
        <div className="absolute right-[40px] top-[15px] w-12 h-12 rounded-full bg-[#ffe0cc]/25 blur-sm pointer-events-none" />

        {/* Header inside the orange background */}
        <div className="flex justify-between items-center mb-3 md:mb-4 px-2 relative z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
          {viewAllLink && (
            <Link to={viewAllLink} className="flex-shrink-0">
              <button className="bg-black text-white p-1.5 md:p-2 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity">
                <ChevronRight size={18} strokeWidth={3} className="text-white" />
              </button>
            </Link>
          )}
        </div>

        {/* Content wrapper with white background */}
        <div className="bg-white rounded-xl p-3 md:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {VIEWED_ITEMS.map((item) => {
              return (
                <Link key={item.id} to={item.redirectUrl} className="group flex flex-col">
                  {/* Gray box surrounding the product thumbnail */}
                  <div className="w-full aspect-square bg-[#f5f5f5] rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
                    <img
                      src={item.image}
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Labels below the box */}
                  <div className="mt-2 px-1">
                    <div className="text-gray-800 text-xs md:text-sm font-medium truncate">
                      {item.label}
                    </div>
                    <div className="text-black text-sm md:text-base font-extrabold mt-0.5">
                      {item.offer}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const BusinessCarousel = ({ title, businesses, viewAllLink }) => {
  if (!businesses || businesses.length === 0) return null;

  return (
    <div className="w-full lg:max-w-7xl md:mx-auto p-0 mt-1 md:mt-2">
      <div className="flex justify-between items-center mb-2 md:mb-4 px-2 md:px-0">
        <h2 className="text-[17px] md:text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-gray-700" />
          {title}
        </h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex-shrink-0">
            <button className="bg-transparent md:bg-white text-red-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full flex items-center justify-center shadow-none md:shadow-sm border border-transparent md:border-gray-100 hover:opacity-90 transition-opacity">
              <ArrowRight size={22} strokeWidth={2.5} />
            </button>
          </Link>
        )}
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2 px-2 md:px-0">
        {businesses.map((business, index) => {
          const shopSlug = business.slug || business.public_id || business.id || business.user_id || `biz-${index}`;
          const businessKey = business.id ?? business.business_id ?? business.slug ?? business.public_id ?? business.user_id ?? `biz-${index}`;

          // Generate consistent mock data for UI completeness if not present
          const nameStr = business.business_name || 'Business';
          const seed = nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + (typeof business.id === 'number' ? business.id : 1);
          const rating = business.rating || (4.1 + (seed % 9) / 10).toFixed(1);
          const reviews = business.reviews || (seed * 17 % 500) + 50;
          const followers = business.followers || ((seed * 7 % 50) / 10 + 1).toFixed(1) + 'k';

          return (
            <Link
              key={businessKey}
              to={`/${(business.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/shop/${shopSlug}/${(business.category || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              className="w-[145px] md:w-[170px] flex-shrink-0 bg-white rounded-[18px] border border-[#F1F5F9] shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-[6px] transition-all duration-300 ease-out p-3 flex flex-col text-left"
            >
              <div className="w-[60px] h-[60px] md:w-[72px] md:h-[72px] mx-auto rounded-full overflow-hidden border border-gray-100 mb-3 flex-shrink-0">
                <img
                  src={business.business_logo ? getImageUrl(business.business_logo) : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect><circle cx='8.5' cy='8.5' r='1.5'></circle><polyline points='21 15 16 10 5 21'></polyline></svg>"}
                  alt={business.business_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="flex flex-col flex-grow">
                <h3 className="text-sm md:text-[15px] font-bold text-gray-900 truncate flex items-center gap-1 mb-0.5">
                  <span className="truncate">{business.business_name}</span>
                  <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </h3>

                <p className="text-[11px] md:text-xs text-gray-500 truncate mb-1">
                  {business.category || business.vendor_type || 'Retail'}
                </p>

                <div className="flex items-center gap-1 mb-1">
                  <Star size={12} className="fill-orange-400 text-orange-400" />
                  <span className="text-[11px] md:text-xs font-bold text-orange-500">{rating}</span>
                  <span className="text-[11px] md:text-xs text-gray-400">({reviews})</span>
                </div>

                <p className="text-[11px] md:text-xs text-gray-500 mb-3">
                  {followers} Followers
                </p>
              </div>

              <div className="mt-auto w-full pt-1">
                <div className="w-full py-1.5 md:py-2 border border-[#cc0000] rounded-full text-center text-[#cc0000] text-xs font-bold hover:bg-red-50 transition-colors">
                  Visit Shop
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Global cache to keep Home Page state alive across unmounts
let homePageCache = null;
let homePageSeed = null;

const Home = () => {
  if (!homePageSeed) {
    homePageSeed = Math.floor(Math.random() * 1000000);
  }
  const user = useSelector((state) => state.auth.user);
  const cartItems = useSelector((state) => state.cart?.items) || [];
  const wishlistItems = useSelector((state) => state.wishlist?.items) || [];
  const [products, setProducts] = useState(homePageCache?.products || []);
  const [ads, setAds] = useState(homePageCache?.ads || []);
  const [categories, setCategories] = useState(homePageCache?.categories || []);
  const [loading, setLoading] = useState(homePageCache ? false : true);
  const [categoriesLoading, setCategoriesLoading] = useState(homePageCache ? false : true);
  const [heroIndex, setHeroIndex] = useState(1); // Start at 1 due to prepended clone
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const largeGridsRef = useRef(null);
  const [isLargeGridHovered, setIsLargeGridHovered] = useState(false);
  const [businesses, setBusinesses] = useState(homePageCache?.businesses || []);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  // Infinite Scroll States
  const [infiniteProducts, setInfiniteProducts] = useState(homePageCache?.infiniteProducts || []);
  const [infinitePage, setInfinitePage] = useState(homePageCache?.infinitePage || 1);
  const [infiniteLoading, setInfiniteLoading] = useState(false);
  const [hasMore, setHasMore] = useState(homePageCache ? homePageCache.hasMore : true);

  // Track scroll position on Home page and save to cache
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 10) {
        if (!homePageCache) homePageCache = {};
        homePageCache.scrollPos = scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position synchronously before paint to prevent any visual jumps
  React.useLayoutEffect(() => {
    if (!loading && homePageCache?.scrollPos) {
      window.scrollTo({
        top: homePageCache.scrollPos,
        behavior: 'instant'
      });
    }
  }, [loading]);

  useEffect(() => {
    if (homePageCache) return;

    const fetchHomeData = async () => {
      try {
        const [productsRes, adsRes, businessesRes] = await Promise.all([
          api.get('/public/home-products'),
          api.get('/public/advertisements'),
          api.get('/public/businesses')
        ]);
        const fetchedProducts = productsRes.data.products || [];
        const fetchedAds = adsRes.data.advertisements || [];
        const fetchedBusinesses = businessesRes.data.businesses || [];

        setProducts(fetchedProducts);
        setAds(fetchedAds);
        setBusinesses(fetchedBusinesses);

        homePageCache = {
          ...homePageCache,
          products: fetchedProducts,
          ads: fetchedAds,
          businesses: fetchedBusinesses
        };
      } catch (error) {
        console.error('Failed to fetch home data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  useEffect(() => {
    if (loading || !hasMore) return;

    // Skip fetching if page 1 products are already loaded in cache
    if (homePageCache?.infiniteProducts && homePageCache.infiniteProducts.length > 0 && infinitePage === 1) {
      return;
    }

    let isMounted = true;
    const fetchItems = async () => {
      setInfiniteLoading(true);
      try {
        const limit = 15;
        const offset = (infinitePage - 1) * limit;
        const res = await api.get(`/public/all-products?limit=${limit}&offset=${offset}&seed=${homePageSeed}`);
        if (!isMounted) return;

        const newProducts = res.data.products || [];
        let newHasMore = true;
        if (newProducts.length < limit) {
          newHasMore = false;
          setHasMore(false);
        }

        setInfiniteProducts(prev => {
          const combined = [...prev, ...newProducts];
          const unique = [];
          const seenIds = new Set();
          for (const p of combined) {
            if (!seenIds.has(p.id)) {
              seenIds.add(p.id);
              unique.push(p);
            }
          }

          homePageCache = {
            ...homePageCache,
            infiniteProducts: unique,
            infinitePage: infinitePage,
            hasMore: newHasMore
          };

          return unique;
        });
      } catch (error) {
        console.error('Failed to load more products', error);
      } finally {
        if (isMounted) {
          setInfiniteLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [infinitePage, loading, hasMore]);

  useEffect(() => {
    if (loading) return;
    const handleScroll = () => {
      if (infiniteLoading || !hasMore) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 250) {
        setInfinitePage(prev => prev + 1);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [infiniteLoading, hasMore, loading]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let cached = sessionStorage.getItem('ibc_categories');
        let data = [];
        if (cached) {
          data = JSON.parse(cached);
          setCategories(data);
          setCategoriesLoading(false);
        } else {
          const res = await api.get('/public/categories');
          data = res.data.categories || [];
          setCategories(data);
          sessionStorage.setItem('ibc_categories', JSON.stringify(data));
          setCategoriesLoading(false);
        }

        homePageCache = {
          ...homePageCache,
          categories: data
        };
      } catch (error) {
        console.error('Failed to fetch categories', error);
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);


  const heroAds = ads.filter(ad => ad.position === 'HERO_SLIDER');
  const couponAds = ads.filter(ad => ad.position === 'COUPON');
  const largeGrids = ads.filter(ad => ad.position === 'GRID_LARGE');
  const horizontalGrids = ads.filter(ad => ad.position === 'GRID_HORIZONTAL');
  const betweenSections = ads.filter(ad => ad.position === 'BETWEEN_SECTIONS');

  useEffect(() => {
    if (heroAds.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      if (document.hidden) return; // Prevent runaway increments in background tab
      setIsTransitioning(true);
      setHeroIndex((prev) => {
        if (prev >= heroAds.length + 1) return 1; // Fallback if transitionend fails
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [heroAds.length, isHovered]);

  useEffect(() => {
    if (!largeGridsRef.current || largeGrids.length <= 1 || isLargeGridHovered) return;
    const interval = setInterval(() => {
      const container = largeGridsRef.current;
      if (container) {
        // If scroll reaches the cloned items (Item 3)
        if (container.scrollLeft > container.clientWidth * 1.4) {
          container.style.scrollSnapType = 'none';
          container.scrollTo({ left: 0, behavior: 'auto' }); // instantly jump to real first item

          // Force reflow
          void container.offsetWidth;
          container.style.scrollSnapType = '';

          setTimeout(() => {
            if (container) container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
          }, 50);
        } else {
          container.scrollBy({ left: container.clientWidth * 0.8, behavior: 'smooth' });
        }
      }
    }, 4500); // 4.5 seconds interval
    return () => clearInterval(interval);
  }, [largeGrids.length, isLargeGridHovered]);

  const handleSwipe = (direction) => {
    if (heroAds.length <= 1) return;
    setIsTransitioning(true);
    if (direction === 'left') {
      setHeroIndex((prev) => prev + 1);
    } else {
      setHeroIndex((prev) => prev - 1);
    }
  };

  const handleTransitionEnd = () => {
    if (heroAds.length <= 1) return;
    if (heroIndex >= heroAds.length + 1) {
      setIsTransitioning(false);
      setHeroIndex(1);
    } else if (heroIndex <= 0) {
      setIsTransitioning(false);
      setHeroIndex(heroAds.length);
    }
  };

  let touchStartX = 0;
  let touchEndX = 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] pb-10">
        {/* Mock Category Nav Skeleton */}
        <div className="w-full bg-white shadow-sm h-12 mb-4 animate-pulse flex items-center gap-4 px-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-6 w-20 bg-gray-100 rounded-sm flex-shrink-0" />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 space-y-6">
          {/* Mock Hero Slider Skeleton */}
          <div className="w-full h-[210px] md:h-[440px] bg-gray-100 rounded-lg animate-pulse" />

          {/* Mock Section Title */}
          <div className="h-6 w-48 bg-gray-200 rounded-sm animate-pulse" />

          {/* Skeleton Product Grid (5 columns on desktop, 2 on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="border border-gray-100 rounded-md p-3 md:p-4 flex flex-col bg-white space-y-3 animate-pulse h-full">
                <div className="aspect-square bg-gray-100 rounded-lg" />
                <div className="h-4 w-3/4 bg-gray-100 rounded-sm" />
                <div className="h-3 w-1/2 bg-gray-100 rounded-sm" />
                <div className="mt-auto pt-2 flex flex-col space-y-2">
                  <div className="h-5 w-20 bg-gray-100 rounded-sm" />
                  <div className="h-3 w-12 bg-gray-100 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--color-background)] min-h-screen pb-10">
      <CategoryNav categories={categories} loading={categoriesLoading} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

      {selectedCategory && (
        <div className="bg-blue-50 border border-blue-200 p-3 mx-2 md:mx-4 mt-4 rounded-md flex justify-between items-center">
          <span className="text-sm font-semibold text-blue-800">
            Filtering by Category: <span className="underline">{selectedCategory}</span> (Min 30% Off)
          </span>
          <button
            onClick={() => setSelectedCategory(null)}
            className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 font-bold"
          >
            Clear Filter
          </button>
        </div>
      )}

      <div className="flex flex-col mt-1 md:mt-4 md:px-4" id="section-For You">
        {heroAds.length > 0 && (
          <div
            className="w-[calc(100%-16px)] mx-2 md:w-[95%] lg:w-full lg:max-w-7xl md:mx-auto relative overflow-hidden rounded-xl md:rounded-2xl bg-white shadow-sm group mb-0 md:mb-[8px]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div
              className={`flex ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
              style={{ transform: `translateX(-${heroIndex * 100}%)` }}
              onTransitionEnd={handleTransitionEnd}
              onTouchStart={(e) => {
                touchStartX = e.changedTouches[0].screenX;
              }}
              onTouchEnd={(e) => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchStartX - touchEndX > 50) handleSwipe('left');
                if (touchEndX - touchStartX > 50) handleSwipe('right');
              }}
            >
              {/* Slides: Clone Last, Originals, Clone First */}
              {[heroAds[heroAds.length - 1], ...heroAds, heroAds[0]].map((ad, idx) => (
                <div key={ad.id + '-' + idx} className="w-full flex-shrink-0 cursor-pointer" style={{ flex: '0 0 100%' }}>
                  <a href={ad.redirect_url || '#'} target={ad.redirect_url ? "_blank" : "_self"} rel="noreferrer" className="w-full block bg-white md:bg-transparent overflow-hidden">
                    <picture>
                      {ad.mobile_image && <source media="(max-width: 768px)" srcSet={getImageUrl(ad.mobile_image)} />}
                      <img
                        src={getImageUrl(ad.image)}
                        alt={ad.title}
                        className="w-full h-[180px] md:h-[420px] block object-cover object-center bg-white md:bg-transparent"
                        loading={idx <= 1 ? "eager" : "lazy"}
                      />
                    </picture>
                  </a>
                </div>
              ))}
            </div>

            {heroAds.length > 1 && (
              <>
                <button
                  onClick={() => handleSwipe('right')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-r-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={24} className="text-gray-800" />
                </button>
                <button
                  onClick={() => handleSwipe('left')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-l-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={24} className="text-gray-800" />
                </button>

                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {heroAds.map((_, index) => {
                    // map visual dot index (0 to length-1) to actual heroIndex for styling
                    const activeIndex = (heroIndex - 1 + heroAds.length) % heroAds.length;
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setIsTransitioning(true);
                          setHeroIndex(index + 1);
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${index === activeIndex ? 'bg-[#cc0000]' : 'bg-gray-300'
                          }`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="w-full md:w-[95%] lg:w-full lg:max-w-7xl md:mx-auto bg-transparent md:bg-white">
          <div className="flex md:grid overflow-x-auto no-scrollbar md:grid-cols-4 lg:grid-cols-8 gap-[7px] md:gap-4 pt-[10px] pb-[8px] md:pt-[12px] md:pb-[30px] snap-x snap-mandatory px-3 md:px-0 scroll-px-2">
            {PROMO_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  // Map promo category display names to user-facing category names
                  const promoCategoryMapping = {
                    'Mobiles & Accessories': 'Mobiles',
                    'Electronics': 'Electronics',
                    'Fashion': 'Fashion',
                    'Beauty & Personal Care': 'Beauty',
                    'Home & Furniture': 'Home',
                    'Grocery': 'Grocery',
                    'Sports & Fitness': 'Sports',
                    'Books & Stationery': 'Books'
                  };
                  const mappedName = promoCategoryMapping[cat.name] || cat.name;
                  setSelectedCategory(mappedName);
                  navigate(`/products?category=${encodeURIComponent(mappedName)}&filter=offers`);
                }}
                style={{ borderColor: cat.borderColor }}
                className={`group rounded-[14px] md:rounded-[18px] pt-[8px] md:pt-[10px] px-[6px] md:px-[14px] pb-[8px] md:pb-[10px] h-[115px] md:h-[145px] lg:h-[150px] w-[82px] md:w-full flex-shrink-0 snap-start cursor-pointer flex flex-col justify-between text-center ${cat.gradient} border shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[5px] hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition-all duration-300 ease-in-out relative overflow-hidden`}
              >
                {/* White overlay to fade background for consistent pastel colors on all devices. Expanded by 1px to fix sub-pixel rendering seam. */}
                <div className="absolute -inset-[1px] bg-white/30 pointer-events-none"></div>

                <div className="relative w-full h-[50px] md:h-[70px] lg:h-[70px] flex items-center justify-center mb-[2px] md:mb-[5px]">
                  <img
                    src={cat.image}
                    onError={(e) => { e.target.onerror = null; e.target.src = '/categories/top_offers.png'; }}
                    alt={cat.name}
                    className="object-contain w-full h-full scale-110 group-hover:scale-125 transition-transform duration-300 ease-in-out mix-blend-darken"
                    loading="lazy"
                  />
                </div>
                <div className="relative w-full flex flex-col flex-1 min-w-0 items-center">
                  <div className="h-[32px] md:h-[36px] flex items-center justify-center w-full">
                    <h3 className="text-[11px] md:text-[13px] lg:text-[13px] font-[700] text-[#222] leading-[1.15] md:leading-[16px] line-clamp-2 break-words text-center">{cat.name}</h3>
                  </div>
                  <p className="text-[8.5px] md:text-[10px] lg:text-[11px] font-[700] text-[#cc0000] mt-auto mb-[4px] md:mb-0 truncate text-center w-full">{cat.offer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>






        {(() => {
          const flattenVariants = (productsList) => {
            const list = [];
            productsList.forEach(product => {
              if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                  list.push({
                    id: variant.id,
                    slug: `${product.slug || product.id}?variant=${variant.seo_slug || variant.id}`,
                    name: `${product.name} (${variant.name})`,
                    thumbnail: variant.thumbnail || product.thumbnail,
                    price: variant.price,
                    mrp: variant.mrp,
                    stock: variant.stock,
                    average_rating: product.average_rating,
                    review_count: product.review_count,
                    category_id: product.category_id,
                    category_name: product.category_name,
                    vendor_id: product.vendor_id,
                    vendor_name: product.vendor_name,
                  });
                });
              } else {
                list.push({
                  id: product.id,
                  slug: product.id,
                  name: product.name,
                  thumbnail: product.thumbnail,
                  price: product.price,
                  mrp: product.mrp,
                  stock: product.stock,
                  average_rating: product.average_rating,
                  review_count: product.review_count,
                  category_id: product.category_id,
                  category_name: product.category_name,
                  vendor_id: product.vendor_id,
                  vendor_name: product.vendor_name,
                });
              }
            });
            return list;
          };

          const filterProducts = (list) => {
            let filtered = list;

            if (searchQuery) {
              filtered = filtered.filter(p =>
                fuzzyMatch(p.name, searchQuery) ||
                fuzzyMatch(p.category_name, searchQuery) ||
                fuzzyMatch(p.vendor_name, searchQuery)
              );
            }

            if (!selectedCategory) return filtered;

            return filtered.filter(p => {
              // Use category map to match any vendor category that belongs to this user category
              const matchesCategory = productMatchesUserCategory(p.category_name, selectedCategory);
              const currentPrice = Number(p.price);
              const originalPrice = Number(p.mrp);
              const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;

              const requiredDiscount = selectedCategory.toLowerCase() === 'top offers' ? 50 : 30;
              return matchesCategory && discount >= requiredDiscount;
            });
          };

          const getRecommendedProducts = () => {
            // Return cached recommendation list if already generated to ensure stability
            if (homePageCache?.recommendedProducts) {
              return homePageCache.recommendedProducts;
            }

            const allFlattened = flattenVariants(filterProducts(products));
            if (allFlattened.length === 0) return [];

            const recommended = [];
            const addedIds = new Set();

            const tryAdd = (item) => {
              if (!item) return;
              if (!addedIds.has(item.id)) {
                addedIds.add(item.id);
                recommended.push(item);
              }
            };

            // Priority 1: Cart Items
            cartItems.forEach(cartItem => {
              const match = allFlattened.find(v =>
                String(v.id) === String(cartItem.variant_id || cartItem.id) ||
                String(v.product_id) === String(cartItem.product_id || cartItem.id)
              );
              if (match) tryAdd(match);
            });

            // Priority 2: Wishlist Items
            wishlistItems.forEach(wishItem => {
              const match = allFlattened.find(v =>
                String(v.id) === String(wishItem.id) ||
                String(v.product_id) === String(wishItem.id)
              );
              if (match) tryAdd(match);
            });

            // Priority 3: Random/remaining products (Fisher-Yates shuffled)
            const remaining = allFlattened.filter(v => !addedIds.has(v.id));
            for (let i = remaining.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
            }

            remaining.forEach(item => tryAdd(item));

            // Save generated recommendation order in cache until page refresh
            if (homePageCache) {
              homePageCache.recommendedProducts = recommended;
            }

            return recommended;
          };

          return (
            <>
              <ProductCarousel title="Trending Now" products={flattenVariants(filterProducts(products.slice(0, 10).reverse()))} reverse={true} isStatic={true} viewAllLink="/products?filter=top_rated" mobileCards={3} compactTitleSpace={true} />

              {couponAds.length > 0 && (
                <div className="w-[96%] mx-auto md:w-[95%] lg:w-full lg:max-w-7xl mt-2 mb-2 md:mt-[12px] md:mb-6">
                  <a href={couponAds[0].redirect_url || '#'} target="_blank" rel="noreferrer" className="block w-full">
                    <picture>
                      {couponAds[0].mobile_image && <source media="(max-width: 768px)" srcSet={getImageUrl(couponAds[0].mobile_image)} />}
                      <img src={getImageUrl(couponAds[0].image)} alt="Coupon" className="w-full rounded-xl md:rounded-2xl shadow-sm object-cover h-[90px] md:h-[128px]" loading="lazy" />
                    </picture>
                  </a>
                </div>
              )}

              {businesses.length > 0 ? (
                <BusinessCarousel title="Top Community Businesses" businesses={businesses} viewAllLink="/businesses" />
              ) : (
                <PlaceholderCarousel title="Top Community Businesses" viewAllLink="/businesses" />
              )}

              <div className="w-full flex flex-col gap-2 md:gap-4 mt-4 mb-4 md:mt-0 md:mb-6">
                {(largeGrids.length > 0 || horizontalGrids.length > 0) && (
                  <div className="flex flex-col gap-2 md:gap-2 w-full lg:max-w-7xl md:mx-auto overflow-hidden">
                    {largeGrids.length > 0 && (
                      <div
                        className="flex overflow-x-auto no-scrollbar gap-3 md:gap-6 snap-x snap-mandatory px-4 md:px-[6%] transition-all duration-700 ease-in-out"
                        ref={largeGridsRef}
                        onMouseEnter={() => setIsLargeGridHovered(true)}
                        onMouseLeave={() => setIsLargeGridHovered(false)}
                      >
                        {[...largeGrids.slice(0, 2), ...largeGrids.slice(0, 2)].map((ad, idx) => (
                          <a key={`${ad.id}-${idx}`} href={ad.redirect_url || '#'} className="block w-[88%] md:w-[85%] flex-shrink-0 snap-center h-40 md:h-[280px] lg:h-[320px] rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <picture>
                              {ad.mobile_image && <source media="(max-width: 768px)" srcSet={getImageUrl(ad.mobile_image)} />}
                              <img src={getImageUrl(ad.image)} className="w-full h-full object-cover" loading="lazy" />
                            </picture>
                          </a>
                        ))}
                      </div>
                    )}
                    {horizontalGrids.length > 0 && (
                      <div className="px-2 md:px-0">
                        {horizontalGrids.slice(0, 1).map(ad => (
                          <a key={ad.id} href={ad.redirect_url || '#'} className="block w-full h-24 md:h-40 rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <picture>
                              {ad.mobile_image && <source media="(max-width: 768px)" srcSet={getImageUrl(ad.mobile_image)} />}
                              <img src={getImageUrl(ad.image)} className="w-full h-full object-cover" loading="lazy" />
                            </picture>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <TrendingGadgetsGrid
                title="Trending Gadgets & Appliances"
                products={flattenVariants(filterProducts(products))}
                viewAllLink="/products"
              />

              <div className="block md:hidden">
                <FashionMostLovedGrid
                  title="Customers' Most-Loved Fashion for you"
                  products={(() => {
                    const fashion = flattenVariants(filterProducts(products)).filter(p => {
                      const cat = (typeof p.category === 'string' ? p.category : typeof p.category?.name === 'string' ? p.category.name : p.category_name || '').toLowerCase();
                      const name = (p.name || '').toLowerCase();
                      return cat.includes('fashion') || cat.includes('clothing') || cat.includes('apparel') || name.includes('shirt') || name.includes('t-shirt') || name.includes('polo') || name.includes('jeans') || name.includes('top') || name.includes('pant') || name.includes('suit') || name.includes('wear');
                    });
                    return fashion.length >= 4 ? fashion : flattenVariants(filterProducts(products));
                  })()}
                  viewAllLink="/products"
                />
              </div>

              <PeopleAlsoViewedGrid
                title="People also viewed"
                viewAllLink="/products"
              />

              <ProductCarousel title="Recommended for You" products={getRecommendedProducts()} viewAllLink="/products" compactTitleSpace={true} />

              <div className="block md:hidden">
                <MobilePromoGrid title="Recently Added" products={flattenVariants(filterProducts(products))} viewAllLink="/products" />
              </div>
              <div className="hidden md:block">
                <ProductCarousel title="Recently Added" products={flattenVariants(filterProducts(products))} viewAllLink="/products" cardsPerViewDesktop={5} compactTitleSpace={true} />
              </div>

              {/* Infinite scroll products */}
              <div className="mt-1 md:mt-2 mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 md:mb-4 px-2 md:px-0">Discover More</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-x-2 gap-y-[20px] md:gap-[20px] px-2 md:px-0">
                  {flattenVariants(infiniteProducts).map((product, index) => (
                    <ProductCard key={product.id ?? product.product_id ?? product.slug ?? `inf-${index}`} product={product} showOfferNextToRating={true} isTall={true} />
                  ))}
                </div>

                {infiniteLoading && (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                )}

                {!hasMore && infiniteProducts.length > 0 && (
                  <div className="text-center text-gray-500 py-8">
                    You have seen all products.
                  </div>
                )}
              </div>
            </>
          );
        })()}

      </div>
    </div>
  );
};

export default Home;
