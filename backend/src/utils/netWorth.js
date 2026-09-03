import Account from '../models/Account.js';
import Debt from '../models/Debt.js';
import Investment from '../models/Investment.js';

export async function netWorthForUser(userId) {
  const [accounts, investments, debts] = await Promise.all([
    Account.find({ user: userId, isArchived: false }),
    Investment.find({ user: userId }),
    Debt.find({ user: userId, status: { $ne: 'paid' } }),
  ]);
  const cash = accounts
    .filter((a) => a.type !== 'credit')
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const credit = accounts
    .filter((a) => a.type === 'credit')
    .reduce((s, a) => s + Math.abs(Number(a.balance || 0)), 0);
  const portfolio = investments.reduce((s, i) => s + i.units * (i.currentPrice || i.buyPrice || 0), 0);
  const borrowed = debts.filter((d) => d.type === 'borrowed').reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);
  const lent = debts.filter((d) => d.type === 'lent').reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);
  const assets = cash + portfolio + lent;
  const liabilities = credit + borrowed;
  return {
    cash,
    portfolio,
    lent,
    credit,
    borrowed,
    assets,
    liabilities,
    netWorth: assets - liabilities,
    breakdown: accounts.map((a) => ({
      name: a.name,
      type: a.type,
      color: a.color,
      currency: a.currency,
      balance: Number(a.balance || 0),
    })),
  };
}
