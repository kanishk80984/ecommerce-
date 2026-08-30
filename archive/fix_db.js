import mysql from 'mysql2/promise';

async function fixDB() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'info',
    database: 'kanishk'
  });

  try {
    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);

    const updates = [
      { table: 'advertisements', col: 'image_url' },
      { table: 'banners', col: 'image_url' },
      { table: 'businesses', col: 'business_logo' },
      { table: 'businesses', col: 'banner_image' },
      { table: 'categories', col: 'image' },
      { table: 'brands', col: 'logo' },
      { table: 'products', col: 'thumbnail' },
      { table: 'model_images', col: 'image_url' },
      { table: 'variant_images', col: 'image_url' },
      { table: 'review_images', col: 'image_url' },
      { table: 'users', col: 'profile_photo' },
      { table: 'vendor_profiles', col: 'business_logo' },
      { table: 'vendor_profiles', col: 'id_proof_url' }
    ];

    for (const { table, col } of updates) {
      if (tableNames.includes(table)) {
        try {
          // First check if column exists
          const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${table}\` LIKE '${col}'`);
          if (columns.length > 0) {
            const [result] = await connection.execute(`UPDATE \`${table}\` SET \`${col}\` = REPLACE(\`${col}\`, 'http://localhost:5000/', '') WHERE \`${col}\` LIKE '%http://localhost:5000/%'`);
            if (result.affectedRows > 0) {
              console.log(`Updated ${result.affectedRows} rows in ${table}.${col}`);
            }
          }
        } catch (e) {
          // ignore if column error
        }
      }
    }
    console.log("Done fixing URLs in database.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await connection.end();
  }
}

fixDB();
