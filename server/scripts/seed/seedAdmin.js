import pool from './src/config/db.js';
import bcrypt from 'bcryptjs';

const seedAdmin = async () => {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);

    // Insert ADMIN
    await pool.query(
      `INSERT IGNORE INTO users (name, email, password_hash, role, status, is_approved) VALUES (?, ?, ?, 'ADMIN', 'ACTIVE', 1)`,
      ['Admin', 'admin@ibcinfotech.com', adminPassword]
    );

    // Insert SUPER_ADMIN
    await pool.query(
      `INSERT IGNORE INTO users (name, email, password_hash, role, status, is_approved) VALUES (?, ?, ?, 'SUPER_ADMIN', 'ACTIVE', 1)`,
      ['Super Admin', 'superadmin@ibcinfotech.com', superAdminPassword]
    );

    console.log('');
    console.log('✅ Users created successfully!');
    console.log('─────────────────────────────────────────');
    console.log('👤 ADMIN');
    console.log('   Email    : admin@ibcinfotech.com');
    console.log('   Password : admin123');
    console.log('─────────────────────────────────────────');
    console.log('👑 SUPER ADMIN');
    console.log('   Email    : superadmin@ibcinfotech.com');
    console.log('   Password : superadmin123');
    console.log('─────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding users:', err.message);
    process.exit(1);
  }
};

seedAdmin();
