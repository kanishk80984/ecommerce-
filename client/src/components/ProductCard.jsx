import React, { useState } from 'react';
import * as rrdPkg from 'react-router-dom';
const { Link } = rrdPkg;
import { Star, Heart, ShoppingCart, Eye } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '../store/wishlistSlice';
import { getImageUrl } from '../utils/imageUrl';

const ProductCard = ({ product, showOfferNextToRating = false, isCompact = false, isSearchPage = false, isTall = false }) => {
  const [imgError, setImgError] = useState(false);
  const dispatch = useDispatch();
  const wishlistItems = useSelector((state) => state.wishlist?.items || []);
  const isWishlisted = wishlistItems.some((item) => item.id === product.id && (item.variant_id || null) === (product.variant_id || null));

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWishlist(product));
  };

  if (!product) return null;

  // Extract dynamic fields, falling back to sensible defaults or handling missing fields
  let currentPrice = Number(product.price) || 0;
  let originalPrice = Number(product.mrp || product.originalPrice) || currentPrice;

  // Correct data entry errors where MRP < Price by swapping them
  if (originalPrice > 0 && currentPrice > originalPrice) {
    const temp = currentPrice;
    currentPrice = originalPrice;
    originalPrice = temp;
  }

  let calculatedDiscount = 0;
  if (product.discountPercentage) {
    calculatedDiscount = product.discountPercentage;
  } else if (originalPrice > currentPrice) {
    calculatedDiscount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  const avgRating = Number(product.average_rating || product.averageRating) || 0;
  const reviewCount = product.review_count || product.reviewCount || 0;

  // Determine the best badge to show
  let badgeText = null;
  const isDiscountBadge = calculatedDiscount > 0;
  if (product.badge) badgeText = product.badge;
  else if (isDiscountBadge) badgeText = `${calculatedDiscount}% OFF`;
  else if (product.isNew) badgeText = 'NEW';
  else if (product.isBestSeller) badgeText = 'BEST SELLER';
  else if (product.isTrending) badgeText = 'TRENDING';

  // Fallback placeholder image (a simple light gray SVG with a bag icon)
  const placeholderImg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%' viewBox='0 0 24 24' fill='none' stroke='%23d1d5db' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'></path><line x1='3' y1='6' x2='21' y2='6'></line><path d='M16 10a4 4 0 0 1-8 0'></path></svg>";

  const displayImage = imgError || !product.thumbnail ? placeholderImg : getImageUrl(product.thumbnail);

  let displayName = product.name;
  if (product.variants && product.variants.length > 0) {
    const firstVariant = product.variants[0];
    let attrs = {};
    try {
      attrs = typeof firstVariant.attributes === 'string' ? JSON.parse(firstVariant.attributes) : (firstVariant.attributes || {});
    } catch (e) { }
    if (attrs.title) {
      displayName = attrs.title;
    } else if (firstVariant.title) {
      displayName = firstVariant.title;
    } else if (firstVariant.name) {
      displayName = firstVariant.name;
    }
  } else {
    let attrs = {};
    if (product.variant_attributes) {
      try {
        attrs = typeof product.variant_attributes === 'string' ? JSON.parse(product.variant_attributes) : (product.variant_attributes || {});
      } catch (e) { }
    }
    if (attrs.title) {
      displayName = attrs.title;
    } else if (product.variant_name) {
      const modelPart = product.model_name ? ` - ${product.model_name}` : '';
      displayName = `${product.name}${modelPart} (${product.variant_name})`;
    }
  }

  const categorySlug = (product.category || product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const variantSlug = product.variant_seo_slug || product.variant_id;
  const linkTo = variantSlug
    ? `/${categorySlug}/product/${variantSlug}/${product.slug || product.id}`
    : `/${categorySlug}/product/${product.slug || product.id}`;

  return (
    <div className={`group ${isTall ? 'bg-transparent rounded-none border-0 shadow-none hover:shadow-none hover:translate-y-0' : 'bg-white rounded-[18px] border border-[#F1F5F9] shadow-[0_6px_18px_rgba(0,0,0,0.06)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-[6px]'} transition-all duration-300 ease-out flex flex-col h-full relative overflow-hidden flex-shrink-0`}>

      {/* Absolute Top Area: Badge */}
      <div className={`absolute top-1.5 left-1 md:top-3 md:left-3 z-10 pointer-events-none ${isCompact || isTall ? 'hidden' : ''}`}>
        {badgeText && (
          <span className={`bg-[#cc0000] text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-full uppercase border-[1.5px] border-white shadow-md ${showOfferNextToRating && isDiscountBadge ? 'md:hidden' : ''}`}>
            {badgeText}
          </span>
        )}
      </div>

      {/* Wishlist Button */}
      <button
        onClick={handleWishlistClick}
        className="absolute top-1.5 right-1.5 md:top-3 md:right-3 z-20 bg-white/80 backdrop-blur-sm p-1.5 md:p-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 group/btn"
      >
        <Heart
          size={18}
          className={`transition-colors duration-300 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400 group-hover/btn:text-red-500'}`}
        />
      </button>

      {/* Image Area */}
      <Link to={linkTo} className={`block relative w-full ${isCompact ? 'h-[130px]' : isSearchPage ? 'h-[200px]' : 'h-[175px]'} ${isTall ? 'md:h-[250px] bg-[#f5f5f5] rounded-2xl mb-2' : 'md:h-[260px] bg-white'} flex items-center justify-center overflow-hidden`}>
        <img
          src={displayImage}
          onError={() => setImgError(true)}
          alt={product.name || 'Product'}
          className={`${isTall ? 'w-full h-full p-1.5 md:p-0 object-contain mix-blend-multiply md:scale-[1.08] group-hover:md:scale-[1.15]' : 'w-full h-full object-cover group-hover:scale-105'} ${!isTall && 'group-hover:scale-105'} transition-transform duration-500 ease-out`}
          loading="lazy"
        />
      </Link>

      {/* Content Area */}
      <Link to={linkTo} className={`${isCompact ? 'p-1.5' : isTall ? 'p-0.5 md:p-0 bg-transparent' : 'p-2.5 bg-white'} md:px-3 md:pt-1.5 md:pb-1.5 flex flex-col flex-1`}>

        {/* Rating */}
        {!isTall && (
          <div className="hidden md:flex h-[20px] items-center gap-1 mb-1">
            <Star size={12} className="fill-[#ff9900] text-[#ff9900]" />
            <span className="text-[11px] md:text-xs font-bold text-[#ff9900]">
              {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
            </span>
            <span className="text-[11px] md:text-xs font-bold text-gray-800">
              ({reviewCount > 0 ? reviewCount : Math.floor((product.name?.length % 20) || 5) + 2})
            </span>
            {showOfferNextToRating && calculatedDiscount > 0 && (
              <span className="text-[10px] md:text-[11px] font-[800] text-[#00a650] ml-4">
                {calculatedDiscount}% OFF
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className={`${isCompact ? 'text-[11.5px] line-clamp-2' : isTall ? 'text-[12px] md:text-[13px] line-clamp-1' : 'text-[13px] md:text-[14px] line-clamp-2'} font-[600] text-gray-900 leading-[1.3] break-words overflow-hidden mb-1`}>
          {displayName}
        </h3>

        {/* Price Section */}
        {isCompact ? (
          <div className="flex flex-row items-center justify-between mt-auto min-h-[28px] w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-0 md:gap-1.5 flex-wrap">
              <span className="text-[13px] md:text-[15px] font-[800] text-gray-900 leading-none">
                ₹{currentPrice.toLocaleString('en-IN')}
              </span>
              {originalPrice > currentPrice && (
                <span className="text-[9.5px] md:text-[11.5px] text-gray-400 line-through font-medium leading-none">
                  ₹{originalPrice.toLocaleString('en-IN')}
                </span>
              )}
            </div>

            {/* Mobile Rating */}
            <div className="flex md:hidden items-center gap-0.5 flex-shrink-0">
              <Star size={10} className="fill-[#ff9900] text-[#ff9900]" />
              <span className="text-[10px] font-bold text-gray-800">
                {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-row items-baseline gap-1.5 md:gap-2 flex-wrap mt-auto">
            <span className="text-[15px] md:text-[16px] font-[800] text-gray-900 leading-none">
              ₹{currentPrice.toLocaleString('en-IN')}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-[11px] md:text-[12px] text-gray-400 line-through font-medium">
                ₹{originalPrice.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        )}
      </Link>
    </div>
  );
};

export default React.memo(ProductCard);
