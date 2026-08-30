import { createSlice } from '@reduxjs/toolkit';

// Safe storage accessor — works in both browser and Node.js (SSR)
const safeStorage = typeof localStorage !== 'undefined' ? localStorage : {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};

const token = safeStorage.getItem('token');
let user = null;
try {
  const savedUser = safeStorage.getItem('user');
  user = savedUser ? JSON.parse(savedUser) : null;
} catch (e) {
  console.error('Failed to parse user from safeStorage', e);
}

const initialState = {
  user,
  token,
  isAuthenticated: !!token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      safeStorage.setItem('token', token);
      safeStorage.setItem('user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      safeStorage.removeItem('token');
      safeStorage.removeItem('user');
      safeStorage.removeItem('guestCheckoutSession');
      safeStorage.removeItem('checkoutReturnUrl');
      safeStorage.removeItem('ibc_search_history');
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      safeStorage.setItem('user', JSON.stringify(state.user));
    },
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;

export default authSlice.reducer;
