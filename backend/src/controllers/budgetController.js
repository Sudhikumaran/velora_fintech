import Budget from '../models/Budget.js';
import Transaction from '../models/Transaction.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getBudgets = async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Calculate spent for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = budget.startDate;
        const endDate = budget.endDate || new Date();

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
