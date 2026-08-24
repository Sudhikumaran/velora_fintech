import type { CapacitorConfig } from '@capacitor/cli';

const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL?.trim();
const hostedUrl = 'https://velora-fintech.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.velora.finance',
  appName: 'Velora',
  webDir: 'dist',
  server: {
    // Load the live site so UI/JS changes deploy with Vercel — no new APK.
    // For same-WiFi live reload: CAPACITOR_LIVE_RELOAD_URL=http://IP:5173 npx cap sync android
    url: liveReloadUrl || hostedUrl,
    cleartext: Boolean(liveReloadUrl),
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
