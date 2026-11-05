import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from './config';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

export const API_ACTIVITY_EVENT = 'api-activity';
const activeRequests = new WeakSet<object>();
let pendingRequests = 0;

const publishActivity = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_ACTIVITY_EVENT, { detail: pendingRequests }));
  }
};

const finishRequest = (config?: object) => {
  if (!config || !activeRequests.has(config)) return;
  activeRequests.delete(config);
  pendingRequests = Math.max(0, pendingRequests - 1);
  publishActivity();
};

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    activeRequests.add(config);
    pendingRequests += 1;
    publishActivity();
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
    finishRequest(response.config);
    return response;
  },
  (error: AxiosError) => {
    finishRequest(error.config);
    const message = (error.response?.data as any)?.message || error.message || 'API request failed';
    console.error('[API Response Error]:', message);
    return Promise.reject(error);
  }
);

export default apiClient;
