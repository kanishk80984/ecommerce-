import pool from '../config/db.js';
import StorageService from '../storage/StorageService.js';

// Helper to normalize and generate slugs
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except spaces/hyphens
    .replace(/[\s_]+/g, '-')       // replace spaces with hyphens
    .replace(/-+/g, '-')          // remove duplicate hyphens
    .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
};

// ─── ADMIN CONTROLLER METHODS ──────────────────────────────────────────────

export const getCategorySeo = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Get category SEO settings
    const [categories] = await pool.query(
      `SELECT id, name, slug, primary_keyword, seo_title, seo_meta_description, seo_h1, seo_content, seo_status, index_status, canonical_url 
       FROM categories WHERE id = ?`,
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const category = categories[0];

    // Get keywords
    const [keywords] = await pool.query(
      `SELECT id, keyword, slug, search_intent, location_id, priority, is_active, index_status 
       FROM category_seo_keywords WHERE category_id = ? ORDER BY priority DESC, keyword ASC`,
      [categoryId]
    );

    // Get target locations
    const [locations] = await pool.query(
      `SELECT l.id, l.name, l.slug 
       FROM locations l 
       JOIN category_target_locations ctl ON l.id = ctl.location_id 
       WHERE ctl.category_id = ?`,
      [categoryId]
    );

    res.status(200).json({
      success: true,
      seoSettings: {
        ...category,
        keywords,
        targetLocations: locations
      }
    });
  } catch (error) {
    next(error);
  }
};

