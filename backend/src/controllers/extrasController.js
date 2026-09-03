import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import Budget from '../models/Budget.js';
import Debt from '../models/Debt.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Household from '../models/Household.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { netWorthForUser } from '../utils/netWorth.js';
import { countedAmount } from '../utils/totals.js';

function monthBounds(offset = 0, from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  const end = new Date(from.getFullYear(), from.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function weekBounds(from = new Date()) {
  const start = new Date(from);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  start.setHours(0, 0, 0, 0);
  const end = new Date(from);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export const getInsights = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currency = req.user.currency || 'INR';
    const now = new Date();
    const thisMonth = monthBounds(0, now);
    const lastMonth = monthBounds(-1, now);
    const thisWeek = weekBounds(now);
    const lastWeekStart = new Date(thisWeek.start);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeek.start);
    lastWeekEnd.setMilliseconds(-1);

    const [monthTx, lastMonthTx, weekTx, lastWeekTx, budgets, debts, subs, worth] = await Promise.all([
      Transaction.find({ user: userId, isArchived: false, date: { $gte: thisMonth.start, $lte: thisMonth.end } }),
      Transaction.find({ user: userId, isArchived: false, date: { $gte: lastMonth.start, $lte: lastMonth.end } }),
      Transaction.find({ user: userId, isArchived: false, type: 'expense', date: { $gte: thisWeek.start, $lte: thisWeek.end } }),
      Transaction.find({ user: userId, isArchived: false, type: 'expense', date: { $gte: lastWeekStart, $lte: lastWeekEnd } }),
      Budget.find({ user: userId, isActive: { $ne: false } }),
      Debt.find({ user: userId, status: { $ne: 'paid' } }),
      Subscription.find({ user: userId, status: 'active' }),
      netWorthForUser(userId, currency),
    ]);

    const cashNet = (rows) => (rows || []).reduce((s, t) => {
      if (t.type === 'income') return s + Number(t.amount || 0);
      if (t.type === 'expense') return s - Number(t.amount || 0);
      return s;
    }, 0);
    const income = countedAmount(monthTx, 'income');
    const expense = countedAmount(monthTx, 'expense');
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    const weekSpend = weekTx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const lastWeekSpend = lastWeekTx.reduce((s, t) => s + Number(t.amount || 0), 0);
    const byCat = {};
    weekTx.forEach((t) => {
      const c = t.category || 'Other';
      byCat[c] = (byCat[c] || 0) + Number(t.amount || 0);
    });
    const weekTop = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

    const lastMonthByCat = {};
    lastMonthTx.filter((t) => t.type === 'expense').forEach((t) => {
      const c = t.category || 'Other';
      lastMonthByCat[c] = (lastMonthByCat[c] || 0) + Number(t.amount || 0);
    });
    const thisMonthByCat = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => {
      const c = t.category || 'Other';
      thisMonthByCat[c] = (thisMonthByCat[c] || 0) + Number(t.amount || 0);
    });
    const unusual = Object.entries(thisMonthByCat)
      .map(([category, spent]) => {
        const prev = lastMonthByCat[category] || 0;
        const jump = prev > 0 ? ((spent - prev) / prev) * 100 : (spent > 0 ? 100 : 0);
        return { category, spent, previous: prev, jump };
      })
      .filter((row) => row.jump >= 40 && row.spent >= 200)
      .sort((a, b) => b.jump - a.jump)
      .slice(0, 4);

    const merchantCount = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => {
      const m = (t.description || '').slice(0, 40) || t.category;
      const day = new Date(t.date).toISOString().slice(0, 10);
      const key = `${m}|${day}`;
      merchantCount[key] = (merchantCount[key] || 0) + 1;
    });
    const repeatMerchant = Object.entries(merchantCount)
      .filter(([, n]) => n >= 3)
      .map(([key, n]) => ({ merchant: key.split('|')[0], times: n }));

    const history = [];
    let running = worth.netWorth;
    for (let i = 0; i < 6; i += 1) {
      const { start, end } = monthBounds(-i, now);
      const txs = i === 0 ? monthTx : await Transaction.find({ user: userId, isArchived: false, date: { $gte: start, $lte: end } }).select('type amount');
      const net = cashNet(txs);
      history.unshift({
        month: `${start.toLocaleString('en', { month: 'short' })} ${start.getFullYear()}`,
        netWorth: running,
        net,
      });
      if (i < 5) running -= net;
    }

    const bills = [];
    const inDays = (d) => {
      if (!d) return null;
      const due = new Date(d);
      due.setHours(0, 0, 0, 0);
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return Math.round((due - t) / 86400000);
    };
    subs.forEach((s) => {
      const days = inDays(s.nextBillingDate);
      if (days != null && days >= 0 && days <= 14) {
        bills.push({ kind: 'subscription', name: s.name, amount: s.amount, date: s.nextBillingDate, days, urgent: days <= 3 });
      }
    });
    debts.forEach((d) => {
      const date = d.isEMI && d.emiDay
        ? new Date(now.getFullYear(), now.getMonth(), Math.min(d.emiDay, 28))
        : d.dueDate;
      const days = inDays(date);
      if (days != null && days >= -1 && days <= 14) {
        bills.push({
          kind: 'debt',
          name: d.isEMI ? `${d.person} EMI` : d.person,
          amount: d.isEMI ? d.emiAmount : (d.remainingAmount ?? d.amount),
          date,
          days,
          urgent: days <= 3,
        });
      }
    });
    bills.sort((a, b) => a.days - b.days);

    const emiMonthly = debts.filter((d) => d.isEMI && d.emiAmount).reduce((s, d) => s + Number(d.emiAmount), 0);

    let householdWorth = null;
    if (req.user.household) {
      const house = await Household.findById(req.user.household).populate('members', 'name');
      if (house?.members?.length) {
        const parts = await Promise.all(house.members.map((m) => netWorthForUser(m._id, currency)));
        householdWorth = {
          name: house.name,
          members: house.members.map((m, i) => ({ name: m.name, netWorth: parts[i].netWorth })),
          netWorth: parts.reduce((s, p) => s + p.netWorth, 0),
        };
      }
    }

    successResponse(res, {
      savingsRate,
      income,
      expense,
      leftover: income - expense,
      emiMonthly,
      householdWorth,
      weekly: {
        spent: weekSpend,
        previous: lastWeekSpend,
        topCategory: weekTop ? { name: weekTop[0], amount: weekTop[1] } : null,
      },
      unusual,
      repeatMerchant,
      bills,
      netWorth: worth,
      history,
      budgets: budgets.map((b) => ({
        category: b.category,
        limit: b.limit,
        spent: b.spent || 0,
        remaining: Math.max(0, (b.limit || 0) - (b.spent || 0)),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const spendCheck = async (req, res, next) => {
  try {
    const amount = parseFloat(req.query.amount);
    const category = String(req.query.category || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) return errorResponse(res, 'Enter an amount.', 400);

    const { start, end } = monthBounds(0);
    const [budgets, monthTx, insightsLike] = await Promise.all([
      Budget.find({ user: req.user._id }),
      Transaction.find({ user: req.user._id, isArchived: false, type: 'expense', date: { $gte: start, $lte: end } }),
      getQuickLeftover(req.user._id),
    ]);

    const spent = (cat) => monthTx.filter((t) => (t.category || '') === cat).reduce((s, t) => s + Number(t.amount || 0), 0);
    const matches = (category
      ? budgets.filter((b) => b.category === category)
      : budgets
    ).map((b) => {
      const used = Number(b.spent || spent(b.category) || 0);
      const remaining = (b.limit || 0) - used;
      return {
        category: b.category,
        limit: b.limit,
        spent: used,
        remaining,
        after: remaining - amount,
        ok: remaining - amount >= 0,
      };
    });

    successResponse(res, {
      amount,
      leftoverMonth: insightsLike.leftover - amount,
      leftoverOk: insightsLike.leftover - amount >= 0,
      budgets: matches,
    });
  } catch (error) {
    next(error);
  }
};

async function getQuickLeftover(userId) {
  const { start, end } = monthBounds(0);
  const txs = await Transaction.find({ user: userId, isArchived: false, date: { $gte: start, $lte: end } }).select('type amount');
  const income = countedAmount(txs, 'income');
  const expense = countedAmount(txs, 'expense');
  return { leftover: income - expense, income, expense };
}

export const whatIf = async (req, res, next) => {
  try {
    const category = String(req.query.category || '').trim();
    const cutPct = Math.min(90, Math.max(1, parseFloat(req.query.cutPct) || 20));
    const { start, end } = monthBounds(0);
    const [monthTx, debts] = await Promise.all([
      Transaction.find({ user: req.user._id, isArchived: false, type: 'expense', date: { $gte: start, $lte: end } }),
      Debt.find({ user: req.user._id, isEMI: true, status: { $ne: 'paid' } }),
    ]);
    const catSpend = monthTx.filter((t) => !category || t.category === category).reduce((s, t) => s + Number(t.amount || 0), 0);
    const savedMonthly = catSpend * (cutPct / 100);
    const results = debts.map((d) => {
      const remaining = d.remainingAmount ?? d.amount;
      const emi = Number(d.emiAmount) || 0;
      const monthsNow = emi > 0 ? remaining / emi : null;
      const monthsThen = emi + savedMonthly > 0 ? remaining / (emi + savedMonthly) : null;
      return {
        person: d.person,
        remaining,
        emi,
        monthsNow,
        monthsThen,
        monthsSaved: monthsNow != null && monthsThen != null ? Math.max(0, monthsNow - monthsThen) : 0,
      };
    });
    successResponse(res, { category: category || 'all expenses', cutPct, savedMonthly, debts: results });
  } catch (error) {
    next(error);
  }
};

export const caExport = async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const txs = await Transaction.find({
      user: req.user._id,
      isArchived: false,
      date: { $gte: start, $lte: end },
    }).populate('account', 'name').sort({ date: 1 });

    const header = 'Date,Voucher,Account,Particulars,Category,Debit,Credit,GSTIN,GST Amount,Split';
    const rows = txs.map((t) => {
      const date = new Date(t.date).toISOString().slice(0, 10);
      const debit = t.type === 'expense' || t.type === 'transfer' ? t.amount : '';
      const credit = t.type === 'income' ? t.amount : '';
      const splits = (t.splits || []).map((s) => `${s.category}:${s.amount}:${s.description || s.notes || ''}`).join('|');
      const cells = [
        date,
        t.type,
        t.account?.name || '',
        t.description || '',
        t.category || '',
        debit,
        credit,
        t.gstin || '',
        t.gstAmount || '',
        splits,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      return cells.join(',');
    });
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="velora-ca-${year}-${String(month).padStart(2, '0')}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

export const saveMerchantRules = async (req, res, next) => {
  try {
    const rules = req.body?.rules && typeof req.body.rules === 'object' ? req.body.rules : {};
    const user = await User.findByIdAndUpdate(req.user._id, { merchantRules: rules }, { new: true });
    successResponse(res, user.merchantRules || {}, 'Merchant rules saved.');
  } catch (error) {
    next(error);
  }
};

export const joinAaWaitlist = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { aaWaitlist: true });
    successResponse(res, { aaWaitlist: true }, 'You are on the Account Aggregator waitlist.');
  } catch (error) {
    next(error);
  }
};

function makeCode() {
  return crypto.randomBytes(3).toString('hex').slice(0, 6).toUpperCase();
}

export const createHousehold = async (req, res, next) => {
  try {
    const existing = await Household.findOne({ members: req.user._id });
    if (existing) return successResponse(res, existing, 'Already in a household.');
    let code = makeCode();
    while (await Household.findOne({ code })) code = makeCode();
    const house = await Household.create({
      name: req.body?.name || `${req.user.name}'s home`,
      code,
      owner: req.user._id,
      members: [req.user._id],
    });
    await User.findByIdAndUpdate(req.user._id, { household: house._id });
    successResponse(res, house, 'Household created.', 201);
  } catch (error) {
    next(error);
  }
};

export const joinHousehold = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const house = await Household.findOne({ code });
    if (!house) return errorResponse(res, 'Household not found.', 404);
    if (!house.members.some((id) => String(id) === String(req.user._id))) {
      house.members.push(req.user._id);
      await house.save();
    }
    await User.findByIdAndUpdate(req.user._id, { household: house._id });
    successResponse(res, house, 'Joined household.');
  } catch (error) {
    next(error);
  }
};

export const getHousehold = async (req, res, next) => {
  try {
    const house = await Household.findOne({ members: req.user._id }).populate('members', 'name email');
    if (!house) return successResponse(res, null, 'No household.');
    const currency = req.user.currency || 'INR';
    const parts = await Promise.all(house.members.map((m) => netWorthForUser(m._id, currency)));
    successResponse(res, {
      ...house.toObject(),
      sharedNetWorth: parts.reduce((s, p) => s + p.netWorth, 0),
      memberWorth: house.members.map((m, i) => ({
        id: m._id,
        name: m.name,
        email: m.email,
        netWorth: parts[i].netWorth,
      })),
    }, 'Household fetched.');
  } catch (error) {
    next(error);
  }
};

export const leaveHousehold = async (req, res, next) => {
  try {
    const house = await Household.findOne({ members: req.user._id });
    if (house) {
      house.members = house.members.filter((id) => String(id) !== String(req.user._id));
      if (house.members.length === 0) {
        await Household.deleteOne({ _id: house._id });
      } else {
        await house.save();
      }
    }
    await User.findByIdAndUpdate(req.user._id, { household: null });
    successResponse(res, null, 'Left household.');
  } catch (error) {
    next(error);
  }
};
