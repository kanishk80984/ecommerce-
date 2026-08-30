/**
 * USER CATEGORY → VENDOR/ADMIN CATEGORY MAPPING
 *
 * Each user-facing category (13 total) maps to one or more
 * vendor/admin category names stored in the `categories` DB table.
 */

export const USER_CATEGORIES = [
  {
    id: 'fashion',
    name: 'Fashion',
    vendorCategories: ['Fashion', 'Accessories', 'Bags', 'Shoes', 'Jewellery', 'Watches'],
  },
  {
    id: 'mobiles',
    name: 'Mobiles',
    vendorCategories: ['Mobile/Tablet'],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    vendorCategories: ['Electronics', 'Computers', 'Laptops', 'Gaming', 'Musical Instruments'],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    vendorCategories: ['Beauty'],
  },
  {
    id: 'home',
    name: 'Home',
    vendorCategories: ['Home', 'Garden', 'Religious Products', 'Office Supplies', 'Stationery'],
  },
  {
    id: 'appliances',
    name: 'Appliances',
    vendorCategories: ['Appliances', 'Home Appliances', 'Kitchen'],
  },
  {
    id: 'toys',
    name: 'Toys',
    vendorCategories: ['Toys & Baby', 'Baby Products', 'Gift Items'],
  },
  {
    id: 'grocery',
    name: 'Grocery',
    vendorCategories: ['Grocery', 'Food & Health', 'Beverages', 'Snacks'],
  },
  {
    id: 'auto',
    name: 'Auto',
    vendorCategories: ['Auto Accessories', 'Automotive'],
  },
  {
    id: 'sports',
    name: 'Sports',
    vendorCategories: ['Sports', 'Sports & Fitness', 'Fitness', 'Cycling', 'Camping', 'Fishing', 'Outdoor', 'Yoga'],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    vendorCategories: ['Furniture', 'Home & Furniture'],
  },
  {
    id: 'books',
    name: 'Books',
    vendorCategories: ['Books', 'Craft Supplies', 'Art Supplies'],
  },
  {
    id: '2wheelers',
    name: '2 Wheelers',
    vendorCategories: ['2 Wheelers', 'Cycling'],
  },
];

/**
 * Given a user-facing category name (e.g. "Fashion"),
 * returns the array of vendor category names it maps to.
 * Falls back to [userCategoryName] if not found.
 */
export function getVendorCategoriesForUser(userCategoryName) {
  if (!userCategoryName) return [];
  const entry = USER_CATEGORIES.find(
    (u) => u.name.toLowerCase() === userCategoryName.toLowerCase()
  );
  return entry ? entry.vendorCategories : [userCategoryName];
}

/**
 * Given a vendor/admin category name (e.g. "Accessories"),
 * returns the user-facing category name it belongs to (e.g. "Fashion").
 * Returns the vendorCategoryName itself if no mapping found.
 */
export function getUserCategoryForVendor(vendorCategoryName) {
  if (!vendorCategoryName) return vendorCategoryName;
  const entry = USER_CATEGORIES.find((u) =>
    u.vendorCategories.some(
      (vc) => vc.toLowerCase() === vendorCategoryName.toLowerCase()
    )
  );
  return entry ? entry.name : vendorCategoryName;
}

/**
 * Check if a product's category_name belongs to a user-facing category.
 * @param {string} productCategoryName  - e.g. "Accessories"
 * @param {string} userCategoryName     - e.g. "Fashion"
 */
export function productMatchesUserCategory(productCategoryName, userCategoryName) {
  const vendorCats = getVendorCategoriesForUser(userCategoryName);
  return vendorCats.some(
    (vc) => vc.toLowerCase() === (productCategoryName || '').toLowerCase()
  );
}
