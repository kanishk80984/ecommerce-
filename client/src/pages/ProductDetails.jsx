import React, { useState, useEffect, useRef } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams, useNavigate, useSearchParams, useNavigationType, Link, useLocation } = rrdPkg;
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, updateQuantity, removeFromCart } from '../store/cartSlice';
import { toggleWishlist } from '../store/wishlistSlice';
import api from '../services/api';
import { getImageUrl as resolveImageUrl } from '../utils/imageUrl';
import { useSuggestedProducts } from '../hooks/useSuggestedProducts';
import ProductCard from '../components/ProductCard';
import {
  Cpu, Battery, Camera, Smartphone, CheckCircle, ChevronDown, ChevronUp,
  Shield, Package, AlertCircle, ShoppingCart, ShoppingBag, ZoomIn, Maximize2, X, Share2, Star, Heart, Copy, ChevronRight, ThumbsUp, ThumbsDown, Minus, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

const getHighlightIcon = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('ram') || lower.includes('rom') || lower.includes('processor') || lower.includes('ghz') || lower.includes('core')) return <Cpu size={20} className="text-blue-500" />;
  if (lower.includes('battery') || lower.includes('mah') || lower.includes('charging')) return <Battery size={20} className="text-green-500" />;
  if (lower.includes('camera') || lower.includes('mp') || lower.includes('lens')) return <Camera size={20} className="text-indigo-500" />;
  if (lower.includes('display') || lower.includes('screen') || lower.includes('inch')) return <Smartphone size={20} className="text-amber-500" />;
  return <CheckCircle size={20} className="text-gray-500" />;
};

