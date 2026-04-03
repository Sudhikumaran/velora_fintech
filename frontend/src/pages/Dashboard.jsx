import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, ArrowRight, Plus, Sparkles, Lightbulb, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { useAnalyticsStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate, getTrend } from '../utils/formatters';
import StatCard from '../components/ui/StatCard';
import { SkeletonDashboard } from '../components/ui/Skeleton';

const PIE_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6'];

const ChartTip = ({ active, payload, label, currency = 'USD' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-2.5 shadow-lg text-xs">
      <p className="text-gray-400 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value, currency)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const { dashboard, monthlyTrend, spendingByCategory, netWorth, fetchDashboard, fetchMonthlyTrend, fetchSpendingByCategory, fetchNetWorth } = useAnalyticsStore();
  const currSymbol = user?.currency === 'INR' ? '₹' : user?.currency === 'EUR' ? '€' : user?.currency === 'GBP' ? '£' : '$';
  const fmtK = (v) => `${currSymbol}${(v / 1000).toFixed(0)}k`;

  useEffect(() => {
    fetchDashboard();
    fetchMonthlyTrend({ months: 6 });
    fetchSpendingByCategory({ period: 'month' });
    fetchNetWorth();
  }, []);

  if (!dashboard) return <SkeletonDashboard />;

  // Generate financial insights
  const insights = [];
  const savingsRate = dashboard.monthlyIncome > 0 ? (dashboard.netSavings / dashboard.monthlyIncome) * 100 : 0;
  if (savingsRate >= 20) insights.push({ type: 'success', text: `Great job! You're saving ${savingsRate.toFixed(0)}% of your income this month.` });
  else if (savingsRate > 0) insights.push({ type: 'warning', text: `Your savings rate is ${savingsRate.toFixed(0)}%. Aim for at least 20%.` });
  else if (dashboard.monthlyIncome > 0) insights.push({ type: 'danger', text: `Expenses exceed income this month by ${formatCurrency(Math.abs(dashboard.netSavings), user?.currency)}.` });

  const topCategory = spendingByCategory[0];
  if (topCategory && dashboard.monthlyExpenses > 0) {
    const pct = ((topCategory.total / dashboard.monthlyExpenses) * 100).toFixed(0);
    if (pct > 40) insights.push({ type: 'warning', text: `${pct}% of spending is on "${topCategory._id}". Consider diversifying.` });
    else insights.push({ type: 'info', text: `Top spending category: "${topCategory._id}" at ${pct}% of total expenses.` });
  }
  if (dashboard.totalAccounts === 0) insights.push({ type: 'info', text: 'Add your first account to start tracking your finances.' });
  if (dashboard.netSavings > 0 && dashboard.monthlyIncome > 0) insights.push({ type: 'success', text: `You have ${formatCurrency(dashboard.netSavings, user?.currency)} left to save or invest this month.` });

  const incomeTrend  = getTrend(dashboard.monthlyIncome,   dashboard.lastMonthIncome);
  const expenseTrend = getTrend(dashboard.monthlyExpenses, dashboard.lastMonthExpenses);

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Here's your financial snapshot for today.</p>
        </div>
        <Link to="/transactions" className="btn-primary text-xs hidden sm:inline-flex">
          <Plus size={14} /> Add Transaction
        </Link>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Balance"     value={formatCurrency(dashboard.totalBalance,    user?.currency)} subtitle={`${dashboard.totalAccounts} accounts`}  icon={Wallet}      color="indigo" delay={0}   />
        <StatCard title="Monthly Income"    value={formatCurrency(dashboard.monthlyIncome,   user?.currency)} trend={incomeTrend}  subtitle="vs last month" icon={TrendingUp}   color="green"  delay={0.05}/>
        <StatCard title="Monthly Expenses"  value={formatCurrency(dashboard.monthlyExpenses, user?.currency)} trend={{ ...expenseTrend, direction: expenseTrend.direction === 'up' ? 'down' : expenseTrend.direction === 'down' ? 'up' : 'neutral' }} subtitle="vs last month" icon={TrendingDown} color="red" delay={0.1}/>
        <StatCard title="Net Savings"       value={formatCurrency(dashboard.netSavings,      user?.currency)} subtitle="this month" icon={dashboard.netSavings >= 0 ? ArrowUpRight : ArrowDownRight} color={dashboard.netSavings >= 0 ? 'green' : 'red'} delay={0.15}/>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Income vs Expenses</p>
              <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
            </div>
            <Link to="/analytics" className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1">
              Full report <ArrowRight size={12} />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#22c55e" stopOpacity={0.18}/>
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#ef4444" stopOpacity={0.14}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<ChartTip currency={user?.currency} />} />
              <Area type="monotone" dataKey="income"  name="Income"   stroke="#22c55e" fill="url(#gIncome)"  strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#gExpense)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Spending</p>
              <p className="text-xs text-gray-400 mt-0.5">This month</p>
            </div>
          </div>
          {spendingByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={spendingByCategory.slice(0,6)} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="total" strokeWidth={0}>
                    {spendingByCategory.slice(0,6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v, user?.currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {spendingByCategory.slice(0,5).map((cat, i) => {
                  const total = spendingByCategory.reduce((s,c) => s+c.total,0);
                  return (
                    <div key={cat._id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">{cat._id}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{((cat.total/total)*100).toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">No data yet</div>
          )}
        </motion.div>
      </div>

      {/* Net Worth + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Net Worth Card */}
        {netWorth && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="card p-5"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Net Worth</p>
            <p className="text-3xl font-bold tracking-tight mb-4" style={{ color: netWorth.netWorth >= 0 ? '#6366f1' : '#ef4444' }}>
              {formatCurrency(netWorth.netWorth, user?.currency)}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Assets</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(netWorth.assets, user?.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Liabilities</span>
                <span className="font-semibold text-red-500">{formatCurrency(netWorth.liabilities, user?.currency)}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-3">
                {netWorth.assets > 0 && (
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, (netWorth.assets / (netWorth.assets + netWorth.liabilities)) * 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Assets</span><span>Liabilities</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Insights Panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          className={`card p-5 ${netWorth ? 'lg:col-span-2' : 'lg:col-span-3'}`}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Lightbulb size={14} className="text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Financial Insights</p>
          </div>
          <div className="space-y-2.5">
            {insights.length === 0 ? (
              <p className="text-sm text-gray-400">Add transactions to get personalized insights.</p>
            ) : insights.map((ins, i) => {
              const cfg = {
                success: { icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                warning: { icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
                danger:  { icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' },
                info:    { icon: Lightbulb,     color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              }[ins.type];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                  className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg}`}
                >
                  <cfg.icon size={15} className={`${cfg.color} mt-0.5 shrink-0`} />
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{ins.text}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Accounts + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Accounts</p>
            <Link to="/accounts" className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {dashboard.accounts?.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {dashboard.accounts.slice(0, 4).map((acc) => (
                <div key={acc._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: acc.color + '18' }}>
                      <CreditCard size={16} style={{ color: acc.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{acc.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${acc.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(acc.balance, user?.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <p className="text-sm text-gray-400 mb-3">No accounts added yet</p>
              <Link to="/accounts" className="btn-primary text-xs"><Plus size={13} /> Add Account</Link>
            </div>
          )}
        </motion.div>

        {/* Recent transactions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-gray-800">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Recent Transactions</p>
            <Link to="/transactions" className="text-xs text-indigo-600 hover:text-indigo-500 font-semibold flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {dashboard.recentTransactions?.length > 0 ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {dashboard.recentTransactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                    }`}>
                      {tx.type === 'income'
                        ? <ArrowUpRight size={16} className="text-emerald-600" />
                        : <ArrowDownRight size={16} className="text-red-500" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(tx.date, 'short')}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, user?.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <p className="text-sm text-gray-400 mb-3">No transactions yet</p>
              <Link to="/transactions" className="btn-primary text-xs"><Plus size={13} /> Add Transaction</Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
