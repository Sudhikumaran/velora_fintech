import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const isProd     = process.env.NODE_ENV === 'production';

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
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// Security & utility middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

if (!isProd) app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Velora API is running.', timestamp: new Date() });
});

app.get('/api/debug-paths', (req, res) => {
  const p1 = path.resolve(process.cwd(), 'frontend', 'dist');
  const p2 = path.resolve(__dirname, '../../frontend/dist');
  const p3 = path.resolve(__dirname, '../../../frontend/dist');
  const tryRead = (p) => { try { return fs.readdirSync(p).slice(0, 5); } catch { return 'NOT FOUND'; } };
  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    p1, p1exists: fs.existsSync(p1), p1files: tryRead(p1),
    p2, p2exists: fs.existsSync(p2), p2files: tryRead(p2),
    p3, p3exists: fs.existsSync(p3), p3files: tryRead(p3),
  });
});

// Serve React build in production
if (isProd) {
  const candidatePaths = [
    path.resolve(process.cwd(), 'frontend', 'dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../../../frontend/dist'),
  ];
  const distPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
  console.log('CWD:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('Serving frontend from:', distPath, '| exists:', fs.existsSync(distPath));
  app.use(express.static(distPath));
  app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('sendFile error:', err.message, '| distPath:', distPath);
        res.status(500).json({ error: 'Frontend not found', distPath });
      }
    });
  });
}

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
