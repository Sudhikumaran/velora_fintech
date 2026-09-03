import cron from 'node-cron';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { sendDailySpendReport, isEmailConfigured } from './emailService.js';
import {
  resolveUserTimeZone,
  zonedDayRange,
  zonedDayRangeFromYmd,
  addCalendarDays,
  monthToDateRange,
  formatLongDate,
} from '../utils/zonedDate.js';

function sumByType(txs, type) {
  return txs.filter((t) => t.type === type && !t.excludeFromTotals).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function categoryTotals(txs) {
  const byCategory = {};
  txs.filter((t) => t.type === 'expense' && !t.excludeFromTotals).forEach((t) => {
    const name = t.category || 'Other';
    byCategory[name] = (byCategory[name] || 0) + Number(t.amount || 0);
  });
  return Object.entries(byCategory)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

async function totalsForRange(userId, start, end) {
  const txs = await Transaction.find({
    user: userId,
    isArchived: false,
    date: { $gte: start, $lte: end },
    type: { $in: ['income', 'expense'] },
  }).select('type amount category description date').sort({ amount: -1 });
  return {
    txs,
    income: sumByType(txs, 'income'),
    expense: sumByType(txs, 'expense'),
  };
}

export async function runDailySpendJob(now = new Date()) {
  if (!isEmailConfigured()) {
    console.warn('[DailySpend] SMTP not configured — skipping.');
    return { sent: 0, skipped: 0 };
  }

  const users = await User.find({ email: { $exists: true, $ne: '' } }).select(
    'name email currency timezone lastDailySpendEmailOn',
  );

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const timeZone = resolveUserTimeZone(user.timezone);
    const today = zonedDayRange(now, timeZone);
    if (user.lastDailySpendEmailOn === today.ymd) {
      skipped += 1;
      continue;
    }

    try {
      const yesterdayYmd = addCalendarDays(today.ymd, -1);
      const yesterday = zonedDayRangeFromYmd(yesterdayYmd, timeZone);
      const month = monthToDateRange(now, timeZone);

      const [todayStats, yesterdayStats, monthStats] = await Promise.all([
        totalsForRange(user._id, today.start, today.end),
        totalsForRange(user._id, yesterday.start, yesterday.end),
        totalsForRange(user._id, month.start, month.end),
      ]);

      const expenses = todayStats.txs.filter((t) => t.type === 'expense' && !t.excludeFromTotals);
      await sendDailySpendReport({
        to: user.email,
        userName: user.name,
        currency: user.currency || 'INR',
        dateLabel: formatLongDate(today.ymd),
        expense: todayStats.expense,
        income: todayStats.income,
        yesterdayExpense: yesterdayStats.expense,
        monthExpense: monthStats.expense,
        dayOfMonth: month.dayOfMonth,
        categories: categoryTotals(todayStats.txs),
        transactions: expenses.slice(0, 12).map((t) => ({
          description: t.description || t.category || 'Expense',
          category: t.category || 'Other',
          amount: t.amount,
        })),
        txCount: expenses.length,
      });

      user.lastDailySpendEmailOn = today.ymd;
      await user.save();
      sent += 1;
      console.log(`[DailySpend] Sent report to ${user.email} for ${today.ymd}.`);
    } catch (err) {
      console.error(`[DailySpend] Failed for ${user.email}:`, err.message);
    }
  }

  return { sent, skipped };
}

export function startDailySpendScheduler() {
  if (!isEmailConfigured()) {
    console.warn('[DailySpend] SMTP not configured — nightly spend email disabled.');
    return;
  }

  cron.schedule('0 23 * * *', () => runDailySpendJob(), { timezone: 'Asia/Kolkata' });
  console.log('[DailySpend] Nightly spend email scheduled at 11:00 PM IST.');
}
