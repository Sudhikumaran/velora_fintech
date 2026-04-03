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
    const { name, type, balance, currency, color, icon, description, creditLimit } = req.body;

    if (!name || !type) {
      return errorResponse(res, 'Name and type are required.', 400);
    }

    const account = await Account.create({
      user: req.user._id,
      name, type, balance: balance || 0, currency: currency || 'USD',
      color: color || '#6366f1', icon: icon || 'wallet', description, creditLimit,
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

    const { name, type, balance, currency, color, icon, description, creditLimit } = req.body;
    Object.assign(account, { name, type, balance, currency, color, icon, description, creditLimit });
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

    await Account.deleteOne({ _id: req.params.id });
    await Transaction.deleteMany({ account: req.params.id, user: req.user._id });

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
