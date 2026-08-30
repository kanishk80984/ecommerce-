// ─── Server-side browser API polyfills ───────────────────────────────────────
if (typeof globalThis.localStorage === 'undefined') {
  const noopStorage = {
    _data: {},
    getItem(key) { return this._data[key] ?? null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; },
    key(i) { return Object.keys(this._data)[i] ?? null; },
    get length() { return Object.keys(this._data).length; },
  };
  globalThis.localStorage = noopStorage;
  globalThis.sessionStorage = { ...noopStorage, _data: {} };
}
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node' };
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;

// Suppress useLayoutEffect warning on server side during SSR
if (typeof console !== 'undefined' && console.error) {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('useLayoutEffect does nothing on the server')) {
      return;
    }
    originalError(...args);
  };
}

import React from 'react';
import { renderToString } from 'react-dom/server';
import * as rrdPkg from 'react-router-dom';
const { MemoryRouter } = rrdPkg;
// Create a plain Redux store WITHOUT redux-persist for SSR.
// redux-persist calls storage.getItem() at store init time which crashes on Node.js.
// The SSR render only needs a minimal initial state — auth is always "guest" on server.
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './store/authSlice';
import cartReducer from './store/cartSlice';
import wishlistReducer from './store/wishlistSlice';
import { Provider } from 'react-redux';
import App from './App';
import { SsrDataProvider } from './ssr/SsrDataContext';

function createSsrStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
    },
  });
}

export function render(url, ssrData = null) {
  // Fresh store per request — no redux-persist, no side effects
  const ssrStore = createSsrStore();

  const html = renderToString(
    <React.StrictMode>
      <Provider store={ssrStore}>
        <SsrDataProvider initialData={ssrData}>
          <MemoryRouter initialEntries={[url]}>
            <App />
          </MemoryRouter>
        </SsrDataProvider>
      </Provider>
    </React.StrictMode>
  );
  
  return { html };
}
