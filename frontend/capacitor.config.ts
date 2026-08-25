import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL?.trim();

const config: CapacitorConfig = {
  appId: 'app.velora.finance',
  appName: 'Velora',
  webDir: 'dist',
  server: {
    // Bundle the UI into the APK. Set CAPACITOR_LIVE_RELOAD_URL to load Vite/Vercel instead.
    ...(liveReloadUrl ? { url: liveReloadUrl, cleartext: liveReloadUrl.startsWith('http://') } : {}),
    androidScheme: 'https',
    hostname: 'localhost',
    allowNavigation: [
      'velora-fintech.vercel.app',
      'velora-backend-phi.vercel.app',
      '*.vercel.app',
      'localhost',
      '127.0.0.1',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#6366f1',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#6366f1',
    },
    Keyboard: {
      resize: 'none',
    },
  },
};

export default config;
