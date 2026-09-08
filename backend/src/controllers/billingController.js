import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isUserPremium, planPayload, startLaunchTrial, TRIAL_DAYS } from '../utils/plan.js';

export const getPlan = async (req, res, next) => {
  try {
    const user = await startLaunchTrial(await User.findById(req.user._id));
    successResponse(res, planPayload(user), 'Plan fetched.');
  } catch (error) {
    next(error);
  }
};

export const startTrial = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (isUserPremium(user)) return successResponse(res, planPayload(user), 'Already on Premium.');
    if (user.trialUsedAt) {
      return errorResponse(res, 'Your free trial has already been used. Join the waitlist for paid Premium.', 400);
    }
    await startLaunchTrial(user);
    successResponse(res, planPayload(user), `${TRIAL_DAYS}-day Premium trial started.`);
  } catch (error) {
    next(error);
  }
};

export const joinPremiumWaitlist = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { premiumWaitlist: true }, { new: true });
    successResponse(res, planPayload(user), 'You are on the Premium waitlist. We will email you when checkout is ready.');
  } catch (error) {
    next(error);
  }
};
