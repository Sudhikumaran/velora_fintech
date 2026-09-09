import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getAccounts = async (req, res, next) => {
  try {
    const { includeArchived } = req.query;
    const filter = { user: req.user._id };
    if (!includeArchived) filter.isArchived = false;

    const accounts = await Account.find(filter).sort({ createdAt: -1 });
    successResponse(res, accounts, 'Accounts fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const { name, type, balance, currency, color, icon, description, creditLimit, upiId } = req.body;

    if (!name || !type) {
      return errorResponse(res, 'Name and type are required.', 400);
    }

    const account = await Account.create({
      user: req.user._id,
      name, type, balance: balance || 0, currency: currency || req.user.currency || 'INR',
      color: color || '#6366f1', icon: icon || 'wallet', description, creditLimit,
      upiId: String(upiId || '').trim(),
    });

    successResponse(res, account, 'Account created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return errorResponse(res, 'Account not found.', 404);

    // Only overwrite what the client actually sent; a partial update should
    // not blank out the fields it left out.
    for (const key of ['name', 'type', 'balance', 'currency', 'color', 'icon', 'description', 'creditLimit', 'upiId']) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) account[key] = req.body[key];
    }
    await account.save();

    successResponse(res, account, 'Account updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return errorResponse(res, 'Account not found.', 404);

    await Account.deleteOne({ _id: req.params.id, user: req.user._id });
    // Transfers reference the account as a destination too — leaving those
    // behind orphans the row and skews the paired account's history.
    await Transaction.deleteMany({
      user: req.user._id,
      $or: [{ account: req.params.id }, { toAccount: req.params.id }],
    });

    successResponse(res, null, 'Account deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const archiveAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return errorResponse(res, 'Account not found.', 404);

    account.isArchived = !account.isArchived;
    await account.save();

    successResponse(res, account, `Account ${account.isArchived ? 'archived' : 'unarchived'} successfully.`);
  } catch (error) {
    next(error);
  }
};

export const getAccountById = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return errorResponse(res, 'Account not found.', 404);
    successResponse(res, account, 'Account fetched successfully.');
  } catch (error) {
    next(error);
  }
};

/** Last N days of end-of-day balances per account, for card sparklines. */
export const getAccountSparklines = async (req, res, next) => {
  try {
    const days = Math.min(60, Math.max(7, parseInt(req.query.days, 10) || 30));
    const userId = req.user._id;
    const accounts = await Account.find({ user: userId, isArchived: false }).select('_id balance');
    if (!accounts.length) return successResponse(res, {}, 'No accounts.');

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const ids = accounts.map((a) => a._id);
    const txs = await Transaction.find({
      user: userId,
      isArchived: false,
      date: { $gte: since },
      $or: [{ account: { $in: ids } }, { toAccount: { $in: ids } }],
    })
      .select('account toAccount type amount date')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const dayKey = (d) => {
      const x = new Date(d);
      return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    };

    // Reverse a txn's effect so we can walk from today's balance back in time.
    const reverseDelta = (tx, accountId) => {
      const amt = Number(tx.amount) || 0;
      const from = String(tx.account);
      const to = tx.toAccount ? String(tx.toAccount) : '';
      const id = String(accountId);
      if (tx.type === 'income' && from === id) return -amt;
      if (tx.type === 'expense' && from === id) return amt;
      if (tx.type === 'transfer') {
        if (from === id) return amt;
        if (to === id) return -amt;
      }
      return 0;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byAccount = {};
    for (const a of accounts) {
      const id = String(a._id);
      const txsFor = txs.filter(
        (t) => String(t.account) === id || (t.toAccount && String(t.toAccount) === id)
      );
      let running = Number(a.balance) || 0;
      let ptr = 0;
      const series = new Array(days);

      for (let offset = 0; offset < days; offset += 1) {
        const day = new Date(today);
        day.setDate(today.getDate() - offset);
        series[days - 1 - offset] = running;
        const key = dayKey(day);
        while (ptr < txsFor.length && dayKey(txsFor[ptr].date) === key) {
          running += reverseDelta(txsFor[ptr], id);
          ptr += 1;
        }
      }
      byAccount[id] = series;
    }

    successResponse(res, byAccount, 'Sparklines fetched.');
  } catch (error) {
    next(error);
  }
};
