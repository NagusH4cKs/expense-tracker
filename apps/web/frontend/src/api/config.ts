const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl && !import.meta.env.DEV) {
  throw new Error('Set VITE_API_URL to your own backend API before deploying the frontend.');
}

export const API_CONFIG = {
  baseURL: configuredApiUrl || 'http://localhost:5000/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};
