import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import { successResponse } from '../utils/apiResponse.js';

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

export const getSpendingByCategory = async (req, res, next) => {
  try {
    const { startDate, endDate, period } = req.query;
    const userId = req.user._id;

    let start, end;
    const now = new Date();
    if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
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
    const { startDate, endDate } = req.query;
    const userId = req.user._id;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : now;

    const data = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          isArchived: false,
          date: { $gte: start, $lte: end },
        },
      },
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

    successResponse(res, data, 'Income vs expense fetched.');
  } catch (error) {
    next(error);
  }
};

export const getNetWorth = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const accounts = await Account.find({ user: userId, isArchived: false });

    const assets = accounts.filter((a) => !['credit'].includes(a.type) && a.balance > 0).reduce((s, a) => s + a.balance, 0);
    const liabilities = accounts.filter((a) => a.type === 'credit' || a.balance < 0).reduce((s, a) => s + Math.abs(a.balance), 0);
    const netWorth = assets - liabilities;

    const breakdown = accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance, color: a.color }));

    successResponse(res, { netWorth, assets, liabilities, breakdown }, 'Net worth fetched.');
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
