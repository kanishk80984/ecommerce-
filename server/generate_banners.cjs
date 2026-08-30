const mysql = require('mysql2/promise');
const gis = require('g-i-s');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const UPLOAD_DIR = path.join(__dirname, 'uploads', 'categories');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function searchImage(query) {
  return new Promise((resolve, reject) => {
    gis(query + ' banner high quality', (error, results) => {
      if (error) {
        reject(error);
      } else {
        if (results && results.length > 0) {
          resolve(results[0].url);
        } else {
          resolve(null);
        }
      }
    });
  });
}

async function processCategory(pool, category) {
  console.log(`Processing: ${category.name}`);
  try {
    let imageUrl = await searchImage(category.name);
    if (!imageUrl) {
      console.log(`No image found for ${category.name}, trying generic...`);
      imageUrl = await searchImage('abstract background');
    }

    if (!imageUrl) {
      console.log(`Failed to find any image for ${category.name}`);
      return;
    }

    const response = await axios({
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const buffer = Buffer.from(response.data, 'binary');
    
    const fileName = `${category.slug}-banner-${Date.now()}.webp`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Resize and aggressively compress to get under 25KB
    await sharp(buffer)
      .resize(1920, 400, { fit: 'cover', position: 'center' })
      .webp({ quality: 40, effort: 6 }) // Low quality to ensure small size
      .toFile(filePath);
      
    // Check file size
    const stats = fs.statSync(filePath);
    console.log(`Saved ${fileName} - Size: ${(stats.size / 1024).toFixed(2)} KB`);

    // Ensure it's under 25kb, if not compress more
    if (stats.size > 25600) {
      console.log(`File too large, compressing further...`);
      const tempPath = filePath + '.temp.webp';
      await sharp(filePath)
        .webp({ quality: 20, effort: 6 })
        .toFile(tempPath);
      fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
      const newStats = fs.statSync(filePath);
      console.log(`Re-saved ${fileName} - New Size: ${(newStats.size / 1024).toFixed(2)} KB`);
    }

    const dbPath = `/uploads/categories/${fileName}`;
    await pool.query('UPDATE service_categories SET banner_image = ? WHERE id = ?', [dbPath, category.id]);
    console.log(`Updated DB for ${category.name} -> ${dbPath}\n`);

  } catch (error) {
    console.error(`Error processing ${category.name}:`, error.message);
  }
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const [categories] = await pool.query('SELECT id, name, slug FROM service_categories');
    console.log(`Found ${categories.length} categories.`);
    
    // Process sequentially to avoid overwhelming the image search API
    for (const cat of categories) {
      await processCategory(pool, cat);
      // Wait 1 second between requests
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('All done!');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await pool.end();
  }
}

run();