export const saveCategorySeo = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const {
      primary_keyword,
      seo_title,
      seo_meta_description,
      seo_h1,
      seo_content,
      seo_status,
      index_status,
      canonical_url,
      keywords = [],
      targetLocations = []
    } = req.body;

    // Update categories table
    await pool.query(
      `UPDATE categories SET 
        primary_keyword = ?, 
        seo_title = ?, 
        seo_meta_description = ?, 
        seo_h1 = ?, 
        seo_content = ?, 
        seo_status = ?, 
        index_status = ?, 
        canonical_url = ? 
       WHERE id = ?`,
      [
        primary_keyword || null,
        seo_title || null,
        seo_meta_description || null,
        seo_h1 || null,
        seo_content || null,
        seo_status || 'Active',
        index_status || 'Index',
        canonical_url || null,
        categoryId
      ]
    );

    // Sync Locations: Convert targetLocation names/slugs to IDs
    const locationIds = [];
    for (const loc of targetLocations) {
      const locName = loc.name.trim();
      const locSlug = loc.slug ? generateSlug(loc.slug) : generateSlug(locName);

      // Check if location exists
      const [existingLoc] = await pool.query('SELECT id FROM locations WHERE slug = ?', [locSlug]);
      let locId;
      if (existingLoc.length > 0) {
        locId = existingLoc[0].id;
      } else {
        const [insertRes] = await pool.query('INSERT INTO locations (name, slug) VALUES (?, ?)', [locName, locSlug]);
        locId = insertRes.insertId;
      }
      locationIds.push(locId);
    }

    // Sync mapping table category_target_locations
    await pool.query('DELETE FROM category_target_locations WHERE category_id = ?', [categoryId]);
    for (const locId of locationIds) {
      await pool.query(
        'INSERT IGNORE INTO category_target_locations (category_id, location_id) VALUES (?, ?)',
        [categoryId, locId]
      );
    }

    // Sync Keywords
    // Get currently stored keywords to identify deletions
    const [existingKeywords] = await pool.query('SELECT id, slug FROM category_seo_keywords WHERE category_id = ?', [categoryId]);
    const incomingIds = keywords.map(k => k.id).filter(Boolean);

    // Delete keywords that are no longer in the list
    const deleteIds = existingKeywords.filter(ek => !incomingIds.includes(ek.id)).map(ek => ek.id);
    if (deleteIds.length > 0) {
      await pool.query('DELETE FROM category_seo_keywords WHERE id IN (?)', [deleteIds]);
    }

    // Insert or update incoming keywords
    for (const kw of keywords) {
      const kwVal = kw.keyword.trim();
      if (!kwVal) continue;

      let kwSlug = kw.slug ? generateSlug(kw.slug) : generateSlug(kwVal);

      // Handle duplicate slug collisions
      let collisionSuffix = 1;
      let checkSlug = kwSlug;
      while (true) {
        const [existingSlug] = await pool.query(
          'SELECT id FROM category_seo_keywords WHERE slug = ? AND id != ?',
          [checkSlug, kw.id || 0]
        );
        if (existingSlug.length === 0) {
          kwSlug = checkSlug;
          break;
        }
        checkSlug = `${kwSlug}-${collisionSuffix}`;
        collisionSuffix++;
      }

      const searchIntent = kw.search_intent || 'Category';
      const priority = kw.priority || 'Medium';
      const is_active = kw.is_active !== undefined ? kw.is_active : 1;
      const index_status = kw.index_status || 'Index';
      const location_id = kw.location_id || null;

      if (kw.id) {
        // Update existing keyword
        await pool.query(
          `UPDATE category_seo_keywords SET 
            keyword = ?, 
            slug = ?, 
            search_intent = ?, 
            location_id = ?, 
            priority = ?, 
            is_active = ?, 
            index_status = ? 
           WHERE id = ?`,
          [kwVal, kwSlug, searchIntent, location_id, priority, is_active, index_status, kw.id]
        );
      } else {
        // Insert new keyword
        await pool.query(
          `INSERT INTO category_seo_keywords 
           (category_id, keyword, slug, search_intent, location_id, priority, is_active, index_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [categoryId, kwVal, kwSlug, searchIntent, location_id, priority, is_active, index_status]
        );
      }
    }

    res.status(200).json({ success: true, message: 'SEO settings saved successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryKeyword = async (req, res, next) => {
  try {
    const { keywordId } = req.params;
    await pool.query('DELETE FROM category_seo_keywords WHERE id = ?', [keywordId]);
    res.status(200).json({ success: true, message: 'Keyword deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadServiceCategoryBanner = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    // Save image
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const fileName = `banner_${categoryId}_${Date.now()}.${ext}`;
    const { publicUrl } = await StorageService.upload(req.file.buffer, {
      module: 'categories',
      fileName,
      mimeType: req.file.mimetype
    });

    // Update the database
    await pool.query(
      'UPDATE service_categories SET banner_image = ? WHERE id = ?',
      [publicUrl, categoryId]
    );

    res.status(200).json({
      success: true,
      message: 'Banner image uploaded successfully',
      banner_image: publicUrl
    });
  } catch (error) {
    next(error);
  }
};

// ─── SERVICE CATEGORY SEO CONTROLLERS ──────────────────────────────────────

export const getServiceCategorySeo = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const [categories] = await pool.query(
      `SELECT id, name, slug, primary_keyword, seo_title, seo_meta_description, seo_h1, seo_content, seo_status, index_status, canonical_url, banner_image 
       FROM service_categories WHERE id = ?`,
      [categoryId]
    );

    if (categories.length === 0) {
      return res.status(404).json({ success: false, message: 'Service Category not found' });
    }

    const category = categories[0];

    const [keywords] = await pool.query(
      `SELECT id, keyword, slug, search_intent, location_id, priority, is_active, index_status 
       FROM service_category_seo_keywords WHERE category_id = ? ORDER BY priority DESC, keyword ASC`,
      [categoryId]
    );

    const [locations] = await pool.query(
      `SELECT l.id, l.name, l.slug 
       FROM locations l 
       JOIN service_category_target_locations ctl ON l.id = ctl.location_id 
       WHERE ctl.category_id = ?`,
      [categoryId]
    );

    res.status(200).json({
      success: true,
      seoSettings: {
        ...category,
        keywords,
        targetLocations: locations
      }
    });
  } catch (error) {
    next(error);
  }
};

export const saveServiceCategorySeo = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const {
      primary_keyword,
      seo_title,
      seo_meta_description,
      seo_h1,
      seo_content,
      seo_status,
      index_status,
      canonical_url,
      banner_image,
      keywords = [],
      targetLocations = []
    } = req.body;

    await pool.query(
      `UPDATE service_categories SET 
        primary_keyword = ?, 
        seo_title = ?, 
        seo_meta_description = ?, 
        seo_h1 = ?, 
        seo_content = ?, 
        seo_status = ?, 
        index_status = ?, 
        canonical_url = ?,
        banner_image = ?
       WHERE id = ?`,
      [
        primary_keyword || null,
        seo_title || null,
        seo_meta_description || null,
        seo_h1 || null,
        seo_content || null,
        seo_status || 'Active',
        index_status || 'Index',
        canonical_url || null,
        banner_image !== undefined ? banner_image : null,
        categoryId
      ]
    );

    const locationIds = [];
    for (const loc of targetLocations) {
      const locName = loc.name.trim();
      const locSlug = loc.slug ? generateSlug(loc.slug) : generateSlug(locName);

      const [existingLoc] = await pool.query('SELECT id FROM locations WHERE slug = ?', [locSlug]);
      let locId;
      if (existingLoc.length > 0) {
        locId = existingLoc[0].id;
      } else {
        const [insertRes] = await pool.query('INSERT INTO locations (name, slug) VALUES (?, ?)', [locName, locSlug]);
        locId = insertRes.insertId;
      }
      locationIds.push(locId);
    }

    await pool.query('DELETE FROM service_category_target_locations WHERE category_id = ?', [categoryId]);
    for (const locId of locationIds) {
      await pool.query(
        'INSERT IGNORE INTO service_category_target_locations (category_id, location_id) VALUES (?, ?)',
        [categoryId, locId]
      );
    }

    const [existingKeywords] = await pool.query('SELECT id, slug FROM service_category_seo_keywords WHERE category_id = ?', [categoryId]);
    const incomingIds = keywords.map(k => k.id).filter(Boolean);

    const deleteIds = existingKeywords.filter(ek => !incomingIds.includes(ek.id)).map(ek => ek.id);
    if (deleteIds.length > 0) {
      await pool.query('DELETE FROM service_category_seo_keywords WHERE id IN (?)', [deleteIds]);
    }

    for (const kw of keywords) {
      const kwVal = kw.keyword.trim();
      if (!kwVal) continue;

      let kwSlug = kw.slug ? generateSlug(kw.slug) : generateSlug(kwVal);

      let collisionSuffix = 1;
      let checkSlug = kwSlug;
      while (true) {
        const [existingSlug] = await pool.query(
          'SELECT id FROM service_category_seo_keywords WHERE slug = ? AND id != ?',
          [checkSlug, kw.id || 0]
        );
        if (existingSlug.length === 0) {
          kwSlug = checkSlug;
          break;
        }
        checkSlug = `${kwSlug}-${collisionSuffix}`;
        collisionSuffix++;
      }

      const searchIntent = kw.search_intent || 'Category';
      const priority = kw.priority || 'Medium';
      const is_active = kw.is_active !== undefined ? kw.is_active : 1;
      const index_status = kw.index_status || 'Index';
      const location_id = kw.location_id || null;

      if (kw.id) {
        await pool.query(
          `UPDATE service_category_seo_keywords SET 
            keyword = ?, 
            slug = ?, 
            search_intent = ?, 
            location_id = ?, 
            priority = ?, 
            is_active = ?, 
            index_status = ? 
           WHERE id = ?`,
          [kwVal, kwSlug, searchIntent, location_id, priority, is_active, index_status, kw.id]
        );
      } else {
        await pool.query(
          `INSERT INTO service_category_seo_keywords 
           (category_id, keyword, slug, search_intent, location_id, priority, is_active, index_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [categoryId, kwVal, kwSlug, searchIntent, location_id, priority, is_active, index_status]
        );
      }
    }

    res.status(200).json({ success: true, message: 'Service Category SEO settings saved successfully.' });
  } catch (error) {
    next(error);
  }
};

