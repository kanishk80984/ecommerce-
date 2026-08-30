import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, ShoppingBag, Smartphone, Monitor as MonitorIcon, Home as HomeIcon, Tv, Puzzle, ShoppingBasket, Car, Dumbbell, Sofa, Book, Bike } from 'lucide-react';
import { USER_CATEGORIES } from '../utils/categoryMap';
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
} from './TwoToneIcons';

export const CategoryNav = ({ categories = [], loading = false, selectedCategory, setSelectedCategory, hideIcons = false, disableSticky = false, fullWidthBreakout = false, hideMobileCategories = false }) => {
  const navigate = useNavigate();
  const [isStickyState, setIsStickyState] = useState(false);
  const isSticky = disableSticky ? false : isStickyState;
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileOpenId, setMobileOpenId] = useState(null);

  useEffect(() => {
    if (disableSticky) return;
    const handleScroll = () => {
      const scrollY = window.pageYOffset;
      setIsStickyState(prev => {
        if (scrollY > 120) return true;
        if (scrollY < 60) return false;
        return prev;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [disableSticky]);


  if (loading) {
    return (
      <div className="bg-white sticky top-[60px] md:top-[68px] z-40 border-t border-b border-gray-200/80 w-full overflow-hidden py-3">
        <div className="max-w-7xl mx-auto flex gap-8 px-4 justify-start overflow-x-auto no-scrollbar">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex flex-col items-center gap-2 min-w-[75px] animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="w-12 h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const iconMap = {
    'For You': SparklesTwoTone,
    'Fashion': ShirtTwoTone,
    'Mobiles': MobileTwoTone,
    'Mobile/Tablet': MobileTwoTone,
    'Electronics': MonitorTwoTone,
    'Beauty': BeautyTwoTone,
    'Home': HomeTwoTone,
    'Home & Furniture': HomeTwoTone,
    'Appliances': TvTwoTone,
    'Toys': PuzzleTwoTone,
    'Toys & Baby': PuzzleTwoTone,
    'Grocery': BasketTwoTone,
    'Auto': CarTwoTone,
    'Auto Accessories': CarTwoTone,
    'Sports': DumbbellTwoTone,
    'Sports & Fitness': DumbbellTwoTone,
    'Furniture': SofaTwoTone,
    'Books': BooksTwoTone,
    '2 Wheelers': BikeTwoTone,
    'Two Wheelers': BikeTwoTone,
    'Cycling': BikeTwoTone
  };

  const TOP_BAR_CATEGORIES = [
    { id: 'cat0', name: 'For You', dbName: 'For You', vendorCategories: [] },
    ...USER_CATEGORIES.map((uc, idx) => ({
      id: `cat${idx + 1}`,
      name: uc.name,
      dbName: uc.vendorCategories[0] || uc.name,
      vendorCategories: uc.vendorCategories,
    }))
  ];

  const lucideIconMap = {
    'For You': Sparkles,
    'Fashion': ShoppingBag,
    'Mobiles': Smartphone,
    'Mobile/Tablet': Smartphone,
    'Electronics': MonitorIcon,
    'Beauty': Sparkles,
    'Home': HomeIcon,
    'Home & Furniture': HomeIcon,
    'Appliances': Tv,
    'Toys': Puzzle,
    'Toys & Baby': Puzzle,
    'Grocery': ShoppingBasket,
    'Auto': Car,
    'Auto Accessories': Car,
    'Sports': Dumbbell,
    'Sports & Fitness': Dumbbell,
    'Furniture': Sofa,
    'Books': Book,
    '2 Wheelers': Bike,
    'Two Wheelers': Bike,
    'Cycling': Bike
  };

  return (
    <>
      <style>{`
        .sticky-category-nav { 
          top: 90px; 
          transition: top 0.3s ease-in-out, background-color 0.3s;
        }
        body.is-scrolling-down .sticky-category-nav {
          top: 50px;
        }
        @media (min-width: 768px) { 
          .sticky-category-nav { top: 85px; } 
          body.is-scrolling-down .sticky-category-nav { top: 85px; }
        }
      `}</style>
      <div className={`sticky sticky-category-nav z-40 overflow-hidden transition-all duration-300 ${disableSticky || isSticky ? 'bg-white border-y border-gray-200 h-[38px] md:h-[40px]' : 'bg-white h-[76px] md:h-[52px]'} ${fullWidthBreakout ? 'w-[100vw] ml-[calc(50%-50vw)] md:-mt-4' : 'w-full'}`}>
        <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar h-full">
          <div className="flex items-center justify-start md:justify-between h-full relative md:border-b md:border-gray-200/60 px-2 md:px-2 gap-0">
            {!hideMobileCategories && (
              <div
                className={`md:hidden flex flex-col items-center justify-center cursor-pointer group relative shrink-0 pr-1 md:px-3 w-auto h-full`}
                onClick={(e) => { e.preventDefault(); navigate('/categories'); }}
              >
                <div className={`md:hidden flex items-center justify-center w-[32px] text-[#e50000] overflow-hidden transition-all duration-300 ease-in-out ${isSticky ? 'h-0 opacity-0 mb-0' : 'h-[32px] opacity-100 mb-1'}`}>
                  <LayoutGrid size={24} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] md:text-[12px] font-bold text-gray-700 md:group-hover:text-[var(--color-primary)] leading-tight md:leading-[16px]">
                  Categories
                </span>
              </div>
            )}
            {TOP_BAR_CATEGORIES.map((cat) => {
              const matchedParent = categories.find(p =>
                cat.vendorCategories.length > 0
                  ? cat.vendorCategories.some(vc => p.name.toLowerCase() === vc.toLowerCase())
                  : p.name.toLowerCase() === cat.dbName.toLowerCase()
              );
              const parentId = matchedParent?.id;
              const subs = categories.filter(c => c.parent_id === parentId);
              const hasSubs = subs.length > 0;
              const isActive =
                selectedCategory?.toLowerCase() === cat.name.toLowerCase() ||
                (cat.vendorCategories.length > 0
                  ? cat.vendorCategories.some(vc => selectedCategory?.toLowerCase() === vc.toLowerCase())
                  : selectedCategory?.toLowerCase() === cat.dbName.toLowerCase()) ||
                subs.some(sub => selectedCategory?.toLowerCase() === sub.name.toLowerCase()) ||
                (!selectedCategory && cat.name === 'For You');

              return (
                <div
                  key={cat.id}
                  className={`${hideMobileCategories && cat.name === 'For You' ? 'hidden md:flex' : 'flex'} flex-col items-center justify-center md:justify-center cursor-pointer group relative shrink-0 px-1 md:px-3 w-auto md:w-auto h-full`}
                  onMouseEnter={() => setActiveDropdown(cat.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (cat.name === 'For You') {
                      navigate('/');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      return;
                    }
                    const targetId = `section-${cat.name}`;
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                      const header = document.querySelector('header');
                      const navbarHeight = header ? header.getBoundingClientRect().height : 64;
                      const stickyCategoryHeight = isSticky ? 44 : (window.innerWidth >= 768 ? 72 : 60);
                      const targetTop = targetEl.getBoundingClientRect().top + window.scrollY;
                      window.scrollTo({
                        top: targetTop - navbarHeight - stickyCategoryHeight,
                        behavior: 'smooth'
                      });
                    } else {
                      if(setSelectedCategory) setSelectedCategory(cat.name);
                      navigate(`/products?category=${encodeURIComponent(cat.name)}`);
                    }
                  }}
                >
                  {!hideIcons && (
                    <div className={`flex items-center justify-center w-[32px] md:w-[28px] relative overflow-hidden transition-all duration-300 ease-in-out ${isSticky ? 'h-0 opacity-0 mb-0' : 'h-[32px] md:h-[28px] opacity-100 mb-1 md:mb-1.5'}`}>
                      {(() => {
                        const IconComponent = iconMap[cat.name] || iconMap[cat.dbName] || GridTwoTone;
                        const LucideComp = lucideIconMap[cat.name] || lucideIconMap[cat.dbName] || LayoutGrid;
                        return (
                          <>
                            <LucideComp size={cat.name === 'For You' ? 28 : 24} strokeWidth={cat.name === 'For You' ? 1.8 : 1.5} className={`md:hidden ${isActive ? 'text-[#e50000]' : 'text-[#e50000]'}`} />
                            <IconComponent size={26} className="hidden md:block group-hover:scale-110 transition-transform drop-shadow-sm" />
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <span className={`text-center text-[11px] md:text-[12px] font-bold md:font-[500] leading-tight md:leading-[16px] whitespace-nowrap px-1 md:mb-[2px] ${isActive ? 'text-black md:text-[#e50000]' : 'text-gray-700 md:text-gray-800'}`}>
                    {cat.name}
                  </span>

                  {isActive && (
                    <div className="block absolute bottom-0 md:-bottom-[1px] left-1/2 -translate-x-1/2 w-[80%] md:w-[79%] h-[4px] md:h-[4px] bg-[#cc0000] md:bg-[#cc0000] rounded-t-sm"></div>
                  )}

                  {hasSubs && (activeDropdown === cat.id || mobileOpenId === cat.id) && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-white border border-gray-200 shadow-xl rounded-md py-2 min-w-[160px] z-50 animate-fadeIn"
                      onMouseEnter={() => setActiveDropdown(cat.id)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      {subs.map(sub => (
                        <div
                          key={sub.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if(setSelectedCategory) setSelectedCategory(sub.name);
                            setMobileOpenId(null);
                            setActiveDropdown(null);
                            navigate(`/products?category=${encodeURIComponent(sub.name)}&filter=top_rated`);
                          }}
                          className={`px-4 py-2 text-sm transition-colors block text-left ${selectedCategory?.toLowerCase() === sub.name.toLowerCase()
                            ? 'bg-blue-50 text-blue-600 font-bold'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                          {sub.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategoryNav;
