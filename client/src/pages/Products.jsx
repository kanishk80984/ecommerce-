import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useSearchParams, Link, useParams, useLocation } = rrdPkg;
import { Star, Share2 } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { getImageUrl } from '../utils/imageUrl';
import { fuzzyMatch } from '../utils/fuzzyMatch';
import { productMatchesUserCategory, USER_CATEGORIES, getUserCategoryForVendor } from '../utils/categoryMap';
import toast from 'react-hot-toast';
import CategoryNav from '../components/CategoryNav';

const Products = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();


  const handleShareProduct = async (e, productSlug, productName) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/product/${productSlug}`;
    const shareData = {
      title: productName || 'Product Details',
      text: 'Check out this product!',
      url: shareUrl
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Product link copied to clipboard!');
      }
    } catch (err) {
      toast.error('Failed to copy to clipboard');
      console.error('Error sharing product:', err);
    }
  };
  const { slug } = useParams();
  const isCategoryPage = location.pathname.startsWith('/category/');
  const isBrandPage = location.pathname.startsWith('/brand/');

  const category = searchParams.get('category');
  const filter = searchParams.get('filter');
  const query = searchParams.get('q');
  const vendorParam = searchParams.get('vendor') || searchParams.get('brand');
  const vendorIdParam = searchParams.get('vendor_id');

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortOption, setSortOption] = useState(searchParams.get('filter') === 'offers' ? 'discount' : 'relevance');
  const [selectedCategories, setSelectedCategories] = useState(category ? [category] : []);
  const [selectedBrands, setSelectedBrands] = useState(vendorParam ? [vendorParam] : []);
  const [priceFilter, setPriceFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  // Update selected categories & brands & sort if URL changes
  useEffect(() => {
    if (category) setSelectedCategories([category]);
    else if (!isCategoryPage) setSelectedCategories([]);

    if (vendorParam) setSelectedBrands([vendorParam]);
    else if (!isBrandPage) setSelectedBrands([]);

    if (filter === 'offers') {
      setSortOption('discount');
    } else {
      setSortOption('relevance');
    }
  }, [category, vendorParam, filter, isCategoryPage, isBrandPage]);

  useEffect(() => {
    if (allProducts.length > 0) {
      if (isCategoryPage && slug) {
        const matched = allProducts.find(p => String(p.category_id).toLowerCase() === slug.toLowerCase());
        if (matched) {
          setSelectedCategories([matched.category_name]);
        }
      }
      if (isBrandPage && slug) {
        const matched = allProducts.find(p => String(p.brand_id).toLowerCase() === slug.toLowerCase());
        if (matched) {
          setSelectedBrands([matched.vendor_name]);
        }
      }
    }
  }, [allProducts, slug, isCategoryPage, isBrandPage]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get('/public/all-products');
        if (res.data.success) {
          setAllProducts(res.data.products);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Build user-facing unique categories from actual products
  // A product in "Accessories" shows as "Fashion", etc.
  const uniqueCategories = [...new Set(
    allProducts
      .map(p => getUserCategoryForVendor(p.category_name))
      .filter(Boolean)
  )].sort();
  const uniqueBrands = [...new Set(allProducts.map(p => p.vendor_name))].filter(Boolean);


  const getPageTitle = () => {
    if (vendorParam) return `${vendorParam}'s Products`;
    if (vendorIdParam) return 'Vendor Products';
    if (filter === 'top_rated') return category ? `Top Rated ${category}` : 'Top Rated Products';
    if (filter === 'offers') return category ? `${category} Offers` : 'Special Offers';
    if (category) return category;
    if (query) return `Search Results for "${query}"`;
    return 'All Products';
  };

  const getFilteredAndSortedProducts = () => {
    let list = [];
    allProducts.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          list.push({
            id: variant.id,
            slug: `${product.slug}?variant=${variant.seo_slug || variant.id}`,
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
            brand_id: product.brand_id,
          });
        });
      } else {
        list.push({
          id: product.id,
          slug: product.slug,
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
          brand_id: product.brand_id,
        });
      }
    });

    // Apply URL Query
    if (query) {
      list = list.filter(p =>
        fuzzyMatch(p.name, query) ||
        fuzzyMatch(p.category_name, query) ||
        fuzzyMatch(p.vendor_name, query)
      );
    }

    // Apply URL Filter (top_rated / offers)
    if (filter === 'top_rated') {
      list = list.filter(p => Number(p.average_rating) >= 4);
    }

    // Apply Vendor ID / Name Filter
    if (vendorIdParam) {
      list = list.filter(p => String(p.vendor_id) === String(vendorIdParam));
    } else if (vendorParam && selectedBrands.length === 0) {
      list = list.filter(p => String(p.vendor_name || '').toLowerCase() === vendorParam.toLowerCase());
    }

    if (selectedCategories.length > 0) {
      list = list.filter(p =>
        selectedCategories.some(userCat =>
          // Use the category map: "Fashion" matches Accessories, Bags, Shoes, etc.
          productMatchesUserCategory(p.category_name, userCat) ||
          // Also allow raw vendor category selection (from sidebar clicks)
          String(p.category_name || '').toLowerCase() === userCat.toLowerCase()
        )
      );
    } else if (isCategoryPage && slug) {
      list = list.filter(p => String(p.category_id || '').toLowerCase() === slug.toLowerCase());
    }

    if (selectedBrands.length > 0) {
      list = list.filter(p => selectedBrands.some(b => String(p.vendor_name || '').toLowerCase() === b.toLowerCase()));
    } else if (isBrandPage && slug) {
      list = list.filter(p => String(p.brand_id || '').toLowerCase() === slug.toLowerCase());
    }

    if (priceFilter !== 'all') {
      if (priceFilter === 'under_500') list = list.filter(p => Number(p.price) < 500);
      else if (priceFilter === '500_2000') list = list.filter(p => Number(p.price) >= 500 && Number(p.price) <= 2000);
      else if (priceFilter === 'over_2000') list = list.filter(p => Number(p.price) > 2000);
    }

    if (ratingFilter !== 'all') {
      if (ratingFilter === '4_plus') list = list.filter(p => Number(p.average_rating) >= 4);
      else if (ratingFilter === '3_plus') list = list.filter(p => Number(p.average_rating) >= 3);
    }

    // Sorting
    if (sortOption === 'price_low') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortOption === 'price_high') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortOption === 'rating') {
      list.sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
    } else if (sortOption === 'discount' || filter === 'offers') {
      list.sort((a, b) => {
        const discountA = Number(a.mrp) > Number(a.price) ? Math.round(((Number(a.mrp) - Number(a.price)) / Number(a.mrp)) * 100) : 0;
        const discountB = Number(b.mrp) > Number(b.price) ? Math.round(((Number(b.mrp) - Number(b.price)) / Number(b.mrp)) * 100) : 0;
        return discountB - discountA;
      });
    }

    return list;
  };

  const displayedProducts = getFilteredAndSortedProducts();

  const handleCategoryToggle = (cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleBrandToggle = (brand) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceFilter('all');
    setRatingFilter('all');
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* CATEGORIES */}
      {uniqueCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">Categories</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {uniqueCategories.map(cat => (
              <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => handleCategoryToggle(cat)}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900">{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* BRAND / VENDOR (Removed as per request) */}

      {/* PRICE */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">Price</h3>
        <div className="space-y-2">
          {[
            { id: 'all', label: 'All Prices' },
            { id: 'under_500', label: 'Under ₹500' },
            { id: '500_2000', label: '₹500 - ₹2000' },
            { id: 'over_2000', label: 'Over ₹2000' }
          ].map(p => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="price"
                className="w-4 h-4 border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                checked={priceFilter === p.id}
                onChange={() => setPriceFilter(p.id)}
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* CUSTOMER RATING */}
      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">Customer Rating</h3>
        <div className="space-y-2">
          {[
            { id: 'all', label: 'All Ratings' },
            { id: '4_plus', label: '4★ & above' },
            { id: '3_plus', label: '3★ & above' }
          ].map(r => (
            <label key={r.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                className="w-4 h-4 border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                checked={ratingFilter === r.id}
                onChange={() => setRatingFilter(r.id)}
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">{r.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <CategoryNav categories={[]} selectedCategory={slug || category} loading={false} hideIcons={true} disableSticky={true} fullWidthBreakout={true} hideMobileCategories={true} />
      <div className="min-h-screen bg-gray-50 md:bg-white py-2 md:py-6 px-0 md:px-6 pb-20 md:pb-6">
        <div className="w-full flex flex-col md:flex-row gap-0 md:gap-6">

          {/* DESKTOP SIDEBAR FILTERS */}
          <div className="hidden md:block w-64 flex-shrink-0 bg-white shadow-sm border border-gray-200 rounded-md p-4 sticky max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar" style={{ top: '155px' }}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-800">Filters</h2>
              {(selectedCategories.length > 0 || selectedBrands.length > 0 || priceFilter !== 'all' || ratingFilter !== 'all') && (
                <button onClick={clearAllFilters} className="text-xs font-semibold text-blue-600 hover:text-blue-800 uppercase tracking-wide">
                  Clear All
                </button>
              )}
            </div>
            <FilterContent />
          </div>


          {/* MAIN PRODUCT GRID */}
          <div className="flex-1 min-w-0">
            <div className="bg-white p-3 md:p-4 border-b border-gray-200 mb-2 flex items-center justify-between gap-4 mx-2 md:mx-0 rounded-md md:shadow-sm">
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
                {!loading && <p className="text-xs sm:text-sm text-gray-500 mt-0.5">(Showing {displayedProducts.length} products)</p>}
              </div>

              {!loading && (
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Sort By</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="border-none bg-transparent font-medium text-sm text-gray-900 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_low">Price -- Low to High</option>
                    <option value="price_high">Price -- High to Low</option>
                    <option value="rating">Top Rated</option>
                    <option value="discount">Highest Discount</option>
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-x-2 gap-y-[10px] md:gap-4 p-0 md:p-0">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} className="border border-gray-150 rounded-sm md:rounded-md p-0 flex flex-col bg-white space-y-3 animate-pulse h-full">
                    <div className="h-[170px] w-full bg-gray-100 rounded-sm" />
                    <div className="p-2 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-100 rounded" />
                      <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-x-2 gap-y-[10px] md:gap-4 p-2 md:p-0 m-0 w-full">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} isSearchPage={true} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-md border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-700 mb-2">No Products Found</h2>
                <p className="text-gray-500">Try adjusting your filters or search query.</p>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE FIXED BOTTOM BAR */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-200 flex">
          <button
            onClick={() => setIsMobileSortOpen(true)}
            className="flex-1 py-3.5 flex items-center justify-center gap-2 font-medium text-gray-700 border-r border-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5h10" /><path d="M11 9h7" /><path d="M11 13h4" /><path d="M3 17l3 3 3-3" /><path d="M6 18V4" /></svg>
            Sort
          </button>
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex-1 py-3.5 flex items-center justify-center gap-2 font-medium text-gray-700 relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            Filter
            {(selectedCategories.length > 0 || selectedBrands.length > 0 || priceFilter !== 'all' || ratingFilter !== 'all') && (
              <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* MOBILE SORT MODAL */}
        {isMobileSortOpen && (
          <div className="fixed inset-0 z-[70] bg-black/60 flex items-end md:hidden" onClick={() => setIsMobileSortOpen(false)}>
            <div className="bg-white w-full rounded-t-2xl p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="font-bold text-lg">Sort By</h3>
                <button onClick={() => setIsMobileSortOpen(false)} className="p-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
              <div className="space-y-2 pb-4">
                {[
                  { id: 'relevance', label: 'Relevance' },
                  { id: 'price_low', label: 'Price -- Low to High' },
                  { id: 'price_high', label: 'Price -- High to Low' },
                  { id: 'rating', label: 'Top Rated' },
                  { id: 'discount', label: 'Highest Discount' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 py-3 cursor-pointer">
                    <input type="radio" name="mobileSort" className="w-5 h-5 text-[var(--color-primary)]" checked={sortOption === opt.id} onChange={() => { setSortOption(opt.id); setIsMobileSortOpen(false); }} />
                    <span className={`text-base ${sortOption === opt.id ? 'font-bold' : ''}`}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE FILTER MODAL */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-[70] bg-white flex flex-col md:hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b shadow-sm">
              <h3 className="font-bold text-lg">Filters</h3>
              <div className="flex items-center gap-4">
                <button onClick={clearAllFilters} className="text-sm font-semibold text-blue-600 uppercase">Clear</button>
                <button onClick={() => setIsMobileFilterOpen(false)} className="p-1"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <FilterContent />
              </div>
            </div>
            <div className="p-4 border-t bg-white">
              <button onClick={() => setIsMobileFilterOpen(false)} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow-md">
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Products;
