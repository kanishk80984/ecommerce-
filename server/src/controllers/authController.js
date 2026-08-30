import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import StorageService from '../storage/StorageService.js';
import { optimizeToSingleBuffer } from '../services/imageService.js';

const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!', {
    expiresIn: '7d'
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, referral_code } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Name, Email, Password, and Mobile number are required' });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Default role logic for safety
    let userRole = 'USER';
    if (role && ['USER', 'VENDOR', 'TECHNICAL_SUPPORT'].includes(role)) {
      userRole = role; // Admins should be created via admin panel, not public registration
    }

    let isApproved = true;
    if (userRole === 'VENDOR' || userRole === 'TECHNICAL_SUPPORT') {
      isApproved = false; // Vendors and Tech Support require admin approval
    }

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, role, is_approved) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, password_hash, phone || null, userRole, isApproved]
    );

    const userId = result.insertId;

    if (userRole === 'VENDOR') {
      // Create an empty vendor profile that they will fill out during KYC
      const vendorPublicId = `vp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const vendorSlug = `${(name || 'vendor').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;
      const myReferralCode = Math.floor(10000000 + Math.random() * 90000000).toString();

      await pool.query(
        `INSERT INTO vendor_profiles (user_id, business_name, kyc_status, public_id, slug, referral_code) VALUES (?, ?, 'PENDING', ?, ?, ?)`,
        [userId, name, vendorPublicId, vendorSlug, myReferralCode]
      );

      if (referral_code) {
        const [referrerProfiles] = await pool.query('SELECT user_id FROM vendor_profiles WHERE referral_code = ?', [referral_code]);
        if (referrerProfiles.length > 0) {
          const referrerVendorId = referrerProfiles[0].user_id;
          
          // Get current bonus amount
          const [settings] = await pool.query('SELECT key_value FROM system_settings WHERE key_name = ?', ['vendor_referral_bonus']);
          const bonusAmount = settings.length > 0 ? parseFloat(settings[0].key_value) : 500;
          
          await pool.query(
            `INSERT INTO vendor_referrals (referrer_vendor_id, referred_vendor_id, referral_code, status, bonus_amount) VALUES (?, ?, ?, 'REGISTERED', ?)`,
            [referrerVendorId, userId, referral_code, bonusAmount]
          );
        }
      }
    }

    const token = generateToken(userId, email, userRole);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email,
        phone: phone || null,
        profile_photo: null,
        role: userRole,
        is_approved: isApproved,
        is_suspended: false,
        suspension_reason: null,
        kyc_status: userRole === 'VENDOR' ? 'PENDING' : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(`
      SELECT u.*, vp.kyc_status 
      FROM users u
      LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
      WHERE u.email = ?
    `, [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    // Check status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: `Account is ${user.status.toLowerCase()}` });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Handle Referral Bonus on first successful login after admin acceptance
    if (user.role === 'VENDOR') {
      const [pendingReferral] = await pool.query(
        `SELECT id, referrer_vendor_id, bonus_amount FROM vendor_referrals WHERE referred_vendor_id = ? AND status = 'ADMIN_ACCEPTED'`,
        [user.id]
      );
      
      if (pendingReferral.length > 0) {
        const referral = pendingReferral[0];
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          
          // Update referral status
          await connection.query(
            `UPDATE vendor_referrals SET status = 'REWARDED', login_completed_at = CURRENT_TIMESTAMP, rewarded_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [referral.id]
          );
          
          // Update referrer wallet
          await connection.query(
            `UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?`,
            [referral.bonus_amount, referral.referrer_vendor_id]
          );
          
          // Insert wallet transaction
          await connection.query(
            `INSERT INTO wallet_transactions (user_id, amount, type, description, status) VALUES (?, ?, 'CREDIT', ?, 'SUCCESS')`,
            [referral.referrer_vendor_id, referral.bonus_amount, `Referral Bonus for referring ${user.name}`]
          );
          
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          console.error('Failed to reward referral on login:', err);
        } finally {
          connection.release();
        }
      }
    }

    const token = generateToken(user.id, user.email, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_photo: user.profile_photo,
        role: user.role,
        wallet_balance: user.wallet_balance,
        is_approved: !!user.is_approved,
        is_suspended: !!user.is_suspended,
        suspension_reason: user.suspension_reason,
        kyc_status: user.kyc_status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    // req.user is set in the protect middleware
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Mobile number are required' });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Mobile number must be exactly 10 digits' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already taken by another account' });
    }

    let profilePhotoPath = req.body.profile_photo;
    if (req.file && req.file.buffer) {
      // Optimize to WebP and upload via StorageService
      const optimized = await optimizeToSingleBuffer(req.file.buffer, {
        maxWidth: 300,
        maxHeight: 300,
        fit: 'cover',
        originalName: (req.file.originalname || 'profile').split('.')[0],
      });
      const uploaded = await StorageService.upload(optimized.buffer, {
        module: 'profiles',
        fileName: optimized.fileName,
        mimeType: optimized.mimeType,
      });
      profilePhotoPath = uploaded.publicUrl;
    } else if (profilePhotoPath === undefined) {
      const [currentUser] = await pool.query('SELECT profile_photo FROM users WHERE id = ?', [userId]);
      profilePhotoPath = currentUser[0]?.profile_photo || null;
    }

    await pool.query(
      'UPDATE users SET name = ?, email = ?, phone = ?, profile_photo = ? WHERE id = ?',
      [name, email, phone || null, profilePhotoPath, userId]
    );

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.profile_photo, u.role, u.status, u.wallet_balance, u.is_approved, u.is_suspended, u.suspension_reason, vp.kyc_status
       FROM users u
       LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: users[0] });
  } catch (error) {
    next(error);
  }
};
