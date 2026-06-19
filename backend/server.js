import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startDebtReminderScheduler } from './src/services/debtReminderJob.js';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  startDebtReminderScheduler();

  app.listen(PORT, () => {
    console.log(`🚀 Velora server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  });
});
