export const FREE_BUDGET_LIMIT = 3;
export const TRIAL_DAYS = 7;

export function isUserPremium(user) {
  if (!user) return false;
  if (user.plan !== 'premium') return false;
  if (!user.planExpiresAt) return true;
  return new Date(user.planExpiresAt).getTime() > Date.now();
}

export function planPayload(user) {
  const premium = isUserPremium(user);
  const expires = user.planExpiresAt ? new Date(user.planExpiresAt) : null;
  const trial = Boolean(user.trialUsedAt) && premium && expires
    && (expires.getTime() - Date.now()) <= TRIAL_DAYS * 86400000;
  return {
    plan: premium ? 'premium' : 'free',
    isPremium: premium,
    isTrial: trial,
    planExpiresAt: user.planExpiresAt || null,
    trialUsed: Boolean(user.trialUsedAt),
    premiumWaitlist: Boolean(user.premiumWaitlist),
    maxBudgets: premium ? null : FREE_BUDGET_LIMIT,
  };
}

export async function startLaunchTrial(user) {
  if (!user || user.trialUsedAt || isUserPremium(user)) return user;
  user.plan = 'premium';
  user.planExpiresAt = new Date(Date.now() + TRIAL_DAYS * 86400000);
  user.trialUsedAt = new Date();
  await user.save();
  return user;
}
