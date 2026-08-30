import pool from '../config/db.js';

function matchRoute(path, pattern) {
  if (pattern === '/' && (path === '/' || path === '')) return {};
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].substring(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// Dynamic public asset and URL resolvers
export function resolvePublicUrl(path, baseOrigin = 'https://www.ibcmart.com') {
  if (!path) return baseOrigin;
  const str = String(path).trim();
  if (/^https?:\/\//i.test(str)) {
    return str;
  }
  const cleanPath = str.startsWith('/') ? str.substring(1) : str;
  return `${baseOrigin}/${cleanPath}`;
}

export function resolvePublicAssetUrl(url, baseOrigin = 'https://www.ibcmart.com') {
  if (!url) return `${baseOrigin}/og-default.png`;
  const str = String(url).trim();

  if (/^https?:\/\//i.test(str)) {
    return str;
  }

  const uploadsIndex = str.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    const relativePath = str.substring(uploadsIndex);
    return `${baseOrigin}/${relativePath}`;
  }

  const cleanPath = str.startsWith('/') ? str.substring(1) : str;
  return `${baseOrigin}/${cleanPath}`;
}

// Exclude sensitive data from business profile returned to public page
export function serializePublicBusiness(biz) {
  if (!biz) return null;
  const publicFields = [
    'id', 'user_id', 'public_id', 'business_name', 'vendor_type', 'category', 'keywords',
    'business_logo', 'store_banner', 'gallery_images', 'gallery_only',
    'store_description', 'business_address', 'city', 'state', 'pincode',
    'country', 'website', 'youtube_link', 'whatsapp_number', 'phone_number',
    'social_links', 'working_hours', 'kyc_status', 'slug', 'business_email',
    'owner_name', 'email', 'phone'
  ];
  const serialized = {};
  for (const field of publicFields) {
    if (field in biz) {
      serialized[field] = biz[field];
    }
  }
  return serialized;
}

// Clean and sanitize string values to prevent undefined/null leaks in head tags
function createResult(pageType, seo, extra = {}, baseOrigin = 'https://www.ibcmart.com') {
  const safe = (val, fallback) => {
    if (val === undefined || val === null || val === 'undefined' || val === 'null' || typeof val === 'object') {
      return fallback;
    }
    const str = String(val).trim();
    return str.length > 0 ? str : fallback;
  };

  const seoData = {
    title: safe(seo.title, 'IBC Mart - Enterprise Marketplace'),
    description: safe(seo.description, 'Discover local products, services, and opportunities on IBC Mart.'),
    canonical: resolvePublicUrl(seo.canonical, baseOrigin)
  };
  if (seo.keywords) {
    seoData.keywords = safe(seo.keywords, '');
  }

  // Centralized structured data generation for consistency and DRY principles
  let jsonLd = null;
  let breadcrumb = null;

  if (pageType === 'businessProfile' && extra.business) {
    const biz = extra.business;
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: biz.business_name,
      url: seoData.canonical,
      telephone: biz.phone_number || biz.phone || undefined,
      description: biz.store_description || biz.description || undefined,
      image: biz.business_logo ? resolvePublicAssetUrl(biz.business_logo, baseOrigin) : undefined,
      address: {
        '@type': 'PostalAddress',
        streetAddress: biz.business_address || undefined,
        addressLocality: biz.city || undefined,
        addressRegion: biz.state || undefined,
        postalCode: biz.pincode || undefined,
        addressCountry: 'IN',
      },
    };
    breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: resolvePublicUrl('/', baseOrigin) },
        { '@type': 'ListItem', position: 2, name: biz.city || 'India', item: resolvePublicUrl(`/${(biz.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, baseOrigin) },
        { '@type': 'ListItem', position: 3, name: biz.business_name, item: seoData.canonical },
      ],
    };
  } else if (pageType === 'serviceDetails' && extra.service) {
    const s = extra.service;
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: s.name || s.title || 'Service',
      url: seoData.canonical,
      description: s.description || undefined,
      image: s.image_path ? resolvePublicAssetUrl(s.image_path, baseOrigin) : undefined,
      provider: {
        '@type': 'LocalBusiness',
        name: s.business_name,
      }
    };
  } else if (pageType === 'productDetails' && extra.product) {
    const p = extra.product;
    const v = extra.variant;
    const desc = p.description || (v ? v.description : '') || '';
    const cleanDesc = desc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: v && v.name ? v.name : p.name,
      url: seoData.canonical,
      description: cleanDesc || undefined,
      image: p.image_path ? resolvePublicAssetUrl(p.image_path, baseOrigin) : undefined,
      brand: {
        '@type': 'Brand',
        name: p.brand || p.business_name || 'IBC Mart',
      }
    };
    if (v) {
      jsonLd.offers = {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: v.price,
        itemCondition: 'https://schema.org/NewCondition',
        availability: v.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      };
    }
  } else if (pageType === 'jobDetails' && extra.job) {
    const j = extra.job;
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: j.title,
      description: j.description ? j.description.replace(/<[^>]*>/g, '').substring(0, 160) : `Apply for ${j.title} at ${j.business_name}.`,
      datePosted: j.created_at,
      validThrough: j.application_deadline || undefined,
      employmentType: j.employment_type ? j.employment_type.replace(' ', '_').toUpperCase() : 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: j.business_name,
        logo: j.business_logo ? resolvePublicAssetUrl(j.business_logo, baseOrigin) : undefined,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: j.city || undefined,
          addressRegion: j.state || undefined,
          addressCountry: 'IN'
        }
      },
      baseSalary: j.salary_min ? {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          minValue: j.salary_min,
          maxValue: j.salary_max || undefined,
          unitText: j.salary_period ? j.salary_period.toUpperCase() : 'MONTH'
        }
      } : undefined
    };
  } else if (pageType === 'home') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${baseOrigin}/#website`,
          url: baseOrigin + '/',
          name: 'IBC MART',
          description: seoData.description
        },
        {
          '@type': 'WebPage',
          '@id': seoData.canonical,
          url: seoData.canonical,
          name: seoData.title,
          description: seoData.description
        }
      ]
    };
  } else if (pageType === 'serviceCategory' || pageType === 'productsListing' || pageType === 'jobsListing' || pageType === 'galleryProduct') {
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: seoData.title,
      url: seoData.canonical,
      description: seoData.description
    };
  }

  return {
    pageType,
    ...extra,
    seoData,
    jsonLd,
    breadcrumb
  };
}

