import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import wishlistReducer from './wishlistSlice';

// Provide a dummy storage for SSR to prevent crash when window is undefined
const createNoopStorage = () => {
  return {
    getItem(_key) {
      return Promise.resolve(null);
    },
    setItem(_key, value) {
      return Promise.resolve(value);
    },
    removeItem(_key) {
      return Promise.resolve();
    },
  };
};

const actualStorage = typeof window !== 'undefined' ? {
  getItem(key) {
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
    return Promise.resolve(value);
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
    return Promise.resolve();
  }
} : createNoopStorage();

const authPersistConfig = {
  key: 'auth',
  storage: actualStorage,
};

const cartPersistConfig = {
  key: 'cart',
  storage: actualStorage,
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedCartReducer = persistReducer(cartPersistConfig, cartReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    cart: persistedCartReducer,
    wishlist: wishlistReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Required for redux-persist
    }),
});

export const persistor = persistStore(store);
