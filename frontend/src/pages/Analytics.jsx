import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalyticsStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency } from '../utils/formatters';
import PageHeader from '../components/ui/PageHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';

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

export default function Analytics() {
  const { spendingByCategory, monthlyTrend, cashFlow, fetchSpendingByCategory, fetchMonthlyTrend, fetchCashFlow } = useAnalyticsStore();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState('month');
  const [months, setMonths] = useState('6');

  useEffect(() => {
    fetchSpendingByCategory({ period });
    fetchMonthlyTrend({ months });
    fetchCashFlow({ year: new Date().getFullYear() });
  }, [period, months]);

  const totalExpenses = spendingByCategory.reduce((sum, c) => sum + c.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Insights into your financial health" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
          {['week', 'month', 'year'].map((p) => (
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
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
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
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
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
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
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
