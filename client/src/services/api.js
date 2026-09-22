import axios from 'axios';

/**
 * Axios instance pre-configured for the SmartCampus ITCare API.
 * Automatically injects JWT token from localStorage.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach Auth Token ───────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('itcare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle Auth Errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // Auto-logout on 401 Unauthorized (expired/invalid token)
    if (status === 401) {
      localStorage.removeItem('itcare_token');
      localStorage.removeItem('itcare_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Return a normalized error object
    return Promise.reject({
      status,
      message,
      data: error.response?.data,
    });
  }
);

export default api;
