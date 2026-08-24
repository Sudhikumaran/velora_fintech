import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

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
  const acc = await Account.findById(account);
  if (!acc) return;

  if (type === 'income') {
    acc.balance += sign * amount;
    await acc.save();
    return;
  }
  if (type === 'expense') {
    acc.balance -= sign * amount;
    await acc.save();
    return;
  }
  if (type === 'transfer') {
    acc.balance -= sign * amount;
    await acc.save();
    if (toAccount) {
      const to = await Account.findById(toAccount);
      if (to) {
        to.balance += sign * amount;
        await to.save();
      }
    }
  }
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
    afterById[String(tx._id)] = balances[accId] ?? 0;
    if (tx.type === 'income') balances[accId] = (balances[accId] ?? 0) - tx.amount;
    else if (tx.type === 'expense') balances[accId] = (balances[accId] ?? 0) + tx.amount;
    else if (tx.type === 'transfer') {
      balances[accId] = (balances[accId] ?? 0) + tx.amount;
      if (tx.toAccount) {
        const toId = String(tx.toAccount);
        balances[toId] = (balances[toId] ?? 0) - tx.amount;
      }
    }
  }

  return pageTxs.map((tx) => {
    const obj = tx.toObject ? tx.toObject() : { ...tx };
    obj.runningBalance = afterById[String(tx._id)];
    return obj;
  });
}
