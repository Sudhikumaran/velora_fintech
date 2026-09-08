# Velora

Personal finance for web and Android. Track accounts, transactions, budgets, debts, investments, and bills — then see net worth, savings rate, and “can I spend this?” on Home.

**Live:** [velora-fintech.vercel.app](https://velora-fintech.vercel.app)  
**API:** [velora-backend-phi.vercel.app](https://velora-backend-phi.vercel.app)

Stack: React + Vite frontend, Express + MongoDB backend, Capacitor Android app.

---

## Features

### Home
- Balance, monthly income vs expenses, spending mix
- **Net worth** = cash & bank + investments + money lent − credit cards − borrowed / EMI remaining
- Savings rate (after EMIs when those exist)
- **Can I spend this?** — type an amount and see leftover budget
- Weekly spend digest vs last week
- Unusual spend alerts (category jump, same merchant 3× in a day)
- What-if: cut a category and see EMI months saved
- Voice add, waiting-payment banner

### Accounts
- Bank, cash, credit, savings, wallet, investment
- Per-account currency and optional **UPI ID** (own-handle payments can be treated as transfers)
- Running balances stay in the number you entered (not converted as foreign currency by default)

### Transactions
- Income, expense, transfer — add, edit, archive, delete, search, CSV import/export
- **Splits** with their own category, amount, and description; search finds split text
- **Don’t count as income** — money returned from home still hits the account, not salary totals
- **Don’t count as spending** — salary given to home that you can take back
- GST / business invoice (GSTIN + GST amount)
- Receipts (upload + OCR), recurring copies, restore-balances repair

### Android (after you pay)
Velora does **not** read SMS. After a UPI or bank-app payment you can log it via:
- Assistant card over other apps (display-over-apps)
- Purple floating button
- “Log a payment” shade notification
- Share the success screen or a screenshot to Velora (OCR)
- Quick Settings tile
- Voice add on Home

Merchant categories (e.g. Swiggy → Food) are remembered on device and on your profile.

### Planning
- **Budgets** — limits, spent, alerts
- **Debts** — borrowed / lent, EMI day, repayments, due reminders
- **Goals** — targets and contributions
- **Income planner** — planned income and posting to the books
- **Subscriptions** — recurring bills and next due date
- **Calendar** — transactions, subscriptions, EMI / rent dues, custom events; 3-day highlight

### Insights & reports
- Analytics: category spend, monthly trend, cash flow, budget analysis
- Monthly report: filters, print / PDF, **CA CSV** (date, particulars, debit/credit, GSTIN, splits)
- Ledger per account
- Global search (including split lines and GSTIN)

### Investments
- Holdings (stocks, mutual funds, gold, etc.) as `units × price`
- Included in net worth

### Settings & security
- **Free vs Premium** — 7-day Premium trial on first login; waitlist after that (checkout not live yet)
- Profile, currency, timezone, avatar, password
- Device **PIN lock** (stored on the phone, not the server)
- JSON export / import; **CA monthly CSV** (Premium)
- Shared **household** join code (Premium; each person keeps their own books)
- **Account Aggregator waitlist** — RBI AA later; Velora never asks for bank passwords
- Light / dark theme

### Plans
**Free:** unlimited accounts and manual transactions, splits, don’t-count-as-income, 3 budgets, debts/calendar, PIN, print reports, dashboard snapshot.

**Premium (trial now waitlist):** Android after-pay capture, net worth extras / spend-check / weekly digest / what-if, unlimited budgets, income planner, household, CA export. Indicative price ₹99–149/mo or ₹799–999/yr when payments open.

---

## Quick start

Needs Node.js 18+ and MongoDB (local or Atlas).

### Backend

```bash
cd backend
npm install
cp .env.example .env   # set MONGODB_URI and JWT_SECRET
npm run dev
```

API: `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` to the backend in local/Vercel setups)

### Android

```bash
cd frontend
npm run cap:sync
```

Then open the Android project (`npm run cap:android`) or build a debug APK with Gradle `assembleDebug`. The APK bundles the UI; reinstall after native or UI changes.

---

## Environment

### Backend (`backend/.env`)

See `backend/.env.example`. Typical keys:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/velora
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

Optional SMTP settings send password resets, debt receipts, and a daily spend email.

### Frontend (`frontend/.env`)

See `frontend/.env.example`. Omit `VITE_API_URL` to use same-origin `/api`. Cloudinary keys are for receipt / avatar uploads.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Web | React, Vite, Tailwind CSS, Zustand, Recharts, Framer Motion, React Router |
| API | Node.js, Express, MongoDB / Mongoose, JWT, Helmet, CORS, rate limits |
| Android | Capacitor (notification listener, overlay, share, Quick Settings) |
| OCR | Tesseract.js (receipts / shared screenshots) |

## Mobile app (native Android)

The **Flutter** app (`flutter_app/`) is the mobile product — native UI, full feature parity with the web app, installable APK.

```bash
cd flutter_app
flutter pub get
flutter run
```

### Download & install (APK)

Install **`releases/Velora-Mobile-2.0.0.apk`** on your phone — see [releases/README.md](releases/README.md).

Build locally:

```powershell
cd flutter_app
flutter build apk --release --dart-define=API_URL=https://velora-fintech.onrender.com
```

More: [flutter_app/README.md](flutter_app/README.md)

---

## Security

- JWT auth (cookie + bearer token for native)
- bcrypt password hashing
- Rate limits on `/api` and login
- Helmet headers and CORS allow-list
- App PIN is local to the device
- No SMS permissions; no bank login / Account Aggregator access yet
