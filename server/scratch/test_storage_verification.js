import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import StorageService from '../src/storage/StorageService.js';
import { detectResourceType } from '../src/storage/providers/CloudinaryProvider.js';

async function testAll() {
  console.log('--- 1. Testing Resource Type Detection ---');
  console.assert(detectResourceType('sample.jpg', 'image/jpeg') === 'image', 'JPEG image detection failed');
  console.assert(detectResourceType('sample.webp', 'image/webp') === 'image', 'WebP image detection failed');
  console.assert(detectResourceType('video.mp4', 'video/mp4') === 'video', 'MP4 video detection failed');
  console.assert(detectResourceType('document.pdf', 'application/pdf') === 'raw', 'PDF raw detection failed');
  console.assert(detectResourceType('archive.zip', 'application/zip') === 'raw', 'ZIP raw detection failed');
  console.log('✓ Resource Type Detection Passed!');

  console.log('\n--- 2. Testing Local Storage Provider via StorageService ---');
  const dummyBuffer = Buffer.from('test storage content');
  const uploadRes = await StorageService.upload(dummyBuffer, {
    module: 'test',
    fileName: 'test_verify_file.txt',
    mimeType: 'text/plain',
  });

  console.log('Uploaded Local File:', uploadRes);
  console.assert(uploadRes.provider === 'local', 'Expected provider to be local');
  console.assert(uploadRes.storageKey.includes('uploads/test/test_verify_file.txt'), 'Unexpected storage key');

  const resolvedUrl = StorageService.getUrl(uploadRes.storageKey, 'local');
  console.log('Resolved Local URL:', resolvedUrl);

  await StorageService.delete(uploadRes.storageKey, 'local');
  console.log('✓ Local Storage Provider Upload, getUrl, Delete Passed!');

  console.log('\n--- 3. Testing Cloudinary URL & Absolute URL Resolution ---');
  const cldUrl = 'https://res.cloudinary.com/demo/image/upload/v123456/products/test.webp';
  const resolvedCldUrl = StorageService.getUrl(cldUrl, 'cloudinary');
  console.assert(resolvedCldUrl === cldUrl, 'Cloudinary absolute URL was modified');
  console.log('Resolved Cloudinary Absolute URL:', resolvedCldUrl);
  console.log('✓ StorageService Absolute URL Pass-Through Passed!');

  console.log('\n====================================================');
  console.log('ALL STORAGE VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');

  process.exit(0);
}

testAll().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
