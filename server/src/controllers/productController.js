import pool from '../config/db.js';

// Get all published products (Public list view joined with first model and variant)
export const getProducts = async (req, res, next) => {
  try {
    const [products] = await pool.query(`
      SELECT 
        p.id, p.public_id, p.slug, p.name as name, p.category_id, p.brand_id, p.created_at,
        c.name as category_name, c.slug as category_slug,
        b.slug as brand_slug,
        c.margin_percentage as category_margin,
        c.gst_percentage as category_gst,
        vp.business_name as vendor_name, vp.public_id as vendor_public_id,
        m.id as model_id, m.public_id as model_public_id, m.name as model_name, m.description as short_description,
        v.id as variant_id, v.public_id as variant_public_id, v.price, v.mrp, v.stock,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id AND vi.is_default = 1 LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id LIMIT 1),
          (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id AND mi.is_default = 1 LIMIT 1),
          (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id LIMIT 1)
        ) as thumbnail,
        (SELECT COALESCE(AVG(r.rating), 0) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED') as average_rating,
        (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id = p.id AND r.status = 'APPROVED') as review_count
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN models m ON m.id = (SELECT m2.id FROM models m2 WHERE m2.product_id = p.id LIMIT 1)
      LEFT JOIN variants v ON v.id = (SELECT v2.id FROM variants v2 WHERE v2.model_id = m.id LIMIT 1)
      WHERE u.is_suspended = 0 
        AND u.status = 'ACTIVE'
      ORDER BY p.created_at DESC
    `);

    // Fetch all variants for these products
    const productIds = products.map(p => p.id);
    let allVariantsMap = {};

    if (productIds.length > 0) {
      const [allVariants] = await pool.query(`
        SELECT 
          v.id, v.public_id, v.model_id, m.public_id as model_public_id, m.product_id, v.name, v.sku, v.price, v.mrp, v.stock, v.attributes, v.seo_slug,
          COALESCE(
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id AND vi.is_default = 1 LIMIT 1),
            (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = v.id LIMIT 1),
            (SELECT mi.image_url FROM model_images mi WHERE mi.model_id = m.id AND mi.is_default = 1 LIMIT 1)
          ) as thumbnail
        FROM variants v
        JOIN models m ON v.model_id = m.id
        WHERE m.product_id IN (?)
      `, [productIds]);

      allVariants.forEach(v => {
        if (!allVariantsMap[v.product_id]) allVariantsMap[v.product_id] = [];
        allVariantsMap[v.product_id].push(v);
      });
    }

    // Normalize response and mask internal IDs
    const formattedProducts = products.map(p => {
      const marginRate = parseFloat(p.category_margin || 0);

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
        brand_id: p.brand_slug,
        model_id: p.model_public_id,
        variant_id: p.variant_public_id,
        thumbnail: p.thumbnail || 'https://via.placeholder.com/150',
        variants: pVariants
      };
    });

    res.status(200).json({ success: true, products: formattedProducts });
  } catch (error) {
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

// Get single product details (Loads all models, variants, specifications, highlights, SEO, documents, and media)
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let queryField = 'p.public_id = ? OR p.slug = ?';
    let queryVal = [id, id];

    if (/^\d+$/.test(id)) {
      queryField = 'p.id = ?';
      queryVal = [parseInt(id)];
    }

    const [products] = await pool.query(`
      SELECT p.*, vp.business_name as vendor_name, vp.public_id as vendor_public_id, u.name as vendor_owner_name, c.name as category_name, c.margin_percentage as category_margin, c.gst_percentage as category_gst, c.slug as category_slug,
             vp.working_hours as vendor_working_hours, vp.business_address as vendor_address, vp.business_email as vendor_email, vp.website as vendor_website, vp.phone_number as vendor_phone, vp.whatsapp_number as vendor_whatsapp
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (${queryField}) AND u.is_suspended = 0 AND u.status = 'ACTIVE'
    `, queryVal);

    if (!products[0]) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // If it was requested using old internal ID, redirect 301 to the new SEO URL
    if (/^\d+$/.test(id)) {
      const categorySlug = (product.category_name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return res.redirect(301, `/${categorySlug}/product/${product.slug}`);
    }

    const realProductId = product.id;

    const [models] = await pool.query(`SELECT * FROM models WHERE product_id = ?`, [realProductId]);

    for (let model of models) {
      const [highlights] = await pool.query(`SELECT highlight FROM model_highlights WHERE model_id = ?`, [model.id]);
      model.highlights = highlights.map(h => h.highlight);

      const [specs] = await pool.query(`
        SELECT ms.value, ca.name as label, ca.id as attribute_id
        FROM model_specifications ms
        JOIN category_attributes ca ON ms.attribute_id = ca.id
        WHERE ms.model_id = ?
      `, [model.id]);
      model.specifications = specs;

      const [seoRow] = await pool.query(`SELECT * FROM seo WHERE model_id = ?`, [model.id]);
      model.seo_details = seoRow[0] || null;

      const [docs] = await pool.query(`SELECT file_path as filePath, file_name as fileName, file_type as fileType FROM documents WHERE model_id = ?`, [model.id]);
      model.documents = docs;

      const [vids] = await pool.query(`SELECT video_url as videoUrl, video_type as videoType FROM videos WHERE model_id = ?`, [model.id]);
      model.videos = vids;

      // Fetch model images
      const [modelImgs] = await pool.query(`SELECT id, image_url as imageUrl, image_type as imageType, sort_order as sortOrder, is_default as isDefault, alt_text as altText FROM model_images WHERE model_id = ? ORDER BY sort_order ASC`, [model.id]);
      model.images = modelImgs;

      const [variants] = await pool.query(`SELECT * FROM variants WHERE model_id = ? AND status = 'PUBLISHED'`, [model.id]);
      for (let variant of variants) {
        // Fetch variant images
        const [variantImgs] = await pool.query(`SELECT id, image_url as imageUrl, image_type as imageType, sort_order as sortOrder, is_default as isDefault, alt_text as altText FROM variant_images WHERE variant_id = ? ORDER BY sort_order ASC`, [variant.id]);
        variant.images = variantImgs;

        variant.highlights = deepParseJson(variant.highlights, []);
        variant.specifications = deepParseJson(variant.specifications, {});
        variant.attributes = deepParseJson(variant.attributes, {});
      }
      model.variants = variants;
    }

    // Mask internal database IDs before sending to client
    const marginRate = parseFloat(product.category_margin || 0);

    const publicModels = models.map(model => {
      const publicVariants = model.variants.map(variant => {
        const vCopy = { ...variant };
        const vBasePrice = parseFloat(variant.price || 0);
        const vMarginAmount = vBasePrice * (marginRate / 100);
        const vPriceAfterMargin = vBasePrice + vMarginAmount;
        const vTotalAmount = Math.round(vPriceAfterMargin);

        vCopy.price = vTotalAmount;
        vCopy.id = variant.public_id;
        vCopy.model_id = model.public_id;
        delete vCopy.public_id;
        return vCopy;
      });
      const mCopy = { ...model };
      mCopy.id = model.public_id;
      mCopy.product_id = product.public_id;
      mCopy.variants = publicVariants;
      delete mCopy.public_id;
      return mCopy;
    });

    const publicProduct = {
      ...product,
      id: product.public_id,
      vendor_id: product.vendor_public_id,
      category_id: product.category_slug,
      models: publicModels
    };

    // Remove internal database primary/foreign keys
    delete publicProduct.public_id;
    delete publicProduct.vendor_public_id;

    res.status(200).json({ success: true, product: publicProduct });
  } catch (error) {
    next(error);
  }
};
