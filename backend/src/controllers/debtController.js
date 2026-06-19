import Debt from '../models/Debt.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sortDebtsByDueDate } from '../utils/debtHelpers.js';

export const getDebts = async (req, res, next) => {
  try {
    const { status, type, category } = req.query;
    const filter = { user: req.user._id };

    if (category === 'closed') {
      filter.status = 'paid';
    } else if (category === 'active') {
      filter.status = { $ne: 'paid' };
    } else if (status) {
      filter.status = status;
    }

    if (type) filter.type = type;

    let debts = await Debt.find(filter);
    debts = sortDebtsByDueDate(debts, { closedFirst: category === 'closed' });

    successResponse(res, debts, 'Debts fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createDebt = async (req, res, next) => {
  try {
    const { type, person, description, dueDate, interestRate, account,
            isEMI, emiAmount, emiDay, emiStartDate, tenure } = req.body;
    const amount = parseFloat(req.body.amount);

    if (!type || !amount || !person) {
      return errorResponse(res, 'Type, amount and person are required.', 400);
    }

    const debt = await Debt.create({
      user: req.user._id,
      type, amount, person, description, dueDate,
      interestRate: interestRate || 0, account,
      remainingAmount: amount,
      isEMI: !!isEMI,
      emiAmount: emiAmount ? parseFloat(emiAmount) : undefined,
      emiDay: emiDay ? parseInt(emiDay) : undefined,
      emiStartDate: emiStartDate || undefined,
      tenure: tenure ? parseInt(tenure) : undefined,
    });

    successResponse(res, debt, 'Debt recorded successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateDebt = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user._id });
    if (!debt) return errorResponse(res, 'Debt not found.', 404);

    const { type, person, description, dueDate, interestRate, account,
            isEMI, emiAmount, emiDay, emiStartDate, tenure } = req.body;
    const amount = parseFloat(req.body.amount);
    Object.assign(debt, {
      type, amount, person, description, dueDate, interestRate, account,
      isEMI: !!isEMI,
      emiAmount: emiAmount ? parseFloat(emiAmount) : debt.emiAmount,
      emiDay: emiDay ? parseInt(emiDay) : debt.emiDay,
      emiStartDate: emiStartDate || debt.emiStartDate,
      tenure: tenure ? parseInt(tenure) : debt.tenure,
    });
    await debt.save();

    successResponse(res, debt, 'Debt updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteDebt = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user._id });
    if (!debt) return errorResponse(res, 'Debt not found.', 404);

    await Debt.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Debt deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const addRepayment = async (req, res, next) => {
  try {
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user._id });
    if (!debt) return errorResponse(res, 'Debt not found.', 404);

    const { amount, date, note } = req.body;
    if (!amount) return errorResponse(res, 'Repayment amount is required.', 400);

    debt.repayments.push({ amount, date: date || Date.now(), note });
    await debt.save();

    successResponse(res, debt, 'Repayment added successfully.');
  } catch (error) {
    next(error);
  }
};
