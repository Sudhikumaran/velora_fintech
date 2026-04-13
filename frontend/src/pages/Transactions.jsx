import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, ArrowUpRight, ArrowDownRight, ArrowLeftRight,
  Edit3, Trash2, Archive, Download, ChevronLeft, ChevronRight, Paperclip,
} from 'lucide-react';
import { exportToCSV, transactionsToCSV } from '../utils/csvExport';
import { useTransactionStore } from '../store/transactionStore';
import { useAccountStore } from '../store/accountStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { TRANSACTION_CATEGORIES } from '../utils/constants';
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
    <form onSubmit={onSubmit} className="space-y-4">
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
              <div className="flex gap-2 mt-2">
                <input
                  className="input-field flex-1"
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
          />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Transaction' : 'Add Transaction'}</button>
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
  const { transactions, pagination, fetchTransactions, createTransaction, updateTransaction, deleteTransaction, archiveTransaction, filters, setFilters, isLoading } = useTransactionStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { user } = useAuthStore();

  // Per-account running balance: work backwards from each account's current balance
  const accountBalanceMap = Object.fromEntries(accounts.map((a) => [a._id, a.balance]));
  const runningBalances = (() => {
    // Track running balance per account as we go newest→oldest
    const currentBal = { ...accountBalanceMap };
    return transactions.map((tx) => {
      const accId = tx.account?._id || tx.account;
      const bal = currentBal[accId] ?? 0;
      // Reverse the effect to get balance before moving to next (older) tx
      if (tx.type === 'income') currentBal[accId] = (currentBal[accId] ?? 0) - tx.amount;
      else if (tx.type === 'expense') currentBal[accId] = (currentBal[accId] ?? 0) + tx.amount;
      else if (tx.type === 'transfer') {
        currentBal[accId] = (currentBal[accId] ?? 0) + tx.amount;
        const toId = tx.toAccount?._id || tx.toAccount;
        if (toId) currentBal[toId] = (currentBal[toId] ?? 0) - tx.amount;
      }
      return { bal, accName: tx.account?.name || '' };
    });
  })();

  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

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
    fetchTransactions({ page });
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
              className="btn-secondary"
              title="Export CSV"
            >
              <Download size={16} />
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        }
      />

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
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-200' : ''}`}
          >
            <Filter size={16} /> Filters
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
            {/* Header row */}
            <div className="flex items-center gap-4 px-6 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <div className="w-9 shrink-0" />
              <div className="flex-1">Transaction</div>
              <div className="w-28 text-right">Amount</div>
              <div className="w-36 text-right">Balance</div>
              <div className="w-16" />
            </div>
            {transactions.map((tx, i) => (
              <motion.div
                key={tx._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  tx.type === 'income' ? 'bg-green-50 dark:bg-green-900/20' :
                  tx.type === 'expense' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'
                }`}>
                  {typeIcons[tx.type]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {tx.description || tx.category}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatDate(tx.date, 'short')}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{tx.account?.name}</span>
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
                  <p className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-indigo-600'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                    {formatCurrency(tx.amount, user?.currency)}
                  </p>
                </div>

                {/* Running Balance per account */}
                <div className="w-36 text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(runningBalances[i]?.bal, user?.currency)}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{runningBalances[i]?.accName}</p>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(tx)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <Edit3 size={13} className="text-gray-500" />
                  </button>
                  <button onClick={() => archiveTransaction(tx._id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <Archive size={13} className="text-gray-500" />
                  </button>
                  <button onClick={() => setDeleteId(tx._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={13} className="text-red-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTx ? 'Edit Transaction' : 'Add Transaction'}>
        <TransactionForm form={form} setForm={setForm} onSubmit={handleSubmit} accounts={accounts} isEdit={!!editTx} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteTransaction(deleteId)}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? Account balances will be updated."
      />
    </div>
  );
}
