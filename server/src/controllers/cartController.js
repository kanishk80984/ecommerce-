import pool from '../config/db.js';

const resolveProductId = async (productId) => {
  if (!productId) return null;
  if (/^\d+$/.test(productId)) return parseInt(productId);
  const [rows] = await pool.query("SELECT id FROM products WHERE public_id = ? OR slug = ?", [productId, productId]);
  return rows[0] ? rows[0].id : null;
};

const resolveVariantId = async (variantId) => {
  if (!variantId || variantId === 0 || variantId === '0') return 0;
  if (/^\d+$/.test(variantId)) return parseInt(variantId);
  const [rows] = await pool.query("SELECT id FROM variants WHERE public_id = ?", [variantId]);
  return rows[0] ? rows[0].id : 0;
};

export const syncCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { localCart } = req.body; // Array of { product_id, quantity, variant_id }

    // Merge local cart into database
    if (localCart && localCart.length > 0) {
      for (const item of localCart) {
        const realId = await resolveProductId(item.product_id);
        if (realId) {
          const variantId = await resolveVariantId(item.variant_id);
          await pool.query(
            `INSERT INTO cart (user_id, product_id, variant_id, quantity) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [userId, realId, variantId, item.quantity, item.quantity]
          );
        }
      }
    }

    // Fetch the unified cart
    const [cartItems] = await pool.query(
      `SELECT c.id as cart_id, c.quantity, c.variant_id, p.public_id as product_id, p.slug, 
        CASE 
          WHEN c.variant_id > 0 THEN CONCAT(p.name, ' - ', COALESCE((SELECT name FROM variants WHERE id = c.variant_id), 'Variant'))
          ELSE p.name 
        END as name,
        ROUND(COALESCE((SELECT price FROM variants WHERE id = c.variant_id), p.price) * (1 + (COALESCE(cat.margin_percentage, 0) / 100))) as price, 
        COALESCE((SELECT mrp FROM variants WHERE id = c.variant_id), p.mrp) as mrp, 
        p.short_description, vp.public_id as vendor_id,
        COALESCE(
          (SELECT vi.image_url FROM variants v2 JOIN models m2 ON v2.model_id = m2.id LEFT JOIN variant_images vi ON vi.variant_id = v2.id WHERE v2.id = c.variant_id AND vi.image_url IS NOT NULL ORDER BY vi.is_default DESC LIMIT 1),
          p.thumbnail,
          (SELECT vi.image_url FROM variants v2 JOIN models m2 ON v2.model_id = m2.id LEFT JOIN variant_images vi ON vi.variant_id = v2.id WHERE m2.product_id = p.id AND vi.image_url IS NOT NULL LIMIT 1),
          (SELECT mi.image_url FROM models m3 LEFT JOIN model_images mi ON mi.model_id = m3.id WHERE m3.product_id = p.id AND mi.image_url IS NOT NULL LIMIT 1)
        ) as thumbnail,
        (SELECT name FROM variants WHERE id = c.variant_id) as variant_name,
        COALESCE(cat.gst_percentage, 0) as gst_percentage
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       LEFT JOIN categories cat ON p.category_id = cat.id
       LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
       WHERE c.user_id = ?`,
      [userId]
    );

    res.status(200).json({ success: true, cart: cartItems });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity, variantId } = req.body;
    const realId = await resolveProductId(productId);
    const realVariantId = await resolveVariantId(variantId);
    if (!realId) return res.status(404).json({ success: false, message: 'Product not found' });

    await pool.query(
      `INSERT INTO cart (user_id, product_id, variant_id, quantity) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, realId, realVariantId, quantity || 1, quantity || 1]
    );

    res.status(200).json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    next(error);
  }
};

export const updateCartQuantity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { quantity, variantId } = req.body;
    const realId = await resolveProductId(productId);
    const realVariantId = await resolveVariantId(variantId);
    if (!realId) return res.status(404).json({ success: false, message: 'Product not found' });

    await pool.query(
      `UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
      [quantity, userId, realId, realVariantId]
    );

    res.status(200).json({ success: true, message: 'Cart quantity updated' });
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const variantId = req.query.variantId;
    const realId = await resolveProductId(productId);
    const realVariantId = await resolveVariantId(variantId);
    if (!realId) return res.status(404).json({ success: false, message: 'Product not found' });

    await pool.query(
      `DELETE FROM cart WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
      [userId, realId, realVariantId]
    );

    res.status(200).json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await pool.query(`DELETE FROM cart WHERE user_id = ?`, [userId]);
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};
