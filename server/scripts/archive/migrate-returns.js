import pool from './config/db.js';

async function runMigrations() {
  const connection = await pool.getConnection();
  try {
    console.log('Starting migrations...');
    
    // Returns table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        order_id INT UNSIGNED NOT NULL,
        vendor_id INT UNSIGNED NOT NULL,
        return_type ENUM('RETURN', 'REPLACEMENT') NOT NULL,
        status ENUM('REQUESTED', 'VENDOR_REVIEW', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'RETURN_PICKED_UP', 'RETURN_COMPLETED', 'REPLACEMENT_SHIPPED', 'REPLACEMENT_DELIVERED', 'REFUNDED') DEFAULT 'REQUESTED',
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        images JSON,
        vendor_rejection_reason TEXT,
        delivery_request_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (vendor_id) REFERENCES users(id)
      )
    `);
    
    // Return items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        return_id INT UNSIGNED NOT NULL,
        order_item_id INT UNSIGNED NOT NULL,
        quantity INT NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
      )
    `);

    // Return status logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS return_status_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        return_id INT UNSIGNED NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
      )
    `);

    // Product reviews table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        order_item_id INT UNSIGNED NOT NULL,
        rating DECIMAL(2,1) NOT NULL,
        title VARCHAR(255),
        body TEXT,
        is_verified_purchase BOOLEAN DEFAULT TRUE,
        status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
      )
    `);

    // Review images
    await connection.query(`
      CREATE TABLE IF NOT EXISTS review_images (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        media_url VARCHAR(1000) NOT NULL,
        media_type ENUM('IMAGE', 'VIDEO') DEFAULT 'IMAGE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE
      )
    `);

    // Review helpful votes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS review_helpful_votes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        vote_type ENUM('HELPFUL', 'UNHELPFUL') DEFAULT 'HELPFUL',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vote (review_id, user_id),
        FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

runMigrations();
