import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// handle 401 unauthorized responses and suppress expected 404s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token expired or invalid, clean up
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/signin';
    }

    // suppress console errors for 404s on project operations (these are handled gracefully)
    if (
      error.response?.status === 404 &&
      error.config?.url?.includes('/projects/') &&
      (error.config?.method === 'put' || error.config?.method === 'delete')
    ) {
      // Don't log this error - it's expected and handled by auto-sync
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);