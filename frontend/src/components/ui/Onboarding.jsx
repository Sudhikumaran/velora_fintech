import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, BarChart2, Target, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';
import api from '../../utils/api';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Velora!',
    subtitle: 'Your personal finance command centre',
    description: "Let's set up your account in a few quick steps so you can start tracking your finances right away.",
    color: 'from-indigo-500 to-purple-600',
    action: 'Get started',
  },
  {
    icon: Wallet,
    title: 'Add your first account',
    subtitle: 'Bank, cash, or credit',
    description: 'Tell Velora about your accounts so we can track your balances and transactions automatically.',
    color: 'from-blue-500 to-indigo-600',
    action: 'Add account',
    form: 'account',
  },
  {
    icon: BarChart2,
    title: 'Set your budget',
    subtitle: 'Take control of spending',
    description: "Create a monthly budget for a category you spend on most — like Food or Transport.",
    color: 'from-amber-500 to-orange-500',
    action: 'Set budget',
    form: 'budget',
    skip: true,
  },
  {
    icon: Target,
    title: 'Set a savings goal',
    subtitle: 'Start building your future',
    description: "Whether it's a vacation, emergency fund, or a big purchase — goals keep you motivated.",
    color: 'from-emerald-500 to-teal-600',
    action: 'Create goal',
    form: 'goal',
    skip: true,
  },
  {
    icon: CheckCircle2,
    title: "You're all set!",
    subtitle: 'Velora is ready for you',
    description: "Head to your dashboard to see your financial overview and start adding transactions.",
    color: 'from-emerald-400 to-teal-500',
    action: 'Go to Dashboard',
  },
];

const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit', 'investment', 'other'];
const BUDGET_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Rent', 'Other'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState({ name: '', type: 'checking', balance: '' });
  const [budget, setBudget] = useState({ name: '', category: 'Food', limit: '', period: 'monthly' });
  const [goal, setGoal] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchAccounts } = useAccountStore();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = async () => {
    if (isLast) {
      localStorage.setItem('velora_onboarded', 'true');
      navigate('/');
      return;
    }
    if (current.form === 'account' && account.name && account.balance !== '') {
      setSaving(true);
      try { await api.post('/accounts', { ...account, balance: parseFloat(account.balance) }); fetchAccounts(); }
      catch {}
      setSaving(false);
    }
    if (current.form === 'budget' && budget.name && budget.limit) {
      setSaving(true);
      try { await api.post('/budgets', { ...budget, limit: parseFloat(budget.limit) }); }
      catch {}
      setSaving(false);
    }
    if (current.form === 'goal' && goal.name && goal.targetAmount) {
      setSaving(true);
      try { await api.post('/goals', { ...goal, targetAmount: parseFloat(goal.targetAmount), currentAmount: 0 }); }
      catch {}
      setSaving(false);
    }
    setStep(step + 1);
  };

  const skip = () => setStep(step + 1);

  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
            } ${i === step ? 'w-8' : 'w-4'}`} />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="card p-8 text-center"
        >
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}
            style={{ boxShadow: '0 8px 24px rgba(99,102,241,.25)' }}>
            <current.icon size={28} className="text-white" />
          </div>

          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">{current.subtitle}</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{current.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">{current.description}</p>

          {/* Forms */}
          {current.form === 'account' && (
            <div className="text-left space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Account name</label>
                  <input className="input-field" placeholder="e.g. Main Checking"
                    value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={account.type} onChange={(e) => setAccount({ ...account, type: e.target.value })}>
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Current balance ({user?.currency || 'USD'})</label>
                <input type="number" step="0.01" className="input-field" placeholder="0.00"
                  value={account.balance} onChange={(e) => setAccount({ ...account, balance: e.target.value })} />
              </div>
            </div>
          )}
          {current.form === 'budget' && (
            <div className="text-left space-y-3 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Budget name</label>
                  <input className="input-field" placeholder="e.g. Food & Dining"
                    value={budget.name} onChange={(e) => setBudget({ ...budget, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input-field" value={budget.category} onChange={(e) => setBudget({ ...budget, category: e.target.value })}>
                    {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Monthly limit ({user?.currency || 'USD'})</label>
                <input type="number" step="0.01" className="input-field" placeholder="500"
                  value={budget.limit} onChange={(e) => setBudget({ ...budget, limit: e.target.value })} />
              </div>
            </div>
          )}
          {current.form === 'goal' && (
            <div className="text-left space-y-3 mb-6">
              <div>
                <label className="label">Goal name</label>
                <input className="input-field" placeholder="e.g. Emergency fund"
                  value={goal.name} onChange={(e) => setGoal({ ...goal, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target amount</label>
                  <input type="number" step="0.01" className="input-field" placeholder="10000"
                    value={goal.targetAmount} onChange={(e) => setGoal({ ...goal, targetAmount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Target date</label>
                  <input type="date" className="input-field" value={goal.targetDate}
                    onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleNext}
            disabled={saving}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
              <>{current.action} {!isLast && <ChevronRight size={18} />}</>
            )}
          </button>

          {current.skip && (
            <button onClick={skip} className="mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Skip for now
            </button>
          )}
        </motion.div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Step {step + 1} of {STEPS.length} · You can always change this later in settings
        </p>
      </div>
    </div>
  );
}

