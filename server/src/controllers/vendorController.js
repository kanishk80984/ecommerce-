import pool from '../config/db.js';
import StorageService from '../storage/StorageService.js';
import { optimizeToSingleBuffer } from '../services/imageService.js';

const generateId = (prefix) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let res = prefix;
  for (let i = 0; i < 8; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

/**
 * Upload a single image buffer via StorageService.
 * Handles base64-encoded strings (legacy) AND raw Buffers uniformly.
 *
 * @param {Buffer|string} source  - Buffer or base64 data-URL string
 * @param {string} module         - Storage module folder
 * @param {string} [originalName] - Hint for file naming
 * @returns {Promise<string|null>} publicUrl, or the input if it's already a URL
 */
const uploadImageBuffer = async (sourceInput, module = 'products', originalName = 'image') => {
  let source = sourceInput;

  // Handle object structure from advanced uploader or fallback image data
  if (source && typeof source === 'object' && !Buffer.isBuffer(source)) {
    source = source.url || source.imageUrl || source.image_url || source.dataURL || source.data_url || source.file || source.image || null;
  }

  if (!source) return null;

  // Already a URL or relative file path — return as-is
  if (typeof source === 'string' && !source.startsWith('data:')) {
    return source;
  }

  let buffer;

  if (Buffer.isBuffer(source)) {
    buffer = source;
  } else if (typeof source === 'string' && source.startsWith('data:')) {
    // Decode base64 data-URL
    const matches = source.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
    if (!matches) return null;
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    return null;
  }

  const optimized = await optimizeToSingleBuffer(buffer, {
    maxWidth: 1200,
    maxHeight: 1200,
    fit: 'inside',
    originalName,
  });

  const uploaded = await StorageService.upload(optimized.buffer, {
    module,
    fileName: optimized.fileName,
    mimeType: optimized.mimeType,
  });

  return uploaded.publicUrl;
};


// Update KYC & Business Details
export const updateKyc = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      vendor_type, business_name, vendor_name, category, subcategory,
      gst_number, pan_number, aadhaar_number,
      bank_account, ifsc_code, upi_id, store_description,
      business_address, pickup_address, city, state, pincode,
      website, whatsapp_number, working_hours, social_links,
      latitude, longitude, house_no, area, district, formatted_address
    } = req.body;

    let logoPath = req.body.business_logo_path || null;
    let bannerPath = req.body.store_banner_path || null;
    let docs = [];
    let gallery = [];

    // Handle multipart file uploads via StorageService
    if (req.files) {
      if (req.files.business_logo && req.files.business_logo[0].buffer) {
        logoPath = await uploadImageBuffer(req.files.business_logo[0].buffer, 'vendors', 'logo');
      }
      if (req.files.store_banner && req.files.store_banner[0].buffer) {
        bannerPath = await uploadImageBuffer(req.files.store_banner[0].buffer, 'vendors', 'banner');
      }
      if (req.files.kyc_documents) {
        docs = await Promise.all(
          req.files.kyc_documents.map(f => uploadImageBuffer(f.buffer, 'vendors', 'kyc'))
        );
        docs = docs.filter(Boolean);
      }
      if (req.files.gallery_images) {
        gallery = await Promise.all(
          req.files.gallery_images.map(f => uploadImageBuffer(f.buffer, 'vendors', 'gallery'))
        );
        gallery = gallery.filter(Boolean);
      }
    }

    const docsJson = docs.length > 0 ? JSON.stringify(docs) : null;
    const galleryJson = gallery.length > 0 ? JSON.stringify(gallery) : null;

    let parsedSocialLinks = null;
    if (social_links) {
      try {
        parsedSocialLinks = typeof social_links === 'string' ? social_links : JSON.stringify(social_links);
      } catch (e) {
        parsedSocialLinks = social_links;
      }
    }

    let query = `
      UPDATE vendor_profiles SET
        vendor_type = ?, business_name = ?, category = ?, subcategory = ?,
        gst_number = ?, pan_number = ?, aadhaar_number = ?,
        bank_account = ?, ifsc_code = ?, upi_id = ?, store_description = ?,
        business_address = ?, pickup_address = ?, city = ?, state = ?, pincode = ?,
        website = ?, whatsapp_number = ?, working_hours = ?, social_links = ?,
        latitude = ?, longitude = ?, house_no = ?, area = ?, district = ?, formatted_address = ?
    `;
    const params = [
      vendor_type || 'PRODUCT', business_name, category || null, subcategory || null,
      gst_number || null, pan_number || null, aadhaar_number || null,
      bank_account || null, ifsc_code || null, upi_id || null, store_description || null,
      business_address || null, pickup_address || null, city || null, state || null, pincode || null,
      website || null, whatsapp_number || null, working_hours || null, parsedSocialLinks,
      latitude || null, longitude || null, house_no || null, area || null, district || null, formatted_address || null
    ];

    if (logoPath) { query += `, business_logo = ?`; params.push(logoPath); }
    if (bannerPath) { query += `, store_banner = ?`; params.push(bannerPath); }
    if (docsJson) { query += `, kyc_documents = ?`; params.push(docsJson); }
    if (galleryJson) { query += `, gallery_images = ?`; params.push(galleryJson); }

    query += `, kyc_status = 'PENDING' WHERE user_id = ?`;
    params.push(userId);

    await pool.query(query, params);

    if (vendor_name) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [vendor_name, userId]);
    }

    res.status(200).json({ success: true, message: 'KYC submitted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Update Community Business Profile
export const updateBusinessProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      vendor_type, business_name, vendor_name, category, subcategory, keywords,
      gst_number, pan_number, aadhaar_number,
      bank_account, ifsc_code, upi_id, store_description,
      business_address, pickup_address, city, state, pincode, country,
      website, whatsapp_number, phone_number, working_hours, social_links,
      account_holder_name, bank_name, branch_location,
      latitude, longitude, house_no, area, district, formatted_address,
      yearly_turnover, year_established, youtube_link, gallery_images_data, gallery_only_data,
      business_email
    } = req.body;

    let logoPath = req.body.business_logo_path || null;
    let bannerPath = req.body.store_banner_path || null;
    let docs = [];
    let gallery = [];

    if (req.files) {
      if (req.files.business_logo && req.files.business_logo[0].buffer) {
        logoPath = await uploadImageBuffer(req.files.business_logo[0].buffer, 'vendors', 'logo');
      }
      if (req.files.store_banner && req.files.store_banner[0].buffer) {
        bannerPath = await uploadImageBuffer(req.files.store_banner[0].buffer, 'vendors', 'banner');
      }
      if (req.files.kyc_documents) {
        docs = await Promise.all(
          req.files.kyc_documents.map(f => uploadImageBuffer(f.buffer, 'vendors', 'kyc'))
        );
        docs = docs.filter(Boolean);
      }
      if (req.files.gallery_images) {
        gallery = await Promise.all(
          req.files.gallery_images.map(f => uploadImageBuffer(f.buffer, 'vendors', 'gallery'))
        );
        gallery = gallery.filter(Boolean);
      }
    }

    const docsJson = docs.length > 0 ? JSON.stringify(docs) : null;
    const galleryJson = gallery.length > 0 ? JSON.stringify(gallery) : null;

    let finalGalleryJson = gallery_images_data || null;
    if (galleryJson) {
      finalGalleryJson = galleryJson;
    }

    let finalGalleryOnlyJson = gallery_only_data || null;

    let parsedSocialLinks = null;
    if (social_links) {
      try {
        parsedSocialLinks = typeof social_links === 'string' ? social_links : JSON.stringify(social_links);
      } catch (e) {
        parsedSocialLinks = social_links;
      }
    }

    let newSlugParts = [business_name.trim()];
    let newSlug = newSlugParts.join('-').toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Ensure uniqueness
    const [existingSlug] = await pool.query('SELECT id FROM vendor_profiles WHERE slug = ? AND user_id != ?', [newSlug, userId]);
    if (existingSlug.length > 0) {
      newSlug = newSlug + '-' + Math.floor(1000 + Math.random() * 9000);
    }

    let query = `
      UPDATE vendor_profiles SET
        vendor_type = ?, business_name = ?, category = ?, subcategory = ?, keywords = ?,
        gst_number = ?, pan_number = ?, aadhaar_number = ?,
        bank_account = ?, ifsc_code = ?, upi_id = ?, store_description = ?,
        business_address = ?, pickup_address = ?, city = ?, state = ?, pincode = ?, country = ?,
        website = ?, whatsapp_number = ?, phone_number = ?, working_hours = ?, social_links = ?,
        account_holder_name = ?, bank_name = ?, branch_location = ?,
        latitude = ?, longitude = ?, house_no = ?, area = ?, district = ?, formatted_address = ?,
        yearly_turnover = ?, year_established = ?, youtube_link = ?, gallery_images = ?, gallery_only = ?, business_email = ?, slug = ?
    `;
    if (!business_name || !business_name.trim()) {
      return res.status(400).json({ success: false, message: 'Business Name is required.' });
    }

    const params = [
      vendor_type || 'PRODUCT', business_name.trim(), category || null, subcategory || null, keywords || null,
      gst_number || null, pan_number || null, aadhaar_number || null,
      bank_account || null, ifsc_code || null, upi_id || null, store_description || null,
      business_address || null, pickup_address || null, city || null, state || null, pincode || null, country || null,
      website || null, whatsapp_number || null, phone_number || null, working_hours || null, parsedSocialLinks,
      account_holder_name || null, bank_name || null, branch_location || null,
      latitude || null, longitude || null, house_no || null, area || null, district || null, formatted_address || null,
      yearly_turnover || null, year_established ? parseInt(year_established) : null, youtube_link || null, finalGalleryJson || null, finalGalleryOnlyJson || null, business_email || null, newSlug
    ];

    if (logoPath) { query += `, business_logo = ?`; params.push(logoPath); }
    if (bannerPath) { query += `, store_banner = ?`; params.push(bannerPath); }
    if (docsJson) { query += `, kyc_documents = ?`; params.push(docsJson); }

    query += ` WHERE user_id = ?`;
    params.push(userId);

    await pool.query(query, params);

    if (vendor_name) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [vendor_name, userId]);
    }

    res.status(200).json({ success: true, message: 'Community Business Profile updated successfully.' });
  } catch (error) {
    console.error('Business Profile Update Error:', error);
    next(error);
  }
};