export const deleteServiceCategoryKeyword = async (req, res, next) => {
  try {
    const { keywordId } = req.params;
    await pool.query('DELETE FROM service_category_seo_keywords WHERE id = ?', [keywordId]);
    res.status(200).json({ success: true, message: 'Service Category Keyword deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getLocations = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM locations ORDER BY name ASC');
    res.status(200).json({ success: true, locations: rows });
  } catch (error) {
    next(error);
  }
};

export const addLocation = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Location name is required.' });
    }
    const locName = name.trim();
    const locSlug = generateSlug(locName);

    const [existing] = await pool.query('SELECT id FROM locations WHERE slug = ?', [locSlug]);
    if (existing.length > 0) {
      return res.status(200).json({ success: true, location: existing[0] });
    }

    const [result] = await pool.query('INSERT INTO locations (name, slug) VALUES (?, ?)', [locName, locSlug]);
    res.status(201).json({ success: true, location: { id: result.insertId, name: locName, slug: locSlug } });
  } catch (error) {
    next(error);
  }
};

// ─── PUBLIC DYNAMIC SEO PAGE ENDPOINT ──────────────────────────────────────

export const getSeoPageDetails = async (req, res, next) => {
  try {
    const { slug } = req.params; // Can be a category slug or a keyword slug
    const { location: locationQuery } = req.query; // optional location slug or name

    // 1. Identify category & configuration
    let category = null;
    let location = null;
    let keywordObj = null;
    let isService = false;

    // Check if slug matches a category directly
    const [cats] = await pool.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    if (cats.length > 0) {
      category = cats[0];
    } else {
      // Check if it matches an active keyword slug
      const [kws] = await pool.query(
        `SELECT k.*, c.name as category_name, c.slug as category_slug, c.parent_id 
         FROM category_seo_keywords k 
         JOIN categories c ON k.category_id = c.id 
         WHERE k.slug = ? AND k.is_active = 1`,
        [slug]
      );
      if (kws.length > 0) {
        keywordObj = kws[0];
        // Fetch full category info
        const [fullCats] = await pool.query('SELECT * FROM categories WHERE id = ?', [keywordObj.category_id]);
        category = fullCats[0];
      } else {
        // Check service categories
        const [servCats] = await pool.query('SELECT * FROM service_categories WHERE slug = ?', [slug]);
        if (servCats.length > 0) {
          category = servCats[0];
          isService = true;
        } else {
          // Check active service keyword slug
          const [servKws] = await pool.query(
            `SELECT k.*, c.name as category_name, c.slug as category_slug 
             FROM service_category_seo_keywords k 
             JOIN service_categories c ON k.category_id = c.id 
             WHERE k.slug = ? AND k.is_active = 1`,
            [slug]
          );
          if (servKws.length > 0) {
            keywordObj = servKws[0];
            const [fullServCats] = await pool.query('SELECT * FROM service_categories WHERE id = ?', [keywordObj.category_id]);
            category = fullServCats[0];
            isService = true;
          }
        }
      }
    }

    if (!category) {
      // Check if it's a product slug
      const [prods] = await pool.query(
        `SELECT p.slug, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.slug = ?`,
        [slug]
      );
      if (prods.length > 0) {
        const prod = prods[0];
        const categorySlug = (prod.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const targetUrl = `/${categorySlug}/product/${prod.slug}`;
        return res.status(404).json({
          success: false,
          isProductRedirect: true,
          targetUrl,
          message: 'Redirecting to correct product URL...'
        });
      }
      return res.status(404).json({ success: false, message: 'No category, service category, or keyword matching this URL was found.' });
    }

    // 2. Identify Location
    let locSlug = locationQuery || '';
    if (!locSlug && keywordObj && keywordObj.location_id) {
      const [locs] = await pool.query('SELECT * FROM locations WHERE id = ?', [keywordObj.location_id]);
      if (locs.length > 0) location = locs[0];
    } else if (locSlug) {
      const [locs] = await pool.query('SELECT * FROM locations WHERE slug = ? OR name = ?', [locSlug, locSlug]);
      if (locs.length > 0) {
        location = locs[0];
      } else {
        const decoded = decodeURIComponent(locSlug);
        const name = decoded.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        location = { name, slug: locSlug };
      }
    }

    // 3. Retrieve associated businesses with flexible category name and location matching
    let businessesQuery = `
      SELECT DISTINCT vp.*, 
        COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED'), 0) as average_rating,
        (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED') as review_count
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      LEFT JOIN products p ON p.vendor_id = u.id
      WHERE vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
    `;
    const params = [];

    const cleanCatName = category.name.trim();
    const singularCatName = cleanCatName.endsWith('s') ? cleanCatName.slice(0, -1) : cleanCatName;
    const pluralCatName = cleanCatName.endsWith('s') ? cleanCatName : cleanCatName + 's';

    businessesQuery += ` AND (
      LOWER(vp.category) = LOWER(?) OR LOWER(vp.category) = LOWER(?) OR LOWER(vp.category) = LOWER(?)
      OR LOWER(vp.subcategory) = LOWER(?) OR LOWER(vp.subcategory) = LOWER(?) OR LOWER(vp.subcategory) = LOWER(?)
      ${isService ? '' : 'OR p.category_id = ?'}
      OR LOWER(vp.keywords) LIKE LOWER(?)
      OR LOWER(vp.keywords) LIKE LOWER(?)
    )`;
    params.push(
      cleanCatName, singularCatName, pluralCatName,
      cleanCatName, singularCatName, pluralCatName
    );
    if (!isService) {
      params.push(category.id);
    }
    params.push(`%${singularCatName}%`, `%${pluralCatName}%`);

    if (location) {
      businessesQuery += ` AND (
        LOWER(vp.city) = LOWER(?) OR LOWER(vp.city) = LOWER(?)
        OR LOWER(vp.district) = LOWER(?) OR LOWER(vp.district) = LOWER(?)
        OR LOWER(vp.formatted_address) LIKE LOWER(?) OR LOWER(vp.formatted_address) LIKE LOWER(?)
      )`;
      params.push(
        location.name, location.slug,
        location.name, location.slug,
        `%${location.name}%`, `%${location.slug}%`
      );
    }

    businessesQuery += ` LIMIT 50`;
    const [businesses] = await pool.query(businessesQuery, params);

    // 4. Retrieve services and products under this category
    const [services] = await pool.query(
      `SELECT vs.*, vp.business_name, vp.slug AS vendor_slug, vp.public_id AS vendor_public_id, vp.user_id AS vendor_user_id, vp.id AS vendor_profile_id, 
        COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED'), 0) as average_rating,
        (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED') as review_count, 
        vp.city, vp.formatted_address, vp.business_address, vp.phone_number, vp.keywords AS vendor_keywords
       FROM vendor_services vs 
       JOIN vendor_profiles vp ON vs.vendor_id = vp.user_id
       WHERE LOWER(vs.name) LIKE LOWER(?) 
       OR LOWER(vs.name) LIKE LOWER(?)
       OR LOWER(vs.description) LIKE LOWER(?)
       OR LOWER(vs.description) LIKE LOWER(?)
       LIMIT 20`,
      [
        `%${singularCatName}%`,
        `%${pluralCatName}%`,
        `%${singularCatName}%`,
        `%${pluralCatName}%`
      ]
    );

    // 5. Gather other keywords and internal target links for widgets
    const keywordTableName = isService ? 'service_category_seo_keywords' : 'category_seo_keywords';
    const targetLocTableName = isService ? 'service_category_target_locations' : 'category_target_locations';

    const [internalKeywords] = await pool.query(
      `SELECT keyword, slug FROM ${keywordTableName} 
       WHERE category_id = ? AND is_active = 1 AND index_status = 'Index'`,
      [category.id]
    );

    const [targetLocations] = await pool.query(
      `SELECT l.name, l.slug FROM locations l 
       JOIN ${targetLocTableName} ctl ON l.id = ctl.location_id 
       WHERE ctl.category_id = ?`,
      [category.id]
    );

    // 6. Construct dynamic metadata dynamically avoiding keyword stuffing
    const targetLocName = location ? location.name : '';
    const categoryName = category.name;

    const baseName = keywordObj?.keyword || category.name;
    const seoTitle = keywordObj?.seo_title || category.seo_title || `Best ${baseName}s ${targetLocName ? 'in ' + targetLocName : ''} | Local Services`;
    const seoDescription = keywordObj?.seo_meta_description || category.seo_meta_description || `Find top rated ${baseName}s ${targetLocName ? 'in ' + targetLocName : ''}. Get contact details, reviews, address, and map location of local professionals.`;
    const seoH1 = keywordObj?.seo_h1 || category.seo_h1 || `Best ${baseName}s ${targetLocName ? 'in ' + targetLocName : ''}`;
    const seoContent = category.seo_content || '';
    const canonical = category.canonical_url || `/${location ? location.slug + '/' : ''}${category.slug}`;

    // Disable caching on the response level to keep preview data real-time
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    res.status(200).json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.margin_description,
      },
      category_name: category.name,
      category_slug: category.slug,
      location: location ? {
        id: location.id,
        name: location.name,
        slug: location.slug
      } : null,
      location_slug: location ? location.slug : null,
      primary_keyword: keywordObj?.keyword || category.primary_keyword || '',
      seo_keywords: internalKeywords.map(k => k.keyword),
      seo_title: seoTitle,
      meta_description: seoDescription,
      h1: seoH1,
      seo_content: seoContent,
      seo_status: category.seo_status || 'Active',
      index_status: category.index_status || 'Index',
      canonical_url: canonical,
      banner_image: category.banner_image || null,
      target_locations: targetLocations,
      related_search_phrases: internalKeywords.map(k => k.keyword),
      businesses,
      services,
      business_count: businesses.length
    });
  } catch (error) {
    next(error);
  }
};

