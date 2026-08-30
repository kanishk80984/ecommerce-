const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost',user:'root',password:'',database:'user4'}).then(async c => {
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS review_reactions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        review_id INT UNSIGNED NOT NULL,
        review_type ENUM('service', 'product') NOT NULL DEFAULT 'service',
        user_id INT UNSIGNED NOT NULL,
        reaction_type ENUM('LIKE', 'DISLIKE') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_reaction (review_id, review_type, user_id)
      );
    `);
    console.log('Table created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    c.end();
  }
});
