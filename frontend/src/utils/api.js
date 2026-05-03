import axios from 'axios';

/** Backend mounts all routes under `/api`. Accepts `https://host` or `https://host/api` in VITE_API_URL. */
function resolveApiBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw == null || String(raw).trim() === '') return '/api';
  const trimmed = String(raw).replace(/\/+$/, '');
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
