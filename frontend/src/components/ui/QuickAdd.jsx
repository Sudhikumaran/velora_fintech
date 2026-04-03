import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { useTransactionStore } from '../../store/transactionStore';
import { useAccountStore } from '../../store/accountStore';
import { TRANSACTION_CATEGORIES } from '../../utils/constants';
import Modal from './Modal';

const ACTIONS = [
  { type: 'income',   label: 'Income',   icon: ArrowUpRight,   color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { type: 'expense',  label: 'Expense',  icon: ArrowDownRight, color: 'bg-red-500',     ring: 'ring-red-200' },
  { type: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'bg-indigo-500',  ring: 'ring-indigo-200' },
];

export default function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [form, setForm] = useState({ account: '', toAccount: '', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
  const { createTransaction } = useTransactionStore();
  const { accounts } = useAccountStore();

  const openForm = (type) => {
    setForm({ account: accounts[0]?._id || '', toAccount: '', amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
    setModalType(type);
    setOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTransaction({ ...form, type: modalType });
    setModalType(null);
  };

  const categories = TRANSACTION_CATEGORIES[modalType === 'transfer' ? 'expense' : modalType] || [];

  return (
    <>
      {/* FAB cluster */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3">
        <AnimatePresence>
          {open && ACTIONS.map((a, i) => (
            <motion.button
              key={a.type}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 20 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
              onClick={() => openForm(a.type)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-lg ${a.color} ring-4 ${a.ring} dark:ring-opacity-20`}
            >
              <a.icon size={16} />
              {a.label}
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.92 }}
          className="w-14 h-14 rounded-2xl text-white shadow-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,.4)' }}
        >
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={24} />
          </motion.div>
        </motion.button>
      </div>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30"
          />
        )}
      </AnimatePresence>

      {/* Quick form modal */}
      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={`Quick Add ${modalType ? modalType.charAt(0).toUpperCase() + modalType.slice(1) : ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0.01" className="input-field" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">{modalType === 'transfer' ? 'From Account' : 'Account'}</label>
            <select className="input-field" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} required>
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          {modalType === 'transfer' ? (
            <div>
              <label className="label">To Account</label>
              <select className="input-field" value={form.toAccount} onChange={(e) => setForm({ ...form, toAccount: e.target.value })} required>
                <option value="">Select account</option>
                {accounts.filter((a) => a._id !== form.account).map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Description</label>
            <input className="input-field" placeholder="What was this for?" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full py-3">Add {modalType}</button>
        </form>
      </Modal>
    </>
  );
}
