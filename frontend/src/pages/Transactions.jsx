import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Edit3, Trash2, Archive, Download, ChevronLeft, ChevronRight, Paperclip, Upload, RotateCcw,
} from 'lucide-react';
import { exportToCSV, transactionsToCSV } from '../utils/csvExport';
import { parseTransactionCsv } from '../utils/csvImport';
import { ocrReceipt } from '../utils/receiptOcr';
import { useTransactionStore } from '../store/transactionStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_CATEGORIES, FREQUENCIES } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ReceiptUpload from '../components/ui/ReceiptUpload';

const defaultForm = {
  account: '', toAccount: '', type: 'expense', amount: '',
  category: '', description: '', date: new Date().toISOString().split('T')[0], tags: '', notes: '', receiptUrl: '',
  splits: [], isRecurring: false, frequency: 'monthly', nextRunDate: '',
};

function TransactionForm({ form, setForm, onSubmit, accounts, isEdit }) {
  const baseCategories = TRANSACTION_CATEGORIES[form.type === 'transfer' ? 'expense' : form.type] || [];
  const storageKey = `velora_custom_categories_${form.type === 'transfer' ? 'expense' : form.type}`;
  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const categories = [...baseCategories, ...customCategories];

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setForm({ ...form, category: trimmed });
    setNewCategory('');
    setShowNewCategory(false);
  };

  return (
    <form id="transaction-form" onSubmit={onSubmit} className="space-y-4">
      {/* Type Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {['income', 'expense', 'transfer'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm({ ...form, type: t, category: t === 'transfer' ? 'Transfer' : '' })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              form.type === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <label className="label">{form.type === 'transfer' ? 'From Account' : 'Account'}</label>
          <select className="input-field" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} required>
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
        {form.type === 'transfer' ? (
          <div>
            <label className="label">To Account</label>
            <select className="input-field" value={form.toAccount} onChange={(e) => setForm({ ...form, toAccount: e.target.value })} required>
              <option value="">Select account</option>
              {accounts.filter((a) => a._id !== form.account).map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">Category</label>
            <select
              className="input-field"
              value={showNewCategory ? '__new__' : form.category}
              onChange={(e) => {
                if (e.target.value === '__new__') { setShowNewCategory(true); }
                else { setShowNewCategory(false); setForm({ ...form, category: e.target.value }); }
              }}
              required={!showNewCategory}
            >
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ Create new category</option>
            </select>
            {showNewCategory && (
              <div className="flex flex-wrap gap-2 mt-2">
                <input
                  className="input-field flex-1 min-w-[10rem]"
                  placeholder="New category name..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  autoFocus
                />
                <button type="button" onClick={handleAddCategory}
                  className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
                  Add
                </button>
                <button type="button" onClick={() => { setShowNewCategory(false); setNewCategory(''); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Description</label>
          <input className="input-field" placeholder="What was this for?" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label">Notes (optional)</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Additional notes..." value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <ReceiptUpload
            transactionId={isEdit ? form._id : null}
            currentUrl={form.receiptUrl}
            onUploaded={(url) => setForm((f) => ({ ...f, receiptUrl: url }))}
            onOcr={async (file) => {
              try {
                const parsed = await ocrReceipt(file);
                setForm((f) => ({
                  ...f,
                  amount: parsed.amount || f.amount,
                  date: parsed.date || f.date,
                  description: f.description || parsed.description,
                }));
              } catch { /* OCR optional */ }
            }}
          />
        </div>
        {form.type !== 'transfer' && (
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Split across categories</label>
              <button type="button" className="text-xs text-indigo-600 font-semibold"
                onClick={() => setForm({ ...form, splits: [...(form.splits || []), { category: '', amount: '' }] })}>
                + Add split
              </button>
            </div>
            {(form.splits || []).map((split, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="input-field flex-1" value={split.category}
                  onChange={(e) => {
                    const splits = [...form.splits];
                    splits[i] = { ...splits[i], category: e.target.value };
                    setForm({ ...form, splits, category: splits[0]?.category || form.category });
                  }}>
                  <option value="">Category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" step="0.01" className="input-field w-28" placeholder="0.00" value={split.amount}
                  onChange={(e) => {
                    const splits = [...form.splits];
                    splits[i] = { ...splits[i], amount: e.target.value };
                    const total = splits.reduce((s, x) => s + parseFloat(x.amount || 0), 0);
                    setForm({ ...form, splits, amount: total ? String(total) : form.amount });
                  }} />
                <button type="button" className="text-red-500 text-sm" onClick={() => setForm({ ...form, splits: form.splits.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={!!form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} />
            Repeat this transaction
          </label>
          {form.isRecurring && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select className="input-field sm:w-36" value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input type="date" className="input-field sm:w-40" value={form.nextRunDate}
                onChange={(e) => setForm({ ...form, nextRunDate: e.target.value })} />
            </div>
          )}
        </div>
      </div>
      <button type="submit" className="btn-primary w-full min-h-12 text-base">
        {isEdit ? 'Update Transaction' : 'Add Transaction'}
      </button>
    </form>
  );
}

const typeColors = { income: 'income', expense: 'expense', transfer: 'transfer' };
const typeIcons = {
  income: <ArrowUpRight size={16} className="text-green-600" />,
  expense: <ArrowDownRight size={16} className="text-red-600" />,
  transfer: <ArrowLeftRight size={16} className="text-indigo-600" />,
};

export default function Transactions() {
  const { transactions, pagination, fetchTransactions, createTransaction, updateTransaction, deleteTransaction, archiveTransaction, importTransactions, postRecurring, repairBalances, filters, setFilters, isLoading } = useTransactionStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const fileRef = useRef();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const needsBalanceRepair = accounts.some((a) => a.type !== 'credit' && Number(a.balance) < 0);

  useEffect(() => {
    fetchAccounts();
    postRecurring({ silent: true });
  }, []);

  useEffect(() => {
    const type = searchParams.get('type') || '';
    setFilters({ type });
  }, [searchParams]);

  useEffect(() => {
    fetchTransactions({ page });
  }, [page, filters]);

  const openCreate = () => { setForm({ ...defaultForm, account: accounts[0]?._id || '' }); setEditTx(null); setModalOpen(true); };
  const openEdit = (tx) => {
    setForm({
      account: tx.account?._id || tx.account,
      toAccount: tx.toAccount?._id || tx.toAccount || '',
      type: tx.type, amount: tx.amount, category: tx.category,
      description: tx.description || '', date: new Date(tx.date).toISOString().split('T')[0],
      receiptUrl: tx.receiptUrl || '',
      tags: tx.tags?.join(', ') || '', notes: tx.notes || '',
      splits: tx.splits || [], isRecurring: !!tx.isRecurring, frequency: tx.frequency || 'monthly',
      nextRunDate: tx.nextRunDate ? new Date(tx.nextRunDate).toISOString().split('T')[0] : '',
    });
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [] };
    if (editTx) {
      await updateTransaction(editTx._id, data);
    } else {
      await createTransaction(data);
    }
    setModalOpen(false);
    await fetchTransactions({ page });
    fetchAccounts(); // refresh balances immediately after transaction
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        subtitle={`${pagination.total} total transactions`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(transactionsToCSV(transactions), `transactions-${new Date().toISOString().split('T')[0]}.csv`)}
              className="btn-secondary px-3"
              title="Export CSV"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-secondary px-3"
              title="Import bank statement CSV"
            >
              <Upload size={16} />
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const rows = parseTransactionCsv(text);
                await importTransactions(rows, accounts[0]?._id);
                e.target.value = '';
                fetchAccounts();
              }} />
            <button onClick={openCreate} className="btn-primary flex-1 lg:flex-none">
              <Plus size={16} />
              <span className="lg:hidden">Add</span>
              <span className="hidden lg:inline">Add Transaction</span>
            </button>
          </div>
        }
      />

      {needsBalanceRepair && (
        <div className="card p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/40">
          <p className="font-medium text-amber-900 dark:text-amber-200">Account balances look too low</p>
          <p className="text-sm text-amber-800/80 dark:text-amber-200/70 mt-1">
            Extra auto-posted recurring items likely subtracted more than once. Restore puts that money back and removes the duplicate rows.
          </p>
          <button
            type="button"
            disabled={repairing}
            onClick={async () => {
              if (!window.confirm('Remove extra auto-posted transactions and restore balances?')) return;
              setRepairing(true);
              try {
                const result = await repairBalances();
                if (result) {
                  await fetchAccounts();
                  await fetchTransactions({ page });
                }
              } finally {
                setRepairing(false);
              }
            }}
            className="btn-secondary text-sm mt-3 inline-flex items-center gap-2"
          >
            <RotateCcw size={14} /> {repairing ? 'Restoring…' : 'Restore balances'}
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="input-field"
              style={{ paddingLeft: '2.25rem' }}
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => { setFilters({ search: e.target.value }); setPage(1); }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary shrink-0 px-3 ${showFilters ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200' : ''}`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <select className="input-field text-sm" value={filters.type} onChange={(e) => { setFilters({ type: e.target.value }); setPage(1); }}>
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </select>
                <select className="input-field text-sm" value={filters.account} onChange={(e) => { setFilters({ account: e.target.value }); setPage(1); }}>
                  <option value="">All Accounts</option>
                  {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
                <input type="date" className="input-field text-sm" value={filters.startDate}
                  onChange={(e) => { setFilters({ startDate: e.target.value }); setPage(1); }} />
                <input type="date" className="input-field text-sm" value={filters.endDate}
                  onChange={(e) => { setFilters({ endDate: e.target.value }); setPage(1); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transactions List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner center />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions found"
            description="Add your first transaction to start tracking your finances."
            action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Transaction</button>}
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            <div className="hidden lg:flex items-center gap-4 px-6 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="w-9 shrink-0" />
              <div className="flex-1">Transaction</div>
              <div className="w-28 text-right">Amount</div>
              <div className="w-36 text-right">Balance</div>
              <div className="w-16" />
            </div>
            {transactions.map((tx, i) => {
              const amountClass = tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600';
              const amountLabel = `${tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${formatCurrency(tx.amount, user?.currency)}`;
              const balanceLabel = formatCurrency(
                tx.runningBalance ?? accounts.find((a) => a._id === (tx.account?._id || tx.account))?.balance,
                user?.currency
              );
              const iconWrap = tx.type === 'income'
                ? 'bg-green-50 dark:bg-green-900/20'
                : tx.type === 'expense'
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-indigo-50 dark:bg-indigo-900/20';

              return (
              <motion.div
                key={tx._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group list-row"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openEdit(tx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openEdit(tx); }}
                  className="lg:hidden w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconWrap}`}>
                    {typeIcons[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {tx.description || tx.category}
                      </p>
                      <p className={`text-sm font-semibold shrink-0 tabular-nums ${amountClass}`}>
                        {amountLabel}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate">
                        {formatDate(tx.date, 'short')}
                        {tx.account?.name ? ` · ${tx.account.name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400 shrink-0 tabular-nums">Bal {balanceLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {tx.category && <Badge variant={typeColors[tx.type]} size="xs">{tx.category}</Badge>}
                      {tx.receiptUrl && (
                        <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-500 flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}>
                          <Paperclip size={11} /> Receipt
                        </a>
                      )}
                      <span className="flex-1" />
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setDeleteId(tx._id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDeleteId(tx._id); } }}
                        className="p-1.5 -mr-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-4 px-6 py-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
                    {typeIcons[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {tx.description || tx.category}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <span className="text-xs text-gray-500 shrink-0">{formatDate(tx.date, 'short')}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 truncate">{tx.account?.name}</span>
                      {tx.category && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <Badge variant={typeColors[tx.type]} size="xs">{tx.category}</Badge>
                        </>
                      )}
                      {tx.receiptUrl && (
                        <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-0.5" title="View receipt"
                          onClick={(e) => e.stopPropagation()}>
                          <Paperclip size={11} /> Receipt
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="w-28 text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${amountClass}`}>{amountLabel}</p>
                  </div>
                  <div className="w-36 text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{balanceLabel}</p>
                    <p className="text-xs text-gray-400 truncate">{tx.account?.name}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(tx)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Edit3 size={13} className="text-gray-500" />
                    </button>
                    <button onClick={async () => { await archiveTransaction(tx._id); fetchAccounts(); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Archive size={13} className="text-gray-500" />
                    </button>
                    <button onClick={() => setDeleteId(tx._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 size={13} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between gap-2 px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs sm:text-sm text-gray-500 truncate">
              {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.pages} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTx ? 'Edit Transaction' : 'Add Transaction'}
        headerAction={
          <button type="submit" form="transaction-form" className="btn-primary w-full min-h-12 text-base">
            {editTx ? 'Update Transaction' : 'Add Transaction'}
          </button>
        }
      >
        <TransactionForm form={form} setForm={setForm} onSubmit={handleSubmit} accounts={accounts} isEdit={!!editTx} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { await deleteTransaction(deleteId); setDeleteId(null); fetchAccounts(); fetchTransactions({ page }); }}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? Account balances will be updated."
      />
    </div>
  );
}
