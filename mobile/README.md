# Velora Mobile (WebView)

Velora ships as a **Capacitor** app: native Android/iOS shells load your React build in a WebView.

## Prerequisites

- Node.js 18+
- **Android:** [Android Studio](https://developer.android.com/studio) + JDK 17
- **iOS (Mac only):** Xcode + CocoaPods

## One-time setup

```bash
cd frontend
npm install
cp .env.mobile.example .env.mobile
# Edit .env.mobile — set VITE_API_URL to your live API (e.g. Render)
npx cap add android
# Mac only:
npx cap add ios
```

## Build and run (bundled web app)

```bash
cd frontend
npm run cap:sync          # build + copy dist into native projects
npm run cap:android     # open Android Studio → Run on device/emulator
```

Or from repo root:

```bash
npm run mobile:sync
npm run mobile:android
```

## Dev: live Vite on your phone

1. Find your PC LAN IP (`ipconfig` on Windows).
2. In `frontend/capacitor.config.ts`, uncomment and set:
   ```ts
   server: { url: 'http://192.168.x.x:5173', cleartext: true }
   ```
3. Start backend + frontend (`npm run dev:backend`, `npm run dev:frontend`).
4. Add `http://192.168.x.x:5173` to backend `CLIENT_URL` in `.env`.
5. Run: `npx cap run android` (from `frontend/`).

## API / CORS

- Mobile builds **must** set `VITE_API_URL` in `.env.mobile` (no `/api` proxy like Vercel).
- Backend allows Capacitor origins (`https://localhost`, `capacitor://`) automatically.

## App ID

- Android/iOS bundle: `com.velora.finance`
- Change in `frontend/capacitor.config.ts` if you publish under your own account.

## Icons & splash

Replace default Capacitor assets:

```bash
cd frontend
npx @capacitor/assets generate --iconBackgroundColor "#4f46e5" --splashBackgroundColor "#4f46e5"
```

(Place a 1024×1024 `icon.png` in `frontend/` first, or use your `public/favicon.svg` exported to PNG.)

## Downloadable APK (install on any Android phone)

From repo root:

```powershell
npm run mobile:apk
```

Output: **`releases/Velora-1.0.0-debug.apk`** — copy to the phone and install (enable “unknown apps”).

Details: [releases/README.md](../releases/README.md)

**GitHub:** use the **Android APK** workflow (Actions) to download the APK without building locally.

**Play Store:** signed `bundleRelease` + Google Play Console (see releases README).

## Production checklist

- [ ] `.env.mobile` → production `VITE_API_URL`
- [ ] `npm run build:mobile` && `npx cap sync`
- [ ] Signing keys in Android Studio / Xcode
- [ ] Test login, transactions, file upload (receipts) on a real device
