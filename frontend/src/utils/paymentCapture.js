import { App } from '@capacitor/app';
import { isNativeApp } from './native';
import PaymentCapture from '../plugins/paymentCapture';
import { parsePaymentNotification, matchAccountId, matchToAccount } from './paymentAlertParser';
import { useAccountStore } from '../store/accountStore';
import { usePaymentReviewStore } from '../store/paymentReviewStore';
import { useTransactionStore } from '../store/transactionStore';
import { recallMerchantCategory, rememberMerchantCategory, syncMerchantMemory } from './merchantMemory';
import { bumpTodaySpend } from './todaySpend';
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

function alreadySeen(fp) {
  const seen = JSON.parse(localStorage.getItem('velora_pay_seen') || '[]');
  return seen.includes(fp);
}

function markSeen(fp) {
  const seen = JSON.parse(localStorage.getItem('velora_pay_seen') || '[]');
  if (seen.includes(fp)) return;
  seen.push(fp);
  localStorage.setItem('velora_pay_seen', JSON.stringify(seen.slice(-400)));
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
  if (!isAutoPayEnabled() || !notes.length) return 0;
  const drop = [];
  let queued = 0;
  for (const note of notes) {
    const parsed = parsePaymentNotification(note);
    if (!parsed) {
      if (note?.id) drop.push(note.id);
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
  if (!isNativeApp() || !isAutoPayEnabled()) return 0;
  try {
    const { notifications } = await PaymentCapture.getPending();
    return ingestNotifications(notifications || []);
  } catch {
    return 0;
  }
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

  if (action === 'save' && item) {
    const category = launch.category || item.rememberedCategory || item.suggestedCategory;
    if (!category) {
      store.openAt(item.sourceId);
      return;
    }
    const created = await useTransactionStore.getState().createTransaction({
      account: item.accountId,
      toAccount: item.toAccountId || undefined,
      type: item.type,
      amount: item.amount,
      category: item.type === 'transfer' ? 'Transfer' : category,
      description: item.description,
      date: item.date,
      notes: item.notes,
      source: item.source || 'import',
      sourceId: item.sourceId,
    }, { silent: true });
    if (created && !created.skipped) {
      await rememberMerchantCategory(item.merchant || item.description, category);
      if (item.type === 'expense') bumpTodaySpend(item.amount);
      toast.success(`Saved ${category}`);
    }
    await finishPaymentReview(item.sourceId, item.noteId);
    store.removeBySourceId(item.sourceId);
    useAccountStore.getState().fetchAccounts();
    return;
  }

  if (item) store.openAt(item.sourceId);
}

export async function startPaymentAutoCapture() {
  if (!isNativeApp() || started) return;
  started = true;
  syncMerchantMemory();

  try {
    listenerHandle = await PaymentCapture.addListener('paymentNotification', async (note) => {
      if (!isAutoPayEnabled()) return;
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
    if (granted) {
      await PaymentCapture.scanRecentSms();
      await flushPendingPayments();
    }
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
