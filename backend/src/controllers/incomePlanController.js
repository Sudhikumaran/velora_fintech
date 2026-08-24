import IncomePlan from '../models/IncomePlan.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { createUserTransaction } from '../utils/money.js';

function summarizePlan(plan) {
  const doc = typeof plan.toObject === 'function' ? plan.toObject() : { ...plan };
  const entries = [...(doc.entries || [])].sort((a, b) => {
    const byDate = new Date(a.date) - new Date(b.date);
    if (byDate !== 0) return byDate;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });

  let balance = 0;
  let totalReceived = 0;
  let totalGive = 0;
  let givenDone = 0;

  const ledger = entries.map((e) => {
    const received = e.type === 'received' ? e.amount : 0;
    const give = e.type === 'give' ? e.amount : 0;
    balance += received - give;
    totalReceived += received;
    totalGive += give;
    if (e.type === 'give' && e.isDone) givenDone += give;
    return {
      ...e,
      received,
      give,
      balance,
    };
  });

  return {
    ...doc,
    entries: ledger,
    totalReceived,
    totalGive,
    remaining: balance,
    givenDone,
    givenPending: totalGive - givenDone,
    allocatedPercent: totalReceived > 0 ? Math.min(100, (totalGive / totalReceived) * 100) : 0,
  };
}

function parseAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : NaN;
}

export const getPlans = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const plans = await IncomePlan.find(filter).sort({ updatedAt: -1 });
    successResponse(res, plans.map(summarizePlan), 'Income plans fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const getPlan = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);
    successResponse(res, summarizePlan(plan), 'Income plan fetched successfully.');
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const { title, notes, status } = req.body;
    if (!title?.trim()) return errorResponse(res, 'Plan title is required.', 400);

    const plan = await IncomePlan.create({
      user: req.user._id,
      title: title.trim(),
      notes: notes || '',
      status: status || 'active',
      entries: [],
    });

    const amount = parseAmount(req.body.amount);
    if (amount > 0) {
      plan.entries.push({
        type: 'received',
        amount,
        date: req.body.date || Date.now(),
        name: req.body.name || 'Received',
        category: req.body.category || 'Salary',
        notes: req.body.entryNotes || '',
      });
      await plan.save();
    }

    successResponse(res, summarizePlan(plan), 'Income plan created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const { title, notes, status } = req.body;
    if (title !== undefined) {
      if (!title.trim()) return errorResponse(res, 'Plan title is required.', 400);
      plan.title = title.trim();
    }
    if (notes !== undefined) plan.notes = notes;
    if (status !== undefined) plan.status = status;
    await plan.save();

    successResponse(res, summarizePlan(plan), 'Income plan updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);
    await IncomePlan.deleteOne({ _id: req.params.id });
    successResponse(res, null, 'Income plan deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const addEntry = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const { type, name, category, notes, date } = req.body;
    const amount = parseAmount(req.body.amount);

    if (!['received', 'give'].includes(type)) {
      return errorResponse(res, 'Type must be received or give.', 400);
    }
    if (!amount || amount <= 0) return errorResponse(res, 'A valid amount is required.', 400);
    if (!name?.trim()) return errorResponse(res, 'Name is required.', 400);

    plan.entries.push({
      type,
      amount,
      date: date || Date.now(),
      name: name.trim(),
      category: category || '',
      notes: notes || '',
      isDone: type === 'give' ? Boolean(req.body.isDone) : false,
    });
    await plan.save();

    successResponse(res, summarizePlan(plan), 'Entry added successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateEntry = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const entry = plan.entries.id(req.params.entryId);
    if (!entry) return errorResponse(res, 'Entry not found.', 404);

    const { type, name, category, notes, date, isDone } = req.body;
    if (type !== undefined) {
      if (!['received', 'give'].includes(type)) return errorResponse(res, 'Type must be received or give.', 400);
      entry.type = type;
    }
    if (req.body.amount !== undefined) {
      const amount = parseAmount(req.body.amount);
      if (!amount || amount <= 0) return errorResponse(res, 'A valid amount is required.', 400);
      entry.amount = amount;
    }
    if (name !== undefined) {
      if (!name.trim()) return errorResponse(res, 'Name is required.', 400);
      entry.name = name.trim();
    }
    if (category !== undefined) entry.category = category;
    if (notes !== undefined) entry.notes = notes;
    if (date !== undefined) entry.date = date;
    if (isDone !== undefined) entry.isDone = Boolean(isDone);

    await plan.save();
    successResponse(res, summarizePlan(plan), 'Entry updated successfully.');
  } catch (error) {
    next(error);
  }
};

export const toggleEntryDone = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const entry = plan.entries.id(req.params.entryId);
    if (!entry) return errorResponse(res, 'Entry not found.', 404);
    if (entry.type !== 'give') return errorResponse(res, 'Only give entries can be marked done.', 400);

    entry.isDone = !entry.isDone;
    await plan.save();
    successResponse(res, summarizePlan(plan), entry.isDone ? 'Marked as given.' : 'Marked as pending.');
  } catch (error) {
    next(error);
  }
};

export const deleteEntry = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const entry = plan.entries.id(req.params.entryId);
    if (!entry) return errorResponse(res, 'Entry not found.', 404);

    entry.deleteOne();
    await plan.save();
    successResponse(res, summarizePlan(plan), 'Entry deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export const postEntry = async (req, res, next) => {
  try {
    const plan = await IncomePlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!plan) return errorResponse(res, 'Income plan not found.', 404);

    const entry = plan.entries.id(req.params.entryId);
    if (!entry) return errorResponse(res, 'Entry not found.', 404);
    if (entry.postedTransaction) return errorResponse(res, 'This line is already posted to an account.', 400);

    const { account, toAccount } = req.body;
    if (!account) return errorResponse(res, 'Choose an account to post this line.', 400);

    const tx = await createUserTransaction(req.user._id, {
      account,
      toAccount: toAccount || null,
      type: entry.type === 'received' ? 'income' : 'expense',
      amount: entry.amount,
      category: entry.category || (entry.type === 'received' ? 'Salary' : 'Other'),
      description: entry.name,
      date: entry.date,
      notes: entry.notes || `Posted from plan: ${plan.title}`,
      source: 'planner',
      sourceId: String(entry._id),
    });

    entry.postedTransaction = tx._id;
    entry.isDone = true;
    await plan.save();

    successResponse(res, { plan: summarizePlan(plan), transaction: tx }, 'Posted to accounts.');
  } catch (error) {
    if (error.status) return errorResponse(res, error.message, error.status);
    next(error);
  }
};
