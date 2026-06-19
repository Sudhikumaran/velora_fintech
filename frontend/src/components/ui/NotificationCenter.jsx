import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, CheckCircle2, Calendar, TrendingDown, RefreshCw } from 'lucide-react';
import { useBudgetStore, useSubscriptionStore, useDebtStore } from '../../store/financeStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getEffectiveDueDate, getDaysUntilDue } from '../../utils/debtHelpers';
import { useAuthStore } from '../../store/authStore';

function buildNotifications(budgets, subscriptions, debts, currency) {
  const notifs = [];
  const today = new Date();

  budgets.forEach((b) => {
    const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    if (pct >= 100) notifs.push({ id: `budget-over-${b._id}`, type: 'danger', icon: AlertTriangle, title: 'Budget exceeded', body: `"${b.name}" is over budget by ${formatCurrency(b.spent - b.limit, currency)}.`, time: 'Now' });
    else if (pct >= b.alertThreshold) notifs.push({ id: `budget-warn-${b._id}`, type: 'warning', icon: AlertTriangle, title: 'Budget warning', body: `"${b.name}" is at ${pct.toFixed(0)}% of its limit.`, time: 'Now' });
  });

  subscriptions.filter((s) => s.status === 'active' && s.nextBillingDate).forEach((s) => {
    const days = Math.ceil((new Date(s.nextBillingDate) - today) / (1000 * 60 * 60 * 24));
    if (days <= 0) notifs.push({ id: `sub-due-${s._id}`, type: 'danger', icon: RefreshCw, title: 'Payment due today', body: `${s.name} — ${formatCurrency(s.amount, currency)} due now.`, time: formatDate(s.nextBillingDate, 'short') });
    else if (days <= 3) notifs.push({ id: `sub-soon-${s._id}`, type: 'warning', icon: Calendar, title: 'Upcoming bill', body: `${s.name} — ${formatCurrency(s.amount, currency)} due in ${days} day${days > 1 ? 's' : ''}.`, time: formatDate(s.nextBillingDate, 'short') });
  });

  debts.filter((d) => d.status !== 'paid').forEach((d) => {
    const dueDate = getEffectiveDueDate(d);
    if (!dueDate) return;
    const days = getDaysUntilDue(d);
    if (days < 0) notifs.push({ id: `debt-over-${d._id}`, type: 'danger', icon: TrendingDown, title: 'Debt overdue', body: `Debt to/from "${d.person}" was due ${Math.abs(days)} days ago.`, time: formatDate(dueDate, 'short') });
    else if (days <= 7) notifs.push({ id: `debt-soon-${d._id}`, type: 'warning', icon: TrendingDown, title: 'Debt due soon', body: `${formatCurrency(d.remainingAmount || d.amount, currency)} owed to/from "${d.person}" in ${days} days.`, time: formatDate(dueDate, 'short') });
  });

  return notifs;
}

const typeStyles = {
  danger:  { badge: 'bg-red-100 text-red-600',   icon: 'text-red-500',     dot: 'bg-red-500' },
  warning: { badge: 'bg-amber-100 text-amber-600', icon: 'text-amber-500',  dot: 'bg-amber-500' },
  success: { badge: 'bg-emerald-100 text-emerald-600', icon: 'text-emerald-500', dot: 'bg-emerald-500' },
  info:    { badge: 'bg-indigo-100 text-indigo-600', icon: 'text-indigo-500',   dot: 'bg-indigo-500' },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('velora_dismissed_notifs') || '[]'); } catch { return []; }
  });
  const { budgets, fetchBudgets } = useBudgetStore();
  const { subscriptions, fetchSubscriptions } = useSubscriptionStore();
  const { debts, fetchDebts } = useDebtStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchBudgets();
    fetchSubscriptions();
    fetchDebts();
  }, []);

  const allNotifs = buildNotifications(budgets, subscriptions, debts, user?.currency);
  const active = allNotifs.filter((n) => !dismissed.includes(n.id));

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('velora_dismissed_notifs', JSON.stringify(next));
  };
  const dismissAll = () => {
    const next = [...dismissed, ...active.map((n) => n.id)];
    setDismissed(next);
    localStorage.setItem('velora_dismissed_notifs', JSON.stringify(next));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
      >
        <Bell size={17} className="text-gray-500 dark:text-gray-400" />
        {active.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
              style={{ boxShadow: '0 16px 40px rgba(0,0,0,.12)' }}
            >
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
                  {active.length > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">{active.length}</span>
                  )}
                </div>
                {active.length > 0 && (
                  <button onClick={dismissAll} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium">Clear all</button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {active.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">No new alerts.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-gray-800">
                    {active.map((n) => {
                      const s = typeStyles[n.type] || typeStyles.info;
                      return (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.badge.split(' ')[0]}`}>
                            <n.icon size={15} className={s.icon} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                            <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                          </div>
                          <button onClick={() => dismiss(n.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all shrink-0">
                            <X size={13} className="text-gray-400" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
