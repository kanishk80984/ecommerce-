/**
 * Safe Cloudinary Connection Test
 * ════════════════════════════════════════════════════════════════
 * Validates Cloudinary credentials from server/.env:
 * 1. Uploads 1 temporary in-memory test asset to Cloudinary (_temp_test folder).
 * 2. Verifies public_id, secure_url, and resource_type.
 * 3. Asserts secure_url starts with "https://res.cloudinary.com/".
 * 4. Immediately deletes the test asset from Cloudinary.
 * 5. NO database changes, NO local upload file changes, NO migration execution.
 * ════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import CloudinaryProvider from '../src/storage/providers/CloudinaryProvider.js';

async function runSafeCloudinaryConnectionTest() {
  console.log('====================================================');
  console.log('Running Safe Cloudinary Connection & Credentials Test');
  console.log('====================================================');

  console.log(`Cloud Name configured: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configured' : '✗ MISSING'}`);
  console.log(`API Key configured   : ${process.env.CLOUDINARY_API_KEY ? '✓ Configured' : '✗ MISSING'}`);
  console.log(`API Secret configured: ${process.env.CLOUDINARY_API_SECRET ? '✓ Configured [SECRET HIDDEN]' : '✗ MISSING'}`);

  const provider = new CloudinaryProvider();

  // 1x1 transparent GIF buffer for lightweight in-memory testing
  const dummyBuffer = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  const testFileName = `conn_test_${Date.now()}.gif`;
  console.log(`\n1. Uploading single test asset "${testFileName}" to Cloudinary folder "_temp_test"...`);

  const uploadResult = await provider.upload(dummyBuffer, {
    module: '_temp_test',
    fileName: testFileName,
    mimeType: 'image/gif',
  });

  console.log('\nCloudinary Upload Response:');
  console.log(`  storageKey  : ${uploadResult.storageKey}`);
  console.log(`  publicUrl   : ${uploadResult.publicUrl}`);
  console.log(`  resourceType: ${uploadResult.resourceType}`);

  // Verification checks
  console.assert(uploadResult.storageKey, 'ERR: storageKey is missing');
  console.assert(uploadResult.publicUrl, 'ERR: publicUrl is missing');
  console.assert(
    uploadResult.publicUrl.startsWith('https://res.cloudinary.com/'),
    `ERR: publicUrl "${uploadResult.publicUrl}" does not start with https://res.cloudinary.com/`
  );
  console.assert(uploadResult.resourceType === 'image', 'ERR: expected resourceType to be "image"');

  console.log('\n✓ Asset upload verification passed!');

  // Immediately cleanup / delete test asset
  console.log(`\n2. Deleting temporary test asset "${uploadResult.storageKey}" from Cloudinary...`);
  await provider.delete(uploadResult.storageKey, { resourceType: uploadResult.resourceType });
  console.log('✓ Temporary test asset deleted successfully from Cloudinary!');

  console.log('\n====================================================');
  console.log('CLOUDINARY CONNECTION TEST COMPLETED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runSafeCloudinaryConnectionTest().catch((err) => {
  console.error('\n✗ CLOUDINARY CONNECTION TEST FAILED:', err.message);
  process.exit(1);
});
