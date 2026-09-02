import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import { successResponse } from '../utils/apiResponse.js';
import { netWorthForUser } from '../utils/netWorth.js';

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + mondayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function enumerateCalendarDays(start, end) {
  const days = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function clampDateRange(start, end, minStart, maxEnd) {
  let s = new Date(start);
  let e = new Date(end);
  if (minStart && s < minStart) s = new Date(minStart);
  if (maxEnd && e > maxEnd) e = new Date(maxEnd);
  return { start: s, end: e };
}

function resolveAnalysisRange(query, now = new Date()) {
  const period = (query.period || 'lastMonth').toString();

  let start;
  let end;
  if (period === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'week') {
    start = startOfWeekMonday(now);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'month') {
    const y = toInt(query.year, now.getFullYear());
    const m = toInt(query.month, now.getMonth() + 1); // 1-12
    start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    end = new Date(y, m, 0, 23, 59, 59, 999);
  } else if (period === 'lastMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    const y = toInt(query.year, now.getFullYear());
    start = new Date(y, 0, 1, 0, 0, 0, 0);
    end = new Date(y, 11, 31, 23, 59, 59, 999);
  } else if (period === 'all') {
    start = new Date(0);
    end = new Date(now);
  } else {
    // custom
    start = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = query.endDate ? new Date(query.endDate) : new Date(now);
    if (isValidDate(end)) end.setHours(23, 59, 59, 999);
  }

  if (!isValidDate(start) || !isValidDate(end)) {
    const fallbackStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const fallbackEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { period: 'lastMonth', start: fallbackStart, end: fallbackEnd };
  }

  if (end > now) end = new Date(now);
  return { period, start, end };
}

async function breakdownForBudget({ userId, category, start, end, groupBy }) {
  if (!groupBy) return null;
  const rangeDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  // Guardrail to avoid huge payloads
  if (groupBy === 'day' && rangeDays > 93) return null;

  let groupId;
  let labelExpr;
  if (groupBy === 'week') {
    groupId = { y: { $isoWeekYear: '$date' }, w: { $isoWeek: '$date' } };
    labelExpr = {
      $concat: [
        { $toString: '$$ROOT._id.y' },
        '-W',
        {
          $cond: [
            { $lt: ['$$ROOT._id.w', 10] },
            { $concat: ['0', { $toString: '$$ROOT._id.w' }] },
            { $toString: '$$ROOT._id.w' },
          ],
        },
      ],
    };
  } else {
    // day
    groupId = { d: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } };
    labelExpr = '$$ROOT._id.d';
  }

  const rows = await Transaction.aggregate([
    {
      $match: {
        user: userId,
        category,
        type: 'expense',
        isArchived: false,
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: groupId, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { '_id.d': 1, '_id.y': 1, '_id.w': 1 } },
  ]);

  return rows.map((r) => ({
    key: r._id?.d ?? `${r._id?.y}-W${String(r._id?.w).padStart(2, '0')}`,
    label: typeof labelExpr === 'string' ? r._id?.d : `${r._id?.y}-W${String(r._id?.w).padStart(2, '0')}`,
    spent: r.total || 0,
    txCount: r.count || 0,
  }));
}

export const getDashboardSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [accounts, monthlyStats, lastMonthStats, recentTransactions] = await Promise.all([
      Account.find({ user: userId, isArchived: false }),
      Transaction.aggregate([
        { $match: { user: userId, isArchived: false, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, isArchived: false, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.find({ user: userId, isArchived: false })
        .sort({ date: -1 })
        .limit(5)
        .populate('account', 'name type color'),
    ]);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const getTotal = (stats, type) => stats.find((s) => s._id === type)?.total || 0;

    const summary = {
      totalBalance,
      totalAccounts: accounts.length,
      monthlyIncome: getTotal(monthlyStats, 'income'),
      monthlyExpenses: getTotal(monthlyStats, 'expense'),
      lastMonthIncome: getTotal(lastMonthStats, 'income'),
      lastMonthExpenses: getTotal(lastMonthStats, 'expense'),
      netSavings: getTotal(monthlyStats, 'income') - getTotal(monthlyStats, 'expense'),
      recentTransactions,
      accounts,
    };

    successResponse(res, summary, 'Dashboard summary fetched.');
  } catch (error) {
    next(error);
  }
};

export const getMonthlyBudgetAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Defaults to last completed month (more useful for "after every month")
    const defaultDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = toInt(req.query.year, defaultDate.getFullYear());
    const month = toInt(req.query.month, defaultDate.getMonth() + 1); // 1-12

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const budgets = await Budget.find({ user: userId, isActive: true }).sort({ createdAt: -1 });

    const rows = await Promise.all(
      budgets.map(async (budget) => {
        const budgetStart = budget.startDate ? new Date(budget.startDate) : null;
        const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;

        const windowStart = budgetStart && budgetStart > start ? budgetStart : start;
        const windowEnd = budgetEnd && budgetEnd < end ? budgetEnd : end;

        // If the budget wasn't active during this month window, return zeros.
        if (windowEnd < windowStart) {
          return {
            ...budget.toObject(),
            spent: 0,
            remaining: budget.limit,
            utilizationPct: 0,
            window: { startDate: windowStart, endDate: windowEnd },
          };
        }

        const result = await Transaction.aggregate([
          {
            $match: {
              user: userId,
              category: budget.category,
              type: 'expense',
              isArchived: false,
              date: { $gte: windowStart, $lte: windowEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);

        const spent = result[0]?.total || 0;
        const count = result[0]?.count || 0;
        const remaining = budget.limit - spent;
        const utilizationPct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

        return {
          ...budget.toObject(),
          spent,
          txCount: count,
          remaining,
          utilizationPct,
          window: { startDate: windowStart, endDate: windowEnd },
        };
      })
    );

    const totalLimit = rows.reduce((s, b) => s + (b.limit || 0), 0);
    const totalSpent = rows.reduce((s, b) => s + (b.spent || 0), 0);
    const totalRemaining = totalLimit - totalSpent;

    const overBudget = rows
      .filter((b) => (b.limit || 0) > 0 && (b.spent || 0) > (b.limit || 0))
      .sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));

    const nearLimit = rows
      .filter((b) => (b.limit || 0) > 0 && (b.spent || 0) <= (b.limit || 0) && b.utilizationPct >= (b.alertThreshold || 80))
      .sort((a, b) => b.utilizationPct - a.utilizationPct);

    const insights = [];
    if (overBudget.length) {
      insights.push({
        type: 'danger',
        text: `${overBudget.length} budget(s) exceeded the limit this month.`,
      });
    }
    if (nearLimit.length) {
      insights.push({
        type: 'warning',
        text: `${nearLimit.length} budget(s) were near the limit (>= threshold).`,
      });
    }
    if (!overBudget.length && totalLimit > 0) {
      insights.push({
        type: 'success',
        text: `All budgets stayed within limits. Remaining: ${totalRemaining.toFixed(2)}.`,
      });
    }

    successResponse(
      res,
      {
        month: `${year}-${String(month).padStart(2, '0')}`,
        startDate: start,
        endDate: end,
        totalLimit,
        totalSpent,
        totalRemaining,
        budgets: rows,
        overBudget,
        nearLimit,
        insights,
      },
      'Monthly budget analysis fetched.'
    );
  } catch (error) {
    next(error);
  }
};

export const getBudgetAnalysis = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const { period, start, end } = resolveAnalysisRange(req.query, now);
    const groupBy = (req.query.groupBy || '').toString(); // '', 'day', 'week'
    const breakdownMode = groupBy === 'day' || groupBy === 'week' ? groupBy : '';

    const budgets = await Budget.find({ user: userId, isActive: true }).sort({ createdAt: -1 });

    const rows = await Promise.all(
      budgets.map(async (budget) => {
        const budgetStart = budget.startDate ? new Date(budget.startDate) : null;
        const budgetEnd = budget.endDate ? new Date(budget.endDate) : null;
        const { start: windowStart, end: windowEnd } = clampDateRange(start, end, budgetStart, budgetEnd);

        if (windowEnd < windowStart) {
          return {
            ...budget.toObject(),
            spent: 0,
            txCount: 0,
            remaining: budget.limit,
            utilizationPct: 0,
            window: { startDate: windowStart, endDate: windowEnd },
            breakdown: null,
          };
        }

        const result = await Transaction.aggregate([
          {
            $match: {
              user: userId,
              category: budget.category,
              type: 'expense',
              isArchived: false,
              date: { $gte: windowStart, $lte: windowEnd },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);

        const spent = result[0]?.total || 0;
        const count = result[0]?.count || 0;
        const remaining = budget.limit - spent;
        const utilizationPct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;

        const breakdown = breakdownMode
          ? await breakdownForBudget({ userId, category: budget.category, start: windowStart, end: windowEnd, groupBy: breakdownMode })
          : null;

        return {
          ...budget.toObject(),
          spent,
          txCount: count,
          remaining,
          utilizationPct,
          window: { startDate: windowStart, endDate: windowEnd },
          breakdown,
        };
      })
    );

    const totalLimit = rows.reduce((s, b) => s + (b.limit || 0), 0);
    const totalSpent = rows.reduce((s, b) => s + (b.spent || 0), 0);
    const totalRemaining = totalLimit - totalSpent;

    const overBudget = rows
      .filter((b) => (b.limit || 0) > 0 && (b.spent || 0) > (b.limit || 0))
      .sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));

    const nearLimit = rows
      .filter((b) => (b.limit || 0) > 0 && (b.spent || 0) <= (b.limit || 0) && b.utilizationPct >= (b.alertThreshold || 80))
      .sort((a, b) => b.utilizationPct - a.utilizationPct);

    const insights = [];
    if (overBudget.length) insights.push({ type: 'danger', text: `${overBudget.length} budget(s) exceeded the limit in this range.` });
    if (nearLimit.length) insights.push({ type: 'warning', text: `${nearLimit.length} budget(s) were near the limit (>= threshold) in this range.` });
    if (!overBudget.length && totalLimit > 0) insights.push({ type: 'success', text: `All budgets stayed within limits. Remaining: ${totalRemaining.toFixed(2)}.` });

    successResponse(
      res,
      {
        period,
        startDate: start,
        endDate: end,
        groupBy: breakdownMode || null,
        totalLimit,
        totalSpent,
        totalRemaining,
        budgets: rows,
        overBudget,
        nearLimit,
        insights,
      },
      'Budget analysis fetched.'
    );
  } catch (error) {
    next(error);
  }
};

export const getSpendingByCategory = async (req, res, next) => {
  try {
    const { startDate, endDate, period } = req.query;
    const userId = req.user._id;

    let start, end;
    const now = new Date();
    if (period === 'day') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      start = startOfWeekMonday(now);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else {
      start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = endDate ? new Date(endDate) : now;
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          isArchived: false,
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    successResponse(res, data, 'Spending by category fetched.');
  } catch (error) {
    next(error);
  }
};

export const getMonthlyTrend = async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const userId = req.user._id;
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - parseInt(months) + 1, 1);

    const data = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          isArchived: false,
          date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Transform into chart-friendly format
    const months_map = {};
    data.forEach(({ _id, total }) => {
      const key = `${_id.year}-${String(_id.month).padStart(2, '0')}`;
      if (!months_map[key]) {
        months_map[key] = { month: key, income: 0, expense: 0, transfer: 0 };
      }
      months_map[key][_id.type] = total;
    });

    const trend = Object.values(months_map).sort((a, b) => a.month.localeCompare(b.month));
    successResponse(res, trend, 'Monthly trend fetched.');
  } catch (error) {
    next(error);
  }
};