// Get Dashboard Data
export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [profiles] = await pool.query('SELECT * FROM vendor_profiles WHERE user_id = ?', [userId]);
    let profile = profiles[0];

    const [catRequests] = await pool.query(
      'SELECT id, suggested_name, status, updated_at FROM category_requests WHERE vendor_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    const categoryRequest = catRequests[0] || null;

    if (!profile && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
      profile = {
        user_id: userId,
        business_name: 'Admin Demo Store',
        business_logo: null,
        city: 'Erode',
        state: 'Tamil Nadu',
        district: 'Erode',
        year_established: 2026,
        kyc_status: 'APPROVED',
        subcategory: 'Administration'
      };
    }

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const [subs] = await pool.query(`
      SELECT vs.*, sp.name as plan_name, sp.product_limit, sp.image_limit, sp.tier
      FROM vendor_subscriptions vs
      JOIN subscription_plans sp ON vs.plan_id = sp.id
      WHERE vs.vendor_id = ? AND vs.status = 'ACTIVE'
    `, [userId]);

    const activeSubscription = subs[0] || null;

    const [productCountResult] = await pool.query('SELECT COUNT(*) as count FROM products WHERE vendor_id = ?', [userId]);
    const productCount = productCountResult[0].count;

    const [orderCountResult] = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(order_items.price * order_items.quantity), 0) as total_revenue 
      FROM order_items 
      JOIN orders ON order_items.order_id = orders.id
      WHERE order_items.vendor_id = ?
    `, [userId]);
    const orderCount = orderCountResult[0].count;
    const totalRevenue = Number(orderCountResult[0].total_revenue || 0);

    const [weeklyRevenueResult] = await pool.query(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total 
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      WHERE oi.vendor_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [userId]);
    const weeklyRevenue = Number(weeklyRevenueResult[0].total || 0);

    const [monthlyRevenueResult] = await pool.query(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total 
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.id 
      WHERE oi.vendor_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [userId]);
    const monthlyRevenue = Number(monthlyRevenueResult[0].total || 0);

    // Fetch all products with detailed sales data for this vendor
    const [allProductsSales] = await pool.query(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        c.name as category_name,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id) as units_sold,
        (SELECT COALESCE(SUM(oi.price * oi.quantity), 0) FROM order_items oi WHERE oi.product_id = p.id) as total_revenue,
        COALESCE(
          (SELECT SUM(v.stock) FROM variants v JOIN models m ON v.model_id = m.id WHERE m.product_id = p.id),
          p.stock
        ) as current_stock,
        COALESCE(
          (SELECT MIN(v.price) FROM variants v JOIN models m ON v.model_id = m.id WHERE m.product_id = p.id),
          p.price
        ) as price,
        COALESCE(
          (SELECT MAX(v.mrp) FROM variants v JOIN models m ON v.model_id = m.id WHERE m.product_id = p.id),
          p.mrp
        ) as mrp,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi JOIN variants v ON vi.variant_id = v.id JOIN models m ON v.model_id = m.id WHERE m.product_id = p.id ORDER BY vi.is_default DESC LIMIT 1),
          (SELECT mi.image_url FROM model_images mi JOIN models m ON mi.model_id = m.id WHERE m.product_id = p.id LIMIT 1),
          p.thumbnail
        ) as thumbnail,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.vendor_id = ?
      ORDER BY total_revenue DESC, units_sold DESC
    `, [userId]);

    // Top sold products
    const soldProducts = allProductsSales
      .filter(p => Number(p.units_sold) > 0)
      .slice(0, 8)
      .map(p => ({
        id: p.product_id,
        name: p.product_name,
        sold_quantity: Number(p.units_sold),
        revenue: Number(p.total_revenue),
        stock: p.current_stock,
        thumbnail: p.thumbnail
      }));

    const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    const vendorName = userRows[0]?.name || '';

    res.status(200).json({
      success: true,
      profile,
      vendorName,
      categoryRequest,
      subscription: activeSubscription,
      stats: {
        total_products: productCount,
        total_orders: orderCount,
        total_revenue: totalRevenue,
        weekly_revenue: weeklyRevenue,
        monthly_revenue: monthlyRevenue,
        sold_products: soldProducts,
        all_products_sales: allProductsSales
      }
    });

  } catch (error) {
    next(error);
  }
};

