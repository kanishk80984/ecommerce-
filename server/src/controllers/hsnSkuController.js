import pool from '../config/db.js';

// Abbreviation Helper
const getAbbreviation = (name) => {
  if (!name) return 'GEN';
  const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (clean.length <= 3) return clean.padEnd(3, 'X');
  const consonants = clean.replace(/[AEIOU]/g, '');
  if (consonants.length >= 3) return consonants.slice(0, 3);
  return clean.slice(0, 3);
};

const getCategoryCode = (name) => {
  const maps = {
    'fashion': 'FSH',
    'mobiles': 'MOB',
    'electronics': 'ELC',
    'laptops': 'LAP',
    'furniture': 'FUR',
    'beauty': 'BTY',
    'books': 'BKS',
    'sports': 'SPT'
  };
  const clean = (name || '').toLowerCase().trim();
  if (maps[clean]) return maps[clean];
  return getAbbreviation(name);
};

// 1. Get HSN Code by Category
export const getHsnByCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const [mapping] = await pool.query(
      `SELECT h.code, h.description 
       FROM category_hsn_mapping c 
       JOIN hsn_codes h ON c.hsn_code_id = h.id 
       WHERE c.category_id = ?`,
      [categoryId]
    );

    const [catRow] = await pool.query("SELECT gst_rate FROM categories WHERE id = ?", [categoryId]);
    const gstRate = catRow.length > 0 ? catRow[0].gst_rate : 18.00;

    res.status(200).json({ 
      success: true, 
      code: mapping.length > 0 ? mapping[0].code : 'HSN Code Not Configured', 
      description: mapping.length > 0 ? mapping[0].description : null,
      gst_rate: gstRate
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get HSN Code by Product Type
export const getHsnByProductType = async (req, res, next) => {
  try {
    const { productTypeId } = req.params;
    const [mapping] = await pool.query(
      `SELECT h.code, h.description, p.gst_rate 
       FROM product_types p 
       LEFT JOIN hsn_codes h ON p.hsn_code_id = h.id 
       WHERE p.id = ?`,
      [productTypeId]
    );

    if (mapping.length === 0) {
      return res.status(200).json({ success: true, code: 'HSN Code Not Configured', gst_rate: null });
    }
    res.status(200).json({ 
      success: true, 
      code: mapping[0].code || 'HSN Code Not Configured', 
      description: mapping[0].description || null,
      gst_rate: mapping[0].gst_rate
    });
  } catch (error) {
    next(error);
  }
};

// 3. Generate Seller SKU
export const generateSellerSku = async (req, res, next) => {
  try {
    const { categoryName, brandName } = req.query;

    const catCode = getCategoryCode(categoryName);
    const brandCode = getAbbreviation(brandName || 'GEN');
    const prefix = `${catCode}-${brandCode}`;

    // Atomic increment/upsert to prevent duplicate SKU assignments
    await pool.query(
      `INSERT INTO seller_sku_sequences (prefix, current_value, number_length) 
       VALUES (?, 1, 6) 
       ON DUPLICATE KEY UPDATE current_value = current_value + 1`,
      [prefix]
    );

    const [seqRow] = await pool.query(
      `SELECT current_value, number_length FROM seller_sku_sequences WHERE prefix = ?`,
      [prefix]
    );

    const seqVal = seqRow[0].current_value;
    const len = seqRow[0].number_length;
    const sku = `${prefix}-${String(seqVal).padStart(len, '0')}`;

    res.status(200).json({ success: true, sku });
  } catch (error) {
    next(error);
  }
};

// 4. Validate Seller SKU
export const validateSellerSku = async (req, res, next) => {
  try {
    const { sku, productId } = req.body;
    if (!sku) {
      return res.status(400).json({ success: false, message: 'SKU is required' });
    }

    let query = 'SELECT id FROM products WHERE sku = ?';
    let params = [sku];
    if (productId) {
      query += ' AND id != ?';
      params.push(productId);
    }

    const [rows] = await pool.query(query, params);
    if (rows.length > 0) {
      return res.status(200).json({ success: true, valid: false, message: 'SKU already exists' });
    }
    res.status(200).json({ success: true, valid: true, message: 'SKU is unique' });
  } catch (error) {
    next(error);
  }
};

// Admin Endpoints
export const getHsnCodes = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM hsn_codes ORDER BY code ASC");
    res.status(200).json({ success: true, hsnCodes: rows });
  } catch (error) {
    next(error);
  }
};

export const addHsnCode = async (req, res, next) => {
  try {
    const { code, description } = req.body;
    if (![4, 6, 8].includes(code?.length)) {
      return res.status(400).json({ success: false, message: 'HSN Code must be 4, 6, or 8 digits' });
    }

    await pool.query("INSERT INTO hsn_codes (code, description) VALUES (?, ?)", [code, description]);
    res.status(201).json({ success: true, message: 'HSN Code added successfully' });
  } catch (error) {
    next(error);
  }
};

export const editHsnCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, description } = req.body;
    if (![4, 6, 8].includes(code?.length)) {
      return res.status(400).json({ success: false, message: 'HSN Code must be 4, 6, or 8 digits' });
    }

    await pool.query("UPDATE hsn_codes SET code = ?, description = ? WHERE id = ?", [code, description, id]);
    res.status(200).json({ success: true, message: 'HSN Code updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteHsnCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM hsn_codes WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: 'HSN Code deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateHsnMapping = async (req, res, next) => {
  try {
    const { categoryId, hsnCodeId, gstRate } = req.body;
    await pool.query(
      `INSERT INTO category_hsn_mapping (category_id, hsn_code_id) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE hsn_code_id = ?`,
      [categoryId, hsnCodeId, hsnCodeId]
    );

    if (gstRate) {
      await pool.query("UPDATE categories SET gst_rate = ? WHERE id = ?", [gstRate, categoryId]);
    }

    res.status(200).json({ success: true, message: 'Category HSN mapping and GST rate updated' });
  } catch (error) {
    next(error);
  }
};

export const updateSkuSettings = async (req, res, next) => {
  try {
    const { prefix, numberLength } = req.body;
    await pool.query(
      `INSERT INTO seller_sku_sequences (prefix, current_value, number_length) 
       VALUES (?, 0, ?) 
       ON DUPLICATE KEY UPDATE number_length = ?`,
      [prefix, numberLength, numberLength]
    );
    res.status(200).json({ success: true, message: 'SKU sequence settings updated' });
  } catch (error) {
    next(error);
  }
};

export const getSkuSettings = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM seller_sku_sequences");
    res.status(200).json({ success: true, settings: rows });
  } catch (error) {
    next(error);
  }
};
