import { App } from '@capacitor/app';
import { isNativeApp } from './native';
import PaymentCapture from '../plugins/paymentCapture';
import { parsePaymentNotification, matchAccountId, matchToAccount } from './paymentAlertParser';
import { useAccountStore } from '../store/accountStore';
import { usePaymentReviewStore } from '../store/paymentReviewStore';
import { recallMerchantCategory, syncMerchantMemory } from './merchantMemory';
import toast from 'react-hot-toast';

export const AUTO_PAY_ENABLED_KEY = 'velora_auto_payments';
export const AUTO_PAY_ACCOUNT_KEY = 'velora_auto_pay_account';

export function isAutoPayEnabled() {
  return localStorage.getItem(AUTO_PAY_ENABLED_KEY) === '1';
}

export function setAutoPayEnabled(on) {
  localStorage.setItem(AUTO_PAY_ENABLED_KEY, on ? '1' : '0');
}

export function getAutoPayAccountId() {
  return localStorage.getItem(AUTO_PAY_ACCOUNT_KEY) || '';
}

export function setAutoPayAccountId(id) {
  localStorage.setItem(AUTO_PAY_ACCOUNT_KEY, id || '');
}

let started = false;
let listenerHandle = null;
let appHandle = null;

const SEEN_KEY = 'velora_pay_seen_v2';

function alreadySeen(fp) {
  const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  return seen.includes(fp);
}

function markSeen(fp) {
  const seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  if (seen.includes(fp)) return;
  seen.push(fp);
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen.slice(-400)));
}

export function queueForReview(parsed, rawText, noteId) {
  if (alreadySeen(parsed.sourceId)) return true;
  const accounts = useAccountStore.getState().accounts;
  const accountId = parsed.accountId || matchAccountId(accounts, rawText, getAutoPayAccountId());
  const merchant = parsed.merchant || '';
  const remembered = recallMerchantCategory(merchant || parsed.description);
  const toAccountId = parsed.type === 'income' ? '' : matchToAccount(accounts, merchant, accountId);
  const isTransfer = Boolean(toAccountId && accountId && toAccountId !== accountId);

  usePaymentReviewStore.getState().enqueue({
    noteId: noteId || parsed.id,
    sourceId: parsed.sourceId,
    type: isTransfer ? 'transfer' : parsed.type,
    amount: parsed.amount,
    merchant,
    description: isTransfer
      ? `Transfer to ${accounts.find((a) => a._id === toAccountId)?.name || 'account'}`
      : parsed.description,
    date: parsed.date,
    notes: parsed.notes,
    source: parsed.source,
    accountId,
    toAccountId: isTransfer ? toAccountId : '',
    suggestedCategory: remembered || parsed.category,
    rememberedCategory: remembered,
  });
  toast('Review this payment, then save');
  return false;
}

async function dropNative(ids) {
  const clean = ids.filter(Boolean);
  if (!clean.length) return;
  try { await PaymentCapture.removeByIds({ ids: clean }); } catch { /* ignore */ }
}

export async function finishPaymentReview(sourceId, noteId) {
  if (sourceId) markSeen(sourceId);
  await dropNative([noteId]);
}

export async function ingestNotifications(notes = []) {
  if (!notes.length) return 0;
  if (!isAutoPayEnabled()) {
    setAutoPayEnabled(true);
  }
  const drop = [];
  let queued = 0;
  for (const note of notes) {
    const parsed = parsePaymentNotification(note);
    if (!parsed) {
      const blob = `${note?.title || ''} ${note?.text || ''} ${note?.bigText || ''}`;
      if (note?.id && /otp|verification code|failed|declined/i.test(blob) && !/debited|paid|upi/i.test(blob)) {
        drop.push(note.id);
      }
      continue;
    }
    if (alreadySeen(parsed.sourceId)) {
      if (note?.id) drop.push(note.id);
      continue;
    }
    const rawText = `${note.title || ''} ${note.text || ''} ${note.bigText || ''}`;
    queueForReview(parsed, rawText, note.id);
    queued += 1;
  }
  await dropNative(drop);
  return queued;
}

export async function flushPendingPayments() {
  if (!isNativeApp()) return 0;
  try { await PaymentCapture.scanRecentSms(); } catch { /* no SMS permission */ }
  try {
    const { notifications } = await PaymentCapture.getPending();
    return ingestNotifications(notifications || []);
  } catch {
    return 0;
  }
}

export function openTestPaymentReview() {
  const now = Date.now();
  queueForReview({
    id: `test-${now}`,
    sourceId: `pay:test|${now}`,
    type: 'expense',
    amount: 50,
    merchant: 'Test merchant',
    category: 'Food & Dining',
    description: 'Paid to Test merchant',
    date: new Date().toISOString(),
    notes: 'Test popup',
    source: 'import',
    rememberedCategory: 'Food & Dining',
  }, 'test', `test-${now}`);
}

async function applyLaunchAction() {
  if (!isNativeApp()) return;
  let launch = null;
  try { launch = await PaymentCapture.consumeLaunchAction(); } catch { return; }
  const action = launch?.action;
  if (!action) return;

  await flushPendingPayments();
  const noteId = launch.noteId || '';
  const store = usePaymentReviewStore.getState();
  const item = store.queue.find((row) => row.noteId === noteId || row.sourceId === noteId) || store.queue[0];

  if (action === 'skip' && item) {
    await finishPaymentReview(item.sourceId, item.noteId);
    store.removeBySourceId(item.sourceId);
    toast('Payment skipped');
    return;
  }

  if (item) {
    store.openAt(item.sourceId);
    toast('Review this payment, then save');
  }
}

export async function startPaymentAutoCapture() {
  if (!isNativeApp() || started) return;
  started = true;
  syncMerchantMemory();

  try {
    listenerHandle = await PaymentCapture.addListener('paymentNotification', async (note) => {
      await ingestNotifications([note]);
    });
  } catch { /* plugin missing on old APK */ }

  try {
    appHandle = await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        applyLaunchAction();
        flushPendingPayments();
      }
    });
  } catch { /* web */ }

  await applyLaunchAction();
  flushPendingPayments();
}

export async function enableBankSmsCapture() {
  if (!isNativeApp()) return false;
  try {
    try { await PaymentCapture.requestNotifyPermission(); } catch { /* older Android */ }
    const { granted } = await PaymentCapture.requestSmsPermission();
    return !!granted;
  } catch {
    return false;
  }
}

export async function stopPaymentAutoCapture() {
  started = false;
  try { await listenerHandle?.remove(); } catch { /* ignore */ }
  try { await appHandle?.remove(); } catch { /* ignore */ }
  listenerHandle = null;
  appHandle = null;
}

export async function skipAllWaitingPayments() {
  const { queue, clearAll } = usePaymentReviewStore.getState();
  for (const item of queue) {
    await finishPaymentReview(item.sourceId, item.noteId);
  }
  clearAll();
}
