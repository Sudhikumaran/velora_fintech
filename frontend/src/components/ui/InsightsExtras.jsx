import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, AlertTriangle, Wallet } from 'lucide-react';
import { useExtrasStore } from '../../store/financeStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/formatters';
import { TRANSACTION_CATEGORIES } from '../../utils/constants';
import api from '../../utils/api';

export default function InsightsExtras() {
  const { user } = useAuthStore();
  const { insights, fetchInsights } = useExtrasStore();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [check, setCheck] = useState(null);
  const [cutPct, setCutPct] = useState(20);
  const [what, setWhat] = useState(null);

  useEffect(() => { fetchInsights(); }, []);

  if (!insights) return null;
  const currency = user?.currency;
  const leftover = insights.leftover;
  const savings = insights.savingsRate || 0;
  const week = insights.weekly || {};
  const weekDelta = (week.spent || 0) - (week.previous || 0);

  const runCheck = async (e) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    const { data } = await api.get('/extras/spend-check', { params: { amount: n, category } });
    setCheck(data.data);
  };

  const runWhatIf = async () => {
    const { data } = await api.get('/extras/what-if', { params: { category: category || 'Food & Dining', cutPct } });
    setWhat(data.data);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-5 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Savings rate</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{savings.toFixed(0)}%</p>
        <p className="text-sm text-gray-500">
          {formatCurrency(leftover, currency)} left this month
          {insights.emiMonthly > 0 ? ` after EMIs of ${formatCurrency(insights.emiMonthly, currency)}` : ''}.
        </p>
        {insights.history?.length > 1 && (
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={insights.history}>
              <XAxis dataKey="month" hide />
              <YAxis hide />
              <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              <Area type="monotone" dataKey="netWorth" stroke="#6366f1" fill="#6366f133" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {insights.householdWorth && (
          <p className="text-xs text-indigo-600">
            Household ({insights.householdWorth.name}): {formatCurrency(insights.householdWorth.netWorth, currency)}
          </p>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-indigo-600" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">Can I spend this?</p>
        </div>
        <form onSubmit={runCheck} className="flex gap-2">
          <input
            type="number"
            min="1"
            step="1"
            className="input-field"
            placeholder="₹500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select className="input-field w-36" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Overall</option>
            {(TRANSACTION_CATEGORIES.expense || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn-primary shrink-0">Check</button>
        </form>
        {check && (
          <div className="text-sm space-y-1">
            <p className={check.leftoverOk ? 'text-emerald-600' : 'text-red-500'}>
              {check.leftoverOk ? 'Yes' : 'Tight'} — leftover after this: {formatCurrency(check.leftoverMonth, currency)}
            </p>
            {(check.budgets || []).slice(0, 3).map((b) => (
              <p key={b.category} className={b.ok ? 'text-gray-600 dark:text-gray-300' : 'text-red-500'}>
                {b.category}: {formatCurrency(b.after, currency)} left in budget
              </p>
            ))}
          </div>
        )}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-1">This week</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Spent {formatCurrency(week.spent, currency)}
            {week.previous != null ? ` vs ${formatCurrency(week.previous, currency)} last week` : ''}
            {weekDelta > 0 ? ' · up' : weekDelta < 0 ? ' · down' : ''}.
          </p>
          {week.topCategory && (
            <p className="text-xs text-gray-500 mt-1">Top: {week.topCategory.name} ({formatCurrency(week.topCategory.amount, currency)})</p>
          )}
          {(insights.budgets || []).filter((b) => b.remaining <= 0).slice(0, 2).map((b) => (
            <p key={b.category} className="text-xs text-red-500 mt-1">{b.category} is over budget</p>
          ))}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <p className="text-sm font-bold text-gray-900 dark:text-white">Alerts & what-if</p>
        </div>
        {(insights.unusual || []).slice(0, 2).map((u) => (
          <p key={u.category} className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {u.category} is up {u.jump.toFixed(0)}% vs last month
          </p>
        ))}
        {(insights.repeatMerchant || []).slice(0, 2).map((m) => (
          <p key={m.merchant} className="text-sm text-gray-600 dark:text-gray-300">
            {m.merchant} appeared {m.times}× in one day
          </p>
        ))}
        {!insights.unusual?.length && !insights.repeatMerchant?.length && (
          <p className="text-sm text-gray-400">No unusual spend this month.</p>
        )}
        <div className="flex gap-2 pt-1">
          <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {(TRANSACTION_CATEGORIES.expense || []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" min="5" max="80" className="input-field w-20" value={cutPct} onChange={(e) => setCutPct(e.target.value)} />
          <button type="button" className="btn-secondary shrink-0" onClick={runWhatIf}>If I cut</button>
        </div>
        {what && (
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
            <p>Saving {formatCurrency(what.savedMonthly, currency)} / month on {what.category}.</p>
            {(what.debts || []).map((d) => (
              <p key={d.person}>
                {d.person}: EMI finishes ~{Math.round(d.monthsSaved)} month{Math.round(d.monthsSaved) === 1 ? '' : 's'} earlier
              </p>
            ))}
            {!what.debts?.length && <p>Add an EMI to see payoff impact.</p>}
          </div>
        )}
        {(insights.bills || []).filter((b) => b.urgent).slice(0, 3).map((b) => (
          <p key={`${b.kind}-${b.name}`} className="text-xs text-red-500">
            {b.name} due {b.days === 0 ? 'today' : `in ${b.days}d`} · {formatCurrency(b.amount, currency)}
          </p>
        ))}
      </div>
    </div>
  );
}
