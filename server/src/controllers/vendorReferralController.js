import pool from '../config/db.js';

export const getReferralDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get vendor's own referral code
    const [profiles] = await pool.query('SELECT referral_code FROM vendor_profiles WHERE user_id = ?', [userId]);
    const referralCode = profiles.length > 0 ? profiles[0].referral_code : null;

    // Get stats
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalReferrals,
        SUM(CASE WHEN status = 'REGISTERED' THEN 1 ELSE 0 END) as registeredCount,
        SUM(CASE WHEN status = 'ADMIN_ACCEPTED' THEN 1 ELSE 0 END) as acceptedCount,
        SUM(CASE WHEN status IN ('LOGIN_SUCCESSFUL', 'REWARDED') THEN 1 ELSE 0 END) as loginSuccessfulCount,
        SUM(CASE WHEN status = 'REWARDED' THEN bonus_amount ELSE 0 END) as totalEarned
      FROM vendor_referrals
      WHERE referrer_vendor_id = ?
    `, [userId]);

    // Get wallet balance
    const [users] = await pool.query('SELECT wallet_balance FROM users WHERE id = ?', [userId]);
    const walletBalance = users.length > 0 ? users[0].wallet_balance : 0;

    // Get current active bonus amount
    const [settings] = await pool.query('SELECT key_value FROM system_settings WHERE key_name = ?', ['vendor_referral_bonus']);
    const currentBonus = settings.length > 0 ? Number(settings[0].key_value) : 500;

    res.status(200).json({
      success: true,
      data: {
        referralCode,
        currentBonus,
        stats: {
          totalReferrals: stats[0].totalReferrals || 0,
          registeredCount: stats[0].registeredCount || 0,
          acceptedCount: stats[0].acceptedCount || 0,
          loginSuccessfulCount: stats[0].loginSuccessfulCount || 0,
          totalEarned: stats[0].totalEarned || 0,
          walletBalance: walletBalance
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getReferralsList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const [referrals] = await pool.query(`
      SELECT 
        vr.id,
        vr.referral_code,
        vr.status,
        vr.bonus_amount,
        vr.registered_at,
        vp.business_name
      FROM vendor_referrals vr
      JOIN vendor_profiles vp ON vr.referred_vendor_id = vp.user_id
      WHERE vr.referrer_vendor_id = ?
      ORDER BY vr.registered_at DESC
    `, [userId]);

    res.status(200).json({
      success: true,
      referrals
    });
  } catch (error) {
    next(error);
  }
};
