import 'dotenv/config';
import app from './src/app.js';

const isVercel = process.env.VERCEL === '1';
const PORT = process.env.PORT || 5000;

if (!isVercel) {
  // Local dev: connect DB eagerly and start server + scheduler
  const { default: connectDB } = await import('./src/config/db.js');
  const { startDebtReminderScheduler } = await import('./src/services/debtReminderJob.js');

  await connectDB();
  startDebtReminderScheduler();
  app.listen(PORT, () => {
    console.log(`🚀 Velora server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
}

export default app;
