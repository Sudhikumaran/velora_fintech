# Velora — Personal Finance Dashboard

A full-stack personal finance web app built with React, Node.js, Express, and MongoDB.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)

### 1. Backend Setup

```bash
cd backend
npm install
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

Backend runs on: `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## 🔧 Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/velora
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## 📦 Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS v4
- Zustand (state management)
- Recharts (data visualization)
- Framer Motion (animations)
- React Router v6
- Axios

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs (password hashing)
- Helmet, CORS, Rate Limiting

## 🌟 Features

- 💰 **Dashboard** — Balance overview, income vs expenses, spending trends
- 💳 **Accounts** — Bank, cash, credit, savings, investments
- 🧾 **Transactions** — Add, edit, delete, archive, filter
- 📊 **Analytics** — Charts, category breakdown, monthly trends
- 💸 **Budgets** — Set limits, track usage, alerts
- 📉 **Debts** — Track borrowed/lent money, repayments
- 💼 **Income** — Multiple sources, monthly insights
- 📈 **Investments** — Portfolio tracking, gain/loss
- 🔁 **Subscriptions** — Recurring expenses management
- 🎯 **Goals** — Financial goal tracking with contributions
- 📅 **Calendar** — Financial event visualization
- ⚙️ **Settings** — Profile, password, currency, data export

## 🔐 Security

- JWT-based authentication
- bcrypt password hashing
- Rate limiting on auth routes
- Helmet.js security headers
- CORS protection