// ─── DYNAMIC SITEMAP XML GENERATOR ─────────────────────────────────────────

export const getSitemapXml = async (req, res, next) => {
  try {
    const baseUrl = process.env.BASE_URL || 'https://www.ibcmart.com';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // 1. Static/home pages
    xml += `
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // 2. Active categories (Indexable)
    const [categories] = await pool.query("SELECT slug FROM categories WHERE status = 'ACTIVE' AND index_status = 'Index'");
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${baseUrl}/category/${cat.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // 3. Active businesses (Indexable)
    const [businesses] = await pool.query(
      `SELECT vp.slug, vp.city, c.slug as category_slug 
       FROM vendor_profiles vp 
       JOIN users u ON vp.user_id = u.id 
       JOIN products p ON p.vendor_id = u.id
       JOIN categories c ON p.category_id = c.id
       WHERE vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
       GROUP BY u.id`
    );
    for (const biz of businesses) {
      const bSlug = biz.slug || `biz-${biz.id}`;
      const location = (biz.city || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const catSlug = biz.category_slug || 'category';
      xml += `
  <url>
    <loc>${baseUrl}/${location}/shop/${bSlug}/${catSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    // 4. Dynamic SEO Landing Pages (Category + target location combinations)
    // Query active category target location mappings
    const [catLocs] = await pool.query(
      `SELECT c.slug as category_slug, l.slug as location_slug 
       FROM category_target_locations ctl
       JOIN categories c ON ctl.category_id = c.id
       JOIN locations l ON ctl.location_id = l.id
       WHERE c.status = 'ACTIVE' AND c.index_status = 'Index'`
    );
    for (const cl of catLocs) {
      xml += `
  <url>
    <loc>${baseUrl}/${cl.location_slug}/${cl.category_slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // 5. Active and Indexable SEO Keywords
    const [seoKeywords] = await pool.query(
      `SELECT k.slug FROM category_seo_keywords k
       JOIN categories c ON k.category_id = c.id
       WHERE k.is_active = 1 AND k.index_status = 'Index' AND c.status = 'ACTIVE'`
    );
    for (const kw of seoKeywords) {
      xml += `
  <url>
    <loc>${baseUrl}/${kw.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    xml += `
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
};
