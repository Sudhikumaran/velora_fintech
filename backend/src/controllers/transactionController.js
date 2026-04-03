import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';

const updateAccountBalance = async (accountId, amount, type, direction = 'add') => {
  const account = await Account.findById(accountId);
  if (!account) return;
  if (direction === 'add') {
    account.balance += type === 'income' ? amount : -amount;
  } else {
    account.balance += type === 'income' ? -amount : amount;
  }
  await account.save();
};

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
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Transaction.countDocuments(filter);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    const transactions = await Transaction.find(filter)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    paginatedResponse(res, transactions, total, page, limit);
  } catch (error) {
    next(error);
  }
};

export const createTransaction = async (req, res, next) => {
  try {
    const { account, type, amount, category, subcategory, description, date, tags, notes, isRecurring, receiptUrl } = req.body;
    const toAccount = req.body.toAccount || null;

    if (!account || !type || !amount || !category) {
      return errorResponse(res, 'Account, type, amount and category are required.', 400);
    }

    const accountDoc = await Account.findOne({ _id: account, user: req.user._id });
    if (!accountDoc) return errorResponse(res, 'Account not found.', 404);

    const transaction = await Transaction.create({
      user: req.user._id,
      account, toAccount, type, amount, category, subcategory,
      description, date: date || Date.now(), tags, notes, isRecurring, receiptUrl,
    });

    // Update account balances
    if (type === 'income') {
      accountDoc.balance += amount;
      await accountDoc.save();
    } else if (type === 'expense') {
      accountDoc.balance -= amount;
      await accountDoc.save();
    } else if (type === 'transfer' && toAccount) {
      accountDoc.balance -= amount;
      await accountDoc.save();
      const toAccountDoc = await Account.findOne({ _id: toAccount, user: req.user._id });
      if (toAccountDoc) {
        toAccountDoc.balance += amount;
        await toAccountDoc.save();
      }
    }

    const populated = await Transaction.findById(transaction._id)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon');

    successResponse(res, populated, 'Transaction created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!existing) return errorResponse(res, 'Transaction not found.', 404);

    // Reverse old balance change
    const oldAccount = await Account.findById(existing.account);
    if (oldAccount && !existing.isArchived) {
      if (existing.type === 'income') oldAccount.balance -= existing.amount;
      else if (existing.type === 'expense') oldAccount.balance += existing.amount;
      else if (existing.type === 'transfer') {
        oldAccount.balance += existing.amount;
        if (existing.toAccount) {
          const oldToAccount = await Account.findById(existing.toAccount);
          if (oldToAccount) { oldToAccount.balance -= existing.amount; await oldToAccount.save(); }
        }
      }
      await oldAccount.save();
    }

    const { account, type, amount, category, subcategory, description, date, tags, notes, receiptUrl } = req.body;
    const toAccount = req.body.toAccount || null;
    Object.assign(existing, { account, toAccount, type, amount, category, subcategory, description, date, tags, notes, receiptUrl });
    await existing.save();

    // Apply new balance change
    const newAccount = await Account.findById(existing.account);
    if (newAccount) {
      if (existing.type === 'income') newAccount.balance += existing.amount;
      else if (existing.type === 'expense') newAccount.balance -= existing.amount;
      else if (existing.type === 'transfer') {
        newAccount.balance -= existing.amount;
        if (existing.toAccount) {
          const newToAccount = await Account.findById(existing.toAccount);
          if (newToAccount) { newToAccount.balance += existing.amount; await newToAccount.save(); }
        }
      }
      await newAccount.save();
    }

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
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) return errorResponse(res, 'Transaction not found.', 404);

    // Reverse balance
    if (!transaction.isArchived) {
      const account = await Account.findById(transaction.account);
      if (account) {
        if (transaction.type === 'income') account.balance -= transaction.amount;
        else if (transaction.type === 'expense') account.balance += transaction.amount;
        else if (transaction.type === 'transfer') {
          account.balance += transaction.amount;
          if (transaction.toAccount) {
            const toAccount = await Account.findById(transaction.toAccount);
            if (toAccount) { toAccount.balance -= transaction.amount; await toAccount.save(); }
          }
        }
        await account.save();
      }
    }

    await Transaction.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Transaction deleted successfully.');
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
