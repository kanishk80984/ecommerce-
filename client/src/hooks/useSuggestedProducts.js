import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Fetches suggested products from the backend.
 *
 * Priority (applied server-side):
 *   1. Products in the EXACT same vendor/admin category
 *   2. Products in other vendor categories that belong to the same USER category
 *
 * @param {string} categoryName   - vendor/admin category of the current product (e.g. "Shoes")
 * @param {string} variantId      - public_id of the current variant
 * @param {number} [limit=50]     - max number of products to return
 * @returns {{ products: Array, loading: boolean }}
 */
export function useSuggestedProducts(categoryName, excludeId, variantId, limit = 50) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!categoryName || !excludeId) return;

    let cancelled = false;
    const requestParams = { category: categoryName, excludeId, limit };
    if (variantId) {
      requestParams.variantId = variantId;
    }

    api
      .get('/public/suggested-products', {
        params: requestParams,
      })
      .then((res) => {
        if (!cancelled) {
          setProducts(res.data.products || []);
        }
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryName, excludeId, variantId, limit]);

  return { products, loading };
}
