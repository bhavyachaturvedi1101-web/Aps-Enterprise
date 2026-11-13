import axios from 'axios';

// Base API URL calculation matching project conventions
export const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

export const BASE_API_URL = isLocal ? 'http://localhost:5000/api' : '/api';

/**
 * Retrieves stored authentication token
 */
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aps_token') || null;
};

/**
 * Centralized Axios instance with request and response interceptors
 */
export const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: inject Bearer token automatically
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle session expiry / 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      handleUnauthorizedSession();
    }
    return Promise.reject(error);
  }
);

// Also configure the default axios global instance for modules doing direct `import axios from 'axios'`
axios.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      handleUnauthorizedSession();
    }
    return Promise.reject(error);
  }
);

function handleUnauthorizedSession() {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (currentPath !== '/login') {
    console.warn('[Auth] Session expired or invalid. Redirecting to login.');
    localStorage.removeItem('aps_token');
    localStorage.removeItem('aps_auth_user');
    window.location.href = '/login';
  }
}

/**
 * Global fetch wrapper to guarantee 100% of fetch() calls throughout the app
 * pass the required Authorization Bearer header.
 */
export function setupAuthFetch() {
  if (typeof window === 'undefined' || window.__authFetchInstalled) return;
  window.__authFetchInstalled = true;

  const originalFetch = window.fetch;
  window.fetch = async function (resource, init = {}) {
    let url = typeof resource === 'string' ? resource : resource?.url || '';
    
    // Check if the request is destined for the application backend API
    const isApiCall = (
      url.startsWith('/api') ||
      url.includes('/api/') ||
      url.includes(':5000/api')
    );

    if (isApiCall) {
      const token = getAuthToken();
      const headers = new Headers(init.headers || (typeof resource === 'object' && resource.headers ? resource.headers : {}));
      
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      init = {
        ...init,
        headers
      };
    }

    try {
      const response = await originalFetch(resource, init);
      // Ignore 401 on login endpoint itself so user sees the "Invalid Credentials" message
      if (response.status === 401 && isApiCall && !url.includes('/auth/login')) {
        handleUnauthorizedSession();
      }
      return response;
    } catch (err) {
      throw err;
    }
  };
}

export default api;
