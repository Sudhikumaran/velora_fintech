import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + mondayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clampDateRange(start, end, minStart, maxEnd) {
  const s = minStart && start < minStart ? new Date(minStart) : new Date(start);
  const e = maxEnd && end > maxEnd ? new Date(maxEnd) : new Date(end);
  return { start: s, end: e };
}

export function getBudgetPeriodWindow(budget, now = new Date()) {
  const period = budget.period || 'monthly';

  let start;
  let end;
  if (period === 'weekly') {
    start = startOfWeekMonday(now);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'yearly') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const budgetStart = budget.startDate ? new Date(budget.startDate) : null;
  const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;
  ({ start, end } = clampDateRange(start, end, budgetStart, budgetEnd));

  if (end > now) end = new Date(now);
  return { start, end };
}

async function computeBudgetSpent(budget, now = new Date()) {
  const { start: startDate, end: endDate } = getBudgetPeriodWindow(budget, now);

  if (startDate > endDate) {
    return { spent: 0, periodWindow: { startDate, endDate }, notStarted: true };
  }

  const result = await Transaction.aggregate([
    {
      $match: {
        user: budget.user,
        category: budget.category,
        type: 'expense',
        isArchived: false,
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return {
    spent: result[0]?.total || 0,
    periodWindow: { startDate, endDate },
    notStarted: false,
  };
}

async function attachSpentToBudget(budget, now = new Date()) {
  const budgetObj = budget.toObject ? budget.toObject() : { ...budget };
  const { spent, periodWindow, notStarted } = await computeBudgetSpent(budgetObj, now);
  budgetObj.spent = spent;
  budgetObj.periodWindow = periodWindow;
  budgetObj.notStarted = notStarted;
  return budgetObj;
}

function applyBudgetUpdates(budget, body) {
  const scalarFields = ['name', 'category', 'period', 'color', 'isActive', 'rollover', 'notifications'];
  for (const key of scalarFields) {
    if (body[key] !== undefined) budget[key] = body[key];
  }
  if (body.limit !== undefined) budget.limit = parseFloat(body.limit);
  if (body.alertThreshold !== undefined) budget.alertThreshold = parseFloat(body.alertThreshold);
  if (body.startDate !== undefined) budget.startDate = body.startDate;
  if ('endDate' in body) budget.endDate = body.endDate || undefined;
}

export const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ createdAt: -1 });
    const budgetsWithSpent = await Promise.all(budgets.map((b) => attachSpentToBudget(b)));
    successResponse(res, budgetsWithSpent, 'Budgets fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createBudget = async (req, res, next) => {
  try {
    const { name, category, limit, period, startDate, endDate, color, rollover, notifications, alertThreshold } = req.body;

    if (!name || !category || !limit || !startDate) {
      return errorResponse(res, 'Name, category, limit and start date are required.', 400);
    }

    const budget = await Budget.create({
      user: req.user._id,
      name,
      category,
      limit: parseFloat(limit),
      period: period || 'monthly',
      startDate,
      endDate: endDate || undefined,
      color: color || '#6366f1',
      rollover: rollover ?? false,
      notifications: notifications ?? true,
      alertThreshold: alertThreshold != null ? parseFloat(alertThreshold) : 80,
    });

    const budgetWithSpent = await attachSpentToBudget(budget);
    successResponse(res, budgetWithSpent, 'Budget created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return errorResponse(res, 'Budget not found.', 404);

    applyBudgetUpdates(budget, req.body);
    await budget.save();

    const budgetWithSpent = await attachSpentToBudget(budget);
    successResponse(res, budgetWithSpent, 'Budget updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return errorResponse(res, 'Budget not found.', 404);

    await Budget.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Budget deleted successfully.');
  } catch (error) {
    next(error);
  }
};