// Suggest a custom category (Auto-saved)
export const suggestCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { suggested_name } = req.body;

    if (!suggested_name || !suggested_name.trim()) {
      return res.status(400).json({ success: false, message: 'Suggested name is required.' });
    }

    // Check if this category is already active/approved in categories table
    const [existingMain] = await pool.query(
      'SELECT id FROM categories WHERE name = ? AND status = "ACTIVE"',
      [suggested_name.trim()]
    );
    if (existingMain.length > 0) {
      return res.status(200).json({ success: true, message: 'Category is already approved and active.', status: 'APPROVED' });
    }

    // Check if there is already a request for this vendor
    const [existing] = await pool.query(
      'SELECT id, status FROM category_requests WHERE vendor_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      const lastReq = existing[0];
      // If last request is draft, we update it in-place
      if (lastReq.status === 'DRAFT') {
        await pool.query(
          'UPDATE category_requests SET suggested_name = ? WHERE id = ?',
          [suggested_name.trim(), lastReq.id]
        );
        return res.status(200).json({ success: true, message: 'Category suggestion draft updated.', status: 'DRAFT' });
      }
    }

    // Otherwise insert new draft request
    await pool.query(
      'INSERT INTO category_requests (vendor_id, suggested_name, status) VALUES (?, ?, "DRAFT")',
      [userId, suggested_name.trim()]
    );

    res.status(201).json({ success: true, message: 'Category suggestion draft saved.', status: 'DRAFT' });
  } catch (error) {
    next(error);
  }
};