export const getCashFlow = async (req, res, next) => {
  try {
    const { year } = req.query;
    const userId = req.user._id;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const data = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          isArchived: false,
          date: {
            $gte: new Date(targetYear, 0, 1),
            $lte: new Date(targetYear, 11, 31),
          },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i, 1).toLocaleString('default', { month: 'short' }),
      income: 0,
      expense: 0,
    }));

    data.forEach(({ _id, total }) => {
      const monthData = months[_id.month - 1];
      if (_id.type === 'income') monthData.income = total;
      else if (_id.type === 'expense') monthData.expense = total;
    });

    months.forEach((m) => { m.net = m.income - m.expense; });

    successResponse(res, months, 'Cash flow fetched.');
  } catch (error) {
    next(error);
  }
};

export const getIncomeVsExpense = async (req, res, next) => {
  try {
    const { startDate, endDate, account, type: typeParam } = req.query;
    const userId = req.user._id;
    const now = new Date();
    const end = endDate ? new Date(endDate) : new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const typeClause =
      typeParam === 'income' || typeParam === 'expense'
        ? typeParam
        : { $in: ['income', 'expense'] };

    const match = {
      user: userId,
      isArchived: false,
      type: typeClause,
      date: { $gte: start, $lte: end },
    };
    if (account && mongoose.Types.ObjectId.isValid(account)) {
      match.account = new mongoose.Types.ObjectId(account);
    }

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const byDate = {};
    rows.forEach(({ _id, total }) => {
      const d = _id.date;
      if (!byDate[d]) byDate[d] = { income: 0, expense: 0 };
      if (_id.type === 'income') byDate[d].income = total;
      else if (_id.type === 'expense') byDate[d].expense = total;
    });

    const allDays = enumerateCalendarDays(start, end);
    const series = allDays.map((date) => {
      const inc = byDate[date]?.income ?? 0;
      const exp = byDate[date]?.expense ?? 0;
      return { date, income: inc, expense: exp, net: inc - exp };
    });

    successResponse(res, { series, startDate: allDays[0], endDate: allDays[allDays.length - 1] }, 'Income vs expense fetched.');
  } catch (error) {
    next(error);
  }
};

