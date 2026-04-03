import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, TrendingDown, TrendingUp, PlusCircle, Clock } from 'lucide-react';
import { useDebtStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const defaultForm = { type: 'borrowed', amount: '', person: '', description: '', dueDate: '', interestRate: '' };
const repaymentDefault = { amount: '', date: new Date().toISOString().split('T')[0], note: '' };

function DebtForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-2">
        {['borrowed', 'lent'].map((t) => (
          <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${form.type === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
            {t === 'borrowed' ? '🔴 I Borrowed' : '🟢 I Lent'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Person / Organization</label>
          <input className="input-field" placeholder="Name" value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })} required />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <input className="input-field" placeholder="What is this for?" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Due Date (optional)</label>
          <input type="date" className="input-field" value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Interest Rate % (optional)</label>
          <input type="number" step="0.1" min="0" className="input-field" placeholder="0" value={form.interestRate}
            onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Debt' : 'Record Debt'}</button>
    </form>
  );
}

function RepaymentForm({ onSubmit }) {
  const [form, setForm] = useState(repaymentDefault);
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
      <button type="submit" className="btn-primary w-full">Add Repayment</button>
    </form>
  );
}

const statusConfig = {
  pending: { variant: 'warning', label: 'Pending' },
  partial: { variant: 'blue', label: 'Partial' },
  paid: { variant: 'success', label: 'Paid' },
};

export default function Debts() {
  const { debts, fetchDebts, createDebt, updateDebt, deleteDebt, addRepayment, isLoading } = useDebtStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [repaymentModal, setRepaymentModal] = useState(null);
  const [editDebt, setEditDebt] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { fetchDebts(); }, []);

  const openCreate = () => { setForm(defaultForm); setEditDebt(null); setModalOpen(true); };
  const openEdit = (d) => {
    setForm({ type: d.type, amount: d.amount, person: d.person, description: d.description || '', dueDate: d.dueDate?.split('T')[0] || '', interestRate: d.interestRate || '' });
    setEditDebt(d);
    setModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editDebt) await updateDebt(editDebt._id, form);
    else await createDebt(form);
    setModalOpen(false);
  };

  const filtered = filterType === 'all' ? debts : debts.filter((d) => d.type === filterType);
  const borrowed = debts.filter((d) => d.type === 'borrowed' && d.status !== 'paid').reduce((s, d) => s + (d.remainingAmount || d.amount), 0);
  const lent = debts.filter((d) => d.type === 'lent' && d.status !== 'paid').reduce((s, d) => s + (d.remainingAmount || d.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debts"
        subtitle="Track borrowed and lent money"
        action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={18} /> Record Debt</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl"><TrendingDown size={20} className="text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">I Owe</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(borrowed, user?.currency)}</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl"><TrendingUp size={20} className="text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Owed to Me</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(lent, user?.currency)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all', 'borrowed', 'lent'].map((t) => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner center /> : filtered.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="No debts recorded"
          description="Track money you've borrowed or lent."
          action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Record Debt</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((debt, i) => {
            const pct = debt.amount > 0 ? ((debt.amount - (debt.remainingAmount || 0)) / debt.amount) * 100 : 0;
            return (
              <motion.div key={debt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{debt.type === 'borrowed' ? '🔴' : '🟢'}</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{debt.person}</h3>
                    </div>
                    {debt.description && <p className="text-sm text-gray-500 mt-0.5">{debt.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[debt.status]?.variant}>{statusConfig[debt.status]?.label}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(debt)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Edit3 size={13} className="text-gray-500" /></button>
                      <button onClick={() => setDeleteId(debt._id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-500" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-500">Original</p>
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(debt.amount, user?.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className={`font-bold ${debt.status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(debt.remainingAmount || 0, user?.currency)}
                    </p>
                  </div>
                </div>

                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-green-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {debt.dueDate && (
                      <><Clock size={12} /><span>Due {formatDate(debt.dueDate, 'short')}</span></>
                    )}
                  </div>
                  {debt.status !== 'paid' && (
                    <button onClick={() => setRepaymentModal(debt._id)}
                      className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                      <PlusCircle size={12} /> Add Repayment
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editDebt ? 'Edit Debt' : 'Record Debt'}>
        <DebtForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editDebt} />
      </Modal>

      <Modal isOpen={!!repaymentModal} onClose={() => setRepaymentModal(null)} title="Add Repayment" size="sm">
        <RepaymentForm onSubmit={async (data) => { await addRepayment(repaymentModal, data); setRepaymentModal(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteDebt(deleteId)} title="Delete Debt" message="Are you sure you want to delete this debt record?" />
    </div>
  );
}