// Submit custom category request for admin approval
export const submitCategoryRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { suggested_name } = req.body;

    // Get the latest draft request
    const [existing] = await pool.query(
      'SELECT id, status, suggested_name FROM category_requests WHERE vendor_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (existing.length === 0 || existing[0].status !== 'DRAFT') {
      if (suggested_name && suggested_name.trim()) {
        // If they submitted quickly before the debounce autosave created the draft, just create the pending request directly
        await pool.query(
          'INSERT INTO category_requests (vendor_id, suggested_name, status) VALUES (?, ?, "PENDING")',
          [userId, suggested_name.trim()]
        );
        return res.status(200).json({ success: true, message: 'Category request submitted for approval.', status: 'PENDING' });
      }
      return res.status(400).json({ success: false, message: 'No draft category request found to submit and no suggested name provided.' });
    }

    const draft = existing[0];
    if (!draft.suggested_name && !suggested_name) {
      return res.status(400).json({ success: false, message: 'Suggested name cannot be empty.' });
    }

    // Update status to PENDING
    await pool.query(
      'UPDATE category_requests SET suggested_name = COALESCE(?, suggested_name), status = "PENDING" WHERE id = ?',
      [suggested_name ? suggested_name.trim() : null, draft.id]
    );

    res.status(200).json({ success: true, message: 'Category request submitted for approval.', status: 'PENDING' });
  } catch (error) {
    next(error);
  }
};

