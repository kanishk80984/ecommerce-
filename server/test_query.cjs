const mysql = require('mysql2/promise');
mysql.createConnection({host:'localhost',user:'root',password:'',database:'user4'}).then(async c => {
  try {
    // Get all product enquiries with null image_path
    const [enquiries] = await c.query(
      "SELECT se.id, se.vendor_id, se.enquiry_text FROM service_enquiries se WHERE se.enquiry_text LIKE 'Enquiry about Gallery Product:%' AND se.image_path IS NULL"
    );
    
    for (const enq of enquiries) {
      // Get gallery images from vendor profile
      const [vendors] = await c.query(
        "SELECT gallery_images FROM vendor_profiles WHERE user_id = ?", [enq.vendor_id]
      );
      if (!vendors[0]?.gallery_images) continue;
      
      const gallery = typeof vendors[0].gallery_images === 'string' 
        ? JSON.parse(vendors[0].gallery_images) 
        : vendors[0].gallery_images;
      
      // Extract product name from enquiry_text
      const match = enq.enquiry_text.match(/Enquiry about Gallery Product: "([^"]+)"/);
      if (!match) continue;
      const productName = match[1];
      
      // Find matching gallery item
      const item = gallery.find(g => g.name === productName);
      if (item?.image_path) {
        await c.query("UPDATE service_enquiries SET image_path = ? WHERE id = ?", [item.image_path, enq.id]);
        console.log(`Updated enquiry ${enq.id} with image: ${item.image_path}`);
      }
    }
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    c.end();
  }
});
