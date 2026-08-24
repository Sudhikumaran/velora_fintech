import axios from 'axios';
import { isNativeApp, NATIVE_API_URL, isHostedWebOrigin, loginRedirectPath } from './native';

/**
 * API base: always ends with `/api` (no trailing slash).
 * Hosted WebView uses the same-origin Vercel proxy; bundled native hits the API host.
 */
export function resolveApiBaseURL() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') {
    const trimmed = String(raw).trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/api')) return trimmed;
    return `${trimmed}/api`;
  }
  if (isHostedWebOrigin()) return '/api';
  if (isNativeApp()) return NATIVE_API_URL;
  return '/api';
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  config.baseURL = resolveApiBaseURL();
  if (isNativeApp() && !isHostedWebOrigin()) {
    config.withCredentials = false;
  }
  const token = localStorage.getItem('velora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = AUTH_ENDPOINTS.some((e) => url.includes(e));
    if (error.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('velora_token');
      localStorage.removeItem('velora_user');
      window.location.href = loginRedirectPath();
    }
    return Promise.reject(error);
  }
);

export default api;
