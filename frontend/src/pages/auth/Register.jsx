import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { CURRENCIES } from '../../utils/constants';
import AuthShell from '../../components/ui/AuthShell';
import { fadeUp, stagger } from '../../utils/motion';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', currency: 'USD' });
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(form.name, form.email, form.password, form.currency);
    if (success) navigate('/');
  };

  return (
    <AuthShell
      headline={<>Your finances,<br />beautifully organized.</>}
      subhead="Track accounts, budgets, debts, investments and more — all in one elegant dashboard."
      features={['Track every rupee you earn & spend', 'Set budgets that actually work', 'Visualize your financial growth']}
    >
      <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <span className="text-white font-bold">V</span>
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-white">Velora</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          Already have one?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold">Sign in</Link>
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        variants={stagger(0.04, 0.07)}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <label className="label">Full Name</label>
          <input type="text" className="input-field" placeholder="e.g. Alex Johnson"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name" required />
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className="label">Email Address</label>
          <input type="email" className="input-field" placeholder="alex@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email" required />
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className="label">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} className="input-field pr-11"
              placeholder="At least 6 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password" required minLength={6} />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className="label">Default Currency</label>
          <select className="input-field" value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name} — {c.code} ({c.symbol})</option>
            ))}
          </select>
        </motion.div>

        <motion.button variants={fadeUp} type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 text-sm">
          {isLoading ? 'Creating account…' : 'Create account'}
        </motion.button>
      </motion.form>

      <p className="text-center text-xs text-gray-400 mt-6">
        By signing up you agree to our Terms & Privacy Policy.
      </p>
    </AuthShell>
  );
}