// Redesigned Product Group Creation
export const createProduct = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const [userRow] = await pool.query('SELECT is_approved FROM users WHERE id = ?', [vendorId]);
    if (!userRow[0].is_approved) {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval.' });
    }

    const { name, category_id, brand_id } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (name.length > 255) {
      return res.status(400).json({ success: false, message: 'Product name cannot exceed 255 characters' });
    }
    const slugBase = name.substring(0, 200).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const publicId = generateId('PRD');
    const slug = slugBase + '-' + publicId;

    let finalBrandId = null;
    if (brand_id) {
      const isInteger = Number.isInteger(Number(brand_id)) && String(parseInt(brand_id)) === String(brand_id);
      if (isInteger) {
        finalBrandId = parseInt(brand_id);
      } else {
        const brandName = brand_id.trim();
        const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const [brandRows] = await pool.query('SELECT id FROM brands WHERE name = ? OR slug = ?', [brandName, brandSlug]);
        if (brandRows.length > 0) {
          finalBrandId = brandRows[0].id;
        } else {
          const [insertRes] = await pool.query(
            'INSERT INTO brands (name, slug, status) VALUES (?, ?, \'ACTIVE\')',
            [brandName, brandSlug]
          );
          finalBrandId = insertRes.insertId;
        }
      }
    }

    const [result] = await pool.query(
      `INSERT INTO products (public_id, vendor_id, category_id, brand_id, name, slug, status) VALUES (?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      [publicId, vendorId, category_id || 1, finalBrandId, name, slug]
    );

    res.status(201).json({ success: true, message: 'Product group created successfully', productId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const getVendorProducts = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, b.name as brand_name,
        (SELECT COUNT(*) FROM models m WHERE m.product_id = p.id) as model_count,
        (SELECT COUNT(*) FROM variants v JOIN models m ON v.model_id = m.id WHERE m.product_id = p.id) as variant_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.vendor_id = ?
      ORDER BY p.created_at DESC
    `, [vendorId]);
    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { id } = req.params;
    const { name, category_id, brand_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (name.length > 255) {
      return res.status(400).json({ success: false, message: 'Product name cannot exceed 255 characters' });
    }

    let finalBrandId = null;
    if (brand_id) {
      const isInteger = Number.isInteger(Number(brand_id)) && String(parseInt(brand_id)) === String(brand_id);
      if (isInteger) {
        finalBrandId = parseInt(brand_id);
      } else {
        const brandName = brand_id.trim();
        const brandSlug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const [brandRows] = await pool.query('SELECT id FROM brands WHERE name = ? OR slug = ?', [brandName, brandSlug]);
        if (brandRows.length > 0) {
          finalBrandId = brandRows[0].id;
        } else {
          const [insertRes] = await pool.query(
            'INSERT INTO brands (name, slug, status) VALUES (?, ?, \'ACTIVE\')',
            [brandName, brandSlug]
          );
          finalBrandId = insertRes.insertId;
        }
      }
    }

    const [result] = await pool.query(
      `UPDATE products SET name = ?, category_id = ?, brand_id = ? WHERE id = ? AND vendor_id = ?`,
      [name, category_id || 1, finalBrandId, id, vendorId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    res.status(200).json({ success: true, message: 'Product group updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const vendorId = req.user.id;
    const { id } = req.params;

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // Delete associated order items to bypass constraint
    await conn.query('DELETE FROM order_items WHERE product_id = ?', [id]);

    // Delete the product
    const [result] = await conn.query('DELETE FROM products WHERE id = ? AND vendor_id = ?', [id, vendorId]);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    res.status(200).json({ success: true, message: 'Product group deleted successfully' });
  } catch (error) {
    next(error);
  } finally {
    conn.release();
  }
};

// Model CRUD
export const getModelsByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const [models] = await pool.query(`
      SELECT m.* FROM models m WHERE m.product_id = ?
    `, [productId]);

    for (let model of models) {
      const [hRows] = await pool.query('SELECT highlight FROM model_highlights WHERE model_id = ?', [model.id]);
      model.highlights = hRows.map(h => h.highlight);

      const [seoRows] = await pool.query('SELECT slug, meta_title as metaTitle, meta_description as metaDescription, keywords, canonical_url as canonicalUrl, og_title as ogTitle, twitter_card_type as twitterCardType FROM seo WHERE model_id = ?', [model.id]);
      model.seo_details = seoRows.length > 0 ? seoRows[0] : null;

      const [specs] = await pool.query(`
        SELECT ms.value, ca.name as label, ca.id as attribute_id
        FROM model_specifications ms
        JOIN category_attributes ca ON ms.attribute_id = ca.id
        WHERE ms.model_id = ?
      `, [model.id]);
      model.specifications = specs;

      const [docs] = await pool.query(`SELECT id, file_path as filePath, file_name as fileName, file_type as fileType FROM documents WHERE model_id = ?`, [model.id]);
      const [vids] = await pool.query(`SELECT id, video_url as videoUrl, video_type as videoType FROM videos WHERE model_id = ?`, [model.id]);
      const [imgs] = await pool.query(`SELECT id, image_url as imageUrl, image_type as imageType, sort_order as sortOrder, is_default as isDefault, alt_text as altText FROM model_images WHERE model_id = ? ORDER BY sort_order ASC`, [model.id]);

      model.documents = docs;
      model.videos = vids;
      model.images = imgs;
    }

    res.status(200).json({ success: true, models });
  } catch (error) {
    next(error);
  }
};

export const createModel = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { productId } = req.params;
    const { name, sku, description, warranty, replacement_policy, replacement_days, return_policy, return_days, whats_in_the_box, highlights, specifications, seo_details, documents, videos, images } = req.body;

    const publicId = generateId('MDL');
    const [modelResult] = await conn.query(
      `INSERT INTO models (public_id, product_id, name, sku, description, warranty, replacement_policy, replacement_days, return_policy, return_days, whats_in_the_box) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publicId, productId, name, sku || null, description || null, warranty || null, replacement_policy || 'No Replacement', replacement_days || null, return_policy || null, return_days || 7, whats_in_the_box || null]
    );
    const modelId = modelResult.insertId;

    if (Array.isArray(highlights)) {
      for (const highlight of highlights) {
        if (highlight) {
          await conn.query(`INSERT INTO model_highlights (model_id, highlight) VALUES (?, ?)`, [modelId, highlight]);
        }
      }
    }

    if (Array.isArray(specifications)) {
      for (const spec of specifications) {
        if (spec.attribute_id && spec.value) {
          await conn.query(`INSERT INTO model_specifications (model_id, attribute_id, value) VALUES (?, ?, ?)`, [modelId, spec.attribute_id, spec.value]);
        }
      }
    }

    if (seo_details) {
      const slug = seo_details.slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      await conn.query(
        `INSERT INTO seo (model_id, slug, meta_title, meta_description, keywords, canonical_url, og_title, twitter_card_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [modelId, slug, seo_details.metaTitle || null, seo_details.metaDescription || null, seo_details.keywords || null, seo_details.canonicalUrl || null, seo_details.ogTitle || null, seo_details.twitterCardType || null]
      );
    } else {
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      await conn.query(`INSERT INTO seo (model_id, slug) VALUES (?, ?)`, [modelId, slug]);
    }

    if (Array.isArray(images)) {
      for (const img of images) {
        const source = img.imageUrl || img.image_url || img;
        const finalPath = await uploadImageBuffer(source, 'products', 'model_img');
        await conn.query(
          `INSERT INTO model_images (model_id, image_url, image_type, sort_order, is_default, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
          [modelId, finalPath, img.imageType || 'GALLERY', img.sortOrder || 0, img.isDefault || false, img.altText || null]
        );
      }
    }

    if (Array.isArray(documents)) {
      for (const doc of documents) {
        const filePath = await uploadImageBuffer(doc.file || doc.filePath, 'documents', 'doc');
        await conn.query(`INSERT INTO documents (model_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)`, [modelId, filePath, doc.fileName || 'Doc', doc.fileType || 'pdf']);
      }
    }

    if (Array.isArray(videos)) {
      for (const vid of videos) {
        if (vid.videoUrl) {
          await conn.query(`INSERT INTO videos (model_id, video_url, video_type) VALUES (?, ?, ?)`, [modelId, vid.videoUrl, vid.videoType || 'youtube']);
        }
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Model created successfully', modelId });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const updateModel = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { name, sku, description, warranty, replacement_policy, replacement_days, return_policy, return_days, whats_in_the_box, highlights, specifications, seo_details, documents, videos, images } = req.body;

    await conn.query(
      `UPDATE models SET name = ?, sku = ?, description = ?, warranty = ?, replacement_policy = ?, replacement_days = ?, return_policy = ?, return_days = ?, whats_in_the_box = ? WHERE id = ?`,
      [name, sku || null, description || null, warranty || null, replacement_policy || 'No Replacement', replacement_days || null, return_policy || null, return_days || 7, whats_in_the_box || null, id]
    );

    await conn.query(`DELETE FROM model_highlights WHERE model_id = ?`, [id]);
    if (Array.isArray(highlights)) {
      for (const highlight of highlights) {
        if (highlight) {
          await conn.query(`INSERT INTO model_highlights (model_id, highlight) VALUES (?, ?)`, [id, highlight]);
        }
      }
    }

    await conn.query(`DELETE FROM model_specifications WHERE model_id = ?`, [id]);
    if (Array.isArray(specifications)) {
      for (const spec of specifications) {
        if (spec.attribute_id && spec.value) {
          await conn.query(`INSERT INTO model_specifications (model_id, attribute_id, value) VALUES (?, ?, ?)`, [id, spec.attribute_id, spec.value]);
        }
      }
    }

    if (seo_details) {
      const slug = seo_details.slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      await conn.query(
        `INSERT INTO seo (model_id, slug, meta_title, meta_description, keywords, canonical_url, og_title, twitter_card_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE slug = VALUES(slug), meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), keywords = VALUES(keywords), canonical_url = VALUES(canonical_url), og_title = VALUES(og_title), twitter_card_type = VALUES(twitter_card_type)`,
        [id, slug, seo_details.metaTitle || null, seo_details.metaDescription || null, seo_details.keywords || null, seo_details.canonicalUrl || null, seo_details.ogTitle || null, seo_details.twitterCardType || null]
      );
    }

    await conn.query(`DELETE FROM model_images WHERE model_id = ?`, [id]);
    if (Array.isArray(images)) {
      for (const img of images) {
        const source = img.imageUrl || img.image_url || img;
        const finalPath = await uploadImageBuffer(source, 'products', 'model_img');
        await conn.query(
          `INSERT INTO model_images (model_id, image_url, image_type, sort_order, is_default, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, finalPath, img.imageType || 'GALLERY', img.sortOrder || 0, img.isDefault || false, img.altText || null]
        );
      }
    }

    await conn.query(`DELETE FROM documents WHERE model_id = ?`, [id]);
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        const filePath = await uploadImageBuffer(doc.file || doc.filePath, 'documents', 'doc');
        await conn.query(`INSERT INTO documents (model_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)`, [id, filePath, doc.fileName || 'Doc', doc.fileType || 'pdf']);
      }
    }

    await conn.query(`DELETE FROM videos WHERE model_id = ?`, [id]);
    if (Array.isArray(videos)) {
      for (const vid of videos) {
        if (vid.videoUrl) {
          await conn.query(`INSERT INTO videos (model_id, video_url, video_type) VALUES (?, ?, ?)`, [id, vid.videoUrl, vid.videoType || 'youtube']);
        }
      }
    }

    await conn.commit();
    res.status(200).json({ success: true, message: 'Model updated successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const deleteModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM models WHERE id = ?`, [id]);
    res.status(200).json({ success: true, message: 'Model deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({ success: false, message: 'Cannot delete model because it is associated with existing ordered items or other dependencies.' });
    }
    next(error);
  }
};

const deepParseJson = (data, defaultVal) => {
  let parsed = data;
  let iters = 0;
  while (typeof parsed === 'string' && iters < 5) {
    try {
      parsed = JSON.parse(parsed);
      iters++;
    } catch (e) {
      break;
    }
  }
  return parsed || defaultVal;
};

// Variant CRUD
export const getVariantsByModel = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const [variants] = await pool.query(`SELECT * FROM variants WHERE model_id = ?`, [modelId]);
    for (const variant of variants) {
      const [images] = await pool.query(`SELECT id, image_url as imageUrl, image_type as imageType, sort_order as sortOrder, is_default as isDefault, alt_text as altText FROM variant_images WHERE variant_id = ? ORDER BY sort_order ASC`, [variant.id]);
      variant.images = images;
      
      variant.highlights = deepParseJson(variant.highlights, []);
      variant.specifications = deepParseJson(variant.specifications, {});
      variant.attributes = deepParseJson(variant.attributes, {});
    }
    res.status(200).json({ success: true, variants });
  } catch (error) {
    next(error);
  }
};

