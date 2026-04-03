import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, RefreshCw, PauseCircle, PlayCircle, Calendar } from 'lucide-react';
import { useSubscriptionStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SUBSCRIPTION_CATEGORIES, FREQUENCIES, COLORS } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const defaultForm = { name: '', amount: '', frequency: 'monthly', category: '', startDate: new Date().toISOString().split('T')[0], nextBillingDate: '', description: '', website: '', color: '#6366f1' };

function SubscriptionForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Service Name</label>
          <input className="input-field" placeholder="e.g. Netflix" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Frequency</label>
          <select className="input-field" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
            <option value="">Select category</option>
            {SUBSCRIPTION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Next Billing Date</label>
          <input type="date" className="input-field" value={form.nextBillingDate}
            onChange={(e) => setForm({ ...form, nextBillingDate: e.target.value })} required />
        </div>
        <div className="col-span-2">
          <label className="label">Website (optional)</label>
          <input className="input-field" placeholder="https://" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })} />
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
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Subscription' : 'Add Subscription'}</button>
    </form>
  );
}

const frequencyMultiplier = { daily: 365, weekly: 52, biweekly: 26, monthly: 12, quarterly: 4, yearly: 1 };

export default function Subscriptions() {
  const { subscriptions, fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription, toggleStatus, isLoading } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterStatus, setFilterStatus] = useState('active');

  useEffect(() => { fetchSubscriptions(); }, []);

  const openCreate = () => { setForm(defaultForm); setEditSub(null); setModalOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name, amount: s.amount, frequency: s.frequency, category: s.category, startDate: s.startDate?.split('T')[0] || '', nextBillingDate: s.nextBillingDate?.split('T')[0] || '', description: s.description || '', website: s.website || '', color: s.color });
    setEditSub(s);
    setModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editSub) await updateSubscription(editSub._id, form);
    else await createSubscription(form);
    setModalOpen(false);
  };

  const filtered = filterStatus === 'all' ? subscriptions : subscriptions.filter((s) => s.status === filterStatus);
  const activeOnly = subscriptions.filter((s) => s.status === 'active');
  const monthlyTotal = activeOnly.reduce((sum, s) => sum + (s.amount * frequencyMultiplier[s.frequency]) / 12, 0);
  const yearlyTotal = activeOnly.reduce((sum, s) => sum + s.amount * frequencyMultiplier[s.frequency], 0);

  const statusConfig = {
    active: 'success', paused: 'warning', cancelled: 'danger',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Manage recurring expenses"
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Subscription</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Cost', value: formatCurrency(monthlyTotal, user?.currency), color: 'text-indigo-600' },
          { label: 'Yearly Cost', value: formatCurrency(yearlyTotal, user?.currency), color: 'text-red-600' },
          { label: 'Active Services', value: activeOnly.length, color: 'text-green-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        {['active', 'paused', 'cancelled', 'all'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner center /> : filtered.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No subscriptions found"
          description="Track your recurring subscriptions to avoid unwanted charges."
          action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Subscription</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub, i) => {
            const monthlyAmount = (sub.amount * frequencyMultiplier[sub.frequency]) / 12;
            const daysUntilBilling = sub.nextBillingDate ? Math.ceil((new Date(sub.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <motion.div key={sub._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm" style={{ background: sub.color }}>
                      {sub.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{sub.name}</p>
                      <Badge variant={statusConfig[sub.status]} size="xs">{sub.status}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleStatus(sub._id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      {sub.status === 'active' ? <PauseCircle size={14} className="text-yellow-500" /> : <PlayCircle size={14} className="text-green-500" />}
                    </button>
                    <button onClick={() => openEdit(sub)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Edit3 size={13} className="text-gray-500" /></button>
                    <button onClick={() => setDeleteId(sub._id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-500" /></button>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(sub.amount, user?.currency)}</p>
                    <p className="text-xs text-gray-500 capitalize">{sub.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Monthly equiv.</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(monthlyAmount, user?.currency)}/mo</p>
                  </div>
                </div>

                {daysUntilBilling !== null && (
                  <div className={`flex items-center gap-1.5 mt-3 text-xs ${daysUntilBilling <= 3 ? 'text-red-600' : daysUntilBilling <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    <Calendar size={12} />
                    <span>
                      {daysUntilBilling < 0 ? `Overdue by ${Math.abs(daysUntilBilling)}d` :
                       daysUntilBilling === 0 ? 'Due today' :
                       `Due in ${daysUntilBilling}d`} · {formatDate(sub.nextBillingDate, 'short')}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editSub ? 'Edit Subscription' : 'Add Subscription'}>
        <SubscriptionForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editSub} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteSubscription(deleteId)} title="Delete Subscription" message="Are you sure you want to delete this subscription?" />
    </div>
  );
}