const ProductDetails = () => {
  const { slug, variantSlug } = useParams();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart?.items) || [];

  const [searchParams, setSearchParams] = useSearchParams();
  const variantParam = searchParams.get('variant');

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleWishlistToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!product) return;
    const wishlistItem = {
      id: product.id,
      variant_id: selectedVariant?.id || null,
      slug: selectedVariant ? `${product.slug}?variant=${selectedVariant.seo_slug || selectedVariant.id}` : product.slug,
      name: selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name,
      thumbnail: mainImage || product.thumbnail,
      price: selectedVariant?.price || product.price,
      mrp: selectedVariant?.mrp || product.mrp,
      average_rating: product.average_rating,
      review_count: product.review_count,
    };
    dispatch(toggleWishlist(wishlistItem));
  };

  const [likedReviews, setLikedReviews] = useState(new Set());
  const [dislikedReviews, setDislikedReviews] = useState(new Set());

  const handleVoteHelpful = async (reviewId) => {
    if (!isAuthenticated) return alert('Please login to vote.');

    const isLiked = likedReviews.has(reviewId);
    const newLiked = new Set(likedReviews);

    if (isLiked) {
      newLiked.delete(reviewId);
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, helpful_count: Math.max(0, (r.helpful_count || 1) - 1) } : r));
      try {
        await api.post(`/reviews/${reviewId}/vote`, { vote_type: 'NONE' });
      } catch (error) {
        console.error(error);
      }
    } else {
      newLiked.add(reviewId);
      // Remove dislike if it exists
      const newDisliked = new Set(dislikedReviews);
      let newUnhelpfulCount = 0;
      if (newDisliked.has(reviewId)) {
        newDisliked.delete(reviewId);
        setDislikedReviews(newDisliked);
        newUnhelpfulCount = -1;
      }
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, helpful_count: (r.helpful_count || 0) + 1, unhelpful_count: Math.max(0, (r.unhelpful_count || 0) + newUnhelpfulCount) } : r));
      try {
        await api.post(`/reviews/${reviewId}/vote`, { vote_type: 'HELPFUL' });
      } catch (error) {
        console.error(error);
      }
    }
    setLikedReviews(newLiked);
  };

  const handleVoteUnhelpful = async (reviewId) => {
    if (!isAuthenticated) return alert('Please login to vote.');

    const isDisliked = dislikedReviews.has(reviewId);
    const newDisliked = new Set(dislikedReviews);

    if (isDisliked) {
      newDisliked.delete(reviewId);
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, unhelpful_count: Math.max(0, (r.unhelpful_count || 1) - 1) } : r));
      try {
        await api.post(`/reviews/${reviewId}/vote`, { vote_type: 'NONE' });
      } catch (error) {
        console.error(error);
      }
    } else {
      newDisliked.add(reviewId);
      // Remove like if it exists
      const newLiked = new Set(likedReviews);
      let newHelpfulCount = 0;
      if (newLiked.has(reviewId)) {
        newLiked.delete(reviewId);
        setLikedReviews(newLiked);
        newHelpfulCount = -1;
      }
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, unhelpful_count: (r.unhelpful_count || 0) + 1, helpful_count: Math.max(0, (r.helpful_count || 0) + newHelpfulCount) } : r));
      try {
        await api.post(`/reviews/${reviewId}/vote`, { vote_type: 'UNHELPFUL' });
      } catch (error) {
        console.error(error);
      }
    }
    setDislikedReviews(newDisliked);
  };

  // Selection states
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [variantPage, setVariantPage] = useState(1);
  const [variantsPerPage, setVariantsPerPage] = useState(4);

  useEffect(() => {
    const handleResize = () => {
      setVariantsPerPage(window.innerWidth < 640 ? 3 : 4);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [mobileSuggestedPage, setMobileSuggestedPage] = useState(1);
  const [cartSuccessMessage, setCartSuccessMessage] = useState('');

  // Suggested products — fetched after product loads
  const { products: suggestedProducts, loading: suggestedLoading } = useSuggestedProducts(
    product?.category_name,
    product?.id,
    selectedVariant?.id
  );

  const wishlistItems = useSelector((state) => state.wishlist?.items || []);
  const isWishlisted = wishlistItems.some((item) => item.id === product?.id && (item.variant_id || null) === (selectedVariant?.id || null));

  const currentCartItem = cartItems.find(item => item.product_id === product?.id && (item.variant_id || 0) === (selectedVariant?.id || 0));

  const displayedReviews = React.useMemo(() => {
    if (!reviews) return [];
    if (!selectedVariant) return reviews;
    return reviews.filter(r => !r.variant_public_id || String(r.variant_public_id) === String(selectedVariant.id));
  }, [reviews, selectedVariant]);



  // Gallery states
  const [galleryImages, setGalleryImages] = useState([]);
  const [mainImage, setMainImage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });

  // Detail accordion tabs
  const [activeDetailTab, setActiveDetailTab] = useState('Specifications');
  const [highlightsOpen, setHighlightsOpen] = useState(true);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const getImageUrl = (path) => {
    const url = resolveImageUrl(path);
    return url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 150 150"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">No Image</text></svg>';
  };

  const getVariantTitle = (variant, prod) => {
    if (!variant) return prod?.name || '';
    let attrs = {};
    try {
      attrs = typeof variant.attributes === 'string' ? JSON.parse(variant.attributes) : (variant.attributes || {});
    } catch (e) { }
    if (attrs.title) return attrs.title;
    if (variant.title) return variant.title;
    if (variant.name) {
      const cleanName = variant.name.split(' (')[0].trim();
      if (cleanName && cleanName !== prod?.name) return cleanName;
    }
    return prod?.name || '';
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${slug}`);
        const prod = res.data.product;
        setProduct(prod);

        try {
          const revRes = await api.get(`/reviews/product/${prod.id}`);
          setReviews(revRes.data.reviews || []);
        } catch (e) {
          console.error('Failed to load reviews', e);
        }
      } catch (error) {
        console.error('Error fetching product details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (!product) return;

    if (product.models && product.models.length > 0) {
      let foundModel = null;
      let foundVariant = null;
      const targetVariant = variantSlug || variantParam;

      if (targetVariant) {
        for (const model of product.models) {
          if (model.variants) {
            const match = model.variants.find(v =>
              (v.seo_slug && String(v.seo_slug) === String(targetVariant)) ||
              String(v.id) === String(targetVariant)
            );
            if (match) {
              foundModel = model;
              foundVariant = match;
              break;
            }
          }
        }
      }

      const modelToSet = foundModel || product.models[0];
      setSelectedModel(modelToSet);

      if (foundVariant) {
        if (!selectedVariant || selectedVariant.id !== foundVariant.id) {
          setSelectedVariant(foundVariant);
          let attrs = {};
          try {
            attrs = typeof foundVariant.attributes === 'string'
              ? JSON.parse(foundVariant.attributes)
              : (foundVariant.attributes || {});
          } catch (e) { }
          setSelectedAttributes(attrs);
          updateGallery(foundVariant, modelToSet, attrs, null);

          // Track click
          api.post('/public/track-search', {
            productId: product.id,
            variantId: foundVariant.id,
            eventType: 'CLICK'
          }).catch(() => { });
        }
      } else {
        const defaultVar = modelToSet.variants?.[0];
        if (defaultVar && (!selectedVariant || selectedVariant.id !== defaultVar.id)) {
          initializeModel(modelToSet);
          // Track click for default variant initialized
          api.post('/public/track-search', {
            productId: product.id,
            variantId: defaultVar.id,
            eventType: 'CLICK'
          }).catch(() => { });
        } else if (!defaultVar) {
          // Track click for product without variants
          api.post('/public/track-search', {
            productId: product.id,
            eventType: 'CLICK'
          }).catch(() => { });
        }
      }
    } else {
      // Track click for product without models/variants
      api.post('/public/track-search', {
        productId: product.id,
        eventType: 'CLICK'
      }).catch(() => { });
    }
  }, [product, variantSlug, variantParam]);

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
    if (selectedVariant && product) {
      const categorySlug = (product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const path = selectedVariant.seo_slug || selectedVariant.id
        ? `/${categorySlug}/product/${selectedVariant.seo_slug || selectedVariant.id}/${product.slug}`
        : `/${categorySlug}/product/${product.slug}`;
      if (location.pathname !== path) {
        navigate(path, { replace: true });
      }
      setIsTitleExpanded(false);
    }
  }, [selectedVariant, product]);

  const initializeModel = (model) => {
    setVariantPage(1);
    if (model.variants && model.variants.length > 0) {
      const defaultVariant = model.variants[0];
      setSelectedVariant(defaultVariant);

      // Parse current attributes
      let attrs = {};
      try {
        attrs = typeof defaultVariant.attributes === 'string'
          ? JSON.parse(defaultVariant.attributes)
          : (defaultVariant.attributes || {});
      } catch (e) { }
      setSelectedAttributes(attrs);
      updateGallery(defaultVariant, model, attrs, null);
    } else {
      const fallbackVariant = {
        id: null,
        product_id: product?.id || id,
        name: product?.name || model.name,
        price: product?.price || 0,
        mrp: product?.mrp || product?.price || 0,
        stock: product?.stock !== undefined ? product.stock : 10,
        attributes: {}
      };
      setSelectedVariant(fallbackVariant);
      setSelectedAttributes({});
      updateGallery(fallbackVariant, model, {}, null);
    }
  };

  // Switch gallery logic exactly like Amazon/Flipkart
  const updateGallery = (newVariant, currentModel, newAttrs, oldAttrs) => {
    let imagesToUse = [];

    // Fallback Image logic:
    // If variant has images:
    if (newVariant && newVariant.images && newVariant.images.length > 0) {
      imagesToUse = newVariant.images;
    } else {
      // Smart switch retention:
      // If we only changed RAM, storage, capacity etc, and color is the same, and old variant had images, keep them
      if (oldAttrs && newAttrs && oldAttrs['Color'] === newAttrs['Color'] && selectedVariant && selectedVariant.images && selectedVariant.images.length > 0) {
        imagesToUse = selectedVariant.images;
      } else {
        // Fallback to model level images
        imagesToUse = currentModel.images || [];
      }
    }

    // Sort by sort_order
    const sorted = [...imagesToUse].sort((a, b) => (a.sortOrder || a.sort_order || 0) - (b.sortOrder || b.sort_order || 0));
    setGalleryImages(sorted);

    // Pick default image
    const defaultImg = sorted.find(img => img.isDefault || img.is_default) || sorted[0];
    const path = defaultImg ? (defaultImg.imageUrl || defaultImg.image_url) : '';
    setMainImage(path);
  };

  const handleModelChange = (model) => {
    setSelectedModel(model);
    initializeModel(model);
  };

  const handleAttributeChange = (key, val) => {
    const updatedAttrs = { ...selectedAttributes, [key]: val };
    setSelectedAttributes(updatedAttrs);

    // Find the variant matching this combination
    const matched = selectedModel.variants.find(v => {
      let vAttrs = {};
      try {
        vAttrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
      } catch (e) { }
      return Object.entries(updatedAttrs).every(([k, vVal]) => {
        if (vVal === 'All') return true;
        return String(vAttrs[k]).toLowerCase() === String(vVal).toLowerCase();
      });
    });

    // Fallback if exact match not found
    const fallback = !matched ? selectedModel?.variants?.find(v => {
      let vAttrs = {};
      try {
        vAttrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
      } catch (e) { }
      return val === 'All' ? true : String(vAttrs[key]).toLowerCase() === String(val).toLowerCase();
    }) : null;

    const target = matched || fallback;
    if (target) {
      setSelectedVariant(target);
      let attrsToUse = { ...updatedAttrs };
      if (fallback) {
        try {
          const fbAttrs = typeof fallback.attributes === 'string' ? JSON.parse(fallback.attributes) : (fallback.attributes || {});
          attrsToUse = { ...fbAttrs, [key]: val };
        } catch (e) { }
      }
      setSelectedAttributes(attrsToUse);
      updateGallery(target, selectedModel, attrsToUse, selectedAttributes);

      if (selectedModel?.variants) {
        const idx = selectedModel.variants.findIndex(v => v.id === target.id);
        if (idx >= 0) {
          setVariantPage(Math.floor(idx / 8) + 1);
        }
      }
    }
  };

  // Zoom on Hover
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.target.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${getImageUrl(mainImage)})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: '250%'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
  };

  // Cart operations
  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;

    const itemQuantity = 1;

    dispatch(addToCart({
      product_id: product.id,
      name: `${product.name} ${selectedModel ? '- ' + selectedModel.name : ''} ${selectedVariant.name ? '(' + selectedVariant.name + ')' : ''}`.trim(),
      short_description: selectedModel?.description?.replace(/<[^>]*>/g, '') || '',
      price: selectedVariant.price,
      mrp: selectedVariant.mrp || selectedVariant.price,
      thumbnail: mainImage || product.thumbnail,
      vendor_id: product.vendor_id,
      variant_id: selectedVariant.id || 0,
      quantity: itemQuantity,
      gst_percentage: product.category_gst || 0
    }));

    // Track CART_ADD
    api.post('/public/track-search', {
      productId: product.id,
      variantId: selectedVariant.id,
      eventType: 'CART_ADD'
    }).catch(() => { });

    if (isAuthenticated) {
      try {
        await api.post('/cart', { productId: product.id, quantity: itemQuantity, variantId: selectedVariant.id });
      } catch (error) {
        console.error('Failed to sync cart', error);
      }
    }
    setCartSuccessMessage('Item successfully added to cart!');
    setTimeout(() => {
      setCartSuccessMessage('');
    }, 3000);
  };

  const handleBuyNow = () => {
    if (!product || !selectedVariant) return;
    const itemQuantity = 1;
    const cartItem = {
      product_id: product.id,
      name: `${product.name} ${selectedModel ? '- ' + selectedModel.name : ''} ${selectedVariant.name ? '(' + selectedVariant.name + ')' : ''}`.trim(),
      short_description: selectedModel?.description?.replace(/<[^>]*>/g, '') || '',
      price: selectedVariant.price,
      mrp: selectedVariant.mrp || selectedVariant.price,
      thumbnail: mainImage || product.thumbnail,
      vendor_id: product.vendor_id,
      variant_id: selectedVariant.id || 0,
      quantity: itemQuantity,
      gst_percentage: product.category_gst || 0
    };

    dispatch(addToCart(cartItem));

    // Track CART_ADD
    api.post('/public/track-search', {
      productId: product.id,
      variantId: selectedVariant.id,
      eventType: 'CART_ADD'
    }).catch(() => { });

    if (isAuthenticated) {
      api.post('/cart', { productId: product.id, quantity: itemQuantity, variantId: selectedVariant.id })
        .then(() => {
          navigate('/checkout', { state: { checkoutItems: [cartItem] } });
        })
        .catch((error) => {
          console.error('Failed to sync cart', error);
          navigate('/checkout', { state: { checkoutItems: [cartItem] } });
        });
    } else {
      navigate('/checkout', { state: { checkoutItems: [cartItem] } });
    }
  };

  const handleUpdateQuantity = async (quantity) => {
    if (!product || !selectedVariant) return;

    if (quantity < 1) {
      dispatch(removeFromCart({ id: product.id, variantId: selectedVariant.id || 0 }));
      if (isAuthenticated) {
        try {
          await api.delete(`/cart/${product.id}?variantId=${selectedVariant.id || 0}`);
        } catch (error) {
          console.error('Failed to remove cart item from server', error);
        }
      }
      return;
    }

    dispatch(updateQuantity({ id: product.id, variantId: selectedVariant.id || 0, quantity }));

    if (isAuthenticated) {
      try {
        await api.put(`/cart/${product.id}`, { quantity, variantId: selectedVariant.id || 0 });
      } catch (error) {
        console.error('Failed to update cart quantity on server', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1240px] mx-auto bg-white p-4 md:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left image gallery skeleton */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="w-full h-[380px] md:h-[500px] bg-gray-200 rounded-2xl animate-pulse" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          {/* Right details content skeleton */}
          <div className="w-full lg:w-1/2 space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-5/6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-16 w-full bg-gray-100 border border-gray-200 rounded-2xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-12 w-full bg-gray-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!product) return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Product not found.</div>;

  const categoryName = product.category_name || '';
  const isFashionCategory = categoryName.toLowerCase() === 'fashion' || categoryName.toLowerCase().includes('fashion');
  const isMobileCategory = categoryName.toLowerCase() === 'mobiles' || categoryName.toLowerCase().includes('mobile') || categoryName.toLowerCase().includes('phone');
  const isElectronicsCategory = categoryName.toLowerCase().includes('electronic') || categoryName.toLowerCase().includes('computer') || categoryName.toLowerCase().includes('laptop');
  const isBeautyCategory = categoryName.toLowerCase().includes('beauty') || categoryName.toLowerCase().includes('health') || categoryName.toLowerCase().includes('personal');

  const getVariantCountForAttribute = (key, value) => {
    if (!selectedModel || !selectedModel.variants) return 0;
    return selectedModel.variants.filter(v => {
      let attrs = {};
      try {
        attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
      } catch (e) { }
      return attrs[key] === value;
    }).length;
  };

  // Check if model has any custom attributes (e.g. Weight, Material)
  // Custom attributes are anything that is NOT a standard field (title, color, size, pack of, volume, etc.)
  let modelHasCustomAttrs = false;
  if (selectedModel && selectedModel.variants) {
    selectedModel.variants.forEach(v => {
      let attrs = {};
      try {
        attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
      } catch (e) { }

      // Clean up accidental vendor duplicates (e.g., 'size': '5kg' when 'Size': '5kg' already exists)
      const cleanedAttrs = { ...attrs };
      Object.keys(cleanedAttrs).forEach(k => {
        const exactKey = k.trim();
        const lower = exactKey.toLowerCase();
        if (lower === 'size' && exactKey !== 'Size' && cleanedAttrs['Size'] && String(cleanedAttrs['Size']).toLowerCase() === String(cleanedAttrs[k]).toLowerCase()) {
          delete cleanedAttrs[k];
        }
      });

      Object.keys(cleanedAttrs).forEach(k => {
        const exactKey = k.trim();
        const lower = exactKey.toLowerCase();
        // If it's NOT a standard ignored key, and NOT the exact key 'Size' (Main size)
        if (!['title', 'yhrth', 'yhth', 'color', 'colour', 'seo_slug', 'seo-slug', 'seo_slugs', 'pack of', 'volume'].includes(lower) && exactKey !== 'Size') {
          if (attrs[k]) modelHasCustomAttrs = true;
        }
      });
    });
  }

  // Group all available attribute values across variants of selected model
  const attributeMap = {};
  if (selectedModel && selectedModel.variants) {
    selectedModel.variants.forEach(v => {
      let attrs = {};
      try {
        attrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
      } catch (e) { }

      // Clean up accidental vendor duplicates
      const cleanedAttrs = { ...attrs };
      Object.keys(cleanedAttrs).forEach(k => {
        const exactKey = k.trim();
        const lower = exactKey.toLowerCase();
        if (lower === 'size' && exactKey !== 'Size' && cleanedAttrs['Size'] && String(cleanedAttrs['Size']).toLowerCase() === String(cleanedAttrs[k]).toLowerCase()) {
          delete cleanedAttrs[k];
        }
      });

      Object.entries(cleanedAttrs).forEach(([k, val]) => {
        const exactKey = k.trim();
        const lowerKey = exactKey.toLowerCase();

        let isIgnored = ['title', 'yhrth', 'yhth', 'color', 'colour', 'seo_slug', 'seo-slug', 'seo_slugs', 'pack of', 'volume'].includes(lowerKey);

        // If there are custom attributes, Main 'Size' becomes static text (so we ignore it from interactive buttons)
        if (modelHasCustomAttrs && exactKey === 'Size') {
          isIgnored = true;
        }

        if (isIgnored) {
          return;
        }

        const existingKey = Object.keys(attributeMap).find(
          key => key.toLowerCase() === exactKey.toLowerCase()
        ) || exactKey;

        if (!attributeMap[existingKey]) {
          attributeMap[existingKey] = new Set();
        }
        const trimmedVal = String(val).trim();
        const existingVal = Array.from(attributeMap[existingKey]).find(
          existing => existing.toLowerCase() === trimmedVal.toLowerCase()
        );
        if (!existingVal) {
          attributeMap[existingKey].add(trimmedVal);
        }
      });
    });
  }

  // Specifications merging
  const finalSpecs = [];
  let hasVarSpecs = false;
  let varSpecs = {};
  if (selectedVariant && selectedVariant.specifications) {
    try {
      varSpecs = typeof selectedVariant.specifications === 'string'
        ? JSON.parse(selectedVariant.specifications)
        : (selectedVariant.specifications || {});
      if (Object.keys(varSpecs).length > 0) {
        hasVarSpecs = true;
      }
    } catch (e) { }
  }

  if (hasVarSpecs) {
    // Show ONLY variant specs if vendor provided them
    Object.entries(varSpecs).forEach(([key, val]) => {
      if (val !== null && val !== undefined && String(val).trim() !== '') {
        finalSpecs.push({ label: key, value: val });
      }
    });
  } else {
    // Fallback to model specs
    if (selectedModel && selectedModel.specifications) {
      selectedModel.specifications.forEach(s => {
        if (s.value !== null && s.value !== undefined && String(s.value).trim() !== '') {
          finalSpecs.push({ attribute_id: s.attribute_id, label: s.label || s.name, value: s.value });
        }
      });
    }
  }

  // Parse variant highlights safely
  let variantHighlights = [];
  if (selectedVariant && selectedVariant.highlights) {
    try {
      variantHighlights = typeof selectedVariant.highlights === 'string'
        ? JSON.parse(selectedVariant.highlights)
        : selectedVariant.highlights;
    } catch (e) { }
  }
  const displayHighlights = (Array.isArray(variantHighlights) && variantHighlights.length > 0)
    ? variantHighlights
    : (selectedModel?.highlights || []);

  const renderSimilarProducts = (containerClasses, isMobile = false) => {
    if (!suggestedLoading && suggestedProducts.length === 0) return null;

    const displayLimit = isMobile ? mobileSuggestedPage * 10 : 50;
    const displayProducts = suggestedProducts.slice(0, displayLimit);
    const hasMore = isMobile && displayLimit < suggestedProducts.length;

    return (
      <div className={containerClasses}>
        <h3 className="text-lg md:text-2xl font-bold text-gray-800 mb-5 md:mb-6 border-b border-gray-100 pb-3 md:pb-4 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-[#cc0000]" />
          Similar Products
          {product?.category_name && (
            <span className="text-xs md:text-base font-normal text-gray-400 ml-1 md:ml-2">in {product.category_name}</span>
          )}
        </h3>

        {suggestedLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-2 gap-y-[20px] md:gap-[20px] pb-2 md:pb-4">
            {Array.from({ length: isMobile ? 4 : 5 }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-2.5 md:p-3 animate-pulse">
                <div className="w-full aspect-[4/5] bg-gray-200 rounded-lg mb-3" />
                <div className="h-3 md:h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-2.5 md:h-3 w-1/2 bg-gray-200 rounded mb-2" />
                <div className="h-4 md:h-5 w-2/3 bg-gray-200 rounded mt-2 md:mt-3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-2 gap-y-[20px] md:gap-[20px] pb-2 md:pb-4">
              {displayProducts.map((sp) => (
                <ProductCard key={sp.variant_id || sp.id} product={sp} showOfferNextToRating={true} isTall={true} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setMobileSuggestedPage(p => p + 1)}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-full transition-colors"
                >
                  Show more <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen py-0 sm:py-4 px-0 sm:px-6 lg:px-8">
      <div className="max-w-[1240px] mx-auto bg-white p-0 sm:p-2 md:p-4">

        <div className="flex flex-col lg:flex-row gap-8 px-0 sm:px-0">
          {/* LEFT COLUMN: Gallery Panel */}
          <div className="w-full lg:w-[40%] px-3 sm:px-0 flex flex-col gap-2 lg:sticky lg:top-24 lg:self-start lg:z-10">

            <div className="w-full relative group bg-white md:bg-gray-50/50 border-0 md:border md:border-gray-100 rounded-2xl aspect-square md:aspect-[9/10] flex items-center justify-center overflow-hidden mt-1 md:mt-0 shadow-none">
              <img
                key={mainImage}
                src={getImageUrl(mainImage)}
                alt={selectedModel?.name || product.name}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full object-cover cursor-zoom-in animate-fade-in"
                onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl(null); }}
              />

              {/* Fullscreen Trigger */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="absolute bottom-4 right-4 bg-white shadow-md p-2 rounded-full hover:bg-gray-50 text-gray-500 border border-gray-100"
              >
                <Maximize2 size={16} />
              </button>

              {/* Magnified Hover Container */}
              <div
                style={zoomStyle}
                className="absolute inset-0 bg-no-repeat pointer-events-none bg-white z-10 hidden border border-gray-200"
              ></div>
            </div>

            {/* Thumbnails */}
            {galleryImages && galleryImages.length > 1 && (
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide w-full mt-1">
                {galleryImages.map((img, idx) => {
                  const path = typeof img === 'string' ? img : (img?.imageUrl || img?.image_url || img?.src || '');
                  return (
                    <button
                      key={idx}
                      onClick={() => setMainImage(path)}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg md:rounded-xl border-2 overflow-hidden transition-all duration-200 bg-white
                        ${mainImage === path ? 'border-gray-900 shadow-sm opacity-100' : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-600'}`}
                    >
                      <img
                        src={getImageUrl(path)}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl(null); }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Product Info & Actions */}
          <div className="w-full lg:w-[60%] flex flex-col gap-5 px-3 sm:px-0 min-w-0">

            <div className="flex flex-col gap-1 w-full">
              <div className="flex justify-between items-start gap-4 w-full">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  {product.vendor_name && (
                    <a
                      href={`/business/${product.vendor_public_id}`}
                      className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors"
                      title="View Vendor Profile"
                    >
                      {product.vendor_owner_name || product.vendor_name}
                    </a>
                  )}
                  <span className="text-xs font-semibold text-gray-100 px-3 py-1 rounded-full">
                    {selectedModel?.name || product.name}
                  </span>
                </div>

                <div className="flex items-start gap-3 flex-shrink-0 mr-4 lg:mr-8 xl:mr-12">
                  {displayedReviews.length > 0 && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 bg-green-700 text-white px-2 py-1 rounded text-[11px] font-bold">
                        {Number((displayedReviews.reduce((acc, r) => acc + parseFloat(r.rating || 0), 0) / displayedReviews.length).toFixed(1))} <Star size={10} className="fill-current" />
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap pr-1">{displayedReviews.length} Reviews</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleWishlistToggle}
                    className="bg-gray-50 hover:bg-gray-100 p-2 rounded-full border border-gray-250 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer -mt-0.5"
                    title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <Heart
                      size={16}
                      className={isWishlisted ? "fill-red-500 text-red-500" : "text-gray-700"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="bg-gray-50 hover:bg-gray-100 text-gray-700 p-2 rounded-full border border-gray-250 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer -mt-0.5"
                    title="Share Product"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              <div className="w-full">
                <h1
                  className={`text-[16px] md:text-[22px] leading-tight font-normal text-gray-800 mt-1 break-words cursor-pointer transition-all ${isTitleExpanded ? '' : 'line-clamp-3'}`}
                  onClick={() => setIsTitleExpanded(!isTitleExpanded)}
                  title={isTitleExpanded ? "Click to collapse" : "Click to expand"}
                >
                  {getVariantTitle(selectedVariant, product)}
                </h1>
                {!isTitleExpanded && getVariantTitle(selectedVariant, product).length > 80 && (
                  <button
                    onClick={() => setIsTitleExpanded(true)}
                    className="text-xs text-red-600 font-bold mt-1 hover:underline flex items-center gap-1"
                  >
                    Show More <ChevronDown size={12} />
                  </button>
                )}
                {isTitleExpanded && (
                  <button
                    onClick={() => setIsTitleExpanded(false)}
                    className="text-xs text-red-600 font-bold mt-1 hover:underline flex items-center gap-1"
                  >
                    Show Less <ChevronUp size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Model Selector (Hidden as requested) */}
            {/* product.models && product.models.length > 1 && ( ... ) */}

            {/* Variant Cards Options */}
            {selectedModel && selectedModel.variants && selectedModel.variants.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Colour / Option: <span className="text-gray-900 font-extrabold">({selectedModel.variants.length} available)</span>
                  </label>
                  {Math.ceil(selectedModel.variants.length / variantsPerPage) > 1 && (
                    <span className="text-xs text-gray-400 font-bold">
                      Page {variantPage} of {Math.ceil(selectedModel.variants.length / variantsPerPage)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  {selectedModel.variants
                    .slice((variantPage - 1) * variantsPerPage, variantPage * variantsPerPage)
                    .map((v, idx) => {
                      const actualIdx = (variantPage - 1) * 8 + idx;
                      const isSelected = selectedVariant?.id === v.id || (selectedVariant && selectedVariant.id === null && selectedVariant.name === v.name);

                      // Extract attributes
                      let vAttrs = {};
                      try {
                        vAttrs = typeof v.attributes === 'string' ? JSON.parse(v.attributes) : (v.attributes || {});
                      } catch (e) { }

                      // Color / title
                      const baseColor = vAttrs['Color'] || vAttrs['colour'] || (v.name ? v.name.split(' (')[0] : '') || `Variant ${actualIdx + 1}`;
                      const sizeKey = Object.keys(vAttrs).find(k => k.toLowerCase() === 'size');
                      const sizeVal = sizeKey ? vAttrs[sizeKey] : '';

                      // Construct subtitle tag by filtering out ignored keys
                      let tagText = '';
                      const otherEntries = Object.entries(vAttrs)
                        .filter(([k]) => !['color', 'colour', 'size', 'title', 'seo_slug', 'seo-slug', 'seo_slugs', 'pack of', 'volume'].includes(k.toLowerCase()))
                        .map(([_, val]) => val);
                      tagText = otherEntries.join(' • ');

                      // Get thumbnail path
                      let variantThumb = '';
                      if (v.images && v.images.length > 0) {
                        const defImg = v.images.find(img => img.isDefault || img.is_default) || v.images[0];
                        variantThumb = defImg ? (defImg.imageUrl || defImg.image_url) : '';
                      } else {
                        const modelDef = selectedModel?.images?.find(img => img.isDefault || img.is_default) || selectedModel?.images?.[0];
                        variantThumb = modelDef ? (modelDef.imageUrl || modelDef.image_url) : '';
                      }

                      return (
                        <button
                          key={v.id || actualIdx}
                          onClick={() => {
                            setSelectedVariant(v);
                            setSelectedAttributes(vAttrs);
                            updateGallery(v, selectedModel, vAttrs, selectedAttributes);
                          }}
                          type="button"
                          className={`group flex flex-col bg-white overflow-hidden flex-shrink-0 min-w-0 transition-all duration-300 ease-out text-left w-full
                              rounded-[18px] md:rounded-[20px]
                              shadow-[0_6px_18px_rgba(0,0,0,0.06)] md:shadow-[0_8px_24px_rgba(0,0,0,0.08)]
                              hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] md:hover:shadow-[0_24px_48px_rgba(0,0,0,0.16)]
                              p-0
                              ${isSelected
                              ? 'border-[1.5px] md:border-[2px] border-red-300 shadow-md md:shadow-lg bg-red-50/10 scale-[1.02] md:scale-[1.03]'
                              : 'border border-[#F1F5F9] md:border-gray-200 hover:-translate-y-[2px] md:hover:-translate-y-[4px] hover:border-red-300'
                            }`}
                        >
                          <div className="block relative w-full aspect-square bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {v.stock !== undefined && v.stock < 10 && (
                              <span className="absolute top-1 left-1.5 text-[10px] font-extrabold z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] text-red-600">
                                {v.stock}
                              </span>
                            )}
                            <img
                              src={getImageUrl(variantThumb)}
                              alt={baseColor}
                              className="w-full h-full object-cover group-hover:scale-105 md:group-hover:scale-110 transition-transform duration-500 ease-out"
                              onError={(e) => { e.target.onerror = null; e.target.src = getImageUrl(null); }}
                            />
                          </div>

                          <div className="flex flex-col flex-1 p-1.5 md:p-2 bg-transparent w-full">
                            <div className="flex flex-col items-start gap-1 w-full mb-1">
                              <h3 className="text-[11px] md:text-[13px] font-[700] md:font-[800] text-gray-900 leading-tight break-words">
                                {baseColor}
                                {sizeVal && (
                                  <>
                                    <span className="text-gray-900"> - </span>
                                    <span className="text-red-600">{sizeVal}</span>
                                  </>
                                )}
                              </h3>
                              {tagText && (
                                <span className="text-[9px] md:text-[10px] font-bold text-red-600 leading-tight break-words">
                                  ({tagText})
                                </span>
                              )}
                            </div>

                            <div className="flex flex-row items-baseline justify-between w-full mt-auto">
                              <div className="flex items-baseline gap-1 md:gap-1.5 flex-wrap">
                                <span className="text-[13px] md:text-[15px] font-bold text-gray-900 leading-none">₹{Math.round(v.price).toLocaleString('en-IN')}</span>
                                {v.mrp > v.price && (
                                  <span className="text-[9px] md:text-[11px] text-gray-400 line-through font-medium">₹{Math.round(v.mrp).toLocaleString('en-IN')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Previous / Next Pagination Buttons for extra variants */}
                {Math.ceil(selectedModel.variants.length / variantsPerPage) > 1 && (
                  <div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-gray-100 px-1">
                    <button
                      type="button"
                      onClick={() => setVariantPage(p => Math.max(1, p - 1))}
                      disabled={variantPage === 1}
                      className="text-xs font-bold text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      &larr; Previous
                    </button>
                    <span className="text-[10px] font-bold text-gray-400">
                      PAGE {variantPage} / {Math.ceil(selectedModel.variants.length / variantsPerPage)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVariantPage(p => Math.min(Math.ceil(selectedModel.variants.length / variantsPerPage), p + 1))}
                      disabled={variantPage === Math.ceil(selectedModel.variants.length / variantsPerPage)}
                      className="text-xs font-bold text-red-600 disabled:opacity-30 disabled:cursor-not-allowed hover:text-red-700 transition-colors flex items-center gap-1"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Static & Interactive Attributes Logic */}
            {(() => {
              let attrs = {};
              if (selectedVariant) {
                try {
                  attrs = typeof selectedVariant.attributes === 'string'
                    ? JSON.parse(selectedVariant.attributes)
                    : (selectedVariant.attributes || {});
                } catch (e) { }
              }

              // Clean up accidental vendor duplicates
              const cleanedAttrs = { ...attrs };
              Object.keys(cleanedAttrs).forEach(k => {
                const exactKey = k.trim();
                const lower = exactKey.toLowerCase();
                if (lower === 'size' && exactKey !== 'Size' && cleanedAttrs['Size'] && String(cleanedAttrs['Size']).toLowerCase() === String(cleanedAttrs[k]).toLowerCase()) {
                  delete cleanedAttrs[k];
                }
              });

              const staticAttrs = [];
              const seenStaticKeys = new Set();
              Object.entries(cleanedAttrs).forEach(([k, v]) => {
                const exactKey = k.trim();
                const lower = exactKey.toLowerCase();

                // Pack of and Volume are always static text
                if (['pack of', 'volume'].includes(lower) && v) {
                  if (!seenStaticKeys.has(lower)) {
                    staticAttrs.push({ key: exactKey, value: v });
                    seenStaticKeys.add(lower);
                  }
                }
                // If there are custom attributes, Main 'Size' becomes static text
                else if (modelHasCustomAttrs && exactKey === 'Size' && v) {
                  if (!seenStaticKeys.has('size')) {
                    staticAttrs.push({ key: exactKey, value: v });
                    seenStaticKeys.add('size');
                  }
                }
              });

              if (selectedVariant && selectedVariant.stock !== undefined) {
                staticAttrs.push({ key: 'STOCK', value: selectedVariant.stock });
              }

              const hasStaticAttrs = staticAttrs.length > 0;

              return (
                <>
                  {hasStaticAttrs && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                      {staticAttrs.map(({ key, value }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{key}:</span>
                          <span className="text-xs font-extrabold text-red-600 uppercase tracking-wider">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {Object.keys(attributeMap).length > 0 && (
                    <div className="flex flex-col gap-y-4 pt-2.5 border-t border-gray-100 mt-3">
                      {Object.entries(attributeMap).map(([attrKey, attrValuesSet]) => {
                        const attrValues = Array.from(attrValuesSet);
                        if (attrValues.length === 0) return null;
                        const currentVal = selectedAttributes[attrKey] || '';

                        return (
                          <div key={attrKey} className="flex flex-row items-center gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {attrKey}:
                            </label>
                            <div className="flex flex-wrap gap-3">
                              {attrValues.map((val) => {
                                const isSelected = String(selectedAttributes[attrKey]).toLowerCase() === String(val).toLowerCase();
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleAttributeChange(attrKey, val)}
                                    className={`min-w-[80px] flex items-center justify-center px-4 py-2 text-xs font-extrabold rounded-xl border transition-all ${isSelected
                                      ? 'bg-transparent text-red-500 border-red-400 shadow-sm scale-105'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-red-400 hover:bg-red-50/10'
                                      }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Unified Price, Stock, and Action Buttons Container */}
            <div className="bg-white border-0 lg:border border-gray-200 rounded-none lg:rounded-2xl py-2.5 px-1 lg:p-5 shadow-none lg:shadow-sm flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">

              {selectedVariant ? (
                <>
                  {/* MOBILE VIEW PRICING (Single Line: Discount, Price, MRP) */}
                  <div className="flex lg:hidden flex-row items-center gap-2 flex-wrap">
                    {Number(selectedVariant.mrp) > Number(selectedVariant.price) && (
                      <span className="text-sm font-extrabold text-green-700 bg-[#e5f5eb] px-2 py-0.5 rounded-md">
                        {Math.round(((Number(selectedVariant.mrp) - Number(selectedVariant.price)) / Number(selectedVariant.mrp)) * 100)}% off
                      </span>
                    )}
                    <span className="text-2xl font-bold text-black tracking-tight leading-none">
                      <span className="text-xl mr-0.5">₹</span>
                      {Number(selectedVariant.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-base font-bold text-gray-400 line-through decoration-2">
                      ₹{Number(selectedVariant.mrp).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* DESKTOP VIEW PRICING (Original Layout) */}
                  <div className="hidden lg:flex flex-col gap-2">
                    {/* Price and Stock Badge */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-3xl font-bold text-black tracking-tight leading-none">
                        <span className="text-2xl mr-0.5">₹</span>
                        {Number(selectedVariant.price).toLocaleString('en-IN')}
                      </span>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-white whitespace-nowrap ${selectedVariant.stock > 0 ? 'text-green-600 border-green-400' : 'text-red-600 border-red-400'}`}>
                        {selectedVariant.stock > 0 ? `${selectedVariant.stock} In Stock` : 'Out of Stock'}
                      </span>
                    </div>

                    {/* MRP and Discount */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-400 line-through decoration-2">
                        ₹{Number(selectedVariant.mrp).toLocaleString('en-IN')}
                      </span>
                      {Number(selectedVariant.mrp) > Number(selectedVariant.price) && (
                        <span className="text-xs font-bold text-green-700 bg-[#e5f5eb] px-2 py-0.5 rounded-md">
                          {Math.round(((Number(selectedVariant.mrp) - Number(selectedVariant.price)) / Number(selectedVariant.mrp)) * 100)}% off
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full flex-1 bg-yellow-50 text-yellow-800 p-4 border border-yellow-100 rounded-xl flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span className="text-xs font-semibold">Variant combination currently unavailable.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-row w-full lg:w-auto gap-2 lg:gap-3 flex-shrink-0 lg:mt-0 lg:mr-8 xl:mr-12">
                {currentCartItem ? (
                  <button
                    onClick={() => navigate('/cart')}
                    className="flex-1 px-4 lg:px-6 xl:px-8 bg-white hover:bg-gray-50 border-2 border-red-600 text-red-600 font-bold py-3 lg:py-3.5 rounded-xl shadow-sm transition-colors text-sm tracking-wider flex items-center justify-center gap-2 uppercase whitespace-nowrap"
                  >
                    <ShoppingCart size={18} /> GO TO CART
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={!selectedVariant || selectedVariant.stock === 0}
                    className="flex-1 px-4 lg:px-6 xl:px-8 bg-transparent hover:bg-red-50 border-2 border-red-600 text-red-600 font-bold py-3 lg:py-3.5 rounded-xl shadow-sm transition-colors text-sm tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase whitespace-nowrap"
                  >
                    <ShoppingCart size={18} /> ADD TO CART
                  </button>
                )}
                <button
                  onClick={handleBuyNow}
                  disabled={!selectedVariant || selectedVariant.stock === 0}
                  className="flex-1 px-4 lg:px-6 xl:px-8 bg-red-600 hover:bg-red-700 text-white font-bold py-3 lg:py-3.5 rounded-xl shadow-sm transition-colors text-sm tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase whitespace-nowrap"
                >
                  <ShoppingBag size={18} /> BUY NOW
                </button>
              </div>
            </div>

            {/* Cart Success Toast/Banner */}
            {cartSuccessMessage && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-sm animate-pulse mt-2">
                <span className="text-base">✨</span>
                <span>{cartSuccessMessage}</span>
              </div>
            )}

            {/* Specs & Documents Info panel */}
            <div className="space-y-4 pt-4 border-t border-gray-150">

              {/* Highlights list */}
              {displayHighlights && displayHighlights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Highlights</h3>
                  <div className="grid grid-cols-1 gap-2 md:gap-3">
                    {displayHighlights.map((h, i) => (
                      <div key={i} className="flex gap-2 items-start p-0 md:p-2 bg-transparent md:bg-gray-50/50 rounded-none md:rounded-xl border-0 md:border border-gray-100">
                        <div className="hidden md:flex p-1 rounded-lg bg-white shadow-sm flex-shrink-0">
                          {getHighlightIcon(h)}
                        </div>
                        <div className="text-sm md:text-xs text-gray-700 md:text-gray-600 leading-relaxed whitespace-pre-wrap break-words break-all min-w-0 w-full pb-1 flex items-start gap-2 before:content-['•'] md:before:content-none before:text-gray-400" style={{ wordBreak: 'break-word' }}>
                          {h}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Details sections */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex bg-gray-50 border-b border-gray-200">
                  {['Specifications', 'Description', 'Warranty'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activeDetailTab === tab ? 'border-red-600 text-gray-900 bg-white' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-2 md:p-5 min-h-[150px]">
                  {activeDetailTab === 'Specifications' && (
                    <div>
                      {finalSpecs.length > 0 ? (
                        <div className="rounded-xl overflow-hidden text-xs max-w-2xl">
                          <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-gray-100">
                              {finalSpecs.map((s, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                  <td className="py-2 px-2 md:py-2.5 md:px-4 font-semibold text-gray-500 w-28 md:w-40 sm:w-48 border-r border-gray-100">
                                    {s.label}
                                  </td>
                                  <td className="py-2 px-2 md:py-2.5 md:px-4 font-medium text-gray-900 break-words break-all">
                                    {s.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No specifications provided.</p>
                      )}
                    </div>
                  )}

                  {activeDetailTab === 'Description' && (
                    selectedVariant?.description ? (
                      <div className="text-xs text-gray-600 leading-relaxed break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {selectedVariant.description}
                      </div>
                    ) : (
                      <div
                        className="text-xs text-gray-600 leading-relaxed rich-text-content break-words"
                        style={{ wordBreak: 'break-word' }}
                        dangerouslySetInnerHTML={{ __html: selectedModel?.description || 'No description available.' }}
                      ></div>
                    )
                  )}

                  {activeDetailTab === 'Warranty' && (
                    <div className="text-xs text-gray-600 space-y-2 break-words" style={{ wordBreak: 'break-word' }}>
                      <p><strong>Warranty Detail:</strong> {selectedVariant?.warranty || selectedModel?.warranty || 'No Warranty specified.'}</p>
                      <p><strong>What's in the Box:</strong> {selectedVariant?.whats_in_the_box || selectedModel?.whats_in_the_box || 'Main Unit'}</p>
                      <p>
                        <strong>Return Policy:</strong>{' '}
                        {(() => {
                          const policy = selectedVariant?.return_policy || 'NO_RETURN';
                          if (policy === 'NO_RETURN') return 'Non-Returnable';
                          if (policy === 'REPLACEMENT_ONLY') return 'Replacement Only';
                          if (policy === 'REFUND_ONLY') return 'Refund Only (Refund upon return)';
                          if (policy === 'REPLACEMENT_AND_REFUND') return 'Return & Replacement Available';
                          return selectedModel?.return_policy || 'Non-Returnable';
                        })()}
                      </p>
                      {selectedVariant?.return_policy && selectedVariant.return_policy !== 'NO_RETURN' && (
                        <p><strong>Return Window:</strong> {selectedVariant?.return_window_days || selectedModel?.return_days || 7} Days</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Similar Products (Mobile Only, Above Reviews) ── */}
              {renderSimilarProducts("block lg:hidden mt-8 bg-white p-0 rounded-2xl", true)}

              {/* Reviews Section - Full Width Below Specs */}
              <div className="mt-8 bg-white md:p-6 rounded-2xl border-0 md:border md:border-gray-200 shadow-none md:shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6 border-b border-gray-100 pb-3 flex items-center gap-2">
                  <Star className="text-primary fill-current w-5 h-5" /> Customer Reviews
                </h3>
                <div className="space-y-4">
                  {displayedReviews.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">No reviews yet for this variant.</p>
                  ) : (
                    <div className="space-y-6">
                      {displayedReviews.map(review => (
                        <div key={review.id} className="border border-gray-100 rounded-2xl p-4 shadow-sm bg-white hover:shadow-md transition-shadow">
                          {/* Top Row: Rating Badge + Title + Date */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-bold border border-green-100">
                                  {parseFloat(review.rating)} <Star className="w-3 h-3 fill-current" />
                                </div>
                                <span className="text-sm font-bold text-gray-800">{review.title}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap">{new Date(review.created_at).toLocaleDateString('en-IN')}</span>
                          </div>

                          {/* Body */}
                          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{review.body}</p>

                          <hr className="border-gray-100 my-3" />

                          {/* Bottom Row: User Info & Thumbs */}
                          <div className="flex justify-between items-center mt-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] text-gray-700 font-medium">{review.user_name}</span>
                              {review.is_verified_purchase ? (
                                <span className="text-[11px] text-green-600 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Verified Buyer
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-4 text-gray-500">
                              <button
                                onClick={() => handleVoteHelpful(review.id)}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${likedReviews.has(review.id) ? 'text-orange-500' : 'hover:text-orange-500'}`}
                              >
                                <ThumbsUp className={`w-4 h-4 ${likedReviews.has(review.id) ? 'fill-current' : ''}`} /> {review.helpful_count || 0}
                              </button>
                              <button
                                onClick={() => handleVoteUnhelpful(review.id)}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${dislikedReviews.has(review.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                              >
                                <ThumbsDown className={`w-4 h-4 ${dislikedReviews.has(review.id) ? 'fill-current' : ''}`} /> {review.unhelpful_count || 0}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* ── Similar Products (Full Width Below Both Columns, Desktop Only) ── */}
        {renderSimilarProducts("hidden lg:block mt-12 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm w-full mb-8", false)}

      </div>

      {/* Fullscreen Zoom Gallery Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 bg-white/10 p-2 rounded-full backdrop-blur-sm transition-all"
          >
            <X size={24} />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex items-center justify-center">
            <img src={getImageUrl(mainImage)} alt="Zoomed view" className="max-w-full max-h-full object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setIsShareModalOpen(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl flex flex-col gap-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-150">
              <h3 className="font-bold text-lg text-gray-800">Share Product</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 py-2">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `🛍️ *${getVariantTitle(selectedVariant, product)}*\n💰 *Price:* ${selectedVariant ? `₹${Number(selectedVariant.price).toLocaleString('en-IN')}` : ''}\nLink: ${window.location.href}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.417 9.86-9.86.002-2.638-1.017-5.114-2.87-6.97-1.854-1.855-4.327-2.877-6.969-2.879-5.439 0-9.861 4.42-9.864 9.863-.001 1.682.443 3.325 1.288 4.776L1.879 21l4.768-1.252-.001.006zm12.302-5.411c-.33-.165-1.951-.963-2.28-1.082-.33-.119-.571-.178-.81.178-.239.356-.927 1.171-1.136 1.409-.209.238-.419.267-.749.102-.33-.165-1.393-.513-2.653-1.638-.98-.874-1.642-1.953-1.834-2.282-.19-.33-.021-.508.144-.672.148-.148.33-.386.495-.579.165-.193.22-.32.33-.535.11-.214.055-.401-.028-.566-.082-.165-.71-1.713-.973-2.348-.256-.62-.516-.536-.71-.546-.179-.01-.384-.01-.589-.01-.205 0-.539.077-.821.386-.282.31-1.077 1.051-1.077 2.562 0 1.511 1.099 2.973 1.253 3.178.154.205 2.162 3.3 5.239 4.629.732.316 1.302.505 1.748.646.736.234 1.407.201 1.937.122.59-.088 1.951-.797 2.227-1.566.275-.769.275-1.428.193-1.566-.083-.138-.302-.22-.632-.385z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700">WhatsApp</span>
              </a>

              {/* Facebook */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2] group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700">Facebook</span>
              </a>

              {/* Twitter/X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `Check out this product: ${getVariantTitle(selectedVariant, product)}`
                )}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-black/10 flex items-center justify-center text-black group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700">Twitter / X</span>
              </a>

              {/* Copy Link */}
              <div
                onClick={async () => {
                  try {
                    const shareText = `🛍️ *${getVariantTitle(selectedVariant, product)}*\n💰 *Price:* ${selectedVariant ? `₹${Number(selectedVariant.price).toLocaleString('en-IN')}` : ''}\nLink: ${window.location.href}`;
                    await navigator.clipboard.writeText(shareText);
                    toast.success('Product details and link copied to clipboard!');
                  } catch (e) {
                    toast.error('Failed to copy link.');
                  }
                  setIsShareModalOpen(false);
                }}
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:scale-105 transition-transform border border-gray-200">
                  <Copy size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-700">Copy Link</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3 flex gap-3 md:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.12)]">
        {currentCartItem ? (
          <button
            onClick={() => navigate('/cart')}
            className="flex-1 bg-white border-2 border-amber-500 hover:bg-amber-50 text-amber-600 font-extrabold py-3.5 rounded-xl shadow-sm transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-1.5"
          >
            <ShoppingCart size={16} /> Go to Cart
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock === 0}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <ShoppingCart size={16} /> Add to Cart
          </button>
        )}
        <button
          onClick={handleBuyNow}
          disabled={!selectedVariant || selectedVariant.stock === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl shadow-md transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ShoppingBag size={16} /> Buy Now
        </button>
      </div>

    </div>
  );
};

export default ProductDetails;