export const createVariant = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { modelId } = req.params;
    const { sku, price, mrp, stock, status, attributes, name, warranty, whats_in_the_box, specifications, images, return_policy, return_window_days } = req.body;

    const tempSku = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const publicId = generateId('VAR');

    const [result] = await conn.query(
      `INSERT INTO variants (public_id, model_id, sku, price, mrp, stock, status, attributes, name, warranty, whats_in_the_box, specifications, return_policy, return_window_days, seo_slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [publicId, modelId, tempSku, price || 0, mrp || 0, stock || 0, status || 'PUBLISHED', JSON.stringify(attributes || {}), name || null, warranty || null, whats_in_the_box || null, JSON.stringify(specifications || {}), return_policy || 'NO_RETURN', return_window_days || 7, null]
    );
    const variantId = result.insertId;

    const baseSku = sku || `SKU-VAR-${Date.now().toString().slice(-6)}`;
    const suffix = `-${variantId}`;
    let finalSku = baseSku;
    if (finalSku.length + suffix.length > 100) {
      finalSku = finalSku.substring(0, 100 - suffix.length);
    }
    finalSku = `${finalSku}${suffix}`;
    const finalSlug = req.body.seo_slug || req.body.seoSlug || finalSku.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await conn.query(
      `UPDATE variants SET sku = ?, seo_slug = ? WHERE id = ?`,
      [finalSku, finalSlug, variantId]
    );

    if (Array.isArray(images)) {
      for (const img of images) {
        const source = img.imageUrl || img.image_url || img;
        const finalPath = await uploadImageBuffer(source, 'products', 'variant_img');
        await conn.query(
          `INSERT INTO variant_images (variant_id, image_url, image_type, sort_order, is_default, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
          [variantId, finalPath, img.imageType || 'GALLERY', img.sortOrder || 0, img.isDefault || false, img.altText || null]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ success: true, message: 'Variant created successfully', variantId });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const updateVariant = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { sku, price, mrp, stock, status, attributes, name, warranty, whats_in_the_box, specifications, images, return_policy, return_window_days } = req.body;

    const [rows] = await conn.query('SELECT id FROM variants WHERE id = ? OR public_id = ?', [id, id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }
    const realId = rows[0].id;

    const baseSku = sku || `SKU-VAR-${Date.now().toString().slice(-6)}`;
    const suffix = `-${realId}`;
    let finalSku = baseSku;
    if (!finalSku.endsWith(suffix)) {
      if (finalSku.length + suffix.length > 100) {
        finalSku = finalSku.substring(0, 100 - suffix.length);
      }
      finalSku = `${finalSku}${suffix}`;
    } else {
      if (finalSku.length > 100) {
        finalSku = finalSku.substring(0, 100);
      }
    }
    const finalSlug = req.body.seo_slug || req.body.seoSlug || finalSku.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await conn.query(
      `UPDATE variants SET sku = ?, price = ?, mrp = ?, stock = ?, status = ?, attributes = ?, name = ?, warranty = ?, whats_in_the_box = ?, specifications = ?, return_policy = ?, return_window_days = ?, seo_slug = ? WHERE id = ?`,
      [finalSku, price || 0, mrp || 0, stock || 0, status || 'PUBLISHED', JSON.stringify(attributes || {}), name || null, warranty || null, whats_in_the_box || null, JSON.stringify(specifications || {}), return_policy || 'NO_RETURN', return_window_days || 7, finalSlug, realId]
    );

    if (Array.isArray(images)) {
      await conn.query(`DELETE FROM variant_images WHERE variant_id = ?`, [realId]);
      for (const img of images) {
        const source = img.imageUrl || img.image_url || img;
        const finalPath = await uploadImageBuffer(source, 'products', 'variant_img');
        await conn.query(
          `INSERT INTO variant_images (variant_id, image_url, image_type, sort_order, is_default, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
          [realId, finalPath, img.imageType || 'GALLERY', img.sortOrder || 0, img.isDefault || false, img.altText || null]
        );
      }
    }

    await conn.commit();
    res.status(200).json({ success: true, message: 'Variant updated successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const deleteVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM variants WHERE id = ? OR public_id = ?`, [id, id]);
    res.status(200).json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({ success: false, message: 'Cannot delete variant because it is associated with existing ordered items or other dependencies.' });
    }
    next(error);
  }
};

