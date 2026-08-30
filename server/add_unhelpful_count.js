import pool from './src/config/db.js';

async function run() {
  try {
    await pool.query('ALTER TABLE product_reviews ADD COLUMN unhelpful_count INT DEFAULT 0');
    console.log('Successfully added unhelpful_count to product_reviews');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column unhelpful_count already exists');
    } else {
      console.error('Error:', err);
    }
  }
  process.exit();
}

run();
