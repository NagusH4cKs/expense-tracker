import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const message = (error.response?.data as any)?.message || error.message || 'API request failed';
    console.error('[API Response Error]:', message);
    return Promise.reject(error);
  }
);

export default apiClient;
