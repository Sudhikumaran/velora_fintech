import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, Flag, PlusCircle, CheckCircle } from 'lucide-react';
import { useGoalStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { GOAL_CATEGORIES, COLORS } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const defaultForm = { name: '', targetAmount: '', currentAmount: '', deadline: '', category: '', description: '', color: '#6366f1', priority: 'medium' };
const contribDefault = { amount: '', date: new Date().toISOString().split('T')[0], note: '' };

function GoalForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Goal Name</label>
          <input className="input-field" placeholder="e.g. Emergency Fund" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Target Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Current Amount</label>
          <input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.currentAmount}
            onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select category</option>
            {GOAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="label">Deadline (optional)</label>
          <input type="date" className="input-field" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
        <div className="col-span-2">
          <label className="label">Description (optional)</label>
          <textarea className="input-field resize-none" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Goal' : 'Create Goal'}</button>
    </form>
  );
}

function ContributionForm({ onSubmit }) {
  const [form, setForm] = useState(contribDefault);
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  return (
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
        <div className="col-span-2">
          <label className="label">Note (optional)</label>
          <input className="input-field" placeholder="Optional note" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">Add Contribution</button>
    </form>
  );
}

const priorityConfig = { low: 'default', medium: 'warning', high: 'danger' };
const statusConfig = { active: 'primary', completed: 'success', cancelled: 'danger', paused: 'warning' };

export default function Goals() {
  const { goals, fetchGoals, createGoal, updateGoal, deleteGoal, addContribution, isLoading } = useGoalStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [contribModal, setContribModal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => { fetchGoals(); }, []);

  const openCreate = () => { setForm(defaultForm); setEditGoal(null); setModalOpen(true); };
  const openEdit = (g) => {
    setForm({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, deadline: g.deadline?.split('T')[0] || '', category: g.category || '', description: g.description || '', color: g.color, priority: g.priority });
    setEditGoal(g);
    setModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editGoal) await updateGoal(editGoal._id, form);
    else await createGoal(form);
    setModalOpen(false);
  };

  const filtered = filterStatus === 'all' ? goals : goals.filter((g) => g.status === filterStatus);
  const totalTarget = goals.filter((g) => g.status === 'active').reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.filter((g) => g.status === 'active').reduce((s, g) => s + g.currentAmount, 0);
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        subtitle="Set and track your financial goals"
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={18} /> New Goal</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Target', value: formatCurrency(totalTarget, user?.currency), color: 'text-indigo-600' },
          { label: 'Total Saved', value: formatCurrency(totalSaved, user?.currency), color: 'text-green-600' },
          { label: 'Completed Goals', value: completedCount, color: 'text-purple-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        {['active', 'completed', 'paused', 'all'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner center /> : filtered.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No goals found"
          description="Set financial goals to stay motivated and track your progress."
          action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Create Goal</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((goal, i) => {
            const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
            return (
              <motion.div key={goal._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {goal.status === 'completed' && <CheckCircle size={16} className="text-green-600" />}
                      <h3 className="font-semibold text-gray-900 dark:text-white">{goal.name}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      {goal.category && <Badge variant="default" size="xs">{goal.category}</Badge>}
                      <Badge variant={priorityConfig[goal.priority]} size="xs">{goal.priority}</Badge>
                      <Badge variant={statusConfig[goal.status]} size="xs">{goal.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(goal)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Edit3 size={13} className="text-gray-500" /></button>
                    <button onClick={() => setDeleteId(goal._id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-500" /></button>
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <div>
                    <p className="text-xs text-gray-500">Saved</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(goal.currentAmount, user?.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(goal.targetAmount, user?.currency)}</p>
                  </div>
                </div>

                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: goal.status === 'completed' ? '#22c55e' : goal.color }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {pct.toFixed(0)}% complete
                    {goal.deadline && ` · Due ${formatDate(goal.deadline, 'short')}`}
                  </span>
                  {goal.status === 'active' && (
                    <button onClick={() => setContribModal(goal._id)}
                      className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                      <PlusCircle size={12} /> Add Funds
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editGoal ? 'Edit Goal' : 'Create Goal'}>
        <GoalForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editGoal} />
      </Modal>

      <Modal isOpen={!!contribModal} onClose={() => setContribModal(null)} title="Add Contribution" size="sm">
        <ContributionForm onSubmit={async (data) => { await addContribution(contribModal, data); setContribModal(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteGoal(deleteId)} title="Delete Goal" message="Are you sure you want to delete this goal?" />
    </div>
  );
}