export const getNetWorth = async (req, res, next) => {
  try {
    const worth = await netWorthForUser(req.user._id, req.user.currency || 'INR');
    successResponse(res, worth, 'Net worth fetched.');
  } catch (error) {
    next(error);
  }
};

export const exportData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const [transactions, accounts, budgets] = await Promise.all([
      Transaction.find({ user: userId }).populate('account', 'name type'),
      Account.find({ user: userId }),
      Budget.find({ user: userId }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      transactions,
      accounts,
      budgets,
    };

    successResponse(res, exportData, 'Data exported successfully.');
  } catch (error) {
    next(error);
  }
};

export const importData = async (req, res, next) => {
  try {
    const payload = req.body?.data || req.body || {};
    const accountsIn = Array.isArray(payload.accounts) ? payload.accounts : [];
    const txsIn = Array.isArray(payload.transactions) ? payload.transactions : [];
    const budgetsIn = Array.isArray(payload.budgets) ? payload.budgets : [];

    const idMap = {};
    let accountsCreated = 0;
    for (const acc of accountsIn) {
      const created = await Account.create({
        user: req.user._id,
        name: acc.name || 'Imported account',
        type: acc.type || 'other',
        balance: acc.balance || 0,
        currency: acc.currency || 'INR',
        color: acc.color,
        description: acc.description,
        creditLimit: acc.creditLimit,
      });
      if (acc._id) idMap[String(acc._id)] = created._id;
      accountsCreated += 1;
    }

    let txCreated = 0;
    const { createUserTransaction } = await import('../utils/money.js');
    const fallback = await Account.findOne({ user: req.user._id });
    for (const tx of txsIn) {
      const account = idMap[String(tx.account?._id || tx.account)] || fallback?._id;
      if (!account) continue;
      try {
        await createUserTransaction(req.user._id, {
          account,
          toAccount: idMap[String(tx.toAccount?._id || tx.toAccount)] || null,
          type: tx.type || 'expense',
          amount: tx.amount,
          category: tx.category || 'Other',
          description: tx.description,
          date: tx.date,
          notes: tx.notes,
          source: 'import',
        });
        txCreated += 1;
      } catch {
        // skip bad rows
      }
    }

    let budgetsCreated = 0;
    for (const b of budgetsIn) {
      await Budget.create({
        user: req.user._id,
        name: b.name,
        category: b.category,
        limit: b.limit,
        period: b.period || 'monthly',
        startDate: b.startDate || new Date(),
        color: b.color,
        alertThreshold: b.alertThreshold,
      });
      budgetsCreated += 1;
    }

    successResponse(res, { accountsCreated, txCreated, budgetsCreated }, 'Import complete.');
  } catch (error) {
    next(error);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const txs = await Transaction.find({
      user: req.user._id,
      isArchived: false,
      date: { $gte: start, $lte: end },
    }).populate('account', 'name');

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const byCategory = {};
    txs.filter((t) => t.type === 'expense').forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    successResponse(res, {
      year,
      month,
      start,
      end,
      income,
      expense,
      net: income - expense,
      savingsRate: income > 0 ? (income - expense) / income * 100 : 0,
      transactionCount: txs.length,
      categories: Object.entries(byCategory)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total),
      transactions: txs,
    }, 'Monthly report generated.');
  } catch (error) {
    next(error);
  }
};
