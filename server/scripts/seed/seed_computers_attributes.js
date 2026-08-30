import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_platform',
});

async function run() {
  try {
    // 1. Find Computers category
    const [cats] = await pool.query("SELECT id FROM categories WHERE name = 'Computers' OR name = 'Computer' LIMIT 1");
    if (cats.length === 0) {
      console.log("❌ Category 'Computers' not found in database.");
      return;
    }
    const catId = cats[0].id;
    console.log(`Found 'Computers' Category ID: ${catId}`);

    // 2. Add 'Storage' Attribute Group
    const [grpStorage] = await pool.query(
      "INSERT INTO attribute_groups (category_id, name, is_enabled, sort_order) VALUES (?, 'Storage', 1, 1)",
      [catId]
    );
    const storageGrpId = grpStorage.insertId;
    console.log(`Added 'Storage' Attribute Group ID: ${storageGrpId}`);

    // Add standard values for Storage
    const storageValues = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];
    for (const val of storageValues) {
      await pool.query(
        "INSERT INTO attribute_values (attribute_group_id, value, is_enabled, sort_order) VALUES (?, ?, 1, 0)",
        [storageGrpId, val]
      );
    }
    console.log("Added Storage values.");

    // 3. Add 'RAM' Attribute Group
    const [grpRam] = await pool.query(
      "INSERT INTO attribute_groups (category_id, name, is_enabled, sort_order) VALUES (?, 'RAM', 1, 2)",
      [catId]
    );
    const ramGrpId = grpRam.insertId;
    console.log(`Added 'RAM' Attribute Group ID: ${ramGrpId}`);

    // Add standard values for RAM
    const ramValues = ['8GB', '16GB', '32GB', '64GB'];
    for (const val of ramValues) {
      await pool.query(
        "INSERT INTO attribute_values (attribute_group_id, value, is_enabled, sort_order) VALUES (?, ?, 1, 0)",
        [ramGrpId, val]
      );
    }
    console.log("Added RAM values.");

    console.log("✅ Successfully configured 'Storage' and 'RAM' for Computers category!");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await pool.end();
  }
}

run();
