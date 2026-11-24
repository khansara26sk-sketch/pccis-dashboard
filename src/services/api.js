import axios from 'axios';

// Get base URL with fallback hierarchy: localStorage override -> env variable -> default localhost
export const getApiBaseUrl = () => {
  return (
    localStorage.getItem('pccis_api_base_url') ||
    import.meta.env.VITE_API_URL ||
    'http://127.0.0.1:8000'
  );
};

export const setApiBaseUrl = (url) => {
  if (url) {
    localStorage.setItem('pccis_api_base_url', url.trim());
    apiClient.defaults.baseURL = url.trim();
  } else {
    localStorage.removeItem('pccis_api_base_url');
    apiClient.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  }
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: add dynamic base URL and Bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('pccis_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const message = error.response?.data?.detail || error.message || 'An unexpected API error occurred';
    
    // Log API warning cleanly
    console.warn(`[PCCIS API] ${error.config?.method?.toUpperCase()} ${error.config?.url} returned ${status}: ${message}`);
    
    return Promise.reject({
      status,
      message,
      originalError: error,
      isNetworkError: !error.response,
    });
  }
);

export default apiClient;
