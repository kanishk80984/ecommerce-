import pool from '../config/db.js';
import StorageService from '../storage/StorageService.js';
import { optimizeToSingleBuffer } from '../services/imageService.js';

// Get all vendors (Pending and Approved)
export const getVendors = async (req, res, next) => {
  try {
    const [vendors] = await pool.query(`
      SELECT u.id, u.name, u.email, u.is_approved, u.is_suspended, u.suspension_reason, vp.vendor_type, vp.business_name, vp.kyc_status, vp.created_at
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE u.role = 'VENDOR'
      ORDER BY vp.created_at DESC
    `);
    res.status(200).json({ success: true, vendors });
  } catch (error) {
    next(error);
  }
};

// Approve or Reject Vendor
export const updateVendorStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    if (action === 'APPROVE') {
      await pool.query('UPDATE users SET is_approved = true WHERE id = ? AND role = "VENDOR"', [id]);
      await pool.query('UPDATE vendor_profiles SET kyc_status = "APPROVED" WHERE user_id = ?', [id]);
      
      // Update referral status to ADMIN_ACCEPTED
      await pool.query('UPDATE vendor_referrals SET status = "ADMIN_ACCEPTED", accepted_at = CURRENT_TIMESTAMP WHERE referred_vendor_id = ? AND status = "REGISTERED"', [id]);
      
      await pool.query(
        'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'APPROVE_VENDOR', id, JSON.stringify({ action: 'approve' })]
      );
      res.status(200).json({ success: true, message: 'Vendor approved successfully' });
    } else if (action === 'REJECT') {
      await pool.query('UPDATE users SET is_approved = false WHERE id = ? AND role = "VENDOR"', [id]);
      await pool.query('UPDATE vendor_profiles SET kyc_status = "REJECTED" WHERE user_id = ?', [id]);
      await pool.query(
        'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'REJECT_VENDOR', id, JSON.stringify({ action: 'reject' })]
      );
      res.status(200).json({ success: true, message: 'Vendor rejected successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    next(error);
  }
};

// Create a Subscription Plan
export const createSubscriptionPlan = async (req, res, next) => {
  try {
    const {
      name, tier, monthly_price, yearly_price, product_limit, image_limit,
      storage_limit, ad_credits, featured_listing, homepage_listing,
      premium_badge, analytics_access, bulk_upload, bulk_export,
      ai_description, commission_percentage, free_business_limit, service_charge_percentage
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO subscription_plans (
        name, tier, monthly_price, yearly_price, product_limit, image_limit,
        storage_limit, ad_credits, featured_listing, homepage_listing,
        premium_badge, analytics_access, bulk_upload, bulk_export,
        ai_description, commission_percentage, free_business_limit, service_charge_percentage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, tier, monthly_price, yearly_price, product_limit, image_limit,
        storage_limit, ad_credits, featured_listing || false, homepage_listing || false,
        premium_badge || false, analytics_access || false, bulk_upload || false, bulk_export || false,
        ai_description || false, commission_percentage || 10.00, free_business_limit || 1000000.00, service_charge_percentage || 5.00
      ]
    );

    res.status(201).json({ success: true, message: 'Plan created successfully', planId: result.insertId });
  } catch (error) {
    next(error);
  }
};

// Get All Subscription Plans
export const getSubscriptionPlans = async (req, res, next) => {
  try {
    const [plans] = await pool.query('SELECT * FROM subscription_plans ORDER BY monthly_price ASC');
    res.status(200).json({ success: true, plans });
  } catch (error) {
    next(error);
  }
};

// Get Analytics (For Admin Dashboard Chart)
export const getAnalytics = async (req, res, next) => {
  try {
    const [userCounts] = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
    const [vendorStatusCounts] = await pool.query('SELECT kyc_status, COUNT(*) as count FROM vendor_profiles GROUP BY kyc_status');
    const [productCount] = await pool.query('SELECT COUNT(*) as count FROM products');

    // Format data for the frontend chart
    const data = {
      users: userCounts,
      vendors: vendorStatusCounts,
      total_products: productCount[0].count
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// --- BANNER MANAGEMENT ---

export const getBanners = async (req, res, next) => {
  try {
    const [banners] = await pool.query('SELECT * FROM banners ORDER BY created_at DESC');
    res.status(200).json({ success: true, banners });
  } catch (error) {
    next(error);
  }
};

export const uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a banner image' });
    }

    const { title, link_url } = req.body;

    // Optimize and upload via StorageService
    const optimized = await optimizeToSingleBuffer(req.file.buffer, {
      maxWidth: 1920,
      fit: 'inside',
      originalName: (req.file.originalname || 'banner').split('.')[0],
    });
    const uploaded = await StorageService.upload(optimized.buffer, {
      module: 'banners',
      fileName: optimized.fileName,
      mimeType: optimized.mimeType,
    });

    const [result] = await pool.query(
      'INSERT INTO banners (image_url, title, link_url, is_active) VALUES (?, ?, ?, true)',
      [uploaded.publicUrl, title || null, link_url || null]
    );

    res.status(201).json({
      success: true,
      message: 'Banner uploaded successfully',
      bannerId: result.insertId,
      imageUrl: uploaded.publicUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if banner exists
    const [existing] = await pool.query('SELECT * FROM banners WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    await pool.query('DELETE FROM banners WHERE id = ?', [id]);

    res.status(200).json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- PRODUCT MANAGEMENT (Admin) ---

export const getAdminProducts = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const [products] = await pool.query('SELECT * FROM products WHERE vendor_id = ? ORDER BY created_at DESC', [adminId]);
    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

export const createAdminProduct = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    let {
      category_id, name, short_description, description,
      stock, mrp, price, thumbnail
    } = req.body;

    if (req.file && req.file.buffer) {
      const optimized = await optimizeToSingleBuffer(req.file.buffer, {
        maxWidth: 800,
        maxHeight: 800,
        fit: 'inside',
        originalName: (req.file.originalname || 'product').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'products',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      thumbnail = uploaded.publicUrl;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();

    const [result] = await pool.query(
      `INSERT INTO products (
        vendor_id, category_id, name, slug, thumbnail, short_description, description, 
        stock, mrp, price, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')`,
      [
        adminId, category_id || 1, name, slug, thumbnail || null, short_description || null, description || null,
        stock || 0, mrp || 0, price || 0
      ]
    );

    res.status(201).json({ success: true, message: 'Product published successfully', productId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const updateAdminProduct = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    let { name, short_description, stock, mrp, price, thumbnail } = req.body;

    if (req.file && req.file.buffer) {
      const optimized = await optimizeToSingleBuffer(req.file.buffer, {
        maxWidth: 800,
        maxHeight: 800,
        fit: 'inside',
        originalName: (req.file.originalname || 'product').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'products',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      thumbnail = uploaded.publicUrl;
    }

    const [result] = await pool.query(
      `UPDATE products SET name = ?, short_description = ?, stock = ?, mrp = ?, price = ?, thumbnail = ?
       WHERE id = ? AND vendor_id = ?`,
      [name, short_description, stock, mrp, price, thumbnail, id, adminId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    res.status(200).json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAdminProduct = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query('DELETE FROM products WHERE id = ? AND vendor_id = ?', [id, adminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found or not authorized' });
    }

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- ADVERTISEMENT MANAGEMENT (Admin) ---

export const getAdvertisements = async (req, res, next) => {
  try {
    const [ads] = await pool.query('SELECT * FROM advertisements ORDER BY created_at DESC');
    res.status(200).json({ success: true, advertisements: ads });
  } catch (error) {
    next(error);
  }
};

export const createAdvertisement = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const {
      title, description, redirect_url, button_text, position,
      priority, start_date, end_date, status
    } = req.body;

    let image = req.body.image_path || null;
    if (req.files && req.files.image && req.files.image[0].buffer) {
      const f = req.files.image[0];
      const optimized = await optimizeToSingleBuffer(f.buffer, {
        maxWidth: 1920,
        fit: 'inside',
        originalName: (f.originalname || 'ad').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'advertisements',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      image = uploaded.publicUrl;
    }

    if (!image) {
      return res.status(400).json({ success: false, message: 'Desktop image is required' });
    }

    let mobile_image = req.body.mobile_image_path || null;
    if (req.files && req.files.mobile_image && req.files.mobile_image[0].buffer) {
      const f = req.files.mobile_image[0];
      const optimized = await optimizeToSingleBuffer(f.buffer, {
        maxWidth: 720,
        fit: 'inside',
        originalName: (f.originalname || 'ad_mobile').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'advertisements',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      mobile_image = uploaded.publicUrl;
    }

    const [result] = await pool.query(
      `INSERT INTO advertisements (
        title, description, image, mobile_image, redirect_url, button_text, 
        position, priority, start_date, end_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description || null, image, mobile_image, redirect_url || null, button_text || null,
        position, priority || 0, start_date || null, end_date || null, status || 'ACTIVE', adminId
      ]
    );

    res.status(201).json({ success: true, message: 'Advertisement created successfully', id: result.insertId });
  } catch (error) {
    console.error('CREATE AD ERROR:', error);
    next(error);
  }
};

export const updateAdvertisement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, redirect_url, button_text, position,
      priority, start_date, end_date, status
    } = req.body;

    let updateQuery = `UPDATE advertisements SET title = ?, description = ?, redirect_url = ?, button_text = ?, position = ?, priority = ?, start_date = ?, end_date = ?, status = ?`;
    let params = [title, description || null, redirect_url || null, button_text || null, position, priority || 0, start_date || null, end_date || null, status || 'ACTIVE'];

    if (req.body.image_path) {
      updateQuery += `, image = ?`;
      params.push(req.body.image_path);
    } else if (req.files && req.files.image && req.files.image[0].buffer) {
      const f = req.files.image[0];
      const optimized = await optimizeToSingleBuffer(f.buffer, {
        maxWidth: 1920,
        fit: 'inside',
        originalName: (f.originalname || 'ad').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'advertisements',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      updateQuery += `, image = ?`;
      params.push(uploaded.publicUrl);
    }

    if (req.body.mobile_image_path) {
      updateQuery += `, mobile_image = ?`;
      params.push(req.body.mobile_image_path);
    } else if (req.files && req.files.mobile_image && req.files.mobile_image[0].buffer) {
      const f = req.files.mobile_image[0];
      const optimized = await optimizeToSingleBuffer(f.buffer, {
        maxWidth: 720,
        fit: 'inside',
        originalName: (f.originalname || 'ad_mobile').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'advertisements',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      updateQuery += `, mobile_image = ?`;
      params.push(uploaded.publicUrl);
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    const [result] = await pool.query(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    res.status(200).json({ success: true, message: 'Advertisement updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAdvertisement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM advertisements WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    res.status(200).json({ success: true, message: 'Advertisement deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const suspendVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required' });
    }

    const [result] = await pool.query(
      'UPDATE users SET is_suspended = true, suspension_reason = ? WHERE id = ? AND role = "VENDOR"',
      [reason, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'SUSPEND_VENDOR', id, JSON.stringify({ reason })]
    );

    res.status(200).json({ success: true, message: 'Vendor suspended successfully' });
  } catch (error) {
    next(error);
  }
};

export const unsuspendVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'UPDATE users SET is_suspended = false, suspension_reason = NULL WHERE id = ? AND role = "VENDOR"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'UNSUSPEND_VENDOR', id, JSON.stringify({ action: 'unsuspend' })]
    );

    res.status(200).json({ success: true, message: 'Vendor unsuspended successfully' });
  } catch (error) {
    next(error);
  }
};

// General User Management
export const getUsers = async (req, res, next) => {
  try {
    const selectFields = req.user.role === 'SUPER_ADMIN'
      ? 'u.id, u.name, u.email, u.phone, u.password_hash as password, u.role, u.is_approved, u.is_suspended, u.suspension_reason, u.created_at, u.login_as_disabled'
      : 'u.id, u.name, u.email, u.phone, u.role, u.is_approved, u.is_suspended, u.suspension_reason, u.created_at, u.login_as_disabled';

    const [users] = await pool.query(`
      SELECT ${selectFields}, v.business_name, v.kyc_status
      FROM users u
      LEFT JOIN vendor_profiles v ON u.id = v.user_id
      ORDER BY u.created_at DESC
    `);

    if (users.length > 0) {
      const [allAddresses] = await pool.query(`
        SELECT user_id, street, city, state, zip, phone FROM addresses
      `);

      const addressMap = {};
      allAddresses.forEach(addr => {
        if (!addressMap[addr.user_id]) {
          addressMap[addr.user_id] = [];
        }
        addressMap[addr.user_id].push({
          street: addr.street,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          phone: addr.phone
        });
      });

      users.forEach(u => {
        u.addresses = addressMap[u.id] || [];
      });
    }

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [targetUser] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Super Administrators are permitted to delete user accounts.' });
    }

    // Fetch and delete the user's orders first to avoid foreign key constraints
    await pool.query('DELETE FROM orders WHERE user_id = ?', [id]);
    // Delete user's addresses
    await pool.query('DELETE FROM addresses WHERE user_id = ?', [id]);

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'DELETE_USER', id, JSON.stringify({ role: targetUser[0].role })]
    );

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

import jwt from 'jsonwebtoken';

export const loginAsUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if target user exists
    const [targetUser] = await pool.query('SELECT id, name, email, role, is_suspended, is_approved, login_as_disabled FROM users WHERE id = ?', [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const target = targetUser[0];

    // Check if the current actor (req.user) is an ADMIN and has impersonation disabled
    if (req.user.role === 'ADMIN') {
      const [actorRows] = await pool.query('SELECT login_as_disabled FROM users WHERE id = ?', [req.user.id]);
      if (actorRows.length > 0 && actorRows[0].login_as_disabled) {
        return res.status(403).json({ success: false, message: 'Your impersonation (Login As) privileges have been disabled by Super Admin.' });
      }
    }

    if (req.user.role !== 'SUPER_ADMIN' && target.login_as_disabled && target.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Impersonation (Login As) has been disabled for this Admin user.' });
    }

    // Safety checks
    if (req.user.role === 'ADMIN' && (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Admins cannot impersonate other admins' });
    }

    const token = jwt.sign(
      { id: target.id, email: target.email, role: target.role },
      process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        is_approved: target.is_approved
      }
    });
  } catch (error) {
    next(error);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required' });
    }

    const [targetUser] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (targetUser[0].role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Super Administrators cannot be suspended.' });
    }
    if (req.user.role === 'ADMIN' && targetUser[0].role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admins cannot delete or modify other Admins.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET is_suspended = true, suspension_reason = ? WHERE id = ?',
      [reason, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'SUSPEND_USER', id, JSON.stringify({ reason })]
    );

    res.status(200).json({ success: true, message: 'User suspended successfully' });
  } catch (error) {
    next(error);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [targetUser] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (targetUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (targetUser[0].role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Super Administrators cannot be unsuspended.' });
    }
    if (req.user.role === 'ADMIN' && targetUser[0].role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admins cannot delete or modify other Admins.' });
    }

    const [result] = await pool.query(
      'UPDATE users SET is_suspended = false, suspension_reason = NULL WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
      [req.user.id, 'UNSUSPEND_USER', id, JSON.stringify({ action: 'unsuspend' })]
    );

    res.status(200).json({ success: true, message: 'User unsuspended successfully' });
  } catch (error) {
    next(error);
  }
};
export const toggleLoginAsDisabled = async (req, res, next) => {
  try {
    const { userIds, disabled } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }
    const val = disabled ? 1 : 0;
    await pool.query('UPDATE users SET login_as_disabled = ? WHERE id IN (?)', [val, userIds]);

    // Log audit log entry
    await pool.query(
      'INSERT INTO audit_logs (admin_id, action_type, details) VALUES (?, ?, ?)',
      [req.user.id, 'TOGGLE_IMPERSONATION_DISABLE', JSON.stringify({ userIds, disabled })]
    );

    res.status(200).json({ success: true, message: `Successfully updated login-as restrictions for selected users.` });
  } catch (error) {
    next(error);
  }
};

export const getCategoriesWithMargins = async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name, status, margin_percentage, margin_description, gst_percentage, youtube_video_link FROM categories ORDER BY name ASC'
    );
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

export const updateCategoryMargin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { margin_percentage, margin_description, gst_percentage, youtube_video_link } = req.body;

    if (margin_percentage === undefined || margin_percentage === null) {
      return res.status(400).json({ success: false, message: 'Margin percentage is required' });
    }

    if (parseFloat(margin_percentage) < 0 || parseFloat(margin_percentage) > 100) {
      return res.status(400).json({ success: false, message: 'Margin percentage must be between 0 and 100' });
    }

    const gstVal = gst_percentage !== undefined && gst_percentage !== null ? parseFloat(gst_percentage) || 0 : 0;
    const marginVal = parseFloat(margin_percentage) || 0;

    const [result] = await pool.query(
      'UPDATE categories SET margin_percentage = ?, margin_description = ?, gst_percentage = ?, youtube_video_link = ? WHERE id = ?',
      [marginVal, margin_description || null, gstVal, youtube_video_link || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Cascade update to all variants belonging to products in this category
    // This triggers recalculation of any cached/stored final price configurations
    const [products] = await pool.query('SELECT id FROM products WHERE category_id = ?', [id]);
    if (products.length > 0) {
      const productIds = products.map(p => p.id);
      const [models] = await pool.query('SELECT id FROM models WHERE product_id IN (?)', [productIds]);
      if (models.length > 0) {
        const modelIds = models.map(m => m.id);
        // If there is any static column, we can update it, otherwise the dynamic calculation on fetch takes care of it.
        // Let's also insert an audit log record for this bulk category margin update.
        await pool.query(
          'INSERT INTO audit_logs (admin_id, action_type, details) VALUES (?, ?, ?)',
          [req.user.id, 'BULK_MARGIN_UPDATE', JSON.stringify({ categoryId: id, margin_percentage: marginVal, gst_percentage: gstVal })]
        );
      }
    }

    res.status(200).json({ success: true, message: 'Category margin, GST, and YouTube video updated successfully' });
  } catch (error) {
    next(error);
  }
};

// --- DYNAMIC ATTRIBUTE GROUPS & VALUES MANAGEMENT ---

export const getAttributeGroups = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    let query = 'SELECT ag.*, c.name as category_name FROM attribute_groups ag JOIN categories c ON ag.category_id = c.id';
    const params = [];

    if (categoryId) {
      query += ' WHERE ag.category_id = ?';
      params.push(categoryId);
    }
    query += ' ORDER BY ag.category_id ASC, ag.sort_order ASC';

    const [groups] = await pool.query(query, params);

    // Fetch values for each group
    for (let group of groups) {
      const [vals] = await pool.query('SELECT * FROM attribute_values WHERE group_id = ? ORDER BY value ASC', [group.id]);
      group.values = vals;
    }

    res.status(200).json({ success: true, attributeGroups: groups });
  } catch (error) {
    next(error);
  }
};

export const createAttributeGroup = async (req, res, next) => {
  try {
    const { category_id, name, is_enabled, sort_order, values } = req.body;

    if (!category_id || !name) {
      return res.status(400).json({ success: false, message: 'Category ID and Name are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO attribute_groups (category_id, name, is_enabled, sort_order) VALUES (?, ?, ?, ?)',
      [category_id, name, is_enabled !== undefined ? is_enabled : true, sort_order || 0]
    );
    const groupId = result.insertId;

    if (Array.isArray(values)) {
      for (const val of values) {
        if (val && val.trim()) {
          await pool.query('INSERT INTO attribute_values (group_id, value) VALUES (?, ?)', [groupId, val.trim()]);
        }
      }
    }

    res.status(201).json({ success: true, message: 'Attribute Group created successfully', groupId });
  } catch (error) {
    next(error);
  }
};

export const updateAttributeGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_enabled, sort_order, values } = req.body;

    await pool.query(
      'UPDATE attribute_groups SET name = COALESCE(?, name), is_enabled = COALESCE(?, is_enabled), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [name, is_enabled, sort_order, id]
    );

    if (Array.isArray(values)) {
      // Sync values: simple drop-and-reinsert or update
      await pool.query('DELETE FROM attribute_values WHERE group_id = ?', [id]);
      for (const val of values) {
        if (val && val.trim()) {
          await pool.query('INSERT INTO attribute_values (group_id, value) VALUES (?, ?)', [id, val.trim()]);
        }
      }
    }

    res.status(200).json({ success: true, message: 'Attribute Group updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const deleteAttributeGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM attribute_groups WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Attribute Group deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const createAttributeValue = async (req, res, next) => {
  try {
    const { group_id, value } = req.body;
    if (!group_id || !value) {
      return res.status(400).json({ success: false, message: 'Group ID and Value are required' });
    }

    const [result] = await pool.query('INSERT INTO attribute_values (group_id, value) VALUES (?, ?)', [group_id, value.trim()]);
    res.status(201).json({ success: true, message: 'Value added successfully', valueId: result.insertId });
  } catch (error) {
    next(error);
  }
};

export const deleteAttributeValue = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM attribute_values WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Value deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Search & Behaviour Analytics ───
export const getSearchAnalytics = async (req, res, next) => {
  try {
    // Top searched keywords
    const [topKeywords] = await pool.query(`
      SELECT query, COUNT(*) as count
      FROM user_search_events
      WHERE query != '' AND event_type = 'SEARCH' AND created_at >= NOW() - INTERVAL 30 DAY
      GROUP BY query
      ORDER BY count DESC
      LIMIT 20
    `);

    // Most clicked products after search
    const [topClickedProducts] = await pool.query(`
      SELECT 
        p.public_id, p.slug, p.name,
        COUNT(se.id) as click_count,
        SUM(CASE WHEN se.event_type = 'CART_ADD' THEN 1 ELSE 0 END) as cart_adds
      FROM user_search_events se
      JOIN products p ON se.product_id = p.id
      WHERE se.event_type IN ('CLICK', 'CART_ADD') AND se.created_at >= NOW() - INTERVAL 30 DAY
      GROUP BY p.id, p.public_id, p.slug, p.name
      ORDER BY click_count DESC
      LIMIT 20
    `);

    // Most clicked variants
    const [topClickedVariants] = await pool.query(`
      SELECT 
        v.public_id as variant_public_id, v.name as variant_name,
        p.public_id as product_public_id, p.slug as product_slug, p.name as product_name,
        COUNT(se.id) as click_count
      FROM user_search_events se
      JOIN variants v ON se.variant_id = v.id
      JOIN models m ON v.model_id = m.id
      JOIN products p ON m.product_id = p.id
      WHERE se.event_type IN ('CLICK', 'CART_ADD') AND se.variant_id IS NOT NULL AND se.created_at >= NOW() - INTERVAL 30 DAY
      GROUP BY v.id, v.public_id, v.name, p.id, p.public_id, p.slug, p.name
      ORDER BY click_count DESC
      LIMIT 20
    `);

    // Daily event volume for last 14 days
    const [dailyVolume] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) as searches,
        SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) as clicks,
        SUM(CASE WHEN event_type = 'CART_ADD' THEN 1 ELSE 0 END) as cart_adds
      FROM user_search_events
      WHERE created_at >= NOW() - INTERVAL 14 DAY
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Total counts
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) as total_events,
        SUM(CASE WHEN event_type = 'SEARCH' THEN 1 ELSE 0 END) as total_searches,
        SUM(CASE WHEN event_type = 'CLICK' THEN 1 ELSE 0 END) as total_clicks,
        SUM(CASE WHEN event_type = 'CART_ADD' THEN 1 ELSE 0 END) as total_cart_adds,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM user_search_events
      WHERE created_at >= NOW() - INTERVAL 30 DAY
    `);

    res.status(200).json({
      success: true,
      analytics: {
        totals,
        topKeywords,
        topClickedProducts,
        topClickedVariants,
        dailyVolume
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSearchAnalytics = async (req, res, next) => {
  try {
    const { type, ids } = req.body;

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    if (type === 'keywords') {
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(`DELETE FROM user_search_events WHERE query IN (${placeholders})`, ids);
    } else if (type === 'products') {
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(`
        DELETE se FROM user_search_events se
        JOIN products p ON se.product_id = p.id
        WHERE p.public_id IN (${placeholders})
      `, ids);
    } else if (type === 'variants') {
      const placeholders = ids.map(() => '?').join(',');
      await pool.query(`
        DELETE se FROM user_search_events se
        JOIN variants v ON se.variant_id = v.id
        WHERE v.public_id IN (${placeholders})
      `, ids);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid type' });
    }

    res.status(200).json({ success: true, message: 'Analytics data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getSupportRequests = async (req, res, next) => {
  try {
    const [requests] = await pool.query(`
      SELECT id, name, email, phone, role, is_approved, is_suspended, suspension_reason, created_at
      FROM users
      WHERE role = 'TECHNICAL_SUPPORT'
      ORDER BY created_at DESC
    `);
    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

export const updateSupportRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    if (action === 'APPROVE') {
      await pool.query('UPDATE users SET is_approved = true, is_suspended = false, suspension_reason = NULL WHERE id = ? AND role = "TECHNICAL_SUPPORT"', [id]);

      // Log the action
      await pool.query(
        'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'APPROVE_SUPPORT', id, JSON.stringify({ action: 'approve', message: `Approved technical support request for user ID: ${id}` })]
      );

      res.status(200).json({ success: true, message: 'Support user approved successfully' });
    } else if (action === 'REJECT') {
      await pool.query('UPDATE users SET is_approved = false, is_suspended = true, suspension_reason = "Application Rejected" WHERE id = ? AND role = "TECHNICAL_SUPPORT"', [id]);

      // Log the action
      await pool.query(
        'INSERT INTO audit_logs (admin_id, action_type, target_user_id, details) VALUES (?, ?, ?, ?)',
        [req.user.id, 'REJECT_SUPPORT', id, JSON.stringify({ action: 'reject', message: `Rejected technical support request for user ID: ${id}` })]
      );

      res.status(200).json({ success: true, message: 'Support user rejected successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    next(error);
  }
};

// ─── Admin User Credential Management ───────────────────────────────────────

import bcrypt from 'bcryptjs';

// Create a new Admin or Super Admin user (SUPER_ADMIN only)
export const createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be ADMIN or SUPER_ADMIN.' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, status, is_approved) VALUES (?, ?, ?, ?, 'ACTIVE', 1)`,
      [name, email, passwordHash, role]
    );

    res.status(201).json({ success: true, message: `${role} user created successfully.` });
  } catch (error) {
    next(error);
  }
};

// Update any user's credentials (name, email, password) — SUPER_ADMIN only
export const updateUserCredentials = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!name && !email && !password) {
      return res.status(400).json({ success: false, message: 'Provide at least one field to update.' });
    }

    // Fetch the user
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check email uniqueness if changing email
    if (email) {
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already in use by another account.' });
      }
    }

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.status(200).json({ success: true, message: 'User credentials updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// Update own credentials (logged-in SUPER_ADMIN changes their own name/email/password)
export const updateMyCredentials = async (req, res, next) => {
  try {
    const { name, email, password, currentPassword } = req.body;
    const userId = req.user.id;

    if (!name && !email && !password) {
      return res.status(400).json({ success: false, message: 'Provide at least one field to update.' });
    }

    // If changing password, verify current password first
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set a new password.' });
      }
      const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    // Check email uniqueness
    if (email) {
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already in use by another account.' });
      }
    }

    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    values.push(userId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    res.status(200).json({ success: true, message: 'Your credentials updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Category Management (SUPER_ADMIN only) ─────────────────────────────────

// Get all categories (including INACTIVE ones)
export const getAdminCategories = async (req, res, next) => {
  try {
    const [categories] = await pool.query(`
      SELECT id, name, slug, parent_id, status, margin_percentage, margin_description, gst_percentage 
      FROM categories 
      ORDER BY parent_id, name ASC
    `);
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// Create a new category
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, parent_id, status, margin_percentage, gst_percentage } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Name and Slug are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Category with this slug already exists.' });
    }

    await pool.query(
      `INSERT INTO categories (name, slug, parent_id, status, margin_percentage, gst_percentage) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        parent_id || null,
        status || 'ACTIVE',
        margin_percentage || 0.00,
        gst_percentage || 0.00
      ]
    );

    res.status(201).json({ success: true, message: 'Category created successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Extended Admin Features ──────────────────────────────────────────────────

// --- AUDIT LOGS ---
export const getAuditLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(`
      SELECT al.*, u.name as admin_name, u.email as admin_email 
      FROM audit_logs al 
      JOIN users u ON al.admin_id = u.id 
      ORDER BY al.created_at DESC
    `);
    res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};

// --- BANK ACCOUNTS ---
export const getBankAccounts = async (req, res, next) => {
  try {
    let query = `
      SELECT ba.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM bank_accounts ba
      JOIN users u ON ba.user_id = u.id
    `;

    // Admin can only see VENDOR and USER bank details. Super Admin sees all.
    if (req.user.role === 'ADMIN') {
      query += ` WHERE u.role IN ('VENDOR', 'USER')`;
    }
    query += ` ORDER BY ba.created_at DESC`;

    const [accounts] = await pool.query(query);
    res.status(200).json({ success: true, bankAccounts: accounts });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateBankAccount = async (req, res, next) => {
  try {
    const { account_holder_name, bank_name, account_number, ifsc_code } = req.body;
    const userId = req.user.id;

    if (!account_holder_name || !bank_name || !account_number || !ifsc_code) {
      return res.status(400).json({ success: false, message: 'All bank details are required.' });
    }

    const [existing] = await pool.query('SELECT id FROM bank_accounts WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      await pool.query(
        'UPDATE bank_accounts SET account_holder_name = ?, bank_name = ?, account_number = ?, ifsc_code = ? WHERE user_id = ?',
        [account_holder_name, bank_name, account_number, ifsc_code, userId]
      );
      res.status(200).json({ success: true, message: 'Bank account updated successfully.' });
    } else {
      await pool.query(
        'INSERT INTO bank_accounts (user_id, account_holder_name, bank_name, account_number, ifsc_code) VALUES (?, ?, ?, ?, ?)',
        [userId, account_holder_name, bank_name, account_number, ifsc_code]
      );
      res.status(201).json({ success: true, message: 'Bank account added successfully.' });
    }
  } catch (error) {
    next(error);
  }
};

export const getMyBankAccount = async (req, res, next) => {
  try {
    const [accounts] = await pool.query('SELECT * FROM bank_accounts WHERE user_id = ?', [req.user.id]);
    res.status(200).json({ success: true, bankAccount: accounts[0] || null });
  } catch (error) {
    next(error);
  }
};

// --- PAYOUTS ---
export const getPayouts = async (req, res, next) => {
  try {
    let query = `
      SELECT p.*, u.name as vendor_name, u.email as vendor_email,
      vp.account_holder_name, vp.bank_name, vp.bank_account as account_number, vp.ifsc_code, vp.branch_location, vp.upi_id
      FROM payouts p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
    `;

    if (req.user.role === 'ADMIN') {
      // Admins might only need to see pending payouts, or all to manage them
      query += ` ORDER BY p.created_at DESC`;
    } else if (req.user.role === 'SUPER_ADMIN') {
      query += ` ORDER BY p.created_at DESC`;
    }

    const [payouts] = await pool.query(query);
    res.status(200).json({ success: true, payouts });
  } catch (error) {
    next(error);
  }
};

export const getVendorPayoutDetails = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    let query = `
      SELECT p.*, u.name as vendor_name, u.email as vendor_email,
      vp.account_holder_name, vp.bank_name, vp.bank_account as account_number, vp.ifsc_code, vp.branch_location, vp.upi_id
      FROM payouts p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON p.vendor_id = vp.user_id
      WHERE p.vendor_id = ?
      ORDER BY p.created_at DESC
    `;
    const [payouts] = await pool.query(query, [vendorId]);
    res.status(200).json({ success: true, payouts });
  } catch (error) {
    next(error);
  }
};

export const updatePayoutStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // status validation based on role
    if (req.user.role === 'ADMIN') {
      if (status !== 'ADMIN_APPROVED' && status !== 'CANCELLED') {
        return res.status(403).json({ success: false, message: 'Admins can only approve or cancel payouts.' });
      }
    } else if (req.user.role === 'SUPER_ADMIN') {
      if (status !== 'PAID' && status !== 'CANCELLED') {
        return res.status(400).json({ success: false, message: 'Invalid status update for Super Admin.' });
      }
    }

    const [result] = await pool.query('UPDATE payouts SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Payout not found.' });
    }

    res.status(200).json({ success: true, message: `Payout marked as ${status}` });
  } catch (error) {
    next(error);
  }
};

// --- REFUND REQUESTS ---
export const getRefundRequests = async (req, res, next) => {
  try {
    let query = `
      SELECT r.*, u.name as user_name, u.email as user_email,
      ba.account_holder_name, ba.bank_name, ba.account_number, ba.ifsc_code
      FROM refund_requests r
      JOIN return_requests rr ON r.order_item_id = rr.order_item_id
      JOIN users u ON r.user_id = u.id
      LEFT JOIN bank_accounts ba ON r.user_id = ba.user_id
      ORDER BY r.created_at DESC
    `;
    const [refunds] = await pool.query(query);
    res.status(200).json({ success: true, refunds });
  } catch (error) {
    next(error);
  }
};

export const updateRefundRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // status validation based on role
    if (req.user.role === 'ADMIN') {
      if (status !== 'ADMIN_APPROVED' && status !== 'REJECTED') {
        return res.status(403).json({ success: false, message: 'Admins can only approve or reject refunds.' });
      }
    } else if (req.user.role === 'SUPER_ADMIN') {
      if (status !== 'REFUNDED') {
        return res.status(400).json({ success: false, message: 'Invalid status update for Super Admin.' });
      }
    }

    const [result] = await pool.query('UPDATE refund_requests SET status = ? WHERE id = ?', [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Refund request not found.' });
    }

    if (status === 'ADMIN_APPROVED') {
      const [refunds] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [id]);
      if (refunds.length > 0 && refunds[0].order_item_id) {
        const orderItemId = refunds[0].order_item_id;
        const [returns] = await pool.query('SELECT * FROM return_requests WHERE order_item_id = ?', [orderItemId]);
        if (returns.length > 0) {
          const ret = returns[0];
          await pool.query('UPDATE return_requests SET status = ? WHERE id = ?', ['REFUND_PROCESSING', ret.id]);
          await pool.query(
            'INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, ?, ?, ?)',
            [ret.id, ret.status, 'REFUND_PROCESSING', 'Refund request approved by Admin']
          );
        }
      }
    }

    if (status === 'REFUNDED') {
      const [refunds] = await pool.query('SELECT * FROM refund_requests WHERE id = ?', [id]);
      if (refunds.length > 0 && refunds[0].order_item_id) {
        const orderItemId = refunds[0].order_item_id;
        const [returns] = await pool.query('SELECT * FROM return_requests WHERE order_item_id = ?', [orderItemId]);
        if (returns.length > 0) {
          const ret = returns[0];
          await pool.query('UPDATE return_requests SET status = ? WHERE id = ?', ['REFUND_COMPLETED', ret.id]);
          await pool.query('UPDATE order_items SET item_status = ? WHERE id = ?', ['REFUND_COMPLETED', orderItemId]);
          await pool.query(
            'INSERT INTO return_status_logs (return_id, return_request_id, previous_status, new_status, remarks) VALUES (NULL, ?, ?, ?, ?)',
            [ret.id, ret.status, 'REFUND_COMPLETED', 'Refund processed successfully by Super Admin']
          );

          const [oRows] = await pool.query('SELECT tracking_timeline FROM orders WHERE id = ?', [ret.order_id]);
          if (oRows.length > 0) {
            let timeline = [];
            try {
              timeline = typeof oRows[0].tracking_timeline === 'string' ? JSON.parse(oRows[0].tracking_timeline) : oRows[0].tracking_timeline || [];
            } catch (e) { timeline = []; }
            timeline.push({
              item_id: orderItemId,
              event: 'REFUND_COMPLETED',
              timestamp: new Date().toISOString(),
              notes: 'Refund completed and processed'
            });
            await pool.query('UPDATE orders SET tracking_timeline = ? WHERE id = ?', [JSON.stringify(timeline), ret.order_id]);
          }
        }
      }
    }

    res.status(200).json({ success: true, message: `Refund request marked as ${status}` });
  } catch (error) {
    next(error);
  }
};

// Get Category Requests
export const getCategoryRequests = async (req, res, next) => {
  try {
    const [requests] = await pool.query(`
      SELECT cr.*, u.name as vendor_name, u.email as vendor_email, vp.business_name 
      FROM category_requests cr
      JOIN users u ON cr.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      ORDER BY cr.created_at DESC
    `);
    res.status(200).json({ success: true, requests });
  } catch (error) {
    next(error);
  }
};

// Approve or Reject Category Request
export const decideCategoryRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be APPROVE or REJECT.' });
    }

    const [requests] = await pool.query(`
      SELECT cr.*, vp.vendor_type 
      FROM category_requests cr
      LEFT JOIN vendor_profiles vp ON cr.vendor_id = vp.user_id
      WHERE cr.id = ?
    `, [id]);
    const request = requests[0];
    if (!request) {
      return res.status(404).json({ success: false, message: 'Category request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request has already been processed.' });
    }

    if (action === 'APPROVE') {
      const slug = request.suggested_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Check if category already exists in service_categories table
      const [existingCat] = await pool.query('SELECT id FROM service_categories WHERE slug = ? OR name = ?', [slug, request.suggested_name]);
      if (existingCat.length > 0) {
        // Make sure it is active
        await pool.query('UPDATE service_categories SET status = "ACTIVE" WHERE id = ?', [existingCat[0].id]);
      } else {
        // Insert new service category
        await pool.query(
          'INSERT INTO service_categories (name, slug, status) VALUES (?, ?, ?)',
          [request.suggested_name, slug, 'ACTIVE']
        );
      }

      // Update the request status
      await pool.query(
        'UPDATE category_requests SET status = "APPROVED" WHERE id = ?',
        [id]
      );

      // Update the vendor's profile category to this newly approved category name
      await pool.query(
        'UPDATE vendor_profiles SET category = ? WHERE user_id = ?',
        [request.suggested_name, request.vendor_id]
      );

    } else {
      // If REJECTED
      await pool.query(
        'UPDATE category_requests SET status = "REJECTED" WHERE id = ?',
        [id]
      );
    }

    res.status(200).json({ success: true, message: `Category request ${action.toLowerCase()}d successfully.` });
  } catch (error) {
    next(error);
  }
};

// Delete a category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT name FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await pool.query('UPDATE products SET category_id = NULL WHERE category_id = ?', [id]);
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    res.status(200).json({ success: true, message: `Category "${existing[0].name}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

// Delete a service category (adds to deleted_service_categories)
export const deleteServiceCategory = async (req, res, next) => {
  try {
    const { name } = req.params;
    await pool.query('UPDATE service_categories SET status = "INACTIVE" WHERE name = ?', [name]);
    res.status(200).json({ success: true, message: `Service Category "${name}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

// Update an E-Commerce category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, parent_id, status, margin_percentage, gst_percentage } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, message: 'Name and slug are required.' });
    }

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await pool.query(
      'UPDATE categories SET name=?, slug=?, parent_id=?, status=?, margin_percentage=?, gst_percentage=? WHERE id=?',
      [name, slug, parent_id || null, status || 'ACTIVE', margin_percentage || 0, gst_percentage || 0, id]
    );

    res.status(200).json({ success: true, message: 'Category updated successfully.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A category with this name or slug already exists.' });
    }
    next(error);
  }
};
