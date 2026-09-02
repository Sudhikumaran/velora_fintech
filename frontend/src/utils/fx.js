export const USD_RATES = {
  USD: 1, EUR: 1.08, GBP: 1.27, INR: 0.012, JPY: 0.0067,
  CAD: 0.73, AUD: 0.66, CHF: 1.12,
};

export function toUserCurrency(amount, from = 'INR', to = 'INR') {
  const n = Number(amount) || 0;
  if (!from || !to || from === to) return n;
  const fromRate = USD_RATES[from] || 1;
  const toRate = USD_RATES[to] || 1;
  return n * fromRate / toRate;
}
