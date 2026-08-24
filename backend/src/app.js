import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const isProd     = process.env.NODE_ENV === 'production';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';
import debtRoutes from './routes/debtRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import incomePlanRoutes from './routes/incomePlanRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// Security & utility middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());

function isTrustedVercelOrigin(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (isTrustedVercelOrigin(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

if (!isProd) app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Clients that call https://api-host/auth/... instead of https://api-host/api/auth/...
const API_FIRST_SEGMENTS = new Set([
  'auth', 'accounts', 'transactions', 'budgets', 'debts', 'investments',
  'subscriptions', 'goals', 'analytics', 'calendar-events', 'ledger', 'income-plans', 'search', 'jobs', 'health',
]);
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const seg = req.path.split('/').filter(Boolean)[0];
  if (seg && API_FIRST_SEGMENTS.has(seg)) {
    req.url = `/api${req.originalUrl}`;
  }
  next();
});

// Ensure DB is connected before every request (needed for Vercel serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again.' });
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/calendar-events', calendarRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/income-plans', incomePlanRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Velora API is running.', timestamp: new Date() });
});

// API-only: frontend is served separately (Vercel)
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Velora API is running.' });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
