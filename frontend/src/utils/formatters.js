export const formatCurrency = (amount, currency = 'USD', compact = false) => {
  if (amount === null || amount === undefined) return '—';
  const options = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  if (compact && Math.abs(amount) >= 1000) {
    options.notation = 'compact';
    options.minimumFractionDigits = 1;
    options.maximumFractionDigits = 1;
  }
  return new Intl.NumberFormat('en-US', options).format(amount);
};

export const formatDate = (date, format = 'medium') => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';

  const formats = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    time: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat('en-US', formats[format] || formats.medium).format(d);
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

export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const getMonthName = (monthNum) => {
  return new Date(2024, monthNum - 1, 1).toLocaleString('default', { month: 'short' });
};

export const getTrend = (current, previous) => {
  if (!previous || previous === 0) return { percent: 0, direction: 'neutral' };
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percent: Math.abs(percent).toFixed(1),
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'neutral',
  };
};
