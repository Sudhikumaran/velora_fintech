import PaymentCapture from '../plugins/paymentCapture';
import { isNativeApp } from './native';

const KEY = 'velora_today_spend';

function dayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function getTodaySpend() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw.day === dayStamp() ? Number(raw.total) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setTodaySpend(total) {
  const value = Math.max(0, Number(total) || 0);
  localStorage.setItem(KEY, JSON.stringify({ day: dayStamp(), total: value }));
  if (!isNativeApp()) return;
  try {
    await PaymentCapture.updateTodaySpend({
      amount: value,
      label: 'Today',
    });
  } catch { /* old APK */ }
}

export async function bumpTodaySpend(delta) {
  await setTodaySpend(getTodaySpend() + (Number(delta) || 0));
}

export async function refreshTodaySpendFromTransactions(transactions = []) {
  const today = dayStamp();
  const spent = (transactions || [])
    .filter((t) => t.type === 'expense' && String(t.date || '').slice(0, 10) === today)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  await setTodaySpend(spent);
}
