import React, { useState, useEffect } from 'react';
import * as rrdPkg from 'react-router-dom';
const { useParams } = rrdPkg;
import api from '../services/api';
import ServiceDetails from './ServiceDetails';
import GalleryDetails from './GalleryDetails';

const slugify = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DynamicDetailDispatcher = () => {
  const { vendorSlug, serviceTitle, productTitle } = useParams();
  const itemTitle = serviceTitle || productTitle;
  
  const [type, setType] = useState(null); // 'service' or 'product'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveType = async () => {
      try {
        setLoading(true);
        // Fetch the business profile
        const res = await api.get(`/public/business/${vendorSlug}`);
        const biz = res.data.business;
        if (biz) {
          // 1. Check if it matches a gallery product
          if (biz.gallery_images) {
            const gallery = typeof biz.gallery_images === 'string' ? JSON.parse(biz.gallery_images) : biz.gallery_images;
            if (Array.isArray(gallery)) {
              const targetSlug = slugify(itemTitle);
              const foundIdx = gallery.findIndex(item => {
                const name = typeof item === 'string' ? 'Product' : (item.name || 'Product');
                return slugify(name) === targetSlug;
              });
              if (foundIdx !== -1) {
                setType('product');
                setLoading(false);
                return;
              }
            }
          }
          
          // 2. Default fallback to service details if not matching any product
          setType('service');
        } else {
          setType('service');
        }
      } catch (err) {
        console.error('Dispatcher error:', err);
        setType('service');
      } finally {
        setLoading(false);
      }
    };

    resolveType();
  }, [vendorSlug, itemTitle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (type === 'product') {
    return <GalleryDetails />;
  }

  return <ServiceDetails />;
};

export default DynamicDetailDispatcher;
