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
  const tryRead = (p) => { try { return fs.readdirSync(p); } catch { return 'NOT FOUND'; } };
  const indexContent = (() => { try { return fs.readFileSync(path.join(p1, 'index.html'), 'utf8').slice(0, 200); } catch (e) { return e.message; } })();
  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    distPath: p1,
    distExists: fs.existsSync(p1),
    distFiles: tryRead(p1),
    assetsFiles: tryRead(path.join(p1, 'assets')),
    indexSnippet: indexContent,
    isProd,
    NODE_ENV: process.env.NODE_ENV,
  });
});

// Serve React build in production
if (isProd) {
  const distPath = path.resolve(process.cwd(), 'frontend', 'dist');
  console.log('Serving static from:', distPath);

  const MIME = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.svg':  'image/svg+xml',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.ico':  'image/x-icon',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
  };

  app.use((req, res, next) => {
    const ext = path.extname(req.path);
    if (!ext) return next();
    const filePath = path.join(distPath, req.path);
    if (!fs.existsSync(filePath)) return next();
    try {
      const data = fs.readFileSync(filePath);
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      return res.end(data);
    } catch (e) {
      return next(e);
    }
  });

  // SPA fallback
  app.get(/(.*)/, (req, res, next) => {
    const indexPath = path.join(distPath, 'index.html');
    try {
      const html = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.end(html);
    } catch (e) {
      return next(e);
    }
  });
}

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
