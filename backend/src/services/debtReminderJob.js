import cron from 'node-cron';
import Debt from '../models/Debt.js';
import { getEffectiveDueDate, getDaysUntilDue } from '../utils/debtHelpers.js';
import { sendDebtDueReminder, isEmailConfigured } from './emailService.js';

const REMINDER_DAYS = 7;

function formatDueLabel(date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shouldSendReminder(debt) {
  const days = getDaysUntilDue(debt);
  if (days === null) return false;
  if (days > REMINDER_DAYS) return false;

  if (debt.lastReminderSentAt) {
    const lastSent = new Date(debt.lastReminderSentAt);
    const today = new Date();
    if (
      lastSent.getFullYear() === today.getFullYear() &&
      lastSent.getMonth() === today.getMonth() &&
      lastSent.getDate() === today.getDate()
    ) {
      return false;
    }
  }

  return true;
}

export async function runDebtReminderJob() {
  if (!isEmailConfigured()) return;

  try {
    const activeDebts = await Debt.find({ status: { $ne: 'paid' } }).populate('user', 'name email');
    const dueDebts = activeDebts.filter(shouldSendReminder);

    if (dueDebts.length === 0) return;

    const byUser = new Map();
    for (const debt of dueDebts) {
      const userId = debt.user?._id?.toString();
      if (!userId || !debt.user?.email) continue;
      if (!byUser.has(userId)) byUser.set(userId, { user: debt.user, debts: [] });

      const daysLeft = getDaysUntilDue(debt);
      const dueDate = getEffectiveDueDate(debt);
      byUser.get(userId).debts.push({
        person: debt.person,
        description: debt.description,
        amount: debt.amount,
        remainingAmount: debt.remainingAmount,
        daysLeft,
        isOverdue: daysLeft < 0,
        dueDateLabel: dueDate ? formatDueLabel(dueDate) : '—',
        debtId: debt._id,
      });
    }

    for (const { user, debts } of byUser.values()) {
      const sent = await sendDebtDueReminder({
        to: user.email,
        userName: user.name,
        debts,
      });

      if (sent) {
        const ids = debts.map((d) => d.debtId);
        await Debt.updateMany(
          { _id: { $in: ids } },
          { $set: { lastReminderSentAt: new Date() } }
        );
        console.log(`[DebtReminder] Sent email to ${user.email} for ${debts.length} debt(s).`);
      }
    }
  } catch (err) {
    console.error('[DebtReminder] Job failed:', err.message);
  }
}

export function startDebtReminderScheduler() {
  if (!isEmailConfigured()) {
    console.warn('[DebtReminder] SMTP not configured — email reminders disabled.');
    return;
  }

  cron.schedule('0 8 * * *', runDebtReminderJob);
  console.log('[DebtReminder] Daily email reminder scheduled at 8:00 AM.');
}
