import { Capacitor } from '@capacitor/core';

export const HOSTED_APP_URL = 'https://velora-fintech.vercel.app';
export const NATIVE_API_URL = 'https://velora-backend-phi.vercel.app/api';

function locationLooksNative() {
  if (typeof window === 'undefined') return false;
  const { protocol, hostname, port } = window.location;
  if (protocol === 'capacitor:' || protocol === 'ionic:') return true;
  return !port && (hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'https:';
}

export function isNativeApp() {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch { /* Capacitor may not be ready yet */ }
  return locationLooksNative();
}

/** Live website (or Vite) — use normal URLs, not hash routes. */
export function isHostedWebOrigin() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('vercel.app') || Boolean(window.location.port);
}

export function usesHashRouter() {
  return isNativeApp() && !isHostedWebOrigin();
}

export function loginRedirectPath() {
  return usesHashRouter() ? '#/login' : '/login';
}

export async function initNativeShell() {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app');

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#6366f1' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch { /* web preview */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* web preview */ }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        sessionStorage.setItem('velora_bg_at', String(Date.now()));
        return;
      }
      const bgAt = Number(sessionStorage.getItem('velora_bg_at') || 0);
      if (bgAt && Date.now() - bgAt > 30_000) {
        try {
          const waiting = JSON.parse(localStorage.getItem('velora_pay_review') || '[]');
          if (Array.isArray(waiting) && waiting.length) return;
        } catch { /* ignore */ }
        window.location.reload();
      }
    });
  } catch { /* web preview */ }
}

export async function tapHaptic() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
}
