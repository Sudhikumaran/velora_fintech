import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import AuthShell from '../../components/ui/AuthShell';
import { fadeUp, stagger } from '../../utils/motion';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(form.email, form.password);
    if (success) navigate('/');
  };

  return (
    <AuthShell
      headline={<>Welcome back.<br />Good to see you.</>}
      subhead="Pick up right where you left off with your personal finance dashboard."
      stats={[
        { label: 'Accounts', value: 'Multi-type' },
        { label: 'Analytics', value: 'Real-time' },
        { label: 'Budgets', value: 'Smart alerts' },
        { label: 'Goals', value: 'Progress tracking' },
      ]}
    >
      <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
          <span className="text-white font-bold">V</span>
        </div>
        <span className="font-bold text-xl text-gray-900 dark:text-white">Velora</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
          New to Velora?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-500 font-semibold">Create an account</Link>
        </p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4"
        variants={stagger(0.05, 0.08)}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp}>
          <label className="label">Email Address</label>
          <input type="email" className="input-field" placeholder="alex@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email" autoFocus required />
        </motion.div>

        <motion.div variants={fadeUp}>
          <label className="label">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} className="input-field pr-11"
              placeholder="Enter your password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password" required />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Link to="/forgot-password" className="text-xs text-indigo-600 font-medium mt-1.5 inline-block">Forgot password?</Link>
        </motion.div>

        <motion.button variants={fadeUp} type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 text-sm">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </motion.button>
      </motion.form>

      <p className="text-center text-xs text-gray-400 mt-6">
        Secure login — your data stays private.
      </p>
    </AuthShell>
  );
}