export async function fetchSeoData(url, baseOrigin = process.env.BASE_URL || 'https://www.ibcmart.com') {
  try {
    const urlObj = new URL(url, 'http://localhost');
    let path = urlObj.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    // 1. Home
    if (path === '/' || path === '') {
      return createResult('home', {
        title: 'IBC Mart - Enterprise Ecommerce, Businesses Directory, Job Portal and IBC Community',
        description: 'IBC Mart (International Businesses Community) is a leading enterprise ecommerce, businesses directory, job portal and IBC community.',
        keywords: 'IBC Mart, International Businesses Community, IBC, Top Ecommerce Shopping Portal, Best Businesses Directory, Top Job Portal, Best Job Portal in India, Top Businesses Community',
        canonical: '/'
      }, {}, baseOrigin);
    }

    // 2. Business Profile
    let match = matchRoute(path, '/:locationSlug/shop/:slug/:categorySlug/:keywordsSlug')
      || matchRoute(path, '/:locationSlug/shop/:slug/:categorySlug')
      || matchRoute(path, '/shop/:slug');

    if (match) {
      const { slug, locationSlug, categorySlug } = match;
      const [businesses] = await pool.query(`
        SELECT vp.*, u.name as owner_name, u.email, u.phone 
        FROM vendor_profiles vp
        JOIN users u ON vp.user_id = u.id
        WHERE (vp.slug = ? OR vp.public_id = ?) AND vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
      `, [slug, slug]);

      if (businesses.length > 0) {
        const business = businesses[0];
        const [services] = await pool.query(
          "SELECT * FROM vendor_services WHERE vendor_id = ? ORDER BY created_at DESC",
          [business.user_id]
        );

        let canonical = `/shop/${slug}`;
        if (locationSlug && categorySlug) {
          canonical = `/${locationSlug}/shop/${slug}/${categorySlug}`;
        }

        const catName = categorySlug ? categorySlug.replace(/-/g, ' ') : '';
        const locName = locationSlug ? locationSlug.replace(/-/g, ' ') : '';
        const displayTitle = business.business_name + (catName ? ` - ${catName}` : ' - Services') + (locName ? ` in ${locName}` : '') + ' | IBC Mart';
        const displayKeywords = [business.business_name, business.keywords, business.category, business.subcategory, business.city, 'Local Business', 'IBC Mart'].filter(Boolean).join(', ');

        // Serialize profile to clean out private payment/banking/KYC info
        const publicBusiness = serializePublicBusiness(business);

        return createResult('businessProfile', {
          title: displayTitle,
          description: business.store_description || business.description ? (business.store_description || business.description).substring(0, 160) : `${business.business_name} provides services in ${business.city || 'India'}. Contact us for more details.`,
          keywords: displayKeywords,
          canonical: canonical
        }, {
          business: { ...publicBusiness, id: publicBusiness.id, business_id: publicBusiness.id },
          services: services
        }, baseOrigin);
      } else {
        return createResult('notFound', {
          title: 'Business Not Found | IBC Mart',
          description: 'The requested business profile could not be found or is no longer active.',
          canonical: '/'
        }, { status: 404 }, baseOrigin);
      }
    }

    // 3. Service Details
    match = matchRoute(path, '/:locationSlug/:vendorSlug/:categorySlug/:serviceTitle')
         || matchRoute(path, '/:locationSlug/:categorySlug/:slug/:vendorSlug')
         || matchRoute(path, '/service/:slug');
    if (match) {
      const { slug, locationSlug, categorySlug, vendorSlug, serviceTitle } = match;
      if (vendorSlug === 'product' || categorySlug === 'product' || slug === 'product') {
        match = null;
      }
    }
    if (match) {
      const { slug, locationSlug, categorySlug, vendorSlug, serviceTitle } = match;
      const lookupVal = serviceTitle ? decodeURIComponent(serviceTitle) : slug;
      let services = [];
      const slugify = (text) => String(text).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      if (serviceTitle && vendorSlug) {
        // Query vendor profile by vendorSlug
        const [vendors] = await pool.query(
          "SELECT user_id, business_name, city, slug, category, gallery_images FROM vendor_profiles WHERE slug = ? OR public_id = ?",
          [vendorSlug, vendorSlug]
        );
        if (vendors.length > 0) {
          const vendor = vendors[0];
          const vendorId = vendor.user_id;
          
          // 1. Check if it matches a gallery product in the business profile
          if (vendor.gallery_images) {
            const gallery = typeof vendor.gallery_images === 'string' ? JSON.parse(vendor.gallery_images) : vendor.gallery_images;
            if (Array.isArray(gallery)) {
              const targetSlug = slugify(lookupVal);
              const foundIdx = gallery.findIndex(item => {
                const name = typeof item === 'string' ? 'Product' : (item.name || 'Product');
                return slugify(name) === targetSlug;
              });
              
              if (foundIdx !== -1) {
                const productItem = gallery[foundIdx];
                const pName = typeof productItem === 'string' ? 'Product' : (productItem.name || 'Product');
                const pDesc = typeof productItem === 'string' ? '' : (productItem.description || '');
                const canonical = `/${locationSlug}/${vendor.slug}/${categorySlug}/${targetSlug}/`;
                
                return createResult('galleryProduct', {
                  title: `${pName} by ${vendor.business_name} | IBC Mart`,
                  description: pDesc ? pDesc.substring(0, 160) : `Check out ${pName} provided by ${vendor.business_name}.`,
                  canonical: canonical
                }, { product: productItem, business: vendor, itemIndex: foundIdx }, baseOrigin);
              }
            }
          }

          // 2. Fetch all services for this vendor
          const [vendorServices] = await pool.query(`
            SELECT s.*, vp.business_name, vp.city, vp.slug as business_slug
            FROM vendor_services s
            JOIN vendor_profiles vp ON s.vendor_id = vp.user_id
            WHERE s.vendor_id = ?
          `, [vendorId]);
          
          // Match in JS using slugify
          const targetSlug = slugify(lookupVal);
          const matched = vendorServices.find(s => slugify(s.name) === targetSlug || slugify(s.slug) === targetSlug || String(s.id) === targetSlug);
          if (matched) {
            services = [matched];
          }
        }
      }

      if (services.length === 0) {
        const [generalServices] = await pool.query(`
          SELECT s.*, vp.business_name, vp.city, vp.slug as business_slug
          FROM vendor_services s
          JOIN vendor_profiles vp ON s.vendor_id = vp.user_id
          WHERE s.slug = ? OR s.id = ? OR s.name = ?
        `, [lookupVal, lookupVal, lookupVal]);
        services = generalServices;
      }

      if (services.length > 0) {
        const service = services[0];
        let canonical = `/service/${service.slug}`;
        if (locationSlug && categorySlug && (vendorSlug || serviceTitle)) {
          const vSlug = vendorSlug || service.business_slug;
          const sTitle = serviceTitle || service.name;
          canonical = `/${locationSlug}/${vSlug}/${categorySlug}/${sTitle}/`;
        }

        const sName = service.name || service.title || 'Service';
        return createResult('serviceDetails', {
          title: `${sName} by ${service.business_name} | IBC Mart`,
          description: service.description ? service.description.substring(0, 160) : `Book ${sName} provided by ${service.business_name}.`,
          canonical: canonical
        }, { service }, baseOrigin);
      } else {
        return createResult('notFound', {
          title: 'Service Not Found | IBC Mart',
          description: 'The requested service could not be found or is no longer available.',
          canonical: '/'
        }, { status: 404 }, baseOrigin);
      }
    }

    // 4. Product Details
    match = matchRoute(path, '/:category/product/:variantSlug/:slug') || 
            matchRoute(path, '/:category/product/:slug') || 
            matchRoute(path, '/product/:slug');
    if (match) {
      const { slug, variantSlug: urlVariantSlug } = match;
      const [products] = await pool.query(`
        SELECT p.*, vp.business_name, c.name as category_name
        FROM products p
        LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.slug = ?
      `, [slug]);

      if (products.length > 0) {
        const product = products[0];

        // Fetch variant if requested in the URL, query parameter, or default to the first variant
        const variantSlug = urlVariantSlug || urlObj.searchParams.get('variant');
        let variant = null;
        if (variantSlug) {
          const [vars] = await pool.query(`
            SELECT v.* FROM variants v
            JOIN models m ON v.model_id = m.id
            WHERE m.product_id = ? AND (v.seo_slug = ? OR v.id = ?)
          `, [product.id, variantSlug, variantSlug]);
          if (vars.length > 0) variant = vars[0];
        }
        if (!variant) {
          const [vars] = await pool.query(`
            SELECT v.* FROM variants v
            JOIN models m ON v.model_id = m.id
            WHERE m.product_id = ?
            ORDER BY v.price ASC LIMIT 1
          `, [product.id]);
          if (vars.length > 0) variant = vars[0];
        }

        // Resolve description using product description or variant description
        const rawDesc = product.description || product.short_description || (variant ? variant.description : '') || '';
        const cleanDesc = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const displayDesc = cleanDesc ? (cleanDesc.length > 160 ? cleanDesc.substring(0, 157) + '...' : cleanDesc) : `Buy ${product.name} on IBC Mart.`;

        // Make canonical absolute / preserve variant query param
        const categorySlug = (product.category || product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let canonical = `/${categorySlug}/product`;
        if (variantSlug) {
          canonical += `/${variantSlug}`;
        }
        canonical += `/${slug}`;

        return createResult('productDetails', {
          title: `${product.name} | IBC Mart`,
          description: displayDesc,
          canonical: canonical
        }, { product, variant }, baseOrigin);
      } else {
        return createResult('notFound', {
          title: 'Product Not Found | IBC Mart',
          description: 'The requested product could not be found or is no longer available.',
          canonical: '/products'
        }, { status: 404 }, baseOrigin);
      }
    }

    // 4.1 Job Details
    match = matchRoute(path, '/jobs/:slug/:locationSlug') || matchRoute(path, '/jobs/:slug');
    if (match) {
      const { slug } = match;
      const [jobs] = await pool.query(`
        SELECT j.*, vp.business_name, vp.business_logo, vp.city as vendor_city, vp.state as vendor_state, vp.slug as vendor_slug, vp.store_description, vp.public_id, vp.year_established, c.name as category_name
        FROM jobs j
        JOIN vendor_profiles vp ON j.vendor_id = vp.user_id
        LEFT JOIN job_categories c ON j.category_id = c.id
        WHERE j.slug = ? AND (j.status = 'ACTIVE' OR j.status = 'PUBLISHED')
      `, [slug]);

      if (jobs.length > 0) {
        const job = jobs[0];
        return createResult('jobDetails', {
          title: `${job.title} at ${job.business_name} | IBC Jobs`,
          description: job.description ? job.description.replace(/<[^>]*>/g, '').substring(0, 160) : `Apply for ${job.title} at ${job.business_name} in ${job.city || vendor_city}.`,
          canonical: `/jobs/${slug}`
        }, { job }, baseOrigin);
      } else {
        return createResult('notFound', {
          title: 'Job Not Found | IBC Jobs',
          description: 'The requested job could not be found or is no longer available.',
          canonical: `/jobs`
        }, { status: 404 }, baseOrigin);
      }
    }

    // 4.2 Jobs Listing
    if (path === '/jobs') {
      return createResult('jobsListing', {
        title: 'Find Your Next Job | IBC Jobs',
        description: 'Explore local opportunities with top community businesses on IBC Mart.',
        canonical: '/jobs'
      }, {}, baseOrigin);
    }

    // 4.3 Businesses Listing
    let businessesMatch = matchRoute(path, '/businesses') || matchRoute(path, '/:locationSlug/businesses');
    if (businessesMatch) {
      const { locationSlug } = businessesMatch;
      const qParam = urlObj.searchParams.get('q') || '';
      const locName = locationSlug ? locationSlug.replace(/-/g, ' ') : '';
      const formattedLoc = locName ? locName.charAt(0).toUpperCase() + locName.slice(1).toLowerCase() : '';
      
      const mainTitle = qParam || 'Best Local Businesses';
      const displayTitle = `${mainTitle}${formattedLoc ? ' in ' + formattedLoc : ' in India'} | IBC Mart`;
      const displayDesc = `Find top rated ${qParam || 'businesses'} in ${formattedLoc || 'India'}. Get contact details, reviews, address, and map location of local professionals on IBC Mart.`;
      const displayKeywords = [qParam, formattedLoc, `businesses in ${formattedLoc}`, `${qParam} in ${formattedLoc}`, 'Local Services', 'Directory', 'IBC Mart'].filter(Boolean).join(', ');

      return createResult('productsListing', {
        title: displayTitle,
        description: displayDesc,
        keywords: displayKeywords,
        canonical: path
      }, {}, baseOrigin);
    }

    // 5. General Products/Brands/Categories Listing
    match = matchRoute(path, '/products') || matchRoute(path, '/category/:slug') || matchRoute(path, '/brand/:slug');
    if (match) {
      const isBrand = path.startsWith('/brand');
      const isCategory = path.startsWith('/category');
      let title = 'Products | IBC Mart';
      if (isBrand && match.slug) title = `${match.slug.replace(/-/g, ' ')} Products | IBC Mart`;
      if (isCategory && match.slug) title = `${match.slug.replace(/-/g, ' ')} | IBC Mart`;

      return createResult('productsListing', {
        title,
        description: `Shop the best ${title} on IBC Mart.`,
        canonical: path
      }, {}, baseOrigin);
    }

    // 6. Gallery Pages
    match = matchRoute(path, '/shop/:slug/gallery') || matchRoute(path, '/:locationSlug/:categorySlug/gallery/:slug');
    if (match) {
      const { slug, locationSlug, categorySlug } = match;
      const [businesses] = await pool.query(`
        SELECT business_name FROM vendor_profiles WHERE slug = ? OR public_id = ?
      `, [slug, slug]);

      if (businesses.length > 0) {
        let canonical = `/shop/${slug}/gallery`;
        if (locationSlug && categorySlug) {
          canonical = `/${locationSlug}/${categorySlug}/gallery/${slug}`;
        }
        return createResult('gallery', {
          title: `Gallery - ${businesses[0].business_name} | IBC Mart`,
          description: `View the gallery and portfolio of ${businesses[0].business_name}.`,
          canonical: canonical
        }, {}, baseOrigin);
      } else {
        return createResult('notFound', {
          title: 'Gallery Not Found | IBC Mart',
          description: 'The requested gallery could not be found.',
          canonical: '/'
        }, { status: 404 }, baseOrigin);
      }
    }

    // 7. Service Category: /:locationSlug/:categorySlug OR /:categorySlug
    // MUST BE LAST as a catch-all
    match = matchRoute(path, '/:locationSlug/:categorySlug') || matchRoute(path, '/:categorySlug');
    if (match) {
      const { categorySlug, locationSlug } = match;

      // Exclude reserved paths
      const reserved = ['api', 'assets', 'uploads', 'cart', 'checkout', 'login', 'register', 'admin', 'vendor', 'superadmin', 'account', 'wishlist', 'orders', 'businesses', 'categories'];
      if (reserved.includes(categorySlug) || (locationSlug && reserved.includes(locationSlug))) {
        return null;
      }

      const [categories] = await pool.query('SELECT * FROM categories WHERE slug = ?', [categorySlug]);
      const kwParam = urlObj.searchParams.get('kw') || urlObj.searchParams.get('q');

      if (categories.length > 0) {
        const category = categories[0];
        let location = null;

        if (locationSlug) {
          const [locations] = await pool.query('SELECT * FROM locations WHERE slug = ?', [locationSlug]);
          if (locations.length > 0) location = locations[0];
        }

        let seoTitle = category.seo_title || `Best ${category.name} ${location ? 'in ' + location.name : ''} | Local Services`;
        let seoDescription = category.seo_meta_description || `Find top rated ${category.name} ${location ? 'in ' + location.name : ''}. Compare contact details, reviews, address, and map location of local professionals on IBC Mart.`;

        if (kwParam) {
          const formattedKw = kwParam.trim();
          seoTitle = `${formattedKw}${location ? ' in ' + location.name : ''} | IBC Mart`;
          seoDescription = `Find trusted ${formattedKw} ${location ? 'in ' + location.name : 'in India'}. Compare reviews, contact details, locations, and business information on IBC Mart.`;
        }

        const seoKeywords = category.seo_meta_keywords || [kwParam, category.name, location ? location.name : '', `${category.name} in ${location ? location.name : 'India'}`, 'Local Services', 'Directory', 'IBC Mart'].filter(Boolean).join(', ');

        let canonical = `/${category.slug}`;
        if (locationSlug) canonical = `/${locationSlug}/${category.slug}`;
        if (kwParam) canonical += `?kw=${encodeURIComponent(kwParam.trim())}`;

        return createResult('serviceCategory', {
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
          canonical: canonical
        }, { category, location }, baseOrigin);
      } else {
        // Catch-all dynamic Service Category / Subcategory SEO generation when slug isn't in categories table:
        const formattedCat = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const formattedLoc = locationSlug ? locationSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

        const seoTitle = kwParam
          ? `${kwParam.trim()}${formattedLoc ? ' in ' + formattedLoc : ''} | IBC Mart`
          : `Best ${formattedCat} ${formattedLoc ? 'in ' + formattedLoc : 'in India'} | IBC Mart`;

        const seoDescription = kwParam
          ? `Find trusted ${kwParam.trim()} ${formattedLoc ? 'in ' + formattedLoc : 'in India'}. Compare reviews, contact details, locations, and business information on IBC Mart.`
          : `Find top rated ${formattedCat} ${formattedLoc ? 'in ' + formattedLoc : 'in India'}. Get contact details, reviews, address, and map location of local professionals on IBC Mart.`;

        const seoKeywords = [kwParam, formattedCat, formattedLoc, `${formattedCat} in ${formattedLoc || 'India'}`, 'Local Services', 'Directory', 'IBC Mart'].filter(Boolean).join(', ');

        let canonical = `/${categorySlug}`;
        if (locationSlug) canonical = `/${locationSlug}/${categorySlug}`;
        if (kwParam) canonical += `?kw=${encodeURIComponent(kwParam.trim())}`;

        return createResult('serviceCategory', {
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
          canonical: canonical
        }, {
          category: { name: formattedCat, slug: categorySlug },
          location: formattedLoc ? { name: formattedLoc, slug: locationSlug } : null
        }, baseOrigin);
      }
    }

    // If query parameter kw or q is present on any fallback route
    const kwParam = urlObj.searchParams.get('kw') || urlObj.searchParams.get('q');
    if (kwParam) {
      const formattedKw = kwParam.trim();
      return createResult('generic', {
        title: `${formattedKw} | IBC Mart`,
        description: `Find trusted ${formattedKw} in India. Compare reviews, contact details, locations, and business information on IBC Mart.`,
        keywords: `${formattedKw}, Local Services, Directory, IBC Mart`,
        canonical: path + `?kw=${encodeURIComponent(formattedKw)}`
      }, {}, baseOrigin);
    }

    // If no specific SEO route matched, return a generic SSR object
    return createResult('generic', {
      title: 'IBC Mart - Enterprise Marketplace',
      description: 'Discover local products, services, and opportunities on IBC Mart.',
      canonical: path
    }, {}, baseOrigin);
  } catch (error) {
    console.error('SSR fetchSeoData Error:', error);
    return null;
  }
}
