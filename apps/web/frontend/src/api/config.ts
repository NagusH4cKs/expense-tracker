export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://expense-tracker-rowe.onrender.com/api'),
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};
