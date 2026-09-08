import { errorResponse } from '../utils/apiResponse.js';
import { isUserPremium } from '../utils/plan.js';

export function requirePremium(req, res, next) {
  if (isUserPremium(req.user)) return next();
  return errorResponse(res, 'This is a Premium feature. Start a trial or upgrade in Settings.', 403);
}
