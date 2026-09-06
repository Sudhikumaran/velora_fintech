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

/** Read JWT from either storage key (they can desync after a 401). */
export function getAuthToken() {
  const direct = localStorage.getItem('velora_token');
  if (direct) return direct;
  try {
    const raw = localStorage.getItem('velora-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    if (typeof token === 'string' && token.length > 0) {
      localStorage.setItem('velora_token', token);
      return token;
    }
  } catch {
    /* ignore corrupt persist blob */
  }
  return null;
}

export function clearAuthSession() {
  localStorage.removeItem('velora_token');
  localStorage.removeItem('velora_user');
  localStorage.removeItem('velora-auth');
  sessionStorage.removeItem('velora_unlocked');
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

let handlingUnauthorized = false;

api.interceptors.request.use((config) => {
  config.baseURL = resolveApiBaseURL();
  if (isNativeApp() && !isHostedWebOrigin()) {
    config.withCredentials = false;
  }
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = AUTH_ENDPOINTS.some((e) => url.includes(e));
    if (error.response?.status === 401 && !isAuthCall) {
      if (!handlingUnauthorized) {
        handlingUnauthorized = true;
        clearAuthSession();
        const path = window.location.pathname;
        const hash = window.location.hash || '';
        const onLogin =
          path === '/login' ||
          path === '/register' ||
          hash.includes('/login') ||
          hash.includes('/register');
        if (!onLogin) {
          window.location.href = loginRedirectPath();
        } else {
          handlingUnauthorized = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
