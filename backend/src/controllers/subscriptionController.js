import Subscription from '../models/Subscription.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

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
    const { name, amount, frequency, category, startDate, nextBillingDate, description, website, color, account, remindBefore, currency } = req.body;

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

    const { name, amount, frequency, category, startDate, nextBillingDate, status, description, website, color, account, remindBefore, currency } = req.body;
    Object.assign(subscription, { name, amount, frequency, category, startDate, nextBillingDate, status, description, website, color, account, remindBefore, currency });
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
