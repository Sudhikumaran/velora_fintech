import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Download, ClipboardList, ArrowDownLeft, ArrowUpRight,
  Edit3, Trash2, Check, Circle, Wallet, Banknote,
} from 'lucide-react';
import { useIncomePlanStore } from '../store/incomePlanStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PLANNER_RECEIVE_CATEGORIES, PLANNER_GIVE_CATEGORIES } from '../utils/constants';
import { exportToCSV, incomePlanToCSV } from '../utils/csvExport';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Badge from '../components/ui/Badge';

const today = () => new Date().toISOString().split('T')[0];
const defaultTitle = () =>
  `${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} plan`;

const emptyPlanForm = () => ({
  title: defaultTitle(),
  notes: '',
  amount: '',
  name: 'Salary',
  category: 'Salary',
  date: today(),
});

const emptyEntryForm = (type) => ({
  type,
  amount: '',
  name: '',
  category: type === 'received' ? 'Salary' : 'Family',
  date: today(),
  notes: '',
});

function PlanForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Plan name</label>
        <input className="input-field" placeholder="e.g. August salary" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      {!isEdit && (
        <>
          <p className="text-xs text-gray-400">Optionally log what you received to start the balance.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Received amount</label>
              <input type="number" step="0.01" min="0" className="input-field" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">From</label>
              <input className="input-field" placeholder="e.g. Salary" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {PLANNER_RECEIVE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input-field" rows={2} value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Plan' : 'Create Plan'}</button>
    </form>
  );
}

function EntryForm({ form, setForm, onSubmit, isEdit }) {
  const isGive = form.type === 'give';
  const categories = isGive ? PLANNER_GIVE_CATEGORIES : PLANNER_RECEIVE_CATEGORIES;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {['received', 'give'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm({
              ...form,
              type: t,
              category: t === 'give' ? 'Family' : 'Salary',
            })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              form.type === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {t === 'received' ? 'I received' : 'Have to give'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Amount</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input-field" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div>
          <label className="label">{isGive ? 'Give to' : 'Received from'}</label>
          <input className="input-field" placeholder={isGive ? 'e.g. Mom, Rent, EMI' : 'e.g. Salary'}
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input-field" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Notes (optional)</label>
          <input className="input-field" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">
        {isEdit ? 'Update Entry' : isGive ? 'Add give item' : 'Add received'}
      </button>
    </form>
  );
}

function Stat({ label, value, color, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function IncomePlanner() {
  const {
    plans, selectedId, isLoading, fetchPlans, selectPlan,
    createPlan, updatePlan, deletePlan, addEntry, updateEntry, toggleEntryDone, deleteEntry, postEntry,
  } = useIncomePlanStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();
  const currency = user?.currency;
  const plan = plans.find((p) => p._id === selectedId) || null;

  const [planModal, setPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [entryModal, setEntryModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [entryForm, setEntryForm] = useState(emptyEntryForm('give'));
  const [deletePlanId, setDeletePlanId] = useState(null);
  const [deleteEntryId, setDeleteEntryId] = useState(null);
  const [postRow, setPostRow] = useState(null);
  const [postAccount, setPostAccount] = useState('');

  useEffect(() => { fetchPlans(); fetchAccounts(); }, []);

  const openCreatePlan = () => {
    setPlanForm(emptyPlanForm());
    setEditPlan(null);
    setPlanModal(true);
  };
  const openEditPlan = () => {
    if (!plan) return;
    setPlanForm({ title: plan.title, notes: plan.notes || '', amount: '', name: '', category: 'Salary', date: today() });
    setEditPlan(plan);
    setPlanModal(true);
  };
  const submitPlan = async (e) => {
    e.preventDefault();
    if (editPlan) {
      await updatePlan(editPlan._id, { title: planForm.title, notes: planForm.notes });
    } else {
      await createPlan(planForm);
    }
    setPlanModal(false);
  };

  const openEntry = (type, entry = null) => {
    if (entry) {
      setEntryForm({
        type: entry.type,
        amount: entry.amount,
        name: entry.name,
        category: entry.category || '',
        date: new Date(entry.date).toISOString().split('T')[0],
        notes: entry.notes || '',
      });
      setEditEntry(entry);
    } else {
      setEntryForm(emptyEntryForm(type));
      setEditEntry(null);
    }
    setEntryModal(true);
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    if (!plan) return;
    if (editEntry) await updateEntry(plan._id, editEntry._id, entryForm);
    else await addEntry(plan._id, entryForm);
    setEntryModal(false);
  };

  const remainingColor = (plan?.remaining || 0) < 0
    ? 'text-red-600'
    : (plan?.remaining || 0) === 0
      ? 'text-gray-900 dark:text-white'
      : 'text-emerald-600';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Income Planner"
        subtitle="Plan what you receive and what you have to give — independent of accounts"
        action={
          <button onClick={openCreatePlan} className="btn-primary">
            <Plus size={16} /> New Plan
          </button>
        }
      />

      {isLoading && plans.length === 0 ? (
        <div className="card"><LoadingSpinner center /></div>
      ) : plans.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ClipboardList}
            title="No income plans yet"
            description="Start a plan with the amount you received, then add who you have to give it to. Balance updates like a ledger."
            action={<button onClick={openCreatePlan} className="btn-primary"><Plus size={16} /> Start a plan</button>}
          />
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {plans.map((p) => {
              const active = p._id === selectedId;
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => selectPlan(p._id)}
                  className={`shrink-0 text-left px-4 py-3 rounded-2xl border transition-all min-w-[180px] ${
                    active
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-indigo-200'
                  }`}
                >
                  <p className={`text-sm font-semibold truncate ${active ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{p.title}</p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-indigo-100' : 'text-gray-400'}`}>
                    Left {formatCurrency(p.remaining, currency)}
                  </p>
                </button>
              );
            })}
          </div>

          {plan && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat
                  label="Received"
                  value={formatCurrency(plan.totalReceived, currency)}
                  color="text-emerald-600"
                />
                <Stat
                  label="Have to give"
                  value={formatCurrency(plan.totalGive, currency)}
                  color="text-red-600"
                  hint={plan.givenPending ? `${formatCurrency(plan.givenPending, currency)} still pending` : 'All marked given'}
                />
                <Stat
                  label="Remaining"
                  value={formatCurrency(plan.remaining, currency)}
                  color={remainingColor}
                  hint={plan.remaining < 0 ? 'Over-allocated' : 'Unallocated'}
                />
                <Stat
                  label="Allocated"
                  value={`${(plan.allocatedPercent || 0).toFixed(0)}%`}
                  color="text-indigo-600"
                />
              </div>

              <div className="card p-4">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${plan.remaining < 0 ? 'bg-red-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, plan.allocatedPercent || 0)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Planning only — this does not change any account balances.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button onClick={() => openEntry('received')} className="btn-secondary">
                    <ArrowDownLeft size={15} className="text-emerald-600" /> I received
                  </button>
                  <button onClick={() => openEntry('give')} className="btn-primary">
                    <ArrowUpRight size={15} /> Have to give
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportToCSV(incomePlanToCSV(plan), `${plan.title.replace(/\s+/g, '-').toLowerCase()}.csv`)}
                    className="btn-secondary px-3"
                    disabled={!plan.entries?.length}
                    title="Export CSV"
                  >
                    <Download size={15} />
                  </button>
                  <button onClick={openEditPlan} className="btn-secondary px-3" title="Rename plan">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => setDeletePlanId(plan._id)} className="btn-secondary px-3" title="Delete plan">
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>

              <div className="card overflow-hidden">
                {!plan.entries?.length ? (
                  <EmptyState
                    icon={Wallet}
                    title="Nothing planned yet"
                    description="Add what you received, then add the people or bills you have to give it to."
                    action={
                      <div className="flex gap-2">
                        <button onClick={() => openEntry('received')} className="btn-secondary">Add received</button>
                        <button onClick={() => openEntry('give')} className="btn-primary">Add give</button>
                      </div>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-5 py-3 w-10" />
                          <th className="text-left px-3 py-3">Date</th>
                          <th className="text-left px-3 py-3">Particulars</th>
                          <th className="text-right px-3 py-3">Received</th>
                          <th className="text-right px-3 py-3">Give</th>
                          <th className="text-right px-3 py-3">Balance</th>
                          <th className="px-5 py-3 w-20" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {plan.entries.map((row, i) => (
                          <motion.tr
                            key={row._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.type === 'give' && row.isDone ? 'opacity-60' : ''}`}
                          >
                            <td className="px-5 py-3">
                              {row.type === 'give' ? (
                                <button
                                  onClick={() => toggleEntryDone(plan._id, row._id)}
                                  className="p-0.5"
                                  title={row.isDone ? 'Mark pending' : 'Mark as given'}
                                >
                                  {row.isDone
                                    ? <Check size={16} className="text-emerald-600" />
                                    : <Circle size={16} className="text-gray-300" />}
                                </button>
                              ) : (
                                <ArrowDownLeft size={16} className="text-emerald-500" />
                              )}
                            </td>
                            <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{formatDate(row.date, 'short')}</td>
                            <td className="px-3 py-3">
                              <p className={`font-medium text-gray-900 dark:text-white ${row.isDone ? 'line-through' : ''}`}>{row.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {row.category && <Badge variant={row.type === 'received' ? 'income' : 'expense'} size="xs">{row.category}</Badge>}
                                {row.type === 'give' && (
                                  <span className="text-xs text-gray-400">{row.isDone ? 'Given' : 'Pending'}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-600">
                              {row.received ? formatCurrency(row.received, currency) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums font-semibold text-red-600">
                              {row.give ? formatCurrency(row.give, currency) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                            </td>
                            <td className={`px-3 py-3 text-right tabular-nums font-bold ${row.balance < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                              {formatCurrency(row.balance, currency)}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => { setPostRow(row); setPostAccount(accounts[0]?._id || ''); }}
                                  disabled={!!row.postedTransaction}
                                  className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                  title={row.postedTransaction ? 'Already posted' : 'Post to account'}
                                >
                                  <Banknote size={13} className={row.postedTransaction ? 'text-gray-300' : 'text-indigo-500'} />
                                </button>
                                <button onClick={() => openEntry(row.type, row)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                                  <Edit3 size={13} className="text-gray-500" />
                                </button>
                                <button onClick={() => setDeleteEntryId(row._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                  <Trash2 size={13} className="text-red-500" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 dark:bg-gray-800/60 font-semibold">
                          <td className="px-5 py-3" colSpan={3}>Remaining</td>
                          <td className="px-3 py-3 text-right tabular-nums text-emerald-600">{formatCurrency(plan.totalReceived, currency)}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-red-600">{formatCurrency(plan.totalGive, currency)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums ${remainingColor}`}>{formatCurrency(plan.remaining, currency)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <Modal isOpen={planModal} onClose={() => setPlanModal(false)} title={editPlan ? 'Edit Plan' : 'New Income Plan'}>
        <PlanForm form={planForm} setForm={setPlanForm} onSubmit={submitPlan} isEdit={!!editPlan} />
      </Modal>

      <Modal isOpen={entryModal} onClose={() => setEntryModal(false)} title={editEntry ? 'Edit Entry' : (entryForm.type === 'give' ? 'Have to give' : 'I received')}>
        <EntryForm form={entryForm} setForm={setEntryForm} onSubmit={submitEntry} isEdit={!!editEntry} />
      </Modal>

      <Modal isOpen={!!postRow} onClose={() => setPostRow(null)} title="Post to an account">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!plan || !postRow || !postAccount) return;
            await postEntry(plan._id, postRow._id, { account: postAccount });
            setPostRow(null);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-500">This creates a real {postRow?.type === 'received' ? 'income' : 'expense'} transaction. Planning numbers stay as they are.</p>
          <select className="input-field" value={postAccount} onChange={(e) => setPostAccount(e.target.value)} required>
            <option value="">Choose account</option>
            {accounts.filter((a) => !a.isArchived).map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <button className="btn-primary w-full" disabled={!postAccount}>Post {postRow ? formatCurrency(postRow.amount, currency) : ''}</button>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deletePlanId}
        onClose={() => setDeletePlanId(null)}
        onConfirm={() => deletePlan(deletePlanId)}
        title="Delete Plan"
        message="This planning ledger will be removed. Account balances are not affected."
      />

      <ConfirmDialog
        isOpen={!!deleteEntryId}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={() => { if (plan) deleteEntry(plan._id, deleteEntryId); }}
        title="Delete Entry"
        message="Remove this line from the plan? Remaining balance will update."
      />
    </div>
  );
}
