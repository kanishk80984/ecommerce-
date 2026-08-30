import { createSlice } from '@reduxjs/toolkit';

const safeStorage = typeof localStorage !== 'undefined' ? localStorage : {
  _d: {}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];}
};

const getUserId = () => {
  try {
    const userStr = safeStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id || 'guest';
    }
  } catch (e) {
    return 'guest';
  }
  return 'guest';
};

const loadWishlistFromStorage = (userId = getUserId()) => {
  try {
    const stored = safeStorage.getItem(`ibc_wishlist_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading wishlist from local storage', error);
    return [];
  }
};

const saveWishlist = (items) => {
  const userId = getUserId();
  safeStorage.setItem(`ibc_wishlist_${userId}`, JSON.stringify(items));
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: loadWishlistFromStorage(),
  },
  reducers: {
    addToWishlist: (state, action) => {
      const product = action.payload;
      const existing = state.items.find((item) => item.id === product.id && (item.variant_id || null) === (product.variant_id || null));
      if (!existing) {
        state.items.push(product);
        saveWishlist(state.items);
      }
    },
    removeFromWishlist: (state, action) => {
      // payload could be productId or an object with {id, variant_id}
      const payload = action.payload;
      const pId = typeof payload === 'object' ? payload.id : payload;
      const vId = typeof payload === 'object' ? (payload.variant_id || null) : null;
      
      state.items = state.items.filter((item) => !(item.id === pId && (item.variant_id || null) === vId));
      saveWishlist(state.items);
    },
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const existing = state.items.find((item) => item.id === product.id && (item.variant_id || null) === (product.variant_id || null));
      if (existing) {
        state.items = state.items.filter((item) => !(item.id === product.id && (item.variant_id || null) === (product.variant_id || null)));
      } else {
        state.items.push(product);
      }
      saveWishlist(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlist([]);
    },
  },
  extraReducers: (builder) => {
    builder.addCase('auth/setCredentials', (state, action) => {
      // User logged in. Load their specific wishlist.
      const userId = action.payload.user?.id || 'guest';
      state.items = loadWishlistFromStorage(userId);
    });
    builder.addCase('auth/logout', (state) => {
      // User logged out. Revert to guest wishlist.
      state.items = loadWishlistFromStorage('guest');
    });
  }
});

export const { addToWishlist, removeFromWishlist, toggleWishlist, clearWishlist } = wishlistSlice.actions;

export default wishlistSlice.reducer;
