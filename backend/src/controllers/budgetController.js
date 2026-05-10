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

function getBudgetPeriodWindow(budget, now = new Date()) {
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
    // monthly default
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // Respect explicit budget bounds (e.g., custom start/end)
  const budgetStart = budget.startDate ? new Date(budget.startDate) : null;
  const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;
  ({ start, end } = clampDateRange(start, end, budgetStart, budgetEnd));

  // Never look into the future
  if (end > now) end = new Date(now);
  return { start, end };
}

export const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Calculate spent for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const { start: startDate, end: endDate } = getBudgetPeriodWindow(budget, new Date());

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

        const spent = result[0]?.total || 0;
        const budgetObj = budget.toObject();
        budgetObj.spent = spent;
        budgetObj.periodWindow = { startDate, endDate };
        return budgetObj;
      })
    );

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
      name, category, limit, period: period || 'monthly',
      startDate, endDate, color: color || '#6366f1',
      rollover, notifications, alertThreshold,
    });

    successResponse(res, budget, 'Budget created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return errorResponse(res, 'Budget not found.', 404);

    const { name, category, limit, period, startDate, endDate, color, isActive, rollover, notifications, alertThreshold } = req.body;
    Object.assign(budget, { name, category, limit, period, startDate, endDate, color, isActive, rollover, notifications, alertThreshold });
    await budget.save();

    successResponse(res, budget, 'Budget updated successfully.');
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
