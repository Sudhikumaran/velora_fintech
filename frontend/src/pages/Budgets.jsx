import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useBudgetStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_CATEGORIES, COLORS } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const today = new Date().toISOString().split('T')[0];
const defaultForm = {
  name: '', category: '', limit: '', period: 'monthly',
  startDate: today, endDate: '', color: '#6366f1', alertThreshold: 80,
};

function BudgetForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Budget Name</label>
          <input className="input-field" placeholder="e.g. Groceries" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category</option>
            {TRANSACTION_CATEGORIES.expense.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Limit Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })} required />
        </div>
        <div>
          <label className="label">Period</label>
          <select className="input-field" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          <label className="label">Alert at (%)</label>
          <input type="number" min="0" max="100" className="input-field" value={form.alertThreshold}
            onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input-field" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
        </div>
        <div>
          <label className="label">End Date (optional)</label>
          <input type="date" className="input-field" value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                className={`w-7 h-7 rounded-lg ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Budget' : 'Create Budget'}</button>
    </form>
  );
}

export default function Budgets() {
  const { budgets, fetchBudgets, createBudget, updateBudget, deleteBudget, isLoading } = useBudgetStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    fetchBudgets();
    const onFocus = () => fetchBudgets();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const openCreate = () => { setForm(defaultForm); setEditBudget(null); setModalOpen(true); };
  const openEdit = (b) => {
    setForm({ name: b.name, category: b.category, limit: b.limit, period: b.period, startDate: b.startDate?.split('T')[0] || today, endDate: b.endDate?.split('T')[0] || '', color: b.color, alertThreshold: b.alertThreshold });
    setEditBudget(b);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      limit: parseFloat(form.limit),
      alertThreshold: parseFloat(form.alertThreshold),
      endDate: form.endDate || undefined,
    };
    const ok = editBudget
      ? await updateBudget(editBudget._id, payload)
      : await createBudget(payload);
    if (ok) setModalOpen(false);
  };

  const totalLimit = budgets.reduce((s, b) => s + Number(b.limit), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        subtitle="Track your spending limits"
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Budget</button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Budget', value: formatCurrency(totalLimit, user?.currency), color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Total Spent', value: formatCurrency(totalSpent, user?.currency), color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Remaining', value: formatCurrency(totalLimit - totalSpent, user?.currency), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {isLoading ? <LoadingSpinner center /> : budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No budgets yet"
          description="Create budgets to track and control your spending."
          action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Create Budget</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget, i) => {
            const limit = Number(budget.limit);
            const spent = Number(budget.spent || 0);
            const pct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
            const isOver = pct >= 100;
            const isWarning = pct >= budget.alertThreshold && !isOver;
            const notStarted = budget.notStarted;

            return (
              <motion.div
                key={budget._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="card p-6 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                      {isOver && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Over budget</span>}
                      {isWarning && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">Near limit</span>}
                      {notStarted && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Not started</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="xs">{budget.category}</Badge>
                      <Badge variant="default" size="xs" className="capitalize">{budget.period}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(budget)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Edit3 size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => setDeleteId(budget._id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Spent</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(spent, user?.currency)} / {formatCurrency(limit, user?.currency)}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: isOver ? '#ef4444' : isWarning ? '#eab308' : budget.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {pct.toFixed(0)}% used
                    </span>
                    <span className="text-gray-500">
                      {formatCurrency(Math.max(0, limit - spent), user?.currency)} left
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editBudget ? 'Edit Budget' : 'Create Budget'}>
        <BudgetForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editBudget} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteBudget(deleteId)}
        title="Delete Budget"
        message="Are you sure you want to delete this budget?"
      />
    </div>
  );
}
