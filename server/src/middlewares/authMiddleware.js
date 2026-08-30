import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');

      // Get user from the token
      const [users] = await pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.profile_photo, u.role, u.status, u.wallet_balance, u.is_approved, u.is_suspended, u.suspension_reason, vp.kyc_status
         FROM users u
         LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
         WHERE u.id = ?`,
        [decoded.id]
      );

      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      req.user = users[0];

      if (req.user.status !== 'ACTIVE') {
         return res.status(403).json({ success: false, message: `Account is ${req.user.status.toLowerCase()}` });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Admins and Super Admins can access all routes for administrative/support purposes
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }
    
    // Strict role validation
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: `User role '${req.user?.role}' is not authorized to access this route`
    });
  };
};

export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecuresecretjwtkey12345!');
      const [users] = await pool.query('SELECT u.id FROM users u WHERE u.id = ?', [decoded.id]);
      if (users.length > 0) req.user = users[0];
    } catch (e) {}
  }
  next();
};
