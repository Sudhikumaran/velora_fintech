import Subscription from '../models/Subscription.js';
import Account from '../models/Account.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { createUserTransaction } from '../utils/money.js';
import { addFrequency, isDueOnOrBefore } from '../utils/recurrence.js';

export const getSubscriptions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const subscriptions = await Subscription.find(filter).sort({ nextBillingDate: 1 });
    successResponse(res, subscriptions, 'Subscriptions fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createSubscription = async (req, res, next) => {
  try {
    const { name, amount, frequency, category, startDate, nextBillingDate, description, website, color, account, remindBefore, currency, autoPost } = req.body;

    if (!name || !amount || !frequency || !category || !nextBillingDate) {
      return errorResponse(res, 'Name, amount, frequency, category and next billing date are required.', 400);
    }

    const subscription = await Subscription.create({
      user: req.user._id,
      name, amount, frequency, category,
      startDate: startDate || Date.now(),
      nextBillingDate, description, website,
      color: color || '#6366f1', account,
      remindBefore: remindBefore || 3,
      currency: currency || 'USD',
      autoPost: autoPost !== false,
    });

    successResponse(res, subscription, 'Subscription created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) return errorResponse(res, 'Subscription not found.', 404);

    const { name, amount, frequency, category, startDate, nextBillingDate, status, description, website, color, account, remindBefore, currency, autoPost } = req.body;
    Object.assign(subscription, { name, amount, frequency, category, startDate, nextBillingDate, status, description, website, color, account, remindBefore, currency, autoPost });
    await subscription.save();

    successResponse(res, subscription, 'Subscription updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) return errorResponse(res, 'Subscription not found.', 404);

    await Subscription.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Subscription deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) return errorResponse(res, 'Subscription not found.', 404);

    subscription.status = subscription.status === 'active' ? 'paused' : 'active';
    await subscription.save();

    successResponse(res, subscription, `Subscription ${subscription.status}.`);
  } catch (error) {
    next(error);
  }
};

async function postOneSubscription(userId, subscription) {
  let accountId = subscription.account;
  if (!accountId) {
    const fallback = await Account.findOne({ user: userId, isArchived: false }).sort({ createdAt: 1 });
    accountId = fallback?._id;
  }
  if (!accountId) {
    throw Object.assign(new Error('No account available to post this subscription.'), { status: 400 });
  }

  const posted = [];
  let guard = 0;
  while (isDueOnOrBefore(subscription.nextBillingDate) && guard < 24) {
    const tx = await createUserTransaction(userId, {
      account: accountId,
      type: 'expense',
      amount: subscription.amount,
      category: subscription.category || 'Subscriptions',
      description: subscription.name,
      date: subscription.nextBillingDate,
      notes: 'Auto-posted from subscription',
      source: 'subscription',
      sourceId: String(subscription._id),
      recurringId: subscription._id,
    });
    posted.push(tx);
    subscription.lastPostedDate = subscription.nextBillingDate;
    subscription.nextBillingDate = addFrequency(subscription.nextBillingDate, subscription.frequency);
    guard += 1;
  }
  await subscription.save();
  return posted;
}

export const postDueSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({
      user: req.user._id,
      status: 'active',
      autoPost: { $ne: false },
    });

    const posted = [];
    const errors = [];
    for (const sub of subscriptions) {
      if (!isDueOnOrBefore(sub.nextBillingDate)) continue;
      try {
        const txs = await postOneSubscription(req.user._id, sub);
        posted.push(...txs);
      } catch (err) {
        errors.push({ id: sub._id, name: sub.name, message: err.message });
      }
    }

    successResponse(res, { posted: posted.length, errors, data: posted }, 'Due subscriptions posted.');
  } catch (error) {
    next(error);
  }
};

export const postSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!subscription) return errorResponse(res, 'Subscription not found.', 404);
    const posted = await postOneSubscription(req.user._id, subscription);
    successResponse(res, { posted: posted.length, subscription, data: posted }, 'Subscription posted.');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    next(error);
  }
};
