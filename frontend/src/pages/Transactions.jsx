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
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ReceiptUpload from '../components/ui/ReceiptUpload';
import CategorySelect from '../components/ui/CategorySelect';

const defaultForm = {
  account: '', toAccount: '', type: 'expense', amount: '',
  category: '', description: '', date: new Date().toISOString().split('T')[0], tags: '', notes: '', receiptUrl: '',
  splits: [], isRecurring: false, frequency: 'monthly', nextRunDate: '',
  isBusiness: false, gstin: '', gstAmount: '',
};

function splitText(split) {
  return (split?.description || split?.notes || '').trim();
}

function isSplitTx(tx) {
  return Array.isArray(tx?.splits) && tx.splits.length > 0;
}

function SplitDetails({ tx, currency, onEdit, onClose }) {
  const amountClass = tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600';
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : '';
  const parts = tx.splits || [];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {tx.description || 'Split transaction'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {formatDate(tx.date, 'long')}
          {tx.account?.name ? ` · ${tx.account.name}` : ''}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/60 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          <span>Category</span>
          <span>Description</span>
          <span className="text-right w-24">Amount</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {parts.map((s, i) => (
            <div key={i} className="px-4 py-3 sm:grid sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-3">
              <div className="flex items-start justify-between gap-3 sm:block">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.category || '—'}</p>
                  <p className="sm:hidden text-xs text-gray-500 mt-0.5">{splitText(s) || 'No description'}</p>
                </div>
                <p className={`sm:hidden text-sm font-semibold tabular-nums shrink-0 ${amountClass}`}>
                  {sign}{formatCurrency(s.amount, currency)}
                </p>
              </div>
              <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 truncate">
                {splitText(s) || '—'}
              </p>
              <p className={`hidden sm:block text-sm font-semibold tabular-nums text-right w-24 ${amountClass}`}>
                {sign}{formatCurrency(s.amount, currency)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total</span>
          <span className={`text-base font-bold tabular-nums ${amountClass}`}>
            {sign}{formatCurrency(tx.amount, currency)}
          </span>
        </div>
      </div>

      {tx.notes && (
        <p className="text-sm text-gray-500">{tx.notes}</p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="btn-primary flex-1 min-h-12">
          <Edit3 size={15} /> Edit split
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 min-h-12">
          Close
        </button>
      </div>
    </div>
  );
}

function TransactionForm({ form, setForm, onSubmit, accounts, isEdit }) {
  const baseCategories = TRANSACTION_CATEGORIES[form.type === 'transfer' ? 'expense' : form.type] || [];
  const storageKey = `velora_custom_categories_${form.type === 'transfer' ? 'expense' : form.type}`;
  const [customCategories, setCustomCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { setCustomCategories(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { setCustomCategories([]); }
  }, [storageKey]);
  const categories = [...baseCategories, ...customCategories];
  const usingSplits = form.type !== 'transfer' && (form.splits || []).length > 0;
  const splitTotal = (form.splits || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  const rememberCategory = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const updateSplit = (i, patch) => {
    const splits = [...form.splits];
    splits[i] = { ...splits[i], ...patch };
    const total = splits.reduce((s, x) => s + parseFloat(x.amount || 0), 0);
    setForm({
      ...form,
      splits,
      amount: total ? String(total) : form.amount,
      category: splits[0]?.category || form.category,
    });
  };

  const addSplit = () => {
    const existing = form.splits || [];
    if (!existing.length) {
      setForm({
        ...form,
        splits: [
          { category: form.category || '', amount: form.amount || '', description: form.description || '' },
          { category: '', amount: '', description: '' },
        ],
      });
      return;
    }
    setForm({ ...form, splits: [...existing, { category: '', amount: '', description: '' }] });
  };

  return (
    <form id="transaction-form" onSubmit={onSubmit} className="space-y-4">
      {/* Type Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {['income', 'expense', 'transfer'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setForm({ ...form, type: t, category: t === 'transfer' ? 'Transfer' : '', splits: t === 'transfer' ? [] : form.splits })}
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
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required={!usingSplits} readOnly={usingSplits} />
          {usingSplits && <p className="text-xs text-gray-400 mt-1">Total from splits: {splitTotal ? splitTotal.toFixed(2) : '0.00'}</p>}
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
        ) : !usingSplits ? (
          <div>
            <label className="label">Category</label>
            <CategorySelect
              value={form.category}
              categories={categories}
              onChange={(name) => {
                rememberCategory(name);
                setForm({ ...form, category: name });
              }}
            />
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-sm text-gray-500 pb-2">Each split has its own category below.</p>
          </div>
        )}
        <div className="col-span-1 sm:col-span-2">
          <label className="label">{usingSplits ? 'Overall description' : 'Description'}</label>
          <input className="input-field" placeholder="What was this for?" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="label">Notes (optional)</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Additional notes..." value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {form.type !== 'transfer' && (
            <div className="mt-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={!!form.isBusiness}
                  onChange={(e) => setForm({ ...form, isBusiness: e.target.checked })}
                />
                Business / GST invoice
              </label>
              {form.isBusiness && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">GSTIN</label>
                    <input className="input-field" placeholder="22AAAAA0000A1Z5" value={form.gstin}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">GST amount</label>
                    <input type="number" step="0.01" className="input-field" placeholder="0.00" value={form.gstAmount}
                      onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}
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
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Split into multiple categories</label>
              {usingSplits ? (
                <button type="button" className="text-xs text-gray-500" onClick={() => setForm({ ...form, splits: [] })}>
                  Remove split
                </button>
              ) : (
                <button type="button" className="text-xs text-indigo-600 font-semibold" onClick={addSplit}>
                  + Add split
                </button>
              )}
            </div>
            {usingSplits && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Each part gets its own category, amount, and description. Example: ₹30 Food (lunch) and ₹20 Other (parking).
                </p>
                {(form.splits || []).map((split, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Part {i + 1}</p>
                      <button type="button" className="text-red-500 text-sm px-1" onClick={() => setForm({ ...form, splits: form.splits.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="label">Category</label>
                        <CategorySelect
                          value={split.category}
                          categories={categories}
                          onChange={(name) => {
                            rememberCategory(name);
                            updateSplit(i, { category: name });
                          }}
                        />
                      </div>
                      <div>
                        <label className="label">Amount</label>
                        <input type="number" step="0.01" className="input-field" placeholder="0.00" value={split.amount}
                          onChange={(e) => updateSplit(i, { amount: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <input className="input-field" placeholder="What was this part for?" value={split.description || ''}
                        onChange={(e) => updateSplit(i, { description: e.target.value })} />
                    </div>
                  </div>
                ))}
                <button type="button" className="text-xs text-indigo-600 font-semibold" onClick={addSplit}>
                  + Add another part
                </button>
              </div>
            )}
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
  const [viewTx, setViewTx] = useState(null);
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

  const openCreate = () => { setForm({ ...defaultForm, account: accounts[0]?._id || '' }); setEditTx(null); setViewTx(null); setModalOpen(true); };
  const openEdit = (tx) => {
    setViewTx(null);
    setForm({
      account: tx.account?._id || tx.account,
      toAccount: tx.toAccount?._id || tx.toAccount || '',
      type: tx.type, amount: tx.amount, category: tx.category,
      description: tx.description || '', date: new Date(tx.date).toISOString().split('T')[0],
      receiptUrl: tx.receiptUrl || '',
      tags: tx.tags?.join(', ') || '', notes: tx.notes || '',
      splits: (tx.splits || []).map((s) => ({
        category: s.category || '',
        amount: s.amount ?? '',
        description: splitText(s),
      })),
      isRecurring: !!tx.isRecurring, frequency: tx.frequency || 'monthly',
      nextRunDate: tx.nextRunDate ? new Date(tx.nextRunDate).toISOString().split('T')[0] : '',
      isBusiness: !!tx.isBusiness, gstin: tx.gstin || '', gstAmount: tx.gstAmount || '',
    });
    setEditTx(tx);
    setModalOpen(true);
  };

  const openTx = (tx) => {
    if (isSplitTx(tx)) {
      setModalOpen(false);
      setEditTx(null);
      setViewTx(tx);
      return;
    }
    openEdit(tx);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawSplits = form.splits || [];
    if (rawSplits.length && rawSplits.some((s) => !s.category || !(parseFloat(s.amount) > 0))) {
      toast.error('Each split needs a category and amount');
      return;
    }
    const splits = rawSplits
      .map((s) => ({
        category: s.category,
        amount: parseFloat(s.amount),
        description: (s.description || '').trim(),
        notes: (s.description || '').trim(),
      }))
      .filter((s) => s.category && Number.isFinite(s.amount) && s.amount > 0);
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      splits,
      category: splits[0]?.category || form.category,
      amount: splits.length ? splits.reduce((n, s) => n + s.amount, 0) : form.amount,
    };
    if (editTx) {
      await updateTransaction(editTx._id, data);
    } else {
      await createTransaction(data);
    }
    setModalOpen(false);
    setViewTx(null);
    await fetchTransactions({ page });
    fetchAccounts();
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
                  onClick={() => openTx(tx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openTx(tx); }}
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
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isSplitTx(tx) ? (
                        <Badge variant={typeColors[tx.type]} size="xs">
                          Split · {tx.splits.length} {tx.splits.length === 1 ? 'part' : 'parts'}
                        </Badge>
                      ) : (
                        tx.category && <Badge variant={typeColors[tx.type]} size="xs">{tx.category}</Badge>
                      )}
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

                <div
                  className="hidden lg:flex items-center gap-4 px-6 py-4 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => openTx(tx)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openTx(tx); }}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconWrap}`}>
                    {typeIcons[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {tx.description || tx.category}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0 flex-wrap">
                      <span className="text-xs text-gray-500 shrink-0">{formatDate(tx.date, 'short')}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 truncate">{tx.account?.name}</span>
                      {isSplitTx(tx) ? (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <Badge variant={typeColors[tx.type]} size="xs">
                            Split · {tx.splits.length} {tx.splits.length === 1 ? 'part' : 'parts'}
                          </Badge>
                        </>
                      ) : tx.category && (
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
                    <button onClick={(e) => { e.stopPropagation(); openTx(tx); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg" title="View">
                      <Edit3 size={13} className="text-gray-500" />
                    </button>
                    <button onClick={async (e) => { e.stopPropagation(); await archiveTransaction(tx._id); fetchAccounts(); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Archive size={13} className="text-gray-500" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(tx._id); }} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
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
        isOpen={!!viewTx}
        onClose={() => setViewTx(null)}
        title="Split details"
      >
        {viewTx && (
          <SplitDetails
            tx={viewTx}
            currency={user?.currency}
            onEdit={() => openEdit(viewTx)}
            onClose={() => setViewTx(null)}
          />
        )}
      </Modal>

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
