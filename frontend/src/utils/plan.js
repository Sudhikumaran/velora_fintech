import { useAuthStore } from '../store/authStore';

export const FREE_BUDGET_LIMIT = 3;
export const TRIAL_DAYS = 7;
export const PREMIUM_PRICE = '₹99–149/month or ₹799–999/year';

export const FREE_FEATURES = [
  'Unlimited accounts and manual transactions',
  'Splits and don’t-count-as-income / spending',
  '3 budgets',
  'Debts, calendar, PIN lock',
  'Print monthly reports',
  'Dashboard income vs expenses',
];

export const PREMIUM_FEATURES = [
  'Android after-pay capture (overlay, bubble, share + OCR)',
  'Net worth, spend-check, weekly digest, what-if',
  'Unlimited budgets',
  'Income planner',
  'Household shared net worth',
  'CA monthly CSV',
];

export function isUserPremium(user) {
  if (!user) return false;
  if (user.isPremium === true && (!user.planExpiresAt || new Date(user.planExpiresAt).getTime() > Date.now())) {
    return true;
  }
  if (user.plan !== 'premium') return false;
  if (!user.planExpiresAt) return true;
  return new Date(user.planExpiresAt).getTime() > Date.now();
}

export function trialDaysLeft(user) {
  if (!isUserPremium(user) || !user?.planExpiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000));
}

export function usePlan() {
  const user = useAuthStore((s) => s.user);
  const premium = isUserPremium(user);
  const daysLeft = trialDaysLeft(user);
  return {
    user,
    isPremium: premium,
    isTrial: Boolean(user?.isTrial) || (premium && Boolean(user?.trialUsed) && daysLeft > 0 && daysLeft <= TRIAL_DAYS),
    trialUsed: Boolean(user?.trialUsed),
    waitlist: Boolean(user?.premiumWaitlist),
    expiresAt: user?.planExpiresAt || null,
    daysLeft,
    maxBudgets: premium ? Infinity : FREE_BUDGET_LIMIT,
  };
}
