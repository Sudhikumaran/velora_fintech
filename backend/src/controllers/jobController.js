import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { runDebtReminderJob } from '../services/debtReminderJob.js';
import Subscription from '../models/Subscription.js';
import Transaction from '../models/Transaction.js';
import { createUserTransaction } from '../utils/money.js';
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
    while (isDueOnOrBefore(sub.nextBillingDate) && guard < 24) {
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
    while (isDueOnOrBefore(tpl.nextRunDate) && guard < 24) {
      await createUserTransaction(tpl.user, {
        account: tpl.account,
        toAccount: tpl.toAccount,
        type: tpl.type,
        amount: tpl.amount,
        category: tpl.category,
        description: tpl.description,
        date: tpl.nextRunDate,
        notes: tpl.notes,
        splits: tpl.splits,
        source: 'recurring',
        sourceId: String(tpl._id),
      });
      tpl.nextRunDate = addFrequency(tpl.nextRunDate, tpl.frequency);
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
