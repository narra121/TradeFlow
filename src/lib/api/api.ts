import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Client Module
// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tradeflow.com/v1';

// Custom event to handle unauthorized access
const dispatchUnauthorized = () => {
  window.dispatchEvent(new CustomEvent('unauthorized'));
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('idToken');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Track if we're currently refreshing the token
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  
  failedQueue = [];
};

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the envelope format from backend: { data: {...}, error: null, meta: null }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      // Check if backend returned an error in the envelope (even with 200 status)
      if (response.data.error && response.data.error !== null) {
        // Treat this as an error even though HTTP status was successful
        return Promise.reject({
          response: {
            data: response.data,
            status: response.status,
            statusText: response.statusText,
          },
          message: response.data.error.message || 'An error occurred',
          isAxiosError: true,
        });
      }
      return response.data.data;
    }
    // Return the data directly if it exists
    return response.data || response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401 && !originalRequest._retry) {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken && !isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;
          
          try {
            // Call refresh token endpoint
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken: refreshToken
            });
            
            // Backend returns envelope format: { data: { IdToken, ... }, error: null }
            const tokens = response.data?.data || response.data;
            const newToken = tokens.IdToken;
            localStorage.setItem('idToken', newToken);
            
            // Update the original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            
            // Process the queued requests
            processQueue(null);
            isRefreshing = false;
            
            // Retry the original request
            return apiClient(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and dispatch unauthorized event
            processQueue(error);
            isRefreshing = false;
            localStorage.removeItem('idToken');
            localStorage.removeItem('refreshToken');
            dispatchUnauthorized();
            return Promise.reject(refreshError);
          }
        } else if (isRefreshing) {
          // If already refreshing, queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(() => {
            if (originalRequest.headers) {
              const token = localStorage.getItem('idToken');
              if (token) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
            }
            return apiClient(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        } else {
          // No refresh token available - dispatch unauthorized event
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
          dispatchUnauthorized();
        }
      } else {
        // Handle other error cases
        switch (status) {
          case 403:
            console.error('Access forbidden');
            break;
          
          case 404:
            console.error('Resource not found');
            break;
          
          case 500:
            console.error('Server error');
            break;
          
          default:
            console.error('API Error:', error.response.data);
        }
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: { message?: string; code?: string }; message?: string }>;
    if (axiosError.response?.data) {
      // Try different possible error message formats from backend
      const data = axiosError.response.data as any;
      
      // Check for envelope error format: { error: { message, code }, data: null }
      if (data.error && data.error.message) {
        return data.error.message;
      }
      
      // Check for direct message
      if (data.message) {
        return data.message;
      }
      
      // Check for string error
      if (typeof data.error === 'string') {
        return data.error;
      }
      
      return axiosError.message || 'An error occurred';
    }
    return axiosError.message || 'An error occurred';
  }
  return 'An unexpected error occurred';
};

// Helper function to extract success message from API response
export const extractSuccessMessage = (response: any): string | null => {
  if (!response) return null;
  
  // Check for message in response
  if (typeof response === 'object') {
    if (response.message && typeof response.message === 'string') {
      return response.message;
    }
    if (response.data?.message && typeof response.data.message === 'string') {
      return response.data.message;
    }
  }
  
  return null;
};

export default apiClient;
