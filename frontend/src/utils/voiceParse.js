import { TRANSACTION_CATEGORIES } from './constants';

const HINTS = [
  { test: /tea|coffee|lunch|dinner|breakfast|food|snack|swiggy|zomato|cafe|restaurant/i, category: 'Food & Dining' },
  { test: /uber|ola|auto|petrol|fuel|bus|metro|rapido|parking/i, category: 'Transportation' },
  { test: /amazon|flipkart|myntra|shop|clothes|grocery/i, category: 'Shopping' },
  { test: /movie|netflix|spotify|game/i, category: 'Entertainment' },
  { test: /medicine|hospital|clinic|doctor/i, category: 'Healthcare' },
  { test: /rent|landlord/i, category: 'Housing' },
  { test: /electric|wifi|recharge|jio|airtel/i, category: 'Utilities' },
];

export function parseVoiceExpense(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const amountMatch = raw.match(/(?:rs\.?|rupees?|inr|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let rest = raw.replace(amountMatch[0], ' ')
    .replace(/\b(rupees?|rs\.?|inr|rupee|spent|paid|for|on|at|cash)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cats = TRANSACTION_CATEGORIES.expense || [];
  let category = '';
  for (const c of cats) {
    const token = c.split('&')[0].trim();
    if (token.length > 2 && new RegExp(`\\b${token}\\b`, 'i').test(rest)) {
      category = c;
      rest = rest.replace(new RegExp(token, 'ig'), ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }
  if (!category) {
    const hint = HINTS.find((row) => row.test.test(raw));
    category = hint?.category || '';
  }

  return {
    type: 'expense',
    amount,
    description: rest || 'Cash',
    category,
    merchant: rest || 'Cash',
  };
}
