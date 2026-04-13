import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// ── Request interceptor: attach JWT ─────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Let the browser set the multipart boundary for file uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      if (typeof config.headers.setContentType === 'function') {
        config.headers.setContentType(undefined);
      } else {
        delete config.headers['Content-Type'];
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401s globally ──────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if we are already on an auth page, so components can show the error
      const isAuthPage = window.location.pathname.startsWith('/login') || 
                         window.location.pathname.startsWith('/register') || 
                         window.location.pathname.startsWith('/forgot-password');
      
      if (!isAuthPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
