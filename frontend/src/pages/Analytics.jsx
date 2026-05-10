import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, Filter } from 'lucide-react';
import { useAnalyticsStore } from '../store/financeStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import { exportToCSV, analyticsDailyReportToCSV } from '../utils/csvExport';
import PageHeader from '../components/ui/PageHeader';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

const ChartTooltip = ({ active, payload, label, currency = 'USD' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-lg text-sm">
        <p className="text-gray-500 mb-1 text-xs">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCurrency(p.value, currency) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function toLocalDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + mondayOffset);
  x.setHours(0, 0, 0, 0);
  return x;
}

function defaultReportRange() {
  const now = new Date();
  const sm = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: toLocalDateInput(sm),
    endDate: toLocalDateInput(now),
    account: '',
    type: '',
  };
}

export default function Analytics() {
  const {
    spendingByCategory, monthlyTrend, cashFlow, dailyReport,
    budgetAnalysis,
    fetchSpendingByCategory, fetchMonthlyTrend, fetchCashFlow, fetchDailyReport, fetchBudgetAnalysis,
  } = useAnalyticsStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [months, setMonths] = useState('6');
  const [reportFilters, setReportFilters] = useState(defaultReportRange);
  const [showReportFilters, setShowReportFilters] = useState(false);
  const [activeRangePreset, setActiveRangePreset] = useState('month');
  const [analysisPreset, setAnalysisPreset] = useState('lastMonth'); // day|week|month|lastMonth|year|all|custom
  const [analysisGroupBy, setAnalysisGroupBy] = useState(''); // '', 'day', 'week'
  const [analysisCustom, setAnalysisCustom] = useState(() => {
    const now = new Date();
    const sm = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toLocalDateInput(sm), endDate: toLocalDateInput(now) };
  });
  const [analysisMonth, setAnalysisMonth] = useState(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [analysisYear, setAnalysisYear] = useState(() => String(new Date().getFullYear()));
  const currSymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
  const fmtK = (v) => `${currSymbol}${(v / 1000).toFixed(0)}k`;

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchSpendingByCategory({ period });
    fetchMonthlyTrend({ months });
    fetchCashFlow({ year: new Date().getFullYear() });
  }, [period, months]);

  useEffect(() => {
    const params = { period: analysisPreset };
    if (analysisPreset === 'month') {
      const [y, m] = analysisMonth.split('-');
      params.year = y;
      params.month = m;
    } else if (analysisPreset === 'year') {
      params.year = analysisYear;
    } else if (analysisPreset === 'custom') {
      params.startDate = analysisCustom.startDate;
      params.endDate = analysisCustom.endDate;
    }
    if (analysisGroupBy) params.groupBy = analysisGroupBy;
    fetchBudgetAnalysis(params);
  }, [analysisPreset, analysisMonth, analysisYear, analysisCustom.startDate, analysisCustom.endDate, analysisGroupBy]);

  useEffect(() => {
    const params = {};
    if (reportFilters.startDate) params.startDate = reportFilters.startDate;
    if (reportFilters.endDate) params.endDate = reportFilters.endDate;
    if (reportFilters.account) params.account = reportFilters.account;
    if (reportFilters.type) params.type = reportFilters.type;
    fetchDailyReport(params);
  }, [reportFilters]);

  const totalExpenses = spendingByCategory.reduce((sum, c) => sum + c.total, 0);

  const reportTotals = useMemo(() => {
    const s = dailyReport?.series || [];
    return s.reduce(
      (acc, r) => ({ income: acc.income + r.income, expense: acc.expense + r.expense }),
      { income: 0, expense: 0 },
    );
  }, [dailyReport]);

  const setThisWeekRange = () => {
    const now = new Date();
    const start = startOfWeekMonday(now);
    setReportFilters((f) => ({
      ...f,
      startDate: toLocalDateInput(start),
      endDate: toLocalDateInput(now),
    }));
    setActiveRangePreset('week');
  };

  const setThisMonthRange = () => {
    const now = new Date();
    const sm = new Date(now.getFullYear(), now.getMonth(), 1);
    setReportFilters((f) => ({
      ...f,
      startDate: toLocalDateInput(sm),
      endDate: toLocalDateInput(now),
    }));
    setActiveRangePreset('month');
  };

  const setLastSixMonthsRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    setReportFilters((f) => ({
      ...f,
      startDate: toLocalDateInput(start),
      endDate: toLocalDateInput(now),
    }));
    setActiveRangePreset('sixMonths');
  };

  const rangePresets = [
    { id: 'week', label: 'This week', fn: setThisWeekRange },
    { id: 'month', label: 'This month', fn: setThisMonthRange },
    { id: 'sixMonths', label: 'Last 6 months', fn: setLastSixMonthsRange },
  ];

  const presetChipClass = (id) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
      activeRangePreset === id
        ? 'bg-indigo-600 text-white border-indigo-600'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`;

  const handleExportReport = () => {
    const rows = analyticsDailyReportToCSV(dailyReport?.series);
    if (!rows.length) return;
    const acc = reportFilters.account ? `-acct-${reportFilters.account.slice(-6)}` : '';
    const typ = reportFilters.type ? `-${reportFilters.type}` : '';
    exportToCSV(
      rows,
      `analytics-daily${typ}${acc}-${reportFilters.startDate}_${reportFilters.endDate}.csv`,
    );
  };

  const dailyChartData = (dailyReport?.series || []).map((r) => ({
    ...r,
    label: r.date.slice(5),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Insights into your financial health" />

      {/* Monthly budget analysis */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Budget analysis</h2>
            <p className="text-xs text-gray-500 mt-0.5">Filter by day, week, month, last month, year, or a custom range</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'day', label: 'Today' },
            { id: 'week', label: 'This week' },
            { id: 'month', label: 'Month' },
            { id: 'lastMonth', label: 'Last month' },
            { id: 'year', label: 'Year' },
            { id: 'all', label: 'Overall' },
            { id: 'custom', label: 'Custom' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setAnalysisPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                analysisPreset === p.id
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p.label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
              {[
                { id: '', label: 'Summary' },
                { id: 'day', label: 'Daily' },
                { id: 'week', label: 'Weekly' },
              ].map((g) => (
                <button
                  key={g.id || 'none'}
                  type="button"
                  onClick={() => setAnalysisGroupBy(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    analysisGroupBy === g.id ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(analysisPreset === 'month' || analysisPreset === 'year' || analysisPreset === 'custom') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {analysisPreset === 'month' && (
              <div className="sm:col-span-1">
                <label className="label text-xs mb-1 block">Month</label>
                <input type="month" className="input-field text-sm w-full" value={analysisMonth} onChange={(e) => setAnalysisMonth(e.target.value)} />
              </div>
            )}
            {analysisPreset === 'year' && (
              <div className="sm:col-span-1">
                <label className="label text-xs mb-1 block">Year</label>
                <input type="number" className="input-field text-sm w-full" value={analysisYear} onChange={(e) => setAnalysisYear(e.target.value)} />
              </div>
            )}
            {analysisPreset === 'custom' && (
              <>
                <div>
                  <label className="label text-xs mb-1 block">From</label>
                  <input
                    type="date"
                    className="input-field text-sm w-full"
                    value={analysisCustom.startDate}
                    onChange={(e) => setAnalysisCustom((c) => ({ ...c, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-xs mb-1 block">To</label>
                  <input
                    type="date"
                    className="input-field text-sm w-full"
                    value={analysisCustom.endDate}
                    onChange={(e) => setAnalysisCustom((c) => ({ ...c, endDate: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {budgetAnalysis ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/15 px-3 py-2 border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-xs text-indigo-700 dark:text-indigo-400/90">Total budget</p>
                <p className="font-semibold text-indigo-900 dark:text-indigo-300">{formatCurrency(budgetAnalysis.totalLimit, user?.currency)}</p>
              </div>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/15 px-3 py-2 border border-red-100 dark:border-red-900/30">
                <p className="text-xs text-red-700 dark:text-red-400/90">Total spent</p>
                <p className="font-semibold text-red-900 dark:text-red-300">{formatCurrency(budgetAnalysis.totalSpent, user?.currency)}</p>
              </div>
              <div className="rounded-xl bg-green-50 dark:bg-green-900/15 px-3 py-2 border border-green-100 dark:border-green-900/30">
                <p className="text-xs text-green-700 dark:text-green-400/90">Remaining</p>
                <p className="font-semibold text-green-900 dark:text-green-300">{formatCurrency(budgetAnalysis.totalRemaining, user?.currency)}</p>
              </div>
            </div>

            {budgetAnalysis.insights?.length ? (
              <div className="flex flex-wrap gap-2">
                {budgetAnalysis.insights.map((i, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-3 py-1.5 rounded-full border ${
                      i.type === 'danger'
                        ? 'bg-red-50 dark:bg-red-900/15 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300'
                        : i.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-300'
                          : 'bg-green-50 dark:bg-green-900/15 border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-300'
                    }`}
                  >
                    {i.text}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 pr-3 font-medium">Budget</th>
                    <th className="text-left py-2 pr-3 font-medium">Category</th>
                    <th className="text-right py-2 pr-3 font-medium">Limit</th>
                    <th className="text-right py-2 pr-3 font-medium">Spent</th>
                    <th className="text-right py-2 font-medium">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetAnalysis.budgets?.map((b) => {
                    const usage = Number.isFinite(b.utilizationPct) ? b.utilizationPct : 0;
                    const over = b.spent > b.limit;
                    return (
                      <>
                        <tr key={b._id} className="border-b border-gray-50 dark:border-gray-900/40">
                          <td className="py-2 pr-3 text-gray-900 dark:text-white font-medium">{b.name}</td>
                          <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{b.category}</td>
                          <td className="py-2 pr-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(b.limit, user?.currency)}</td>
                          <td className={`py-2 pr-3 text-right ${over ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                            {formatCurrency(b.spent, user?.currency)}
                          </td>
                          <td className={`py-2 text-right ${over ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                            {usage.toFixed(0)}%
                          </td>
                        </tr>
                        {analysisGroupBy && Array.isArray(b.breakdown) && b.breakdown.length > 0 && (
                          <tr className="border-b border-gray-50 dark:border-gray-900/40">
                            <td colSpan={5} className="pb-3">
                              <div className="mt-2 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-3">
                                <div className="text-xs text-gray-500 mb-2">{analysisGroupBy === 'day' ? 'Daily' : 'Weekly'} breakdown</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {b.breakdown.slice(0, 12).map((x) => (
                                    <div key={x.key} className="flex items-center justify-between text-xs bg-white/70 dark:bg-gray-950/30 border border-gray-100 dark:border-gray-800 rounded-lg px-3 py-2">
                                      <span className="text-gray-600 dark:text-gray-400">{x.label}</span>
                                      <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(x.spent, user?.currency)}</span>
                                    </div>
                                  ))}
                                </div>
                                {b.breakdown.length > 12 && (
                                  <div className="text-[11px] text-gray-400 mt-2">Showing first 12 buckets</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Loading analysis…</div>
        )}
      </motion.div>

      {/* Daily income & expense report */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Daily income & expenses</h2>
            <p className="text-xs text-gray-500 mt-0.5">Per-day totals (income vs spending), same filters as transactions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportReport}
              disabled={!dailyReport?.series?.length}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              title="Download CSV"
            >
              <Download size={16} /> Export report
            </button>
            <button
              type="button"
              onClick={() => setShowReportFilters(!showReportFilters)}
              className={`btn-secondary flex items-center gap-2 ${showReportFilters ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200' : ''}`}
            >
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rangePresets.map(({ id, label, fn }) => (
            <button key={id} type="button" onClick={fn} className={presetChipClass(id)}>
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Custom range</p>
            {activeRangePreset === 'custom' && (
              <span className="text-[10px] uppercase tracking-wide text-indigo-600 dark:text-indigo-400 font-semibold">Custom</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs mb-1 block">From</label>
              <input
                type="date"
                className="input-field text-sm w-full"
                value={reportFilters.startDate}
                onChange={(e) => {
                  setReportFilters((f) => ({ ...f, startDate: e.target.value }));
                  setActiveRangePreset('custom');
                }}
              />
            </div>
            <div>
              <label className="label text-xs mb-1 block">To</label>
              <input
                type="date"
                className="input-field text-sm w-full"
                value={reportFilters.endDate}
                onChange={(e) => {
                  setReportFilters((f) => ({ ...f, endDate: e.target.value }));
                  setActiveRangePreset('custom');
                }}
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showReportFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <select
                  className="input-field text-sm"
                  value={reportFilters.type}
                  onChange={(e) => setReportFilters((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="">Income & expenses</option>
                  <option value="income">Income only</option>
                  <option value="expense">Expenses only</option>
                </select>
                <select
                  className="input-field text-sm"
                  value={reportFilters.account}
                  onChange={(e) => setReportFilters((f) => ({ ...f, account: e.target.value }))}
                >
                  <option value="">All accounts</option>
                  {accounts.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-green-50 dark:bg-green-900/15 px-3 py-2 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-green-700 dark:text-green-400/90">Income in range</p>
            <p className="font-semibold text-green-900 dark:text-green-300">{formatCurrency(reportTotals.income, user?.currency)}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/15 px-3 py-2 border border-red-100 dark:border-red-900/30">
            <p className="text-xs text-red-700 dark:text-red-400/90">Expenses in range</p>
            <p className="font-semibold text-red-900 dark:text-red-300">{formatCurrency(reportTotals.expense, user?.currency)}</p>
          </div>
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/15 px-3 py-2 border border-indigo-100 dark:border-indigo-900/30">
            <p className="text-xs text-indigo-700 dark:text-indigo-400/90">Net</p>
            <p className="font-semibold text-indigo-900 dark:text-indigo-300">{formatCurrency(reportTotals.income - reportTotals.expense, user?.currency)}</p>
          </div>
        </div>

        {dailyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip content={<ChartTooltip currency={user?.currency} />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data for this range</div>
        )}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          {['day', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                period === p ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          {['3', '6', '12'].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                months === m ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {m}mo
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Spending by Category + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Spending by Category</h2>
          <p className="text-xs text-gray-500 mb-4">Total: {formatCurrency(totalExpenses, user?.currency)}</p>
          {spendingByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={spendingByCategory.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={50}
                    paddingAngle={2}
                    dataKey="total"
                  >
                    {spendingByCategory.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, user?.currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {spendingByCategory.slice(0, 6).map((cat, i) => (
                  <div key={cat._id} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600 dark:text-gray-400 truncate">{cat._id}</span>
                        <span className="text-gray-900 dark:text-white font-medium ml-2">{((cat.total / totalExpenses) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(cat.total / totalExpenses) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No spending data</div>
          )}
        </motion.div>

        {/* Top Category Bars */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h2>
          {spendingByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={spendingByCategory.slice(0, 8)} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtK} />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 11 }} width={75} />
                <Tooltip content={<ChartTooltip currency={user?.currency} />} />
                <Bar dataKey="total" name="Amount" radius={[0, 6, 6, 0]}>
                  {spendingByCategory.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-400 text-sm">No data for this period</div>
          )}
        </motion.div>
      </div>

      {/* Row 2: Monthly Trend */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Income vs Expenses Trend</h2>
        {monthlyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip content={<ChartTooltip currency={user?.currency} />} />
              <Legend />
              <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" fill="url(#incomeGrad2)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#expenseGrad2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-60 text-gray-400 text-sm">No trend data available</div>
        )}
      </motion.div>

      {/* Row 3: Cash Flow */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Cash Flow ({new Date().getFullYear()})</h2>
        {cashFlow.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cashFlow} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtK} />
              <Tooltip content={<ChartTooltip currency={user?.currency} />} />
              <Legend />
              <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-60 text-gray-400 text-sm">No cash flow data</div>
        )}
      </motion.div>
    </div>
  );
}
