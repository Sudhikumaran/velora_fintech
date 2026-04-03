import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wallet, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTransactionStore } from '../store/transactionStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_CATEGORIES } from '../utils/constants';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#14532d', '#6366f1', '#10b981', '#059669', '#047857'];

export default function Income() {
  const { transactions, fetchTransactions, createTransaction, isLoading } = useTransactionStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    account: '', type: 'income', amount: '', category: '',
    description: '', date: new Date().toISOString().split('T')[0], notes: '',
  });

  useEffect(() => {
    fetchAccounts();
    fetchTransactions({ type: 'income', limit: 50 });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTransaction(form);
    setModalOpen(false);
    fetchTransactions({ type: 'income', limit: 50 });
  };

  const totalIncome = transactions.reduce((s, t) => s + t.amount, 0);

  const byCategory = transactions.reduce((acc, t) => {
    const existing = acc.find((a) => a.category === t.category);
    if (existing) existing.total += t.amount;
    else acc.push({ category: t.category, total: t.amount });
    return acc;
  }, []).sort((a, b) => b.total - a.total);

  const byMonth = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'short', year: '2-digit' });
    const existing = acc.find((a) => a.month === month);
    if (existing) existing.total += t.amount;
    else acc.push({ month, total: t.amount });
    return acc;
  }, []).slice(-6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        subtitle="Track all your income sources"
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Income</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Income', value: formatCurrency(totalIncome, user?.currency), color: 'text-green-600' },
          { label: 'Income Sources', value: byCategory.length, color: 'text-indigo-600' },
          { label: 'This Month', value: formatCurrency(transactions.filter((t) => new Date(t.date).getMonth() === new Date().getMonth()).reduce((s, t) => s + t.amount, 0), user?.currency), color: 'text-blue-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Monthly Income</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byMonth} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v, user?.currency)} />
              <Bar dataKey="total" name="Income" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">By Source</h2>
          {byCategory.length > 0 ? (
            <div className="space-y-3">
              {byCategory.slice(0, 6).map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-gray-700 dark:text-gray-300">{cat.category}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(cat.total, user?.currency)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.total / totalIncome) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No income data</div>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Income History</h2>
        </div>
        {isLoading ? <LoadingSpinner center /> : transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No income recorded"
            description="Start tracking your income sources."
            action={<button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Income</button>}
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {transactions.slice(0, 20).map((tx) => (
              <div key={tx._id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{tx.description || tx.category}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(tx.date, 'short')}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <Badge variant="income" size="xs">{tx.category}</Badge>
                  </div>
                </div>
                <p className="text-sm font-semibold text-green-600">+{formatCurrency(tx.amount, user?.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Income">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Account</label>
              <select className="input-field" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} required>
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Source / Category</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select source</option>
                {TRANSACTION_CATEGORIES.income.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <input className="input-field" placeholder="e.g. Monthly salary" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">Add Income</button>
        </form>
      </Modal>
    </div>
  );

  function openCreate() {
    setForm({ account: accounts[0]?._id || '', type: 'income', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setModalOpen(true);
  }
}
