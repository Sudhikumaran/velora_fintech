export const TRANSACTION_CATEGORIES = {
  expense: [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Healthcare', 'Housing', 'Utilities', 'Education', 'Travel',
    'Personal Care', 'Gifts & Donations', 'Insurance', 'Taxes',
    'Subscriptions', 'Pets', 'Business', 'Other',
  ],
  income: [
    'Salary', 'Freelance', 'Business', 'Investment Returns', 'Rental Income',
    'Dividends', 'Interest', 'Bonus', 'Gift', 'Refund', 'Other',
  ],
};

export const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'credit', label: 'Credit Card', icon: '💳' },
  { value: 'savings', label: 'Savings', icon: '🏧' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'wallet', label: 'Digital Wallet', icon: '👛' },
  { value: 'other', label: 'Other', icon: '💰' },
];

export const INVESTMENT_TYPES = [
  { value: 'stock',       label: 'Stocks' },
  { value: 'crypto',      label: 'Cryptocurrency' },
  { value: 'mutual-fund', label: 'Mutual Fund' },
  { value: 'etf',         label: 'ETF' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'bond',        label: 'Bonds' },
  { value: 'commodity',   label: 'Commodity' },
  { value: 'digi-gold',   label: 'Digi Gold' },
  { value: 'other',       label: 'Other' },
];

export const SUBSCRIPTION_CATEGORIES = [
  'Streaming', 'Music', 'Gaming', 'Software', 'Cloud Storage',
  'News & Media', 'Fitness', 'Food Delivery', 'Education',
  'Productivity', 'Security', 'Communication', 'Other',
];

export const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const GOAL_CATEGORIES = [
  'Emergency Fund', 'Retirement', 'Home', 'Car', 'Education',
  'Travel', 'Wedding', 'Investment', 'Vacation', 'Business', 'Other',
];

export const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

export const CHART_COLORS = {
  income: '#22c55e',
  expense: '#ef4444',
  transfer: '#6366f1',
  neutral: '#94a3b8',
  primary: '#6366f1',
  secondary: '#8b5cf6',
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
];

export const CATEGORY_COLORS = {
  'Food & Dining': '#f97316',
  'Transportation': '#3b82f6',
  'Shopping': '#ec4899',
  'Entertainment': '#8b5cf6',
  'Healthcare': '#ef4444',
  'Housing': '#6366f1',
  'Utilities': '#eab308',
  'Education': '#14b8a6',
  'Travel': '#06b6d4',
  'Personal Care': '#f43f5e',
  'Salary': '#22c55e',
  'Freelance': '#10b981',
  'Business': '#059669',
  'Investment Returns': '#6366f1',
};
