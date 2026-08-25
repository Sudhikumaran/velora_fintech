import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Subscription from '../models/Subscription.js';
import { addFrequency, isDueOnOrBefore } from './recurrence.js';

export function normalizeSplits(splits) {
  if (!Array.isArray(splits)) return [];
  return splits
    .map((s) => ({
      category: String(s.category || '').trim(),
      amount: parseFloat(s.amount),
      notes: s.notes || '',
    }))
    .filter((s) => s.category && Number.isFinite(s.amount) && s.amount > 0);
}

export async function applyBalanceChange({ account, toAccount, type, amount, reverse = false }) {
  const sign = reverse ? -1 : 1;
  const delta = Number(amount);
  if (!Number.isFinite(delta)) return;

  const acc = await Account.findById(account);
  if (!acc) return;

  if (type === 'income') {
    acc.balance += sign * delta;
    await acc.save();
    return;
  }
  if (type === 'expense') {
    acc.balance -= sign * delta;
    await acc.save();
    return;
  }
  if (type === 'transfer') {
    acc.balance -= sign * delta;
    await acc.save();
    if (toAccount) {
      const to = await Account.findById(toAccount);
      if (to) {
        to.balance += sign * delta;
        await to.save();
      }
    }
  }
}

function dayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isSameCalendarDay(a, b) {
  if (!a || !b) return false;
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

export async function alreadyPostedSource(userId, source, sourceId, date) {
  if (!sourceId || !date) return false;
  const { start, end } = dayRange(date);
  const found = await Transaction.findOne({
    user: userId,
    source,
    sourceId: String(sourceId),
    date: { $gte: start, $lte: end },
    isArchived: false,
  }).select('_id');
  return Boolean(found);
}

export async function createUserTransaction(userId, payload) {
  const splits = normalizeSplits(payload.splits);
  const amount = splits.length
    ? splits.reduce((s, x) => s + x.amount, 0)
    : parseFloat(payload.amount);

  const type = payload.type;
  const category = payload.category || (type === 'transfer' ? 'Transfer' : splits[0]?.category);
  if (!payload.account || !type || !amount || !category) {
    throw Object.assign(new Error('Account, type, amount and category are required.'), { status: 400 });
  }

  const accountDoc = await Account.findOne({ _id: payload.account, user: userId });
  if (!accountDoc) {
    throw Object.assign(new Error('Account not found.'), { status: 404 });
  }

  if (type === 'transfer' && payload.toAccount) {
    const toAccountDoc = await Account.findOne({ _id: payload.toAccount, user: userId });
    if (!toAccountDoc) {
      throw Object.assign(new Error('Destination account not found.'), { status: 404 });
    }
  }

  const transaction = await Transaction.create({
    user: userId,
    account: payload.account,
    toAccount: payload.toAccount || null,
    type,
    amount,
    category,
    subcategory: payload.subcategory,
    description: payload.description,
    date: payload.date || Date.now(),
    tags: payload.tags,
    notes: payload.notes,
    isRecurring: Boolean(payload.isRecurring),
    frequency: payload.frequency || undefined,
    nextRunDate: payload.nextRunDate || undefined,
    receiptUrl: payload.receiptUrl || '',
    splits,
    source: payload.source || 'manual',
    sourceId: payload.sourceId || undefined,
    recurringId: payload.recurringId || undefined,
  });

  await applyBalanceChange({
    account: transaction.account,
    toAccount: transaction.toAccount,
    type: transaction.type,
    amount: transaction.amount,
  });

  return Transaction.findById(transaction._id)
    .populate('account', 'name type color icon')
    .populate('toAccount', 'name type color icon');
}

export async function attachRunningBalances(userId, pageTxs) {
  if (!pageTxs?.length) return pageTxs;
  const accounts = await Account.find({ user: userId }).select('_id balance');
  const balances = Object.fromEntries(accounts.map((a) => [String(a._id), a.balance]));

  const allTxs = await Transaction.find({ user: userId, isArchived: false })
    .select('account toAccount type amount date createdAt')
    .sort({ date: -1, createdAt: -1 });

  const afterById = {};
  for (const tx of allTxs) {
    const accId = String(tx.account);
    const amt = Number(tx.amount);
    afterById[String(tx._id)] = balances[accId] ?? 0;
    if (tx.type === 'income') balances[accId] = (balances[accId] ?? 0) - amt;
    else if (tx.type === 'expense') balances[accId] = (balances[accId] ?? 0) + amt;
    else if (tx.type === 'transfer') {
      balances[accId] = (balances[accId] ?? 0) + amt;
      if (tx.toAccount) {
        const toId = String(tx.toAccount);
        balances[toId] = (balances[toId] ?? 0) - amt;
      }
    }
  }

  return pageTxs.map((tx) => {
    const obj = tx.toObject ? tx.toObject() : { ...tx };
    obj.runningBalance = afterById[String(tx._id)];
    return obj;
  });
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Remove extra auto-posted copies (recurring/subscription) created after the
 * 24 Aug 2026 auto-post bug, plus same-day duplicates, and put the money back.
 */
export async function repairAutoPostedTransactions(userId) {
  const cutoff = new Date('2026-08-23T18:30:00.000Z');
  const toRemove = new Map();

  const auto = await Transaction.find({
    user: userId,
    isArchived: false,
    source: { $in: ['recurring', 'subscription'] },
  }).sort({ createdAt: 1 });

  const groups = new Map();
  for (const tx of auto) {
    const key = `${tx.source}|${tx.sourceId || ''}|${dayKey(tx.date)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tx);
  }
  for (const list of groups.values()) {
    list.slice(1).forEach((tx) => toRemove.set(String(tx._id), tx));
  }

  const templates = await Transaction.find({
    user: userId,
    isRecurring: true,
    isArchived: false,
  }).select('_id date nextRunDate frequency');

  const templateById = Object.fromEntries(templates.map((t) => [String(t._id), t]));
  for (const tx of auto) {
    if (tx.source !== 'recurring' || !tx.sourceId) continue;
    const tpl = templateById[String(tx.sourceId)];
    if (tpl && isSameCalendarDay(tpl.date, tx.date)) toRemove.set(String(tx._id), tx);
  }

  for (const tx of auto) {
    if (tx.createdAt && tx.createdAt >= cutoff) toRemove.set(String(tx._id), tx);
  }

  let removed = 0;
  const balanceInc = new Map();
  const bump = (id, delta) => {
    if (!id || !Number.isFinite(delta) || delta === 0) return;
    const key = String(id);
    balanceInc.set(key, (balanceInc.get(key) || 0) + delta);
  };
  for (const tx of toRemove.values()) {
    const amt = Number(tx.amount);
    if (!Number.isFinite(amt)) continue;
    if (tx.type === 'income') bump(tx.account, -amt);
    else if (tx.type === 'expense') bump(tx.account, amt);
    else if (tx.type === 'transfer') {
      bump(tx.account, amt);
      bump(tx.toAccount, -amt);
    }
  }
  for (const [accountId, delta] of balanceInc) {
    await Account.updateOne({ _id: accountId }, { $inc: { balance: delta } });
  }
  const ids = [...toRemove.keys()];
  if (ids.length) {
    const del = await Transaction.deleteMany({ _id: { $in: ids }, user: userId });
    removed = del.deletedCount || 0;
  }

  for (const tpl of templates) {
    if (!tpl.frequency) continue;
    const start = tpl.date || tpl.nextRunDate;
    if (!start) continue;
    let next = new Date(start);
    let guard = 0;
    while (isDueOnOrBefore(next) && guard < 120) {
      next = addFrequency(next, tpl.frequency);
      guard += 1;
    }
    tpl.nextRunDate = next;
    await tpl.save();
  }

  const subs = await Subscription.find({ user: userId, status: 'active' });
  const cutoffMs = cutoff.getTime();
  for (const sub of subs) {
    const start = sub.startDate || sub.nextBillingDate;
    if (start && sub.frequency) {
      let next = new Date(start);
      let guard = 0;
      while (isDueOnOrBefore(next) && guard < 120) {
        next = addFrequency(next, sub.frequency);
        guard += 1;
      }
      sub.nextBillingDate = next;
    }
    if (sub.lastPostedDate && sub.lastPostedDate.getTime() >= cutoffMs) {
      sub.lastPostedDate = null;
    }
    await sub.save();
  }

  const accounts = await Account.find({ user: userId, isArchived: false }).select('name balance type');
  return {
    removed,
    accounts: accounts.map((a) => ({ name: a.name, balance: a.balance, type: a.type })),
  };
}
