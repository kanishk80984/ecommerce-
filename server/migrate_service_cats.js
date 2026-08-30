import { getPool } from './src/database/connection.js';
import { initializeDatabase } from './src/database/databaseInitializer.js';

const DEFAULT_CATEGORIES_LIST = [
  "Meat Shops", "Fish Markets", "Pet Shops", "Pet Grooming", "Mobile Shops", "Computer Stores",
  "Laptop Repair", "Mobile Repair", "Electronics", "Home Appliances", "Fashion",
  "Clothing Stores", "Footwear", "Jewellery", "Gift Shops", "Florists", "Sports Stores",
  "Toy Stores", "Stationery Stores", "Printing Press", "Advertising Agencies",
  "Digital Marketing", "Web Design", "Software Companies", "IT Services", "Cyber Cafes",
  "Temples", "Churches", "Mosques", "Tourist Attractions", "Theatres", "Cinema Halls",
  "Parks", "Museums", "Art Galleries", "Clubs", "NGOs", "Government Offices",
  "Police Stations", "Fire Stations", "Post Offices", "Gas Agencies", "Water Suppliers",
  "Electricity Services", "Waste Management", "Automobile Dealers", "Car Service Centers",
  "Bike Service Centers", "Tyre Shops", "Battery Dealers", "Auto Accessories",
  "Petrol Pumps", "EV Charging Stations", "Solar Energy", "CCTV Dealers", "Security Services",
  "AC Sales & Service", "Refrigerator Repair", "Washing Machine Repair", "Recruitment Agencies",
  "HR Consultants", "Exporters", "Importers", "Manufacturers", "Wholesalers", "Retailers",
  "Industrial Suppliers", "Agriculture", "Poultry Farms", "Dairy Farms", "Organic Stores",
  "Fish Farms", "Seed Suppliers", "Fertilizer Dealers", "Textile Mills", "Handloom Shops",
  "Tailors", "Boutiques", "Dance Academy", "Music Academy", "Driving Schools",
  "Language Institutes", "Child Care Centers", "Old Age Homes", "Rehabilitation Centers",
  "Astrology", "Numerology", "Passport Consultants", "Visa Consultants"
];

async function migrate() {
  await initializeDatabase();
  const pool = getPool();
  
  try {
    console.log('Creating service_categories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        banner_image VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Inserting default categories...');
    let inserted = 0;
    for (const name of DEFAULT_CATEGORIES_LIST) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      try {
        await pool.query('INSERT IGNORE INTO service_categories (name, slug) VALUES (?, ?)', [name, slug]);
        inserted++;
      } catch (err) {
        // Ignore duplicate errors
      }
    }
    
    // Also insert any previously approved requests that aren't in the default list
    console.log('Migrating previously approved requests...');
    const [approved] = await pool.query("SELECT DISTINCT suggested_name FROM category_requests WHERE status = 'APPROVED'");
    for (const req of approved) {
      if (req.suggested_name && req.suggested_name !== 'Others') {
        const slug = req.suggested_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        try {
          await pool.query('INSERT IGNORE INTO service_categories (name, slug) VALUES (?, ?)', [req.suggested_name, slug]);
        } catch (err) {}
      }
    }

    // Now disable categories that were previously in deleted_service_categories
    console.log('Applying deleted status to previously deleted categories...');
    try {
      const [deleted] = await pool.query('SELECT name FROM deleted_service_categories');
      for (const d of deleted) {
        await pool.query('UPDATE service_categories SET status = "INACTIVE" WHERE LOWER(name) = LOWER(?)', [d.name]);
      }
    } catch (e) {
      console.log('deleted_service_categories might not exist, skipping.');
    }

    console.log('Migration complete. Inserted default categories.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
