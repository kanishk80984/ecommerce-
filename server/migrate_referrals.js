import pool from './src/config/db.js';

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_name VARCHAR(255) UNIQUE NOT NULL,
        key_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    
    await pool.query(`
      INSERT INTO system_settings (key_name, key_value) 
      VALUES ('vendor_referral_bonus', '500') 
      ON DUPLICATE KEY UPDATE key_name=key_name;
    `);
    console.log('system_settings OK');

    try {
      await pool.query(`ALTER TABLE vendor_profiles ADD COLUMN referral_code VARCHAR(50) NULL UNIQUE;`);
      console.log('vendor_profiles altered');
    } catch(e) {
      if(e.code === 'ER_DUP_FIELDNAME') console.log('vendor_profiles already has referral_code');
      else throw e;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrer_vendor_id INT UNSIGNED NOT NULL,
        referred_vendor_id INT UNSIGNED NOT NULL,
        referral_code VARCHAR(50) NOT NULL,
        status ENUM('REGISTERED', 'ADMIN_ACCEPTED', 'LOGIN_SUCCESSFUL', 'REWARDED') DEFAULT 'REGISTERED',
        bonus_amount DECIMAL(10,2) NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP NULL,
        login_completed_at TIMESTAMP NULL,
        rewarded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(referred_vendor_id),
        FOREIGN KEY (referrer_vendor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_vendor_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('vendor_referrals OK');

    // Backfill missing referral codes for existing vendors
    const [profiles] = await pool.query('SELECT id, user_id, business_name FROM vendor_profiles WHERE referral_code IS NULL');
    if (profiles.length > 0) {
      for (let p of profiles) {
        const uniqueString = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `VEN-${uniqueString}`;
        await pool.query('UPDATE vendor_profiles SET referral_code = ? WHERE id = ?', [code, p.id]);
      }
      console.log(`Backfilled referral codes for ${profiles.length} vendors`);
    } else {
      console.log('No backfill needed');
    }

  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

migrate();
