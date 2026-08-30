import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const categories = [
  'Fashion', 'Mobiles', 'Electronics', 'Beauty', 'Home', 
  'Appliances', 'Toys & Baby', 'Food & Health', 'Auto Accessories', 
  'Sports & Fitness', 'Furniture'
];

async function seedCategories() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'ecommerce_platform'
    });

    console.log('Connected to DB');

    for (const name of categories) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await conn.query('INSERT IGNORE INTO categories (name, slug, status) VALUES (?, ?, "ACTIVE")', [name, slug]);
    }
    console.log('Categories seeded successfully!');
    await conn.end();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedCategories();
