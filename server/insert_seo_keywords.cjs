require('dotenv').config();
const pool = require('./src/config/db.js').default;

const keywordsToInsert = [
  { keyword: 'Caterers', slug: 'caterers', categoryName: 'Restaurants' },
  { keyword: 'Bridal Requisite', slug: 'bridal-requisite', categoryName: 'Wedding+Planning' },
  { keyword: 'Beauty Parlours', slug: 'beauty-parlours', categoryName: 'Beauty+Spa' },
  { keyword: 'Spa & Massages', slug: 'spa-massages', categoryName: 'Beauty+Spa' },
  { keyword: 'Salons', slug: 'salons', categoryName: 'Beauty+Spa' },
  { keyword: 'Banquet Halls', slug: 'banquet-halls', categoryName: 'Event+Organisers' },
  { keyword: 'Electricians', slug: 'electricians', categoryName: 'Electricity Services' }
];

async function insertKeywords() {
  try {
    for (const kw of keywordsToInsert) {
      // Find category ID
      const [cats] = await pool.query('SELECT id FROM service_categories WHERE name = ?', [kw.categoryName]);
      if (cats.length === 0) {
        console.log(`Category not found: ${kw.categoryName}`);
        continue;
      }
      const categoryId = cats[0].id;
      
      // Check if keyword exists
      const [existing] = await pool.query('SELECT id FROM service_category_seo_keywords WHERE slug = ?', [kw.slug]);
      if (existing.length === 0) {
        await pool.query(
          `INSERT INTO service_category_seo_keywords 
           (category_id, keyword, slug, search_intent, priority, is_active, index_status) 
           VALUES (?, ?, ?, 'Category', 'High', 1, 'Index')`,
          [categoryId, kw.keyword, kw.slug]
        );
        console.log(`Inserted ${kw.keyword} into ${kw.categoryName}`);
      } else {
        console.log(`${kw.keyword} already exists.`);
      }
    }
    console.log('Done!');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

insertKeywords();
