import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

function idOf(ref) {
  if (!ref) return null;
  return String(ref._id || ref);
}

/** Net change to an asset-style account balance from one transaction. */
function netEffect(tx, accountId) {
  const accId = idOf(tx.account);
  const toId = idOf(tx.toAccount);
  if (tx.type === 'income' && accId === accountId) return tx.amount;
  if (tx.type === 'expense' && accId === accountId) return -tx.amount;
  if (tx.type === 'transfer') {
    if (accId === accountId) return -tx.amount;
    if (toId === accountId) return tx.amount;
  }
  return 0;
}

function debitCredit(net) {
  if (net > 0) return { debit: net, credit: 0 };
  if (net < 0) return { debit: 0, credit: Math.abs(net) };
  return { debit: 0, credit: 0 };
}

function parseRange(startDate, endDate) {
  let start = null;
  let end = null;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  }
  if (endDate) {
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  }
  return { start, end };
}

function inRange(date, start, end) {
  const d = new Date(date);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

function matchesSearch(tx, search) {
  if (!search) return true;
  const q = search.toLowerCase();
  return [tx.description, tx.category, tx.notes, tx.account?.name, tx.toAccount?.name]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(q));
}

function serializeAccount(account) {
  return {
    _id: account._id,
    name: account.name,
    type: account.type,
    color: account.color,
    icon: account.icon,
    currency: account.currency,
    balance: account.balance,
  };
}

function contraFor(tx, accountId) {
  if (tx.type === 'transfer') {
    const accId = idOf(tx.account);
    if (accId === accountId) return tx.toAccount?.name || 'Transfer';
    return tx.account?.name || 'Transfer';
  }
  return tx.category || tx.type;
}

function particularFor(tx) {
  return tx.description || tx.category || tx.type;
}

async function loadLedgerData(userId, includeArchived = false) {
  const accountFilter = { user: userId };
  if (!includeArchived) accountFilter.isArchived = false;

  const [accounts, transactions] = await Promise.all([
    Account.find(accountFilter).sort({ name: 1 }),
    Transaction.find({ user: userId, isArchived: false })
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .sort({ date: 1, createdAt: 1 })
      .limit(8000),
  ]);

  return { accounts, transactions };
}

function buildAccountLedger(account, transactions, start, end, search) {
  const accountId = String(account._id);

  const periodTxs = transactions.filter((tx) => inRange(tx.date, start, end) && netEffect(tx, accountId) !== 0);
  const fromStartTxs = transactions.filter((tx) => {
    if (start && new Date(tx.date) < start) return false;
    return netEffect(tx, accountId) !== 0;
  });

  const netFromStart = fromStartTxs.reduce((s, tx) => s + netEffect(tx, accountId), 0);
  const openingBalance = account.balance - netFromStart;

  let running = openingBalance;
  const entries = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const tx of periodTxs) {
    const net = netEffect(tx, accountId);
    const { debit, credit } = debitCredit(net);
    running += net;
    totalDebit += debit;
    totalCredit += credit;

    const row = {
      _id: tx._id,
      date: tx.date,
      type: tx.type,
      category: tx.category,
      description: particularFor(tx),
      notes: tx.notes || '',
      contra: contraFor(tx, accountId),
      debit,
      credit,
      balance: running,
      account: tx.account,
      toAccount: tx.toAccount,
    };

    if (matchesSearch(tx, search)) entries.push(row);
  }

  return {
    view: 'ledger',
    account: serializeAccount(account),
    openingBalance,
    closingBalance: running,
    totalDebit,
    totalCredit,
    entryCount: periodTxs.length,
    entries,
  };
}

function buildTrialBalance(accounts, transactions, start, end) {
  const rows = accounts.map((account) => {
    const ledger = buildAccountLedger(account, transactions, start, end, '');
    return {
      account: serializeAccount(account),
      openingBalance: ledger.openingBalance,
      totalDebit: ledger.totalDebit,
      totalCredit: ledger.totalCredit,
      closingBalance: ledger.closingBalance,
      entryCount: ledger.entryCount,
    };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.opening += row.openingBalance;
      acc.debit += row.totalDebit;
      acc.credit += row.totalCredit;
      acc.closing += row.closingBalance;
      acc.entries += row.entryCount;
      return acc;
    },
    { opening: 0, debit: 0, credit: 0, closing: 0, entries: 0 }
  );

  return { view: 'trial-balance', accounts: rows, totals };
}

function buildJournal(transactions, start, end, search) {
  const periodTxs = transactions.filter((tx) => inRange(tx.date, start, end) && matchesSearch(tx, search));
  const entries = [];

  for (const tx of periodTxs) {
    const base = {
      _id: tx._id,
      date: tx.date,
      type: tx.type,
      category: tx.category,
      description: particularFor(tx),
      notes: tx.notes || '',
      amount: tx.amount,
    };

    if (tx.type === 'income') {
      entries.push({
        ...base,
        line: 'debit',
        accountName: tx.account?.name || 'Account',
        accountType: tx.account?.type,
        contra: tx.category || 'Income',
        debit: tx.amount,
        credit: 0,
      });
      entries.push({
        ...base,
        line: 'credit',
        accountName: tx.category || 'Income',
        accountType: 'income',
        contra: tx.account?.name || 'Account',
        debit: 0,
        credit: tx.amount,
      });
    } else if (tx.type === 'expense') {
      entries.push({
        ...base,
        line: 'debit',
        accountName: tx.category || 'Expense',
        accountType: 'expense',
        contra: tx.account?.name || 'Account',
        debit: tx.amount,
        credit: 0,
      });
      entries.push({
        ...base,
        line: 'credit',
        accountName: tx.account?.name || 'Account',
        accountType: tx.account?.type,
        contra: tx.category || 'Expense',
        debit: 0,
        credit: tx.amount,
      });
    } else if (tx.type === 'transfer') {
      entries.push({
        ...base,
        line: 'debit',
        accountName: tx.toAccount?.name || 'To account',
        accountType: tx.toAccount?.type,
        contra: tx.account?.name || 'From account',
        debit: tx.amount,
        credit: 0,
      });
      entries.push({
        ...base,
        line: 'credit',
        accountName: tx.account?.name || 'From account',
        accountType: tx.account?.type,
        contra: tx.toAccount?.name || 'To account',
        debit: 0,
        credit: tx.amount,
      });
    }
  }

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  return {
    view: 'journal',
    entries,
    voucherCount: periodTxs.length,
    totalDebit,
    totalCredit,
  };
}

export const getLedger = async (req, res, next) => {
  try {
    const { account, startDate, endDate, search, view = 'trial-balance' } = req.query;
    const { start, end } = parseRange(startDate, endDate);
    const { accounts, transactions } = await loadLedgerData(req.user._id);

    if (view === 'journal') {
      return successResponse(res, buildJournal(transactions, start, end, search), 'Journal fetched successfully.');
    }

    if (account) {
      const accountDoc = accounts.find((a) => String(a._id) === String(account));
      if (!accountDoc) return errorResponse(res, 'Account not found.', 404);
      return successResponse(
        res,
        buildAccountLedger(accountDoc, transactions, start, end, search),
        'Ledger fetched successfully.'
      );
    }

    return successResponse(
      res,
      buildTrialBalance(accounts, transactions, start, end),
      'Trial balance fetched successfully.'
    );
  } catch (error) {
    next(error);
  }
};
