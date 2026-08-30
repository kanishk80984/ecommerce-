import pool from '../config/db.js';

// --- CUSTOMER APIs ---

export const submitReview = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user.id;
    const { product_id, order_item_id, rating, title, body, images } = req.body;

    if (!product_id || !order_item_id || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    await connection.beginTransaction();

    // 1. Verify eligibility (Delivered and no active conflicting return)
    const [itemInfo] = await connection.query(
      `SELECT oi.delivered_at, oi.variant_id, v.public_id as variant_public_id, v.name as variant_name
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN variants v ON oi.variant_id = v.id
       WHERE oi.id = ? AND o.user_id = ? AND oi.product_id = ?`,
      [order_item_id, userId, product_id]
    );

    if (itemInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Order item not found or you do not own it.' });
    }

    if (!itemInfo[0].delivered_at) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You can only review delivered items.' });
    }

    const variantPublicId = itemInfo[0].variant_public_id || null;
    const variantName = itemInfo[0].variant_name || null;

    // Check for active returns that prevent reviewing
    const [activeReturns] = await connection.query(
      `SELECT r.id FROM returns r
       JOIN return_items ri ON r.id = ri.return_id
       WHERE ri.order_item_id = ? AND r.status NOT IN ('RETURN_COMPLETED', 'REPLACEMENT_DELIVERED', 'REJECTED')`,
      [order_item_id]
    );

    if (activeReturns.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You cannot review an item with an active return/replacement request.' });
    }

    // Check if already reviewed
    const [existingReview] = await connection.query(
      'SELECT id FROM product_reviews WHERE user_id = ? AND order_item_id = ?',
      [userId, order_item_id]
    );

    if (existingReview.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'You have already reviewed this item.' });
    }

    // 2. Insert Review — save variant_public_id & variant_name at submission time
    const [reviewRes] = await connection.query(
      `INSERT INTO product_reviews (product_id, user_id, order_item_id, variant_public_id, variant_name, rating, title, body, is_verified_purchase, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'APPROVED')`,
      [product_id, userId, order_item_id, variantPublicId, variantName, rating, title || '', body || '']
    );
    const reviewId = reviewRes.insertId;

    // 3. Insert Images (if any)
    if (images && Array.isArray(images) && images.length > 0) {
      for (const imgUrl of images) {
        await connection.query(
          'INSERT INTO review_images (review_id, media_url, media_type) VALUES (?, ?, "IMAGE")',
          [reviewId, imgUrl]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Review submitted successfully', reviewId });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const submitServiceReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { service_id, enquiry_id, rating, title, body } = req.body;

    if (!service_id || !enquiry_id || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 1. Verify eligibility (Completed enquiry)
    const [enquiryInfo] = await pool.query(
      `SELECT status FROM service_enquiries WHERE id = ? AND customer_id = ? AND service_id = ?`,
      [enquiry_id, userId, service_id]
    );

    if (enquiryInfo.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found or you do not own it.' });
    }

    if (enquiryInfo[0].status !== 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'You can only review completed services.' });
    }

    // 2. Check if already reviewed
    const [existingReview] = await pool.query(
      'SELECT id FROM service_reviews WHERE user_id = ? AND enquiry_id = ?',
      [userId, enquiry_id]
    );

    if (existingReview.length > 0) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this service booking.' });
    }

    // 3. Insert Review
    const [reviewRes] = await pool.query(
      `INSERT INTO service_reviews (service_id, user_id, enquiry_id, rating, title, body, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')`,
      [service_id, userId, enquiry_id, rating, title || '', body || '']
    );
    
    res.status(201).json({ success: true, message: 'Review submitted successfully', reviewId: reviewRes.insertId });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, title, body } = req.body;

    const [result] = await pool.query(
      'UPDATE product_reviews SET rating = ?, title = ?, body = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [rating, title, body, reviewId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
    }

    res.status(200).json({ success: true, message: 'Review updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const [result] = await pool.query('DELETE FROM product_reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Review not found or unauthorized' });
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [reviews] = await pool.query(
      `SELECT pr.*, p.name as product_name,
        COALESCE(
          (SELECT vi.image_url FROM variant_images vi WHERE vi.variant_id = oi.variant_id AND vi.image_url IS NOT NULL ORDER BY vi.is_default DESC LIMIT 1),
          (SELECT vi.image_url FROM variant_images vi JOIN variants v2 ON vi.variant_id = v2.id JOIN models m2 ON v2.model_id = m2.id WHERE m2.product_id = p.id AND vi.image_url IS NOT NULL LIMIT 1),
          p.thumbnail
        ) as product_thumbnail
       FROM product_reviews pr
       JOIN order_items oi ON pr.order_item_id = oi.id
       JOIN products p ON oi.product_id = p.id
       WHERE pr.user_id = ?
       ORDER BY pr.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

export const voteHelpful = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { vote_type } = req.body; // HELPFUL or UNHELPFUL

    // Insert or update on duplicate key
    await pool.query(
      `INSERT INTO review_helpful_votes (review_id, user_id, vote_type) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE vote_type = ?`,
      [reviewId, userId, vote_type || 'HELPFUL', vote_type || 'HELPFUL']
    );

    // Update helpful_count in product_reviews table
    await pool.query(
      `UPDATE product_reviews SET helpful_count = (
         SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = ? AND vote_type = 'HELPFUL'
       ), unhelpful_count = (
         SELECT COUNT(*) FROM review_helpful_votes WHERE review_id = ? AND vote_type = 'UNHELPFUL'
       ) WHERE id = ?`,
      [reviewId, reviewId, reviewId]
    );

    res.status(200).json({ success: true, message: 'Vote recorded' });
  } catch (error) {
    next(error);
  }
};

// --- PUBLIC APIs ---

export const getReviewsForProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { sort = 'latest' } = req.query; // latest, helpful

    let orderClause = 'r.created_at DESC';
    if (sort === 'helpful') {
      orderClause = 'r.helpful_count DESC, r.created_at DESC';
    }

    let resolvedProductId = productId;
    const [pRows] = await pool.query(
      `SELECT id FROM products WHERE id = ? OR public_id = ? OR slug = ?`,
      [productId, productId, productId]
    );
    if (pRows.length > 0) {
      resolvedProductId = pRows[0].id;
    }

    const [reviews] = await pool.query(
      `SELECT r.*, u.name as user_name,
        (SELECT GROUP_CONCAT(media_url) FROM review_images WHERE review_id = r.id) as images
       FROM product_reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'APPROVED'
       ORDER BY ${orderClause}`,
      [resolvedProductId]
    );

    const processedReviews = reviews.map(review => ({
      ...review,
      images: review.images ? review.images.split(',') : []
    }));

    res.status(200).json({ success: true, reviews: processedReviews });
  } catch (error) {
    next(error);
  }
};