export const saveVariantsBatch = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { modelId } = req.params;
    const { variants } = req.body;

    if (!Array.isArray(variants)) {
      return res.status(400).json({ success: false, message: 'Variants must be an array' });
    }

    // 1. Get existing variants (both ID and public_id) for this model
    const [existingRows] = await conn.query('SELECT id, public_id FROM variants WHERE model_id = ?', [modelId]);
    const existingIds = existingRows.map(r => r.id);

    // Resolve incoming public_id / integer ID values
    const incomingVariantsResolved = variants.map(v => {
      let resolvedId = null;
      if (v.id) {
        const match = existingRows.find(r => r.id === v.id || r.public_id === v.id);
        if (match) {
          resolvedId = match.id;
        }
      }
      return { ...v, resolvedId };
    });

    const incomingDbIds = incomingVariantsResolved.map(v => v.resolvedId).filter(Boolean);

    // 2. Delete variants that are not in the incoming list
    const toDelete = existingIds.filter(id => !incomingDbIds.includes(id));
    if (toDelete.length > 0) {
      await conn.query('DELETE FROM variants WHERE id IN (?)', [toDelete]);
    }

    // 3. Insert or Update incoming variants
    for (const v of incomingVariantsResolved) {
      const attributesJson = JSON.stringify(v.attributes || {});
      const specsJson = JSON.stringify(v.specifications || {});
      const highlightsJson = JSON.stringify(v.highlights || []);
      const baseSku = v.sku || `SKU-VAR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;

      const variantName = v.name ? v.name.substring(0, 255) : null;
      const variantBarcode = v.barcode ? v.barcode.substring(0, 100) : null;

      let variantId = v.resolvedId;

      if (v.resolvedId) {
        // Update
        const suffix = `-${v.resolvedId}`;
        let finalSku = baseSku;
        if (!finalSku.endsWith(suffix)) {
          if (finalSku.length + suffix.length > 100) {
            finalSku = finalSku.substring(0, 100 - suffix.length);
          }
          finalSku = `${finalSku}${suffix}`;
        } else {
          if (finalSku.length > 100) {
            finalSku = finalSku.substring(0, 100);
          }
        }
        const finalSlug = v.seo_slug || v.seoSlug || finalSku.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        await conn.query(
          `UPDATE variants SET sku = ?, price = ?, mrp = ?, stock = ?, status = ?, attributes = ?, name = ?, description = ?, highlights = ?, warranty = ?, whats_in_the_box = ?, specifications = ?, barcode = ?, return_policy = ?, return_window_days = ?, seo_slug = ? WHERE id = ? AND model_id = ?`,
          [finalSku, v.price || 0, v.mrp || 0, v.stock || 0, v.status || 'PUBLISHED', attributesJson, variantName, v.description || null, highlightsJson, v.warranty || null, v.whats_in_the_box || null, specsJson, variantBarcode, v.return_policy || 'NO_RETURN', v.return_window_days || 7, finalSlug, v.resolvedId, modelId]
        );
      } else {
        // Create
        const publicId = generateId('VAR');
        const tempSku = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const [result] = await conn.query(
          `INSERT INTO variants (public_id, model_id, sku, price, mrp, stock, status, attributes, name, description, highlights, warranty, whats_in_the_box, specifications, barcode, return_policy, return_window_days, seo_slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [publicId, modelId, tempSku, v.price || 0, v.mrp || 0, v.stock || 0, v.status || 'PUBLISHED', attributesJson, variantName, v.description || null, highlightsJson, v.warranty || null, v.whats_in_the_box || null, specsJson, variantBarcode, v.return_policy || 'NO_RETURN', v.return_window_days || 7, null]
        );
        variantId = result.insertId;

        const suffix = `-${variantId}`;
        let finalSku = baseSku;
        if (finalSku.length + suffix.length > 100) {
          finalSku = finalSku.substring(0, 100 - suffix.length);
        }
        finalSku = `${finalSku}${suffix}`;
        const finalSlug = v.seo_slug || v.seoSlug || finalSku.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        await conn.query(
          `UPDATE variants SET sku = ?, seo_slug = ? WHERE id = ?`,
          [finalSku, finalSlug, variantId]
        );
      }

      // Save variant images
      if (Array.isArray(v.images)) {
        await conn.query(`DELETE FROM variant_images WHERE variant_id = ?`, [variantId]);
        for (const img of v.images) {
          const source = img.imageUrl || img.image_url || img;
          const finalPath = await uploadImageBuffer(source, 'products', 'variant_img');
          await conn.query(
            `INSERT INTO variant_images (variant_id, image_url, image_type, sort_order, is_default, alt_text) VALUES (?, ?, ?, ?, ?, ?)`,
            [variantId, finalPath, img.imageType || 'GALLERY', img.sortOrder || 0, img.isDefault || false, img.altText || null]
          );
        }
      }
    }

    await conn.commit();
    res.status(200).json({ success: true, message: 'Variants batch saved successfully' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

// Purchase Subscription
export const subscribeToPlan = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { plan_id } = req.body;

    // Fetch the plan details
    const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [plan_id]);
    const plan = plans[0];

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Yearly subscription logic
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    await pool.query(
      `INSERT INTO vendor_subscriptions (
        vendor_id, plan_id, start_date, expiry_date, auto_renewal, status
      ) VALUES (?, ?, ?, ?, true, 'ACTIVE')`,
      [vendorId, plan_id, startDate, expiryDate]
    );

    res.status(200).json({ success: true, message: 'Yearly subscription activated successfully.' });
  } catch (error) {
    next(error);
  }
};

