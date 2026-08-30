import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/authSlice';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const authState = store.getState().auth;
    const token = authState.token;
    const user = authState.user;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Dynamic routing for SUPER_ADMIN
    if (user && user.role === 'SUPER_ADMIN' && config.url && config.url.startsWith('/admin/')) {
      config.url = config.url.replace(/^\/admin\//, '/superadmin/');
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
