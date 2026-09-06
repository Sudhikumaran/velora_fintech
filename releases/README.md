# Velora Mobile 2.0 — native Android app

**Install:** [`Velora-Mobile-2.0.0.apk`](./Velora-Mobile-2.0.0.apk)

Native Flutter app with **all features**, **instant open** (cached data), and **background sync** — no blocking “connecting to server” screen.

## What's new in 2.0

- Opens instantly with your last synced data
- Syncs quietly in the background
- Polished login and splash UI
- All features: dashboard, accounts, transactions, budgets, goals, debts, investments, subscriptions, analytics, calendar, settings

## Install

1. Uninstall any older Velora app
2. Copy `Velora-Mobile-2.0.0.apk` to your phone (~52 MB)
3. Install → sign in
4. First sign-in may take a moment while the cloud API wakes up; after that the app opens fast

## Rebuild

```powershell
$env:Path = "C:\Users\sudhi\flutter\bin;$env:Path"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
cd c:\velora\flutter_app
flutter build apk --release --dart-define=API_URL=https://velora-fintech.onrender.com
copy build\app\outputs\flutter-apk\app-release.apk ..\releases\Velora-Mobile-2.0.0.apk
```