// Get Vendor Payouts
export const getMyPayouts = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    // Fetch orders that are delivered, return window complete, and have no active returns
    const [completedSales] = await pool.query(
      `SELECT 
        oi.id,
        oi.quantity,
        v.price as base_price,
        p.name as product_name,
        oi.delivered_at,
        COALESCE(v.return_window_days, 7) as return_window_days
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       LEFT JOIN variants v ON oi.variant_id = v.id
       WHERE oi.vendor_id = ?
         AND oi.item_status = 'DELIVERED'
         AND oi.delivered_at IS NOT NULL
         AND DATE_ADD(oi.delivered_at, INTERVAL COALESCE(v.return_window_days, 7) DAY) <= NOW()
         AND NOT EXISTS (
           SELECT 1 FROM return_requests rr 
           WHERE rr.order_item_id = oi.id 
             AND rr.status NOT IN ('REJECTED', 'RETURN_REJECTED')
         )`,
      [vendorId]
    );

    // Find existing payouts to avoid duplicates
    const [existingPayouts] = await pool.query(
      `SELECT order_item_id FROM payouts WHERE vendor_id = ? AND order_item_id IS NOT NULL`,
      [vendorId]
    );
    const existingOrderItemIds = new Set(existingPayouts.map(p => p.order_item_id));

    // Insert new payouts for completed sales
    const newPayoutsToInsert = completedSales.filter(item => !existingOrderItemIds.has(item.id));
    if (newPayoutsToInsert.length > 0) {
      const values = newPayoutsToInsert.map(item => {
        const payoutAmount = Number(item.base_price || 0) * Number(item.quantity || 1);
        const details = `${item.product_name} (Qty: ${item.quantity}) - Return period expired`;
        return [vendorId, payoutAmount, 'PENDING', item.id, details];
      });

      await pool.query(
        `INSERT INTO payouts (vendor_id, amount, status, order_item_id, details) VALUES ?`,
        [values]
      );
    }

    // Fetch actual payouts from table
    const [payouts] = await pool.query(
      `SELECT * FROM payouts WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendorId]
    );

    res.status(200).json({ success: true, payouts });
  } catch (error) {
    next(error);
  }
};

export const getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const [orders] = await pool.query(
      `SELECT 
        oi.id as order_item_id, oi.quantity, oi.price, oi.item_status, oi.picked_up_at, oi.delivered_at,
        oi.delivery_request_id, oi.tracking_number, oi.delivery_provider, oi.delivery_agent_name, oi.delivery_agent_phone,
        oi.product_id as product_id,
        o.id as order_id, o.payment_method, o.payment_status, o.created_at,
        p.name as product_name,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = oi.variant_id AND vi.image_url IS NOT NULL ORDER BY vi.is_default DESC LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi JOIN variants v2 ON vi.variant_id = v2.id JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id AND vi.image_url IS NOT NULL LIMIT 1),
          p.thumbnail
        ) as thumbnail,
        u.name as customer_name, u.email as customer_email,
        a.street, a.city, a.state, a.zip, a.phone, a.name as address_name
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON o.user_id = u.id
       JOIN addresses a ON o.shipping_address_id = a.id
       WHERE oi.vendor_id = ?
       ORDER BY o.created_at DESC`,
      [vendorId]
    );
    res.status(200).json({ success: true, orders });
  } catch (error) {
    next(error);
  }
};

export const updateVendorOrderStatus = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { itemId } = req.params;
    const { status, reason } = req.body;

    const [item] = await pool.query('SELECT id FROM order_items WHERE id = ? AND vendor_id = ?', [itemId, vendorId]);
    if (item.length === 0) {
      return res.status(404).json({ success: false, message: 'Order item not found or unauthorized' });
    }

    if (status === 'DELIVERED') {
      await pool.query('UPDATE order_items SET item_status = ?, delivered_at = NOW() WHERE id = ?', [status, itemId]);
    } else if (status === 'CANCELLED') {
      await pool.query('UPDATE order_items SET item_status = ?, rejection_reason = ? WHERE id = ?', [status, reason || null, itemId]);
    } else {
      await pool.query('UPDATE order_items SET item_status = ? WHERE id = ?', [status, itemId]);
    }

    res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    next(error);
  }
};
