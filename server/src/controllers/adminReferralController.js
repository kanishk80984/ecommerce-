import pool from '../config/db.js';

export const getReferralBonus = async (req, res, next) => {
  try {
    const [settings] = await pool.query('SELECT key_value FROM system_settings WHERE key_name = "vendor_referral_bonus"');
    const bonus = settings.length > 0 ? parseFloat(settings[0].key_value) : 500;
    
    res.status(200).json({ success: true, bonus });
  } catch (error) {
    next(error);
  }
};

export const updateReferralBonus = async (req, res, next) => {
  try {
    const { bonus } = req.body;
    
    if (bonus === undefined || bonus === null || isNaN(bonus) || bonus < 0) {
      return res.status(400).json({ success: false, message: 'Invalid bonus amount' });
    }

    await pool.query(
      'INSERT INTO system_settings (key_name, key_value) VALUES ("vendor_referral_bonus", ?) ON DUPLICATE KEY UPDATE key_value = ?',
      [bonus.toString(), bonus.toString()]
    );
    
    res.status(200).json({ success: true, message: 'Referral bonus updated successfully', bonus });
  } catch (error) {
    next(error);
  }
};
