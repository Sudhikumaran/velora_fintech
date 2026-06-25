import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startDebtReminderScheduler } from './src/services/debtReminderJob.js';

const isVercel = process.env.VERCEL === '1';
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  if (!isVercel) {
    startDebtReminderScheduler();
    app.listen(PORT, () => {
      console.log(`🚀 Velora server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  }
});

export default app;
