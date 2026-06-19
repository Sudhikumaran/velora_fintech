import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit3, Trash2, TrendingDown, TrendingUp, PlusCircle, Clock, CalendarClock, CheckCircle2, Archive } from 'lucide-react';
import { useDebtStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getNextEMIDate, getPaidEmiCount, sortDebtsByDueDate, getEffectiveDueDate } from '../utils/debtHelpers';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const defaultForm = {
  type: 'borrowed', amount: '', person: '', description: '', dueDate: '', interestRate: '',
  isEMI: false, emiAmount: '', emiDay: '', emiStartDate: new Date().toISOString().split('T')[0], tenure: '',
};
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
          <label className="label">Total Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Person / Organization</label>
          <input className="input-field" placeholder="e.g. SBI Bank" value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })} required />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <input className="input-field" placeholder="e.g. Education Loan" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Interest Rate % (optional)</label>
          <input type="number" step="0.1" min="0" className="input-field" placeholder="0" value={form.interestRate}
            onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
        </div>
        <div>
          <label className="label">Due Date (optional)</label>
          <input type="date" className="input-field" value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
      </div>

      <button type="button"
        onClick={() => setForm({ ...form, isEMI: !form.isEMI })}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${form.isEMI ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className={form.isEMI ? 'text-indigo-600' : 'text-gray-400'} />
          <span className={`text-sm font-semibold ${form.isEMI ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
            This is an EMI / Monthly Payment
          </span>
        </div>
        <div className={`w-10 h-5 rounded-full transition-all relative ${form.isEMI ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isEMI ? 'left-5' : 'left-0.5'}`} />
        </div>
      </button>

      {form.isEMI && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <div>
            <label className="label">Monthly EMI Amount (₹)</label>
            <input type="number" step="0.01" min="0" className="input-field" placeholder="e.g. 3500.00" value={form.emiAmount}
              onChange={(e) => setForm({ ...form, emiAmount: e.target.value })} required={form.isEMI} />
          </div>
          <div>
            <label className="label">EMI Due Day (of month)</label>
            <input type="number" min="1" max="31" className="input-field" placeholder="e.g. 5" value={form.emiDay}
              onChange={(e) => setForm({ ...form, emiDay: e.target.value })} required={form.isEMI} />
            <p className="text-xs text-gray-400 mt-1">Day of month payment is due</p>
          </div>
          <div>
            <label className="label">EMI Start Date</label>
            <input type="date" className="input-field" value={form.emiStartDate}
              onChange={(e) => setForm({ ...form, emiStartDate: e.target.value })} required={form.isEMI} />
          </div>
          <div>
            <label className="label">Tenure (months)</label>
            <input type="number" min="1" className="input-field" placeholder="e.g. 60" value={form.tenure}
              onChange={(e) => setForm({ ...form, tenure: e.target.value })} required={form.isEMI} />
          </div>
          {form.emiAmount && form.tenure && (
            <div className="col-span-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl text-sm">
              <span className="text-gray-500">Total Payable: </span>
              <span className="font-bold text-indigo-600">₹{(parseFloat(form.emiAmount) * parseInt(form.tenure)).toFixed(2)}</span>
              <span className="text-gray-400 ml-2">({form.tenure} months × ₹{form.emiAmount})</span>
            </div>
          )}
        </div>
      )}

      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Debt' : 'Record Debt'}</button>
    </form>
  );
}

function RepaymentForm({ onSubmit, defaultAmount = '' }) {
  const [form, setForm] = useState({ ...repaymentDefault, amount: defaultAmount });
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
  paid: { variant: 'success', label: 'Closed' },
};

const filterTabs = [
  { key: 'all', label: 'All Active' },
  { key: 'borrowed', label: 'Borrowed' },
  { key: 'lent', label: 'Lent' },
  { key: 'closed', label: 'Closed' },
];

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
    setForm({
      type: d.type, amount: d.amount, person: d.person,
      description: d.description || '', dueDate: d.dueDate?.split('T')[0] || '',
      interestRate: d.interestRate || '',
      isEMI: !!d.isEMI, emiAmount: d.emiAmount || '', emiDay: d.emiDay || '',
      emiStartDate: d.emiStartDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      tenure: d.tenure || '',
    });
    setEditDebt(d);
    setModalOpen(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editDebt) await updateDebt(editDebt._id, form);
    else await createDebt(form);
    setModalOpen(false);
  };

  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const closedDebts = debts.filter((d) => d.status === 'paid');

  let filtered;
  if (filterType === 'closed') {
    filtered = sortDebtsByDueDate(closedDebts, { closedFirst: true });
  } else {
    const base = filterType === 'all'
      ? activeDebts
      : activeDebts.filter((d) => d.type === filterType);
    filtered = sortDebtsByDueDate(base);
  }

  const borrowed = activeDebts.filter((d) => d.type === 'borrowed').reduce((s, d) => s + (d.remainingAmount || d.amount), 0);
  const lent = activeDebts.filter((d) => d.type === 'lent').reduce((s, d) => s + (d.remainingAmount || d.amount), 0);
  const closedCount = closedDebts.length;

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

      <div className="flex flex-wrap gap-2">
        {filterTabs.map(({ key, label }) => (
          <button key={key} onClick={() => setFilterType(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${filterType === key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>
            {key === 'closed' && <Archive size={14} />}
            {label}
            {key === 'closed' && closedCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filterType === key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>{closedCount}</span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? <LoadingSpinner center /> : filtered.length === 0 ? (
        <EmptyState
          icon={filterType === 'closed' ? Archive : TrendingDown}
          title={filterType === 'closed' ? 'No closed loans' : 'No debts recorded'}
          description={filterType === 'closed' ? 'Fully repaid loans will appear here automatically.' : "Track money you've borrowed or lent."}
          action={filterType !== 'closed' ? <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Record Debt</button> : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((debt, i) => {
            const pct = debt.amount > 0 ? ((debt.amount - (debt.remainingAmount || 0)) / debt.amount) * 100 : 0;
            const paidEMIs = getPaidEmiCount(debt);
            const nextEMIDate = debt.isEMI ? getNextEMIDate(debt.emiDay, debt.emiStartDate, paidEMIs) : null;
            const effectiveDue = getEffectiveDueDate(debt);
            const isOverdue = effectiveDue && effectiveDue < new Date() && debt.status !== 'paid';
            const isClosed = debt.status === 'paid';

            return (
              <motion.div key={debt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`card p-5 group ${isOverdue ? 'border-red-200 dark:border-red-800' : ''} ${isClosed ? 'opacity-90' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{debt.type === 'borrowed' ? '🔴' : '🟢'}</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{debt.person}</h3>
                      {debt.isEMI && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 px-2 py-0.5 rounded-full font-medium">EMI</span>}
                    </div>
                    {debt.description && <p className="text-sm text-gray-500 mt-0.5">{debt.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusConfig[debt.status]?.variant}>{statusConfig[debt.status]?.label}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isClosed && <button onClick={() => openEdit(debt)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Edit3 size={13} className="text-gray-500" /></button>}
                      <button onClick={() => setDeleteId(debt._id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={13} className="text-red-500" /></button>
                    </div>
                  </div>
                </div>

                {debt.isEMI && debt.tenure ? (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center px-2 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-xs text-gray-400">EMI</p>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(debt.emiAmount, user?.currency)}</p>
                    </div>
                    <div className="text-center px-2 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-xs text-gray-400">Paid</p>
                      <p className="font-bold text-sm text-green-600">{paidEMIs}/{debt.tenure}</p>
                    </div>
                    <div className="text-center px-2 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-xs text-gray-400">Left</p>
                      <p className="font-bold text-sm text-red-500">{Math.max(0, debt.tenure - paidEMIs)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-500">Original</p>
                      <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(debt.amount, user?.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{isClosed ? 'Paid Off' : 'Remaining'}</p>
                      <p className={`font-bold ${isClosed ? 'text-green-600' : 'text-red-600'}`}>
                        {isClosed ? formatCurrency(debt.amount, user?.currency) : formatCurrency(debt.remainingAmount || 0, user?.currency)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-green-500" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {isClosed && debt.closedAt ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 size={12} />
                        <span>Closed {formatDate(debt.closedAt, 'short')}</span>
                      </div>
                    ) : debt.isEMI && nextEMIDate ? (
                      <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <CalendarClock size={12} />
                        <span>{isOverdue ? '⚠ Overdue · ' : 'Next EMI · '}
                          {nextEMIDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    ) : debt.dueDate ? (
                      <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <Clock size={12} />
                        <span>{isOverdue ? '⚠ Overdue · ' : ''}Due {formatDate(debt.dueDate, 'short')}</span>
                      </div>
                    ) : null}
                  </div>
                  {!isClosed && (
                    <button
                      onClick={() => setRepaymentModal({ id: debt._id, emiAmount: debt.isEMI ? debt.emiAmount : '' })}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${debt.isEMI ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100'}`}>
                      {debt.isEMI ? <><CheckCircle2 size={12} /> Pay EMI</> : <><PlusCircle size={12} /> Add Repayment</>}
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

      <Modal isOpen={!!repaymentModal} onClose={() => setRepaymentModal(null)}
        title={repaymentModal?.emiAmount ? '💳 Pay EMI' : 'Add Repayment'} size="sm">
        <RepaymentForm
          defaultAmount={repaymentModal?.emiAmount || ''}
          onSubmit={async (data) => { await addRepayment(repaymentModal?.id, data); setRepaymentModal(null); }}
        />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteDebt(deleteId)} title="Delete Debt" message="Are you sure you want to delete this debt record?" />
    </div>
  );
}
