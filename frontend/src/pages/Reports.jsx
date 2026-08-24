import { useEffect, useMemo, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useAccountStore } from '../store/accountStore';
import { formatCurrency, formatDate, localeForCurrency } from '../utils/formatters';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'transfer', label: 'Transfer' },
];

function accountId(tx) {
  return tx.account?._id || tx.account || '';
}

function groupByCategory(txs) {
  const map = {};
  txs.forEach((t) => {
    const name = t.category || (t.type === 'transfer' ? 'Transfer' : 'Other');
    map[name] = (map[name] || 0) + (t.amount || 0);
  });
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export default function Reports() {
  const { user } = useAuthStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [account, setAccount] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAccounts(); }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/analytics/monthly-report', { params: { month, year } });
        setReport(data.data);
        setCategory('');
      } finally {
        setLoading(false);
      }
    })();
  }, [month, year]);

  const allTxs = report?.transactions || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTxs.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (account && accountId(t) !== account && String(t.toAccount?._id || t.toAccount || '') !== account) return false;
      if (category && (t.category || '') !== category) return false;
      if (q) {
        const hay = `${t.description || ''} ${t.category || ''} ${t.notes || ''} ${t.account?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTxs, type, account, category, search]);

  const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const transfer = filtered.filter((t) => t.type === 'transfer').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const categories = groupByCategory(
    type === 'all' ? filtered.filter((t) => t.type === 'expense') : filtered
  );
  const categoryOptions = [...new Set(allTxs
    .filter((t) => type === 'all' || t.type === type)
    .map((t) => t.category)
    .filter(Boolean))].sort();

  const breakdownTitle = type === 'income'
    ? 'Income by category'
    : type === 'transfer'
      ? 'Transfers by category'
      : 'Spending by category';

  const stats = type === 'income'
    ? [
      { label: 'Total income', value: income, color: 'text-emerald-600' },
      { label: 'Transactions', value: filtered.length, count: true },
      { label: 'Categories', value: categories.length, count: true },
    ]
    : type === 'expense'
      ? [
        { label: 'Total expenses', value: expense, color: 'text-red-600' },
        { label: 'Transactions', value: filtered.length, count: true },
        { label: 'Categories', value: categories.length, count: true },
      ]
      : type === 'transfer'
        ? [
          { label: 'Total transferred', value: transfer, color: 'text-indigo-600' },
          { label: 'Transactions', value: filtered.length, count: true },
        ]
        : [
          { label: 'Income', value: income, color: 'text-emerald-600' },
          { label: 'Expenses', value: expense, color: 'text-red-600' },
          { label: 'Net', value: net, color: net >= 0 ? 'text-indigo-600' : 'text-red-600' },
          { label: 'Savings rate', value: savingsRate, pct: true },
        ];

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader
        title="Monthly report"
        subtitle="Filter by type, account, and category — then print or save as PDF"
        action={
          <button onClick={() => window.print()} className="btn-primary print:hidden">
            <Printer size={16} /> Print / PDF
          </button>
        }
      />

      <div className="card p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setType(f.id); setCategory(''); }}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                type === f.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input-field text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2026, i, 1).toLocaleString(localeForCurrency(user?.currency), { month: 'long' })}</option>
            ))}
          </select>
          <input type="number" className="input-field text-sm" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <select className="input-field text-sm" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <select className="input-field text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search description, category, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading || !report ? <div className="card"><LoadingSpinner center /></div> : (
        <div className="space-y-4">
          <div className={`grid grid-cols-2 ${stats.length > 3 ? 'lg:grid-cols-4' : stats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3`}>
            {stats.map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-gray-400 uppercase font-semibold">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color || 'text-gray-900 dark:text-white'}`}>
                  {s.pct ? `${Number(s.value || 0).toFixed(0)}%` : s.count ? s.value : formatCurrency(s.value, user?.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold">{breakdownTitle}</div>
            {categories.length === 0 ? (
              <EmptyState title="No matching transactions" description="Try a different type, account, or category." />
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.name} className="border-t border-gray-50 dark:border-gray-800 list-row">
                      <td className="px-5 py-2.5">{c.name}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{formatCurrency(c.total, user?.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold">
              Transactions ({filtered.length})
            </div>
            {filtered.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Nothing in this filter.</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((tx) => (
                  <div key={tx._id} className="flex items-start gap-3 px-4 sm:px-5 py-3 list-row">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description || tx.category}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {formatDate(tx.date, 'short')} · {tx.account?.name || 'Account'}
                        {tx.category ? ` · ${tx.category}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${
                        tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}
                        {formatCurrency(tx.amount, user?.currency)}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <Badge variant={tx.type} size="xs">{tx.type}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
