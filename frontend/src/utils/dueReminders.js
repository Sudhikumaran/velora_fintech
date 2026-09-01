import PaymentCapture from '../plugins/paymentCapture';
import { isNativeApp } from './native';
import { useSubscriptionStore, useDebtStore } from '../store/financeStore';
import { getDaysUntilDue } from './debtHelpers';

const SEEN_KEY = 'velora_due_notified';

function seenMap() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch { return {}; }
}

function markSeen(id) {
  const map = seenMap();
  map[id] = Date.now();
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
}

function daysUntil(date) {
  if (!date) return null;
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export async function checkDueReminders() {
  try {
    await Promise.all([
      useSubscriptionStore.getState().fetchSubscriptions(),
      useDebtStore.getState().fetchDebts(),
    ]);
  } catch { /* offline */ }

  const seen = seenMap();
  const items = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const sub of useSubscriptionStore.getState().subscriptions || []) {
    if (sub.status !== 'active') continue;
    const days = daysUntil(sub.nextBillingDate);
    const window = Number(sub.remindBefore) || 3;
    if (days == null || days < 0 || days > window) continue;
    const id = `sub:${sub._id}:${today}`;
    if (seen[id]) continue;
    markSeen(id);
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    items.push({
      id,
      title: `${sub.name} is due ${when}`,
      text: `₹${Number(sub.amount || 0).toLocaleString('en-IN')} · ${sub.category || 'Subscription'}`,
    });
  }

  for (const debt of useDebtStore.getState().debts || []) {
    if (debt.status === 'paid') continue;
    const days = getDaysUntilDue(debt);
    if (days == null || days < 0 || days > 3) continue;
    const id = `debt:${debt._id}:${today}`;
    if (seen[id]) continue;
    markSeen(id);
    const title = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    items.push({
      id,
      title: `${debt.person || 'Debt'} due ${title}`,
      text: debt.isEMI ? `EMI ₹${Number(debt.emiAmount || 0).toLocaleString('en-IN')}` : `₹${Number(debt.remainingAmount || debt.amount || 0).toLocaleString('en-IN')}`,
    });
  }

  if (!items.length || !isNativeApp()) return items;
  try { await PaymentCapture.showDueNotices({ items: items.slice(0, 5) }); } catch { /* old APK */ }
  return items;
}
