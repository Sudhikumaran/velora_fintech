import Goal from '../models/Goal.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { createUserTransaction } from '../utils/money.js';

export const getGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    successResponse(res, goals, 'Goals fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, currentAmount, deadline, category, description, color, icon, account, priority } = req.body;

    if (!name || !targetAmount) {
      return errorResponse(res, 'Name and target amount are required.', 400);
    }

    const goal = await Goal.create({
      user: req.user._id,
      name, targetAmount, currentAmount: currentAmount || 0,
      deadline, category, description,
      color: color || '#6366f1', icon: icon || 'target',
      account, priority: priority || 'medium',
    });

    successResponse(res, goal, 'Goal created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return errorResponse(res, 'Goal not found.', 404);

    const { name, targetAmount, currentAmount, deadline, category, description, status, color, icon, account, priority } = req.body;
    Object.assign(goal, { name, targetAmount, currentAmount, deadline, category, description, status, color, icon, account, priority });
    await goal.save();

    successResponse(res, goal, 'Goal updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return errorResponse(res, 'Goal not found.', 404);

    await Goal.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Goal deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const addContribution = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return errorResponse(res, 'Goal not found.', 404);

    const { amount, date, note, account } = req.body;
    if (!amount) return errorResponse(res, 'Contribution amount is required.', 400);

    const parsed = parseFloat(amount);
    goal.contributions.push({ amount: parsed, date: date || Date.now(), note });
    goal.currentAmount += parsed;

    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }

    await goal.save();

    if (account) {
      await createUserTransaction(req.user._id, {
        account,
        type: 'expense',
        amount: parsed,
        category: 'Savings',
        description: `Contribution to ${goal.name}`,
        date: date || Date.now(),
        notes: note || '',
        source: 'goal',
        sourceId: String(goal._id),
      });
    }

    successResponse(res, goal, 'Contribution added successfully.');
  } catch (error) {
    next(error);
  }
};
