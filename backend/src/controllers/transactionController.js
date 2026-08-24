import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';
import { applyBalanceChange, createUserTransaction, attachRunningBalances } from '../utils/money.js';
import { addFrequency, isDueOnOrBefore } from '../utils/recurrence.js';

export const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, type, category, account,
      startDate, endDate, search, includeArchived, sortBy = 'date', sortOrder = 'desc',
    } = req.query;

    const filter = { user: req.user._id };
    if (!includeArchived) filter.isArchived = false;
    if (type) filter.type = type;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (account) filter.account = account;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Transaction.countDocuments(filter);
    const sortDir = sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortDir, createdAt: -1 };
    const transactions = await Transaction.find(filter)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const withBalances = await attachRunningBalances(req.user._id, transactions);
    paginatedResponse(res, withBalances, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const populated = await createUserTransaction(req.user._id, req.body);
    successResponse(res, populated, 'Transaction created successfully.', 201);
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    next(error);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return errorResponse(res, 'Transaction not found.', 404);

    if (!existing.isArchived) {
      await applyBalanceChange({
        account: existing.account,
        toAccount: existing.toAccount,
        type: existing.type,
        amount: existing.amount,
        reverse: true,
      });
    }

    const { account, type, category, subcategory, description, date, tags, notes, receiptUrl, isRecurring, frequency, nextRunDate } = req.body;
    const toAccount = req.body.toAccount || null;
    const splits = Array.isArray(req.body.splits) ? req.body.splits : existing.splits;
    const amount = Array.isArray(req.body.splits) && req.body.splits.length
      ? req.body.splits.reduce((s, x) => s + parseFloat(x.amount || 0), 0)
      : parseFloat(req.body.amount);

    Object.assign(existing, {
      account, toAccount, type, amount, category, subcategory, description, date, tags, notes, receiptUrl,
      splits, isRecurring, frequency, nextRunDate,
    });
    await existing.save();

    await applyBalanceChange({
      account: existing.account,
      toAccount: existing.toAccount,
      type: existing.type,
      amount: existing.amount,
    });

    const populated = await Transaction.findById(existing._id)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon');

    successResponse(res, populated, 'Transaction updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon');
    if (!transaction) return errorResponse(res, 'Transaction not found.', 404);

    const snapshot = transaction.toObject();

    if (!transaction.isArchived) {
      await applyBalanceChange({
        account: transaction.account,
        toAccount: transaction.toAccount,
        type: transaction.type,
        amount: transaction.amount,
        reverse: true,
      });
    }

    await Transaction.deleteOne({ _id: req.params.id });
    successResponse(res, snapshot, 'Transaction deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const archiveTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return errorResponse(res, 'Transaction not found.', 404);

    transaction.isArchived = !transaction.isArchived;
    await transaction.save();

    successResponse(res, transaction, `Transaction ${transaction.isArchived ? 'archived' : 'restored'} successfully.`);
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon');
    if (!transaction) return errorResponse(res, 'Transaction not found.', 404);
    successResponse(res, transaction, 'Transaction fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const importTransactions = async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const defaultAccount = req.body.defaultAccount;
    if (!rows.length) return errorResponse(res, 'No rows to import.', 400);

    const accounts = await Account.find({ user: req.user._id, isArchived: false });
    const byName = Object.fromEntries(accounts.map((a) => [a.name.trim().toLowerCase(), a]));

    const created = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      try {
        const named = row.account ? byName[String(row.account).trim().toLowerCase()] : null;
        const account = named?._id || defaultAccount || accounts[0]?._id;
        if (!account) throw new Error('No account found');
        const type = String(row.type || 'expense').toLowerCase();
        const tx = await createUserTransaction(req.user._id, {
          account,
          toAccount: row.toAccount || null,
          type: ['income', 'expense', 'transfer'].includes(type) ? type : 'expense',
          amount: row.amount,
          category: row.category || (type === 'income' ? 'Other' : 'Other'),
          description: row.description || row.particulars || '',
          date: row.date || Date.now(),
          notes: row.notes || '',
          source: 'import',
        });
        created.push(tx);
      } catch (err) {
        errors.push({ row: i + 1, message: err.message });
      }
    }

    successResponse(res, { imported: created.length, failed: errors.length, errors, data: created }, 'Import finished.');
  } catch (error) {
    next(error);
  }
};

export const postRecurringDue = async (req, res, next) => {
  try {
    const templates = await Transaction.find({
      user: req.user._id,
      isRecurring: true,
      isArchived: false,
      frequency: { $exists: true },
      nextRunDate: { $ne: null },
    });

    const posted = [];
    for (const tpl of templates) {
      let guard = 0;
      while (isDueOnOrBefore(tpl.nextRunDate) && guard < 24) {
        const copy = await createUserTransaction(req.user._id, {
          account: tpl.account,
          toAccount: tpl.toAccount,
          type: tpl.type,
          amount: tpl.amount,
          category: tpl.category,
          description: tpl.description,
          date: tpl.nextRunDate,
          notes: tpl.notes,
          splits: tpl.splits,
          source: 'recurring',
          sourceId: String(tpl._id),
        });
        posted.push(copy);
        tpl.nextRunDate = addFrequency(tpl.nextRunDate, tpl.frequency);
        guard += 1;
      }
      await tpl.save();
    }

    successResponse(res, { posted: posted.length, data: posted }, 'Recurring transactions posted.');
  } catch (error) {
    next(error);
  }
};
