# Velora Android app (Capacitor)

This is the **same product as the website**, bundled as an APK, plus **payment auto-detect**.

**Install:** build artifact `Velora-android-debug.apk` from GitHub Actions, or a local `cap:apk` build.

## Features (parity with web)

- Dashboard, accounts, transactions, budgets, debts, goals, investments
- Subscriptions, calendar (with email reminders), ledger, reports, analytics
- Waiting payments inbox, settings, PIN lock

## Payment auto-detect (Android only)

After **Paytm / GPay / PhonePe / bank UPI**:

1. Velora reads the payment notification (not SMS)
2. Amount + date are filled automatically
3. Payment lands in **Waiting payments**
4. You only set **category** and **description**, then save

Also available:

- Floating button over other apps
- “Log a payment” shade shortcut
- Share success screen / screenshot (OCR)
- Quick Settings tile

### First-time setup on phone

1. Install APK → open Velora → sign in
2. Settings → **Payment auto-detect**
3. Allow **Notification access** and **Display over other apps**
4. Pay once on Paytm → open Velora → **Scan recent payments** (or wait for the review card)

## Rebuild locally

```powershell
cd frontend
npm ci
npm run cap:sync
cd android
.\gradlew.bat assembleDebug
copy app\build\outputs\apk\debug\app-debug.apk ..\..\releases\Velora-android-debug.apk
```

API URL comes from `frontend/.env.capacitor` (`VITE_API_URL=https://velora-backend-phi.vercel.app`).

## Note on Flutter

Older `Velora-Mobile-2.0` Flutter APKs are legacy. Prefer this Capacitor build for web parity + payment capture.
