import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Client Module
// API Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.tradeflow.com/v1';

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

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
  (response) => {
    // Return the data directly if it exists
    return response.data || response;
  },
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('idToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          break;
        
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
    const axiosError = error as AxiosError<{ error?: { message?: string } }>;
    return axiosError.response?.data?.error?.message || axiosError.message || 'An error occurred';
  }
  return 'An unexpected error occurred';
};

export default apiClient;
