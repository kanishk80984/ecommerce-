import { getImageUrl } from '../../client/src/utils/imageUrl.js';

const targetUrl = 'https://res.cloudinary.com/c0v0uxu6/image/upload/v1787478986/gallery/images_1786694912183_c3a2ffc5_main_1786952319454_ca02319e_main.webp';
const resolvedUrl = getImageUrl(targetUrl);

console.log('\n--- getImageUrl Resolution Test ---');
console.log('Input URL   :', targetUrl);
console.log('Resolved URL:', resolvedUrl);
console.log('Match Success:', targetUrl === resolvedUrl ? '✓ PASSED' : '✗ FAILED');

const legacyPath = '/uploads/gallery/images_1786694912183_c3a2ffc5_main_1786952319454_ca02319e_main.webp';
const resolvedLegacy = getImageUrl(legacyPath);
console.log('\n--- Legacy Local Path Test ---');
console.log('Input Path  :', legacyPath);
console.log('Resolved URL:', resolvedLegacy);

process.exit(targetUrl === resolvedUrl ? 0 : 1);
