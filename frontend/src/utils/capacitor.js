import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNativeApp = Capacitor.isNativePlatform();

/** Status bar, splash, Android back → history. */
export async function initCapacitor() {
  if (!isNativeApp) return;

  try {
    await SplashScreen.hide();
  } catch {
    /* splash may already be hidden */
  }

  try {
    const prefersDark = localStorage.getItem('velora_theme') === 'dark';
    await StatusBar.setStyle({ style: prefersDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: prefersDark ? '#030712' : '#4f46e5' });
  } catch {
    /* StatusBar not available on all platforms */
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
}
