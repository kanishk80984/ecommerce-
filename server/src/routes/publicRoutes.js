import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { getSeoPageDetails, getSitemapXml } from '../controllers/seoController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';
import { getActiveCategories } from '../controllers/jobCategoryController.js';

import { fetchSeoData } from '../ssr/fetchSeoData.js';

const router = express.Router();

router.get('/ssr-data', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'URL query parameter is required' });
    }
    const decodedUrl = decodeURIComponent(url);
    let ssrData = await fetchSeoData(decodedUrl);
    if (!ssrData) {
      ssrData = {
        pageType: 'generic',
        seoData: {
          title: 'IBC Mart - Enterprise Marketplace',
          description: 'Discover local products, services, and opportunities on IBC Mart.',
          canonical: decodedUrl
        }
      };
    }
    res.status(200).json({ success: true, ssrData });
  } catch (error) {
    next(error);
  }
});

router.get('/job-categories', getActiveCategories);

router.get('/banners', async (req, res, next) => {
  try {
    const [banners] = await pool.query('SELECT * FROM banners WHERE is_active = true ORDER BY created_at DESC LIMIT 5');
    res.status(200).json({ success: true, banners });
  } catch (error) {
    next(error);
  }
});
router.get('/categories', async (req, res, next) => {
  try {
    const [categories] = await pool.query("SELECT id, name, slug, parent_id, status, margin_percentage, margin_description, gst_percentage, youtube_video_link FROM categories WHERE status = 'ACTIVE' ORDER BY name ASC");
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});


router.get('/service-categories', async (req, res, next) => {
  try {
    const [categories] = await pool.query(`
      SELECT id, name, slug, status 
      FROM service_categories 
      WHERE status = 'ACTIVE'
      ORDER BY name ASC
    `);

    const [keywords] = await pool.query(`
      SELECT k.id, k.keyword, k.slug, k.category_id, sc.name as category_name, sc.slug as category_slug
      FROM service_category_seo_keywords k
      JOIN service_categories sc ON k.category_id = sc.id
      WHERE k.is_active = 1 AND sc.status = 'ACTIVE'
      ORDER BY k.keyword ASC
    `);

    res.status(200).json({ success: true, categories, keywords });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/:id/attributes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [attributes] = await pool.query("SELECT * FROM category_attributes WHERE category_id = ? ORDER BY name ASC", [id]);
    res.status(200).json({ success: true, attributes });
  } catch (error) {
    next(error);
  }
});

router.post('/categories/:id/attributes', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    await pool.query("INSERT IGNORE INTO category_attributes (category_id, name) VALUES (?, ?)", [id, name]);
    const [rows] = await pool.query("SELECT id FROM category_attributes WHERE category_id = ? AND name = ?", [id, name]);
    res.status(200).json({ success: true, attribute: { id: rows[0].id, name } });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/:id/attribute-groups', async (req, res, next) => {
  try {
    const { id } = req.params;
    const [groups] = await pool.query(
      "SELECT * FROM attribute_groups WHERE category_id = ? AND is_enabled = true ORDER BY sort_order ASC",
      [id]
    );

    for (let group of groups) {
      const [vals] = await pool.query(
        "SELECT * FROM attribute_values WHERE group_id = ? ORDER BY value ASC",
        [group.id]
      );
      group.values = vals;
    }

    res.status(200).json({ success: true, attributeGroups: groups });
  } catch (error) {
    next(error);
  }
});

