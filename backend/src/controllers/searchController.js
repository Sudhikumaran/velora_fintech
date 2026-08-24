import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Budget from '../models/Budget.js';
import Debt from '../models/Debt.js';
import Goal from '../models/Goal.js';
import Investment from '../models/Investment.js';
import Subscription from '../models/Subscription.js';
import IncomePlan from '../models/IncomePlan.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const globalSearch = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (q.length < 2) return errorResponse(res, 'Query must be at least 2 characters.', 400);

    const user = req.user._id;
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [transactions, accounts, budgets, debts, goals, investments, subscriptions, plans] = await Promise.all([
      Transaction.find({ user, isArchived: false, $or: [{ description: rx }, { category: rx }, { notes: rx }] }).limit(5).populate('account', 'name'),
      Account.find({ user, isArchived: false, name: rx }).limit(5),
      Budget.find({ user, $or: [{ name: rx }, { category: rx }] }).limit(5),
      Debt.find({ user, $or: [{ person: rx }, { description: rx }] }).limit(5),
      Goal.find({ user, $or: [{ name: rx }, { category: rx }] }).limit(5),
      Investment.find({ user, $or: [{ name: rx }, { symbol: rx }] }).limit(5),
      Subscription.find({ user, name: rx }).limit(5),
      IncomePlan.find({ user, title: rx }).limit(5),
    ]);

    const results = [
      ...transactions.map((t) => ({ type: 'transaction', id: t._id, title: t.description || t.category, subtitle: `${t.type} · ${t.account?.name || ''}`, amount: t.amount, txType: t.type })),
      ...accounts.map((a) => ({ type: 'account', id: a._id, title: a.name, subtitle: `${a.type} account`, amount: a.balance })),
      ...budgets.map((b) => ({ type: 'budget', id: b._id, title: b.name, subtitle: b.category, amount: b.limit })),
      ...debts.map((d) => ({ type: 'debt', id: d._id, title: d.person, subtitle: d.type, amount: d.remainingAmount ?? d.amount })),
      ...goals.map((g) => ({ type: 'goal', id: g._id, title: g.name, subtitle: g.category, amount: g.targetAmount })),
      ...investments.map((i) => ({ type: 'investment', id: i._id, title: i.name, subtitle: i.symbol || i.type, amount: i.units * (i.currentPrice || i.buyPrice) })),
      ...subscriptions.map((s) => ({ type: 'subscription', id: s._id, title: s.name, subtitle: s.frequency, amount: s.amount })),
      ...plans.map((p) => ({ type: 'planner', id: p._id, title: p.title, subtitle: 'Income plan' })),
    ];

    successResponse(res, results.slice(0, 20), 'Search results.');
  } catch (error) {
    next(error);
  }
};
