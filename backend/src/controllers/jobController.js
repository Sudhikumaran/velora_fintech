import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { runDebtReminderJob } from '../services/debtReminderJob.js';
import { runDailySpendJob } from '../services/dailySpendJob.js';
import Subscription from '../models/Subscription.js';
import Transaction from '../models/Transaction.js';
import { createUserTransaction, alreadyPostedSource, isSameCalendarDay } from '../utils/money.js';
import { addFrequency, isDueOnOrBefore } from '../utils/recurrence.js';
import Account from '../models/Account.js';

async function postAllDueSubscriptions() {
  const subscriptions = await Subscription.find({ status: 'active', autoPost: { $ne: false } });
  let count = 0;
  for (const sub of subscriptions) {
    if (!isDueOnOrBefore(sub.nextBillingDate)) continue;
    let accountId = sub.account;
    if (!accountId) {
      const fallback = await Account.findOne({ user: sub.user, isArchived: false }).sort({ createdAt: 1 });
      accountId = fallback?._id;
    }
    if (!accountId) continue;
    let guard = 0;
    while (isDueOnOrBefore(sub.nextBillingDate) && guard < 3) {
      const due = sub.nextBillingDate;
      if (await alreadyPostedSource(sub.user, 'subscription', sub._id, due)) {
        sub.nextBillingDate = addFrequency(due, sub.frequency);
        guard += 1;
        continue;
      }
      await createUserTransaction(sub.user, {
        account: accountId,
        type: 'expense',
        amount: sub.amount,
        category: sub.category || 'Subscriptions',
        description: sub.name,
        date: sub.nextBillingDate,
        notes: 'Auto-posted from subscription',
        source: 'subscription',
        sourceId: String(sub._id),
        recurringId: sub._id,
      });
      sub.lastPostedDate = sub.nextBillingDate;
      sub.nextBillingDate = addFrequency(sub.nextBillingDate, sub.frequency);
      count += 1;
      guard += 1;
    }
    await sub.save();
  }
  return count;
}

async function postAllRecurring() {
  const templates = await Transaction.find({
    isRecurring: true,
    isArchived: false,
    frequency: { $exists: true },
    nextRunDate: { $ne: null },
  });
  let count = 0;
  for (const tpl of templates) {
    let guard = 0;
    while (isDueOnOrBefore(tpl.nextRunDate) && guard < 3) {
      const due = tpl.nextRunDate;
      if (isSameCalendarDay(tpl.date, due) || await alreadyPostedSource(tpl.user, 'recurring', tpl._id, due)) {
        tpl.nextRunDate = addFrequency(due, tpl.frequency);
        guard += 1;
        continue;
      }
      await createUserTransaction(tpl.user, {
        account: tpl.account,
        toAccount: tpl.toAccount,
        type: tpl.type,
        amount: tpl.amount,
        category: tpl.category,
        description: tpl.description,
        date: due,
        notes: tpl.notes,
        splits: tpl.splits,
        source: 'recurring',
        sourceId: String(tpl._id),
      });
      tpl.nextRunDate = addFrequency(due, tpl.frequency);
      count += 1;
      guard += 1;
    }
    await tpl.save();
  }
  return count;
}

export const runJobs = async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.secret;
    if (process.env.NODE_ENV === 'production') {
      if (!secret || token !== secret) {
        return errorResponse(res, 'Unauthorized job request.', 401);
      }
    } else if (secret && token !== secret) {
      return errorResponse(res, 'Unauthorized job request.', 401);
    }

    await runDebtReminderJob();
    const subscriptions = await postAllDueSubscriptions();
    const recurring = await postAllRecurring();

    successResponse(res, { subscriptions, recurring }, 'Jobs completed.');
  } catch (error) {
    next(error);
  }
};

export const runDailySpend = async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.secret;
    if (process.env.NODE_ENV === 'production') {
      if (!secret || token !== secret) {
        return errorResponse(res, 'Unauthorized job request.', 401);
      }
    } else if (secret && token !== secret) {
      return errorResponse(res, 'Unauthorized job request.', 401);
    }

    const result = await runDailySpendJob();
    successResponse(res, result, 'Daily spend emails completed.');
  } catch (error) {
    next(error);
  }
};
