# Velora Flutter App

Native Android/iOS client for the Velora personal finance API — same backend as the React web app, **no WebView**.

## Features

- Auth: sign in, register, profile, password
- Dashboard: balance, income/expenses, charts, recent transactions
- Accounts: create, edit, archive, delete
- Transactions: income, expense, **transfer**, edit, filters, search, archive
- Budgets, goals (+ contribute), debts (+ EMI + repay)
- Investments (+ price update), subscriptions (+ pause/resume)
- Analytics (net worth, trends, cash flow), calendar, income, data export
- Settings: API URL override, export

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.16+
- Android Studio (for APK builds)

## Run locally

```bash
cd flutter_app
flutter pub get
flutter run
```

Production API (default on device):

```bash
flutter run --dart-define=API_URL=https://velora-fintech.onrender.com
```

Local backend (emulator → host):

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:5000
```

## Build APK (install on any Android phone)

```powershell
$env:Path = "C:\Users\sudhi\flutter\bin;$env:Path"
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
cd flutter_app
flutter build apk --release --dart-define=API_URL=https://velora-fintech.onrender.com
```

APK: `build/app/outputs/flutter-apk/app-release.apk`

Copy to phone and install (enable unknown sources), or use the prebuilt file at `../releases/Velora-Mobile-1.1.0.apk`.

## Play Store (optional)

```bash
flutter build appbundle --release --dart-define=API_URL=https://velora-fintech.onrender.com
```

## Project structure

```
lib/
  config/       API URL
  core/         Dio client, token storage
  models/       Domain models
  services/     API calls
  providers/    State (Provider)
  screens/      UI (all features)
  router/       go_router + auth guards
  theme/        Velora branding
```

## API

Uses the same REST API as the web app. Native apps call the API directly (no browser CORS).
