const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'user4'
  });

  try {
    const slug = 'ac-sales-service';
    let category = null;
    let isService = false;
    const [cats] = await conn.query('SELECT * FROM categories WHERE slug = ?', [slug]);
    if (cats.length > 0) {
      category = cats[0];
    } else {
      const [servCats] = await conn.query('SELECT * FROM service_categories WHERE slug = ?', [slug]);
      if (servCats.length > 0) {
        category = servCats[0];
        isService = true;
      }
    }
    
    if (!category) {
      console.log('404 Not found');
      return;
    }
    
    console.log('Category found:', category.name);
    
    let businessesQuery = `
      SELECT DISTINCT vp.*, 
        COALESCE((SELECT AVG(r.rating) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED'), 0) as average_rating,
        (SELECT COUNT(r.id) FROM product_reviews r WHERE r.product_id IN (SELECT id FROM products WHERE vendor_id = vp.user_id) AND r.status = 'APPROVED') as review_count
      FROM vendor_profiles vp
      JOIN users u ON vp.user_id = u.id
      LEFT JOIN products p ON p.vendor_id = u.id
      WHERE vp.kyc_status = 'APPROVED' AND u.status = 'ACTIVE' AND u.is_suspended = 0
    `;
    const params = [];

    const cleanCatName = category.name.trim();
    const singularCatName = cleanCatName.endsWith('s') ? cleanCatName.slice(0, -1) : cleanCatName;
    const pluralCatName = cleanCatName.endsWith('s') ? cleanCatName : cleanCatName + 's';

    businessesQuery += ` AND (
      LOWER(vp.category) = LOWER(?) OR LOWER(vp.category) = LOWER(?) OR LOWER(vp.category) = LOWER(?)
      OR LOWER(vp.subcategory) = LOWER(?) OR LOWER(vp.subcategory) = LOWER(?) OR LOWER(vp.subcategory) = LOWER(?)
      ${isService ? '' : 'OR p.category_id = ?'}
      OR LOWER(vp.keywords) LIKE LOWER(?)
      OR LOWER(vp.keywords) LIKE LOWER(?)
    )`;
    params.push(
      cleanCatName, singularCatName, pluralCatName,
      cleanCatName, singularCatName, pluralCatName
    );
    if (!isService) {
      params.push(category.id);
    }
    params.push(`%${singularCatName}%`, `%${pluralCatName}%`);
    
    businessesQuery += ` LIMIT 50`;
    
    console.log('Executing business query...');
    const [businesses] = await conn.query(businessesQuery, params);
    console.log('Businesses:', businesses.length);
    
    const keywordTableName = isService ? 'service_category_seo_keywords' : 'category_seo_keywords';
    const targetLocTableName = isService ? 'service_category_target_locations' : 'category_target_locations';
    
    console.log('Executing keywords query...');
    const [internalKeywords] = await conn.query(
      `SELECT keyword, slug FROM ${keywordTableName} 
       WHERE category_id = ? AND is_active = 1 AND index_status = 'Index' LIMIT 10`,
      [category.id]
    );
    console.log('Keywords:', internalKeywords.length);
    
    console.log('Executing locations query...');
    const [targetLocations] = await conn.query(
      `SELECT l.name, l.slug FROM locations l 
       JOIN ${targetLocTableName} ctl ON l.id = ctl.location_id 
       WHERE ctl.category_id = ? LIMIT 10`,
      [category.id]
    );
    
    console.log('Success!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

run();
