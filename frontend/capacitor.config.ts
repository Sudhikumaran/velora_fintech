import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const liveFile = path.join(dir, '.capacitor-live');
const liveReloadUrl = existsSync(liveFile)
  ? readFileSync(liveFile, 'utf8').trim()
  : process.env.CAPACITOR_LIVE_RELOAD_URL?.trim();

const hostedUrl = 'https://velora-fintech.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.velora.finance',
  appName: 'Velora',
  webDir: 'dist',
  server: {
    // Load the live site so UI/JS changes deploy with Vercel — no new APK.
    // Write frontend/.capacitor-live (one URL) to point a debug build at Vite instead.
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
      resize: 'body',
    },
  },
};

export default config;
