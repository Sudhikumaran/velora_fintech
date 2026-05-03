import axios from 'axios';

/**
 * API base: always ends with `/api` (no trailing slash).
 * - Empty VITE_API_URL → `/api` (same origin; Vercel should proxy `/api/*` to Render in vercel.json).
 * - `https://host` or `https://host/api` both work.
 */
function resolveApiBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === '') return '/api';
  const trimmed = String(raw).trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('velora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('velora_token');
      localStorage.removeItem('velora_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
