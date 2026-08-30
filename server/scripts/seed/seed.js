import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';

const seed = async () => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    await pool.query('INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      'Demo User', 'demo@example.com', hash, 'CUSTOMER'
    ]);
    
    console.log('Demo user inserted: demo@example.com / password123');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
