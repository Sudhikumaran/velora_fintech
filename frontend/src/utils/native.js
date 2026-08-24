import { Capacitor } from '@capacitor/core';

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

export const NATIVE_API_URL = 'https://velora-backend-phi.vercel.app/api';

export async function initNativeShell() {
  if (!isNativeApp()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setBackgroundColor({ color: '#6366f1' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch { /* web preview */ }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* web preview */ }
}

export async function tapHaptic() {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch { /* ignore */ }
}