router.get('/home-products', async (req, res, next) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, u.name as vendor_name, vp.public_id as vendor_public_id, c.name as category_name, c.slug as category_slug,
        c.margin_percentage as category_margin, c.gst_percentage as category_gst,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p 
      JOIN users u ON p.vendor_id = u.id 
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_reviews r ON p.id = r.product_id AND r.status = 'APPROVED'
      WHERE u.role IN ('ADMIN', 'SUPER_ADMIN', 'VENDOR') 
        AND p.status = 'PUBLISHED'
        AND u.is_suspended = 0
        AND u.status = 'ACTIVE'
      GROUP BY p.id, u.name, c.name, vp.public_id, c.slug
      ORDER BY p.created_at DESC, average_rating DESC
      LIMIT 20
    `);

    // Fetch variants for these products (same as /all-products)
    const productIds = products.map(p => p.id);
    let allVariantsMap = {};

    if (productIds.length > 0) {
      const [allVariants] = await pool.query(`
        SELECT 
          v.id, v.public_id, v.model_id, m.public_id as model_public_id, m.product_id, v.name, v.sku, v.price, v.mrp, v.stock, v.attributes,
          COALESCE(
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id AND vi.is_default = 1 LIMIT 1),
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id LIMIT 1),
            (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id AND mi.is_default = 1 LIMIT 1)
          ) as thumbnail
        FROM variants v
        JOIN models m ON v.model_id = m.id
        WHERE m.product_id IN (?) AND v.status = 'PUBLISHED'
      `, [productIds]);

      allVariants.forEach(v => {
        if (!allVariantsMap[v.product_id]) allVariantsMap[v.product_id] = [];
        allVariantsMap[v.product_id].push(v);
      });
    }

    const formatted = products.map(p => {
      const marginRate = parseFloat(p.category_margin || 0);
      const gstRate = parseFloat(p.category_gst || 0);

      const pVariants = (allVariantsMap[p.id] || []).map(v => {
        const vCopy = { ...v };
        const vBasePrice = parseFloat(v.price || 0);
        const vMarginAmount = vBasePrice * (marginRate / 100);
        const vPriceAfterMargin = vBasePrice + vMarginAmount;
        const vTotalAmount = Math.round(vPriceAfterMargin);

        vCopy.price = vTotalAmount;
        vCopy.id = v.public_id;
        vCopy.model_id = v.model_public_id;
        vCopy.product_id = p.public_id;
        delete vCopy.public_id;
        delete vCopy.model_public_id;
        return vCopy;
      });

      const mainBasePrice = parseFloat(p.price || 0);
      const mainMarginAmount = mainBasePrice * (marginRate / 100);
      const mainPriceAfterMargin = mainBasePrice + mainMarginAmount;
      const mainTotalAmount = Math.round(mainPriceAfterMargin);

      return {
        ...p,
        price: mainTotalAmount,
        id: p.public_id,
        vendor_id: p.vendor_public_id,
        category_id: p.category_slug,
        variants: pVariants
      };
    });

    res.status(200).json({ success: true, products: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/all-products', async (req, res, next) => {
  try {
    const seed = req.query.seed ? parseInt(req.query.seed, 10) : null;
    let orderClause = 'ORDER BY p.created_at DESC';
    if (seed !== null && !isNaN(seed)) {
      orderClause = `ORDER BY RAND(p.id + ${seed})`;
    }

    let query = `
      SELECT p.*, u.name as vendor_name, vp.public_id as vendor_public_id, c.name as category_name, c.slug as category_slug,
        c.margin_percentage as category_margin, c.gst_percentage as category_gst,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p 
      JOIN users u ON p.vendor_id = u.id 
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_reviews r ON p.id = r.product_id AND r.status = 'APPROVED'
      WHERE u.role IN ('ADMIN', 'SUPER_ADMIN', 'VENDOR') 
        AND p.status = 'PUBLISHED'
        AND u.is_suspended = 0
        AND u.status = 'ACTIVE'
      GROUP BY p.id, u.name, c.name, vp.public_id, c.slug
      ${orderClause}
    `;
    const params = [];
    if (req.query.limit) {
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(req.query.limit), parseInt(req.query.offset || '0'));
    }

    const [products] = await pool.query(query, params);

    // Fetch all variants for these products
    const productIds = products.map(p => p.id);
    let allVariantsMap = {};

    if (productIds.length > 0) {
      const [allVariants] = await pool.query(`
        SELECT 
          v.id, v.public_id, v.model_id, m.public_id as model_public_id, m.product_id, v.name, v.sku, v.price, v.mrp, v.stock, v.attributes,
          COALESCE(
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id AND vi.is_default = 1 LIMIT 1),
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id LIMIT 1),
            (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id AND mi.is_default = 1 LIMIT 1)
          ) as thumbnail
        FROM variants v
        JOIN models m ON v.model_id = m.id
        WHERE m.product_id IN (?) AND v.status = 'PUBLISHED'
      `, [productIds]);

      allVariants.forEach(v => {
        if (!allVariantsMap[v.product_id]) allVariantsMap[v.product_id] = [];
        allVariantsMap[v.product_id].push(v);
      });
    }

    const formattedProducts = products.map(p => {
      const marginRate = parseFloat(p.category_margin || 0);
      const gstRate = parseFloat(p.category_gst || 0);

      const pVariants = (allVariantsMap[p.id] || []).map(v => {
        const vCopy = { ...v };
        const vBasePrice = parseFloat(v.price || 0);
        const vMarginAmount = vBasePrice * (marginRate / 100);
        const vPriceAfterMargin = vBasePrice + vMarginAmount;
        const vTotalAmount = Math.round(vPriceAfterMargin);

        vCopy.price = vTotalAmount;
        vCopy.id = v.public_id;
        vCopy.model_id = v.model_public_id;
        vCopy.product_id = p.public_id;
        delete vCopy.public_id;
        delete vCopy.model_public_id;
        return vCopy;
      });

      const mainBasePrice = parseFloat(p.price || 0);
      const mainMarginAmount = mainBasePrice * (marginRate / 100);
      const mainPriceAfterMargin = mainBasePrice + mainMarginAmount;
      const mainTotalAmount = Math.round(mainPriceAfterMargin);

      return {
        ...p,
        price: mainTotalAmount,
        id: p.public_id,
        vendor_id: p.vendor_public_id,
        category_id: p.category_slug,
        variants: pVariants
      };
    });

    res.status(200).json({ success: true, products: formattedProducts });
  } catch (error) {
    next(error);
  }
});

// ─── Suggested Products ────────────────────────────────────────────────────────
// GET /public/suggested-products?category=Shoes&excludeId=<public_id>&limit=12
//
// Priority:
//   1. Products in the *exact* same vendor category (e.g. Shoes)
//   2. Products in the other vendor categories that share the same USER category
//      (e.g. Fashion → Fashion, Accessories, Bags, Jewellery, Watches)
//
// The USER_CATEGORIES map is kept in sync with client/src/utils/categoryMap.js
router.get('/suggested-products', async (req, res, next) => {
  try {
    const { category, excludeId, variantId } = req.query;
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);

    if (!category) {
      return res.status(200).json({ success: true, products: [] });
    }

    // ── Category mapping (mirrors client/src/utils/categoryMap.js) ──
    const USER_CATEGORIES = [
      { vendorCategories: ['Fashion', 'Accessories', 'Bags', 'Shoes', 'Jewellery', 'Watches'] },
      { vendorCategories: ['Mobile/Tablet'] },
      { vendorCategories: ['Electronics', 'Computers', 'Laptops', 'Gaming', 'Musical Instruments'] },
      { vendorCategories: ['Beauty'] },
      { vendorCategories: ['Home', 'Garden', 'Religious Products', 'Office Supplies', 'Stationery'] },
      { vendorCategories: ['Appliances', 'Home Appliances', 'Kitchen'] },
      { vendorCategories: ['Toys & Baby', 'Baby Products', 'Gift Items'] },
      { vendorCategories: ['Grocery', 'Food & Health', 'Beverages', 'Snacks'] },
      { vendorCategories: ['Auto Accessories', 'Automotive'] },
      { vendorCategories: ['Sports', 'Sports & Fitness', 'Fitness', 'Cycling', 'Camping', 'Fishing', 'Outdoor', 'Yoga'] },
      { vendorCategories: ['Furniture', 'Home & Furniture'] },
      { vendorCategories: ['Books', 'Craft Supplies', 'Art Supplies'] },
      { vendorCategories: ['2 Wheelers', 'Cycling'] },
    ];

    const userCatGroup = USER_CATEGORIES.find(uc =>
      uc.vendorCategories.some(vc => vc.toLowerCase() === category.toLowerCase())
    );

    const mappedCategories = userCatGroup ? userCatGroup.vendorCategories : [category];
    const otherMappedCategories = mappedCategories.filter(vc => vc.toLowerCase() !== category.toLowerCase());


    // ── Helper: Fetch variants using a specific WHERE clause ──
    const fetchVariants = async (whereClause, params, fetchLimit) => {
      const [rows] = await pool.query(`
        SELECT v.public_id as variant_id, v.name as variant_name, v.attributes as variant_attributes, v.price, v.mrp, v.stock,
               p.public_id, p.slug, p.name,
               m.name as model_name,
               c.name AS category_name, c.slug AS category_slug,
               c.margin_percentage AS category_margin, c.gst_percentage AS category_gst,
               vp.public_id AS vendor_public_id,
               COALESCE(
                 (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id AND vi.is_default = 1 LIMIT 1),
                 (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id LIMIT 1),
                 (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id AND mi.is_default = 1 LIMIT 1),
                 (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id LIMIT 1)
               ) AS thumbnail,
               COALESCE(
                 (SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED'), 0
               ) AS average_rating,
               (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED') AS review_count
        FROM variants v
        JOIN models m ON v.model_id = m.id
        JOIN products p ON m.product_id = p.id
        JOIN users u ON p.vendor_id = u.id
        LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE ${whereClause}
          AND v.status = 'PUBLISHED'
          AND p.status = 'PUBLISHED'
          AND u.is_suspended = 0
          AND u.status = 'ACTIVE'
        ORDER BY average_rating DESC, p.created_at DESC
        LIMIT ?
      `, [...params, fetchLimit]);
      return rows;
    };

    const formatRow = (p) => {
      const marginRate = parseFloat(p.category_margin || 0);
      const gstRate = parseFloat(p.category_gst || 0);
      const base = parseFloat(p.price || 0);
      const afterMargin = base + base * (marginRate / 100);
      const total = Math.round(afterMargin);
      const baseMrp = parseFloat(p.mrp || 0);
      const mrpAfterMargin = baseMrp + baseMrp * (marginRate / 100);
      const totalMrp = Math.round(mrpAfterMargin);
      return {
        id: p.public_id,
        variant_id: p.variant_id,
        slug: p.slug,
        name: p.name,
        category_name: p.category_name,
        category_id: p.category_slug,
        vendor_id: p.vendor_public_id,
        thumbnail: p.thumbnail || null,
        price: total,
        mrp: totalMrp,
        stock: p.stock,
        variant_name: p.variant_name || null,
        model_name: p.model_name || null,
        variant_attributes: p.variant_attributes || null,
        average_rating: p.average_rating,
        review_count: p.review_count,
      };
    };

    let result = [];
    const seenVariantIds = new Set();
    if (variantId) seenVariantIds.add(String(variantId));

    // ── Priority 1: Other variants of the SAME model ──
    if (variantId) {
      const [modelRows] = await pool.query(`SELECT m.id as model_id FROM variants v JOIN models m ON v.model_id = m.id WHERE v.public_id = ?`, [variantId]);
      if (modelRows.length > 0) {
        const currentModelId = modelRows[0].model_id;
        const sameModelRows = await fetchVariants('m.id = ? AND v.public_id != ?', [currentModelId, variantId], limit);
        for (const row of sameModelRows) {
          if (!seenVariantIds.has(String(row.variant_id))) {
            seenVariantIds.add(String(row.variant_id));
            result.push(formatRow(row));
          }
        }
      }
    }

    // ── Priority 2: Exact Category ──
    if (result.length < limit) {
      const remaining = limit - result.length;
      let qParams = [category];
      let qWhere = 'c.name = ?';
      if (excludeId) {
        qWhere += ' AND p.public_id != ?';
        qParams.push(excludeId);
      }
      if (seenVariantIds.size > 0) {
        qWhere += ` AND v.public_id NOT IN (${Array.from(seenVariantIds).map(() => '?').join(',')})`;
        qParams.push(...Array.from(seenVariantIds));
      }
      const exactCategoryRows = await fetchVariants(qWhere, qParams, remaining);
      for (const row of exactCategoryRows) {
        if (!seenVariantIds.has(String(row.variant_id))) {
          seenVariantIds.add(String(row.variant_id));
          result.push(formatRow(row));
        }
      }
    }

    // ── Priority 3: Mapped Categories ──
    if (result.length < limit && otherMappedCategories.length > 0) {
      const remaining = limit - result.length;
      let qParams = [...otherMappedCategories];
      let qWhere = `c.name IN (${otherMappedCategories.map(() => '?').join(',')})`;
      if (excludeId) {
        qWhere += ' AND p.public_id != ?';
        qParams.push(excludeId);
      }
      if (seenVariantIds.size > 0) {
        qWhere += ` AND v.public_id NOT IN (${Array.from(seenVariantIds).map(() => '?').join(',')})`;
        qParams.push(...Array.from(seenVariantIds));
      }
      const mappedCategoryRows = await fetchVariants(qWhere, qParams, remaining);
      for (const row of mappedCategoryRows) {
        if (!seenVariantIds.has(String(row.variant_id))) {
          seenVariantIds.add(String(row.variant_id));
          result.push(formatRow(row));
        }
      }
    }

    res.status(200).json({ success: true, products: result });
  } catch (error) {
    next(error);
  }
});


router.get('/advertisements', async (req, res, next) => {
  try {
    // Fetch only active ads that have either started or have no start date, and haven't ended or have no end date
    const [ads] = await pool.query(`
      SELECT * FROM advertisements 
      WHERE status = 'ACTIVE' 
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY priority DESC, created_at DESC
    `);
    res.status(200).json({ success: true, advertisements: ads });
  } catch (error) {
    next(error);
  }
});

router.get('/businesses', async (req, res, next) => {
  try {
    const [businesses] = await pool.query(`
      SELECT vp.*, u.name as owner_name, u.email, u.phone,
        COALESCE(
          (SELECT COALESCE(SUM(sr.rating), 0) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED')
          /
          NULLIF((SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED'), 0)
        , 0) as rating,
        (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED') as review_count
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
      ORDER BY vp.created_at DESC
    `);
    const formatted = businesses.map(b => {
      const slugVal = b.slug || (b.business_name ? b.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + b.id : `biz-${b.id}`);
      const publicIdVal = b.public_id || `vp_${b.id}`;
      return {
        ...b,
        id: b.id,
        business_id: b.id,
        slug: slugVal,
        public_id: publicIdVal,
        user_id: b.user_id
      };
    });
    res.status(200).json({ success: true, businesses: formatted });
  } catch (error) {
    next(error);
  }
});

router.get('/business/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    let queryField = 'vp.slug = ? OR vp.public_id = ?';
    let queryVal = [id, id];

    if (/^\d+$/.test(id)) {
      queryField = 'vp.id = ? OR vp.user_id = ? OR vp.slug = ? OR vp.public_id = ?';
      queryVal = [parseInt(id), parseInt(id), id, id];
    }

    const [businesses] = await pool.query(`
      SELECT vp.*, u.name as owner_name, u.email, u.phone,
        COALESCE(
          (SELECT COALESCE(SUM(sr.rating), 0) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED')
          / 
          NULLIF(
            (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED')
          , 0)
        , 0) as rating,
        (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED') as review_count,
        COALESCE(
          (SELECT COALESCE(SUM(sr.rating), 0) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text LIKE 'Enquiry about Gallery Product:%')
          / 
          NULLIF(
            (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text LIKE 'Enquiry about Gallery Product:%')
          , 0)
        , 0) as product_rating,
        (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text LIKE 'Enquiry about Gallery Product:%') as product_review_count,
        COALESCE(
          (SELECT COALESCE(SUM(sr.rating), 0) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%')
          / 
          NULLIF(
            (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%')
          , 0)
        , 0) as service_rating,
        (SELECT COUNT(sr.id) FROM service_reviews sr JOIN vendor_services vs ON sr.service_id = vs.id JOIN service_enquiries se ON sr.enquiry_id = se.id WHERE vs.vendor_id = vp.user_id AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%') as service_review_count
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      WHERE (${queryField}) AND vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
    `, queryVal);

    if (businesses.length === 0) {
      return res.status(404).json({ success: false, message: 'Business not found or not active.' });
    }

    const business = businesses[0];
    const slugVal = business.slug || (business.business_name ? business.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + business.id : `biz-${business.id}`);
    const publicIdVal = business.public_id || `vp_${business.id}`;

    const formatted = {
      ...business,
      id: business.id,
      business_id: business.id,
      slug: slugVal,
      public_id: publicIdVal,
      user_id: business.user_id
    };

    res.status(200).json({ success: true, business: formatted });
  } catch (error) {
    next(error);
  }
});

// ─── Trending Products — based on search clicks + purchase count ───
router.get('/trending-products', async (req, res, next) => {
  try {
    // Score: CLICK events × 2 + CART_ADD events × 5 in last 30 days
    const [trendingRows] = await pool.query(`
      SELECT 
        p.id, p.public_id, p.slug, p.name, p.category_id, p.brand_id,
        c.name as category_name, c.slug as category_slug,
        vp.business_name as vendor_name, vp.public_id as vendor_public_id,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi 
           JOIN variants v ON vi.variant_id = v.id 
           JOIN models m ON v.model_id = m.id 
           WHERE m.product_id = p.id AND vi.is_default = 1 LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi 
           JOIN variants v ON vi.variant_id = v.id 
           JOIN models m ON v.model_id = m.id 
           WHERE m.product_id = p.id LIMIT 1),
          (SELECT mi.image_url FROM model_images mi 
           JOIN models m ON mi.model_id = m.id 
           WHERE m.product_id = p.id AND mi.is_default = 1 LIMIT 1),
          (SELECT mi.image_url FROM model_images mi 
           JOIN models m ON mi.model_id = m.id 
           WHERE m.product_id = p.id LIMIT 1)
        ) as thumbnail,
        (SELECT v2.price FROM variants v2 JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id ORDER BY v2.price ASC LIMIT 1) as price,
        (SELECT v2.mrp FROM variants v2 JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id ORDER BY v2.price ASC LIMIT 1) as mrp,
        (SELECT v2.stock FROM variants v2 JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id ORDER BY v2.price ASC LIMIT 1) as stock,
        (SELECT COALESCE(AVG(r.rating), 0) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED') as average_rating,
        (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED') as review_count,
        COALESCE(SUM(CASE 
          WHEN se.event_type = 'CLICK' AND se.created_at >= NOW() - INTERVAL 30 DAY THEN 2
          WHEN se.event_type = 'CART_ADD' AND se.created_at >= NOW() - INTERVAL 30 DAY THEN 5
          WHEN se.event_type = 'SEARCH' AND se.created_at >= NOW() - INTERVAL 30 DAY THEN 1
          ELSE 0 END), 0) as trend_score
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN user_search_events se ON se.product_id = p.id
      WHERE u.is_suspended = 0 AND u.status = 'ACTIVE'
      GROUP BY p.id, p.public_id, p.slug, p.name, p.category_id, p.brand_id, c.name, c.slug, vp.business_name, vp.public_id
      ORDER BY trend_score DESC, p.created_at DESC
      LIMIT 12
    `);

    const formatted = trendingRows.map(p => ({
      ...p,
      id: p.public_id,
      vendor_id: p.vendor_public_id,
      category_id: p.category_slug
    }));

    res.status(200).json({ success: true, products: formatted });
  } catch (error) {
    next(error);
  }
});

// ─── Track Search / Click / Cart Add Events (Anonymous + Synced) ───
router.post('/track-search', async (req, res, next) => {
  try {
    const { query = '', productId, variantId, eventType = 'SEARCH', sessionId } = req.body;
    if (!query && !productId) return res.status(200).json({ success: true });

    // Optional user token decoding for syncing search history
    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');
        userId = decoded.id;
      } catch (e) { }
    }

    // Resolve public_id → internal id if needed
    let realProductId = null;
    if (productId) {
      if (/^\d+$/.test(productId)) {
        realProductId = parseInt(productId);
      } else {
        const [rows] = await pool.query('SELECT id FROM products WHERE public_id = ? OR slug = ?', [productId, productId]);
        if (rows[0]) realProductId = rows[0].id;
      }
    }

    let realVariantId = null;
    if (variantId) {
      if (/^\d+$/.test(variantId)) {
        realVariantId = parseInt(variantId);
      } else {
        const [rows] = await pool.query('SELECT id FROM variants WHERE public_id = ?', [variantId]);
        if (rows[0]) realVariantId = rows[0].id;
      }
    }

    await pool.query(
      `INSERT INTO user_search_events (session_id, user_id, query, product_id, variant_id, event_type) VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId || null, userId, (query || '').substring(0, 500), realProductId, realVariantId, eventType]
    );

    res.status(200).json({ success: true });
  } catch (error) {
    // Silently fail — tracking should never break the app
    res.status(200).json({ success: true });
  }
});

// Fetch last 4 searches of the logged-in user
router.get('/search-history', async (req, res, next) => {
  try {
    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');
        userId = decoded.id;
      } catch (e) { }
    }

    if (!userId) {
      return res.status(200).json({ success: true, history: [] });
    }

    // Fetch last 4 unique queries of type 'SEARCH'
    const [rows] = await pool.query(
      `SELECT query, MAX(created_at) as latest_search FROM user_search_events WHERE user_id = ? AND event_type = 'SEARCH' AND query IS NOT NULL AND query != '' GROUP BY query ORDER BY latest_search DESC LIMIT 4`,
      [userId]
    );

    const history = rows.map(r => r.query);
    res.status(200).json({ success: true, history });
  } catch (error) {
    next(error);
  }
});

// Clear all search history of the logged-in user
router.delete('/search-history', async (req, res, next) => {
  try {
    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');
        userId = decoded.id;
      } catch (e) { }
    }

    if (userId) {
      await pool.query(
        `DELETE FROM user_search_events WHERE user_id = ? AND event_type = 'SEARCH'`,
        [userId]
      );
    }
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Public SEO and sitemap routes
router.get('/seo-pages/:slug', getSeoPageDetails);
router.get('/sitemap.xml', getSitemapXml);


router.get('/business/:id/reviews', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'product' or 'service'
    const user_id = req.user ? req.user.id : 0;
    let queryField = 'vp.slug = ? OR vp.public_id = ?';
    let queryVal = [id, id];

    if (/^\d+$/.test(id)) {
      queryField = 'vp.id = ? OR vp.user_id = ? OR vp.slug = ? OR vp.public_id = ?';
      queryVal = [parseInt(id), parseInt(id), id, id];
    }

    const [vendor] = await pool.query(`SELECT user_id FROM vendor_profiles vp WHERE ${queryField}`, queryVal);
    if (vendor.length === 0) return res.status(404).json({ success: false, message: 'Business not found' });

    const vendor_id = vendor[0].user_id;

    // Build type filter: product = gallery product enquiries, service = all other enquiries
    let typeFilter = '';
    if (type === 'product') {
      typeFilter = "AND se.enquiry_text LIKE 'Enquiry about Gallery Product:%'";
    } else if (type === 'service') {
      typeFilter = "AND se.enquiry_text NOT LIKE 'Enquiry about Gallery Product:%'";
    }

    const [serviceReviews] = await pool.query(`
      SELECT sr.id, sr.rating, sr.title, sr.body, sr.created_at, u.name as reviewer_name, 'service' as type, vs.name as service_name,
      (SELECT COUNT(*) FROM review_reactions rr WHERE rr.review_id = sr.id AND rr.review_type = 'service' AND rr.reaction_type = 'LIKE') as likes,
      (SELECT COUNT(*) FROM review_reactions rr WHERE rr.review_id = sr.id AND rr.review_type = 'service' AND rr.reaction_type = 'DISLIKE') as dislikes,
      (SELECT reaction_type FROM review_reactions rr WHERE rr.review_id = sr.id AND rr.review_type = 'service' AND rr.user_id = ?) as user_reaction
      FROM service_reviews sr 
      JOIN users u ON sr.user_id = u.id 
      JOIN vendor_services vs ON sr.service_id = vs.id 
      JOIN service_enquiries se ON sr.enquiry_id = se.id 
      WHERE vs.vendor_id = ? AND sr.status = 'APPROVED' AND se.status = 'COMPLETED' ${typeFilter}
    `, [user_id, vendor_id]);

    let allReviews = [...serviceReviews];
    allReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json({ success: true, reviews: allReviews });
  } catch (error) {
    next(error);
  }
});

router.post('/business/:id/reviews/:reviewId/reaction', protect, async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { action } = req.body; // 'LIKE' or 'DISLIKE'
    const user_id = req.user.id;

    if (!['LIKE', 'DISLIKE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    // Check if user already reacted
    const [existing] = await pool.query(
      "SELECT id, reaction_type FROM review_reactions WHERE review_id = ? AND review_type = 'service' AND user_id = ?",
      [reviewId, user_id]
    );

    if (existing.length > 0) {
      if (existing[0].reaction_type === action) {
        // Toggle off if same action clicked again
        await pool.query("DELETE FROM review_reactions WHERE id = ?", [existing[0].id]);
        return res.status(200).json({ success: true, message: 'Reaction removed', currentReaction: null });
      } else {
        // Switch reaction
        await pool.query("UPDATE review_reactions SET reaction_type = ? WHERE id = ?", [action, existing[0].id]);
        return res.status(200).json({ success: true, message: 'Reaction updated', currentReaction: action });
      }
    } else {
      // Insert new reaction
      await pool.query(
        "INSERT INTO review_reactions (review_id, review_type, user_id, reaction_type) VALUES (?, 'service', ?, ?)",
        [reviewId, user_id, action]
      );
      return res.status(200).json({ success: true, message: 'Reaction added', currentReaction: action });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
