import React, { useState, useRef, useEffect } from 'react';
import { getImageUrl } from '../utils/imageUrl';

/**
 * OptimizedImage — Lazy-loading, progressive-loading image component
 */
const OptimizedImage = ({
  src,
  sizes,
  alt = '',
  className = '',
  style = {},
  width,
  height,
  objectFit = 'cover',
  priority = false,
}) => {
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    if (priority) return;
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  // Select best source based on available sizes
  useEffect(() => {
    if (!isVisible) return;

    if (sizes && typeof sizes === 'object') {
      const el = imgRef.current;
      const containerWidth = el?.parentElement?.offsetWidth || window.innerWidth;

      // Pick smallest size that's >= container width
      const sizeMap = {
        thumb: 300,
        small: 600,
        medium: 1200,
        large: 2000,
        logo_small: 200,
        banner: 1920,
        mobile: 720,
        tablet: 1200,
        desktop: 1920,
      };

      const sortedKeys = Object.keys(sizes)
        .filter(k => k !== 'main' && sizes[k])
        .sort((a, b) => (sizeMap[a] || 999) - (sizeMap[b] || 999));

      let selectedKey = sortedKeys[sortedKeys.length - 1]; // default to largest
      for (const key of sortedKeys) {
        if ((sizeMap[key] || 999) >= containerWidth) {
          selectedKey = key;
          break;
        }
      }

      setCurrentSrc(getImageUrl(sizes[selectedKey] || sizes.main || src));
    } else {
      setCurrentSrc(getImageUrl(src));
    }
  }, [isVisible, sizes, src]);

  // Thumbnail for blur-up
  const thumbSrc = sizes && sizes.thumb ? getImageUrl(sizes.thumb) : null;

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        ...style,
      }}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded" />
      )}

      {/* Blur-up thumbnail (loads instantly, shown blurred behind main image) */}
      {isVisible && thumbSrc && !isLoaded && (
        <img
          src={thumbSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit,
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            opacity: 0.8,
          }}
        />
      )}

      {/* Main image */}
      {isVisible && currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectFit }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
