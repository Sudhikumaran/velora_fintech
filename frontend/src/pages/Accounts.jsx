import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Edit3, Trash2, Archive, MoreVertical, Wallet, TrendingUp } from 'lucide-react';
import { useAccountStore } from '../store/accountStore';
import { useInvestmentStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ACCOUNT_TYPES, COLORS } from '../utils/constants';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const getDefaultForm = (userCurrency = 'INR') => ({ name: '', type: 'bank', balance: '', currency: userCurrency, color: '#6366f1', description: '', creditLimit: '' });

function AccountForm({ form, setForm, onSubmit, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Account Name</label>
          <input className="input-field" placeholder="e.g. Chase Checking" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Balance</label>
          <input type="number" step="0.01" className="input-field" placeholder="0.00" value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })} required />
        </div>
        {form.type === 'credit' && (
          <div>
            <label className="label">Credit Limit</label>
            <input type="number" step="0.01" className="input-field" placeholder="0.00" value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
          </div>
        )}
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="label">Description (optional)</label>
          <input className="input-field" placeholder="Optional description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">{isEdit ? 'Update Account' : 'Create Account'}</button>
    </form>
  );
}

const accountTypeIcons = { bank: '🏦', cash: '💵', credit: '💳', savings: '🏧', investment: '📈', wallet: '👛', other: '💰' };

export default function Accounts() {
  const { accounts, fetchAccounts, createAccount, updateAccount, deleteAccount, archiveAccount, isLoading } = useAccountStore();
  const { investments, fetchInvestments } = useInvestmentStore();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(() => getDefaultForm(user?.currency));
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { fetchAccounts(showArchived); fetchInvestments(); }, [showArchived]);

  const openCreate = () => { setForm(getDefaultForm(user?.currency)); setEditAccount(null); setModalOpen(true); };
  const openEdit = (account) => {
    setForm({ name: account.name, type: account.type, balance: account.balance, currency: account.currency, color: account.color, description: account.description || '', creditLimit: account.creditLimit || '' });
    setEditAccount(account);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editAccount) {
      await updateAccount(editAccount._id, form);
    } else {
      await createAccount(form);
    }
    setModalOpen(false);
  };

  const totalBalance = accounts.filter((a) => !a.isArchived).reduce((sum, a) => sum + a.balance, 0);
  const bankAccounts = accounts.filter((a) => !a.isArchived && ['bank', 'savings', 'cash', 'wallet'].includes(a.type));
  const creditAccounts = accounts.filter((a) => !a.isArchived && a.type === 'credit');
  const investmentAccounts = accounts.filter((a) => !a.isArchived && a.type === 'investment');
  const portfolioValue = investments.reduce((s, inv) => s + inv.units * (inv.currentPrice || inv.buyPrice), 0);
  const investmentAccountsValue = investmentAccounts.reduce((s, a) => s + a.balance, 0);
  const totalInvestments = portfolioValue + investmentAccountsValue;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        subtitle="Manage your financial accounts"
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Account
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Balance', value: totalBalance, color: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600', icon: Wallet },
          { label: 'Credit Used', value: creditAccounts.reduce((s, a) => s + Math.abs(a.balance), 0), color: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600', icon: CreditCard },
          { label: 'Investments', value: totalInvestments, color: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600', icon: TrendingUp },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${card.color}`}><card.icon size={20} className={card.text} /></div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(card.value, user?.currency)}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toggle archived */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
        >
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <LoadingSpinner center />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No accounts yet"
          description="Add your bank accounts, cash, credit cards, and more to start tracking."
          action={<button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Account</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {accounts.map((account, i) => (
              <motion.div
                key={account._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className={`card p-5 relative group ${account.isArchived ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: account.color + '20' }}>
                      {accountTypeIcons[account.type]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{account.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(account)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Edit3 size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => archiveAccount(account._id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                      <Archive size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => setDeleteId(account._id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="mb-1">
                  <p className="text-2xl font-bold" style={{ color: account.balance < 0 ? '#ef4444' : account.color }}>
                    {formatCurrency(account.balance, user?.currency)}
                  </p>
                </div>

                {account.type === 'credit' && account.creditLimit > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Credit used</span>
                      <span>{formatCurrency(Math.abs(account.balance), user?.currency)} / {formatCurrency(account.creditLimit, user?.currency)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Math.abs(account.balance) / account.creditLimit) * 100)}%`,
                          background: account.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                {account.isArchived && <Badge variant="default" size="xs">Archived</Badge>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editAccount ? 'Edit Account' : 'Add Account'}>
        <AccountForm form={form} setForm={setForm} onSubmit={handleSubmit} isEdit={!!editAccount} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteAccount(deleteId)}
        title="Delete Account"
        message="Are you sure you want to delete this account? All associated transactions will also be deleted."
      />
    </div>
  );
}
