const LOCALE_BY_CURRENCY = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
};

export function localeForCurrency(currency = 'USD') {
  return LOCALE_BY_CURRENCY[currency] || 'en-US';
}

function persistedCurrency() {
  try {
    const raw = JSON.parse(localStorage.getItem('velora-auth') || '{}');
    return raw?.state?.user?.currency || 'USD';
  } catch {
    return 'USD';
  }
}

export const formatCurrency = (amount, currency = 'USD', compact = false) => {
  if (amount === null || amount === undefined) return '—';
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  };
  if (compact && Math.abs(amount) >= 1000) {
    options.notation = 'compact';
    options.minimumFractionDigits = 1;
    options.maximumFractionDigits = 1;
  }
  return new Intl.NumberFormat(localeForCurrency(currency), options).format(amount);
};

export const formatDate = (date, format = 'medium', currency) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  const formats = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    time: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat(localeForCurrency(currency || persistedCurrency()), formats[format] || formats.medium).format(d);
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(decimals)}%`;
};

export const formatNumber = (value, decimals = 0, currency = 'USD') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(localeForCurrency(currency), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const getMonthName = (monthNum, currency = 'USD') => {
  return new Date(2024, monthNum - 1, 1).toLocaleString(localeForCurrency(currency), { month: 'short' });
};

export const getTrend = (current, previous) => {
  if (!previous || previous === 0) return { percent: 0, direction: 'neutral' };
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percent: Math.abs(percent).toFixed(1),
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
  };
};
