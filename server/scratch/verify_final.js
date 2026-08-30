import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import pool from '../src/config/db.js';
import { getImageUrl } from '../../client/src/utils/imageUrl.js';

async function verifyFinal() {
  const searchKey = 'images_1786694912183_c3a2ffc5_main_1786952319454_ca02319e_main.webp';
  console.log('====================================================');
  console.log(`Final Verification for Target Image: ${searchKey}`);
  console.log('====================================================\n');

  // 1. Check vendor_profiles
  const [vendorRows] = await pool.query(
    `SELECT id, business_name, gallery_only FROM vendor_profiles WHERE id = 17`
  );
  console.log('1. DB vendor_profiles (ID 17) gallery_only:');
  console.log(JSON.stringify(JSON.parse(vendorRows[0].gallery_only), null, 2));

  // 2. Extract URL from vendor_profiles.gallery_only
  const galleryItems = JSON.parse(vendorRows[0].gallery_only);
  const targetItem = galleryItems.find(item => item.image_path.includes('images_1786694912183_c3a2ffc5'));
  const dbUrl = targetItem ? targetItem.image_path : null;

  console.log('\n2. Target Image URL stored in Database:');
  console.log('   ->', dbUrl);

  // 3. Test getImageUrl resolution
  const resolvedUrl = getImageUrl(dbUrl);
  console.log('\n3. Frontend getImageUrl(dbUrl) output:');
  console.log('   ->', resolvedUrl);

  // 4. Verification Check
  const isCloudinary = resolvedUrl.startsWith('https://res.cloudinary.com/');
  console.log('\n====================================================');
  console.log('Final Result:');
  console.log('   - Storage Provider in .env:', process.env.STORAGE_PROVIDER);
  console.log('   - Cloudinary CDN URL verified:', isCloudinary ? '✓ 100% SUCCESS' : '✗ FAILED');
  console.log('====================================================\n');

  process.exit(isCloudinary ? 0 : 1);
}

verifyFinal().catch(err => {
  console.error(err);
  process.exit(1);
});
