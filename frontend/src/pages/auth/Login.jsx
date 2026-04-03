import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#6366f1 0%,#7c3aed 60%,#4f46e5 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(-30%,30%)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Velora</span>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Welcome back.<br />Good to see you.
            </h2>
            <p className="text-indigo-200 mt-3 text-sm leading-relaxed">
              Pick up right where you left off with your personal finance dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Accounts', value: 'Multi-type' },
              { label: 'Analytics', value: 'Real-time' },
              { label: 'Budgets', value: 'Smart alerts' },
              { label: 'Goals', value: 'Progress tracking' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3 backdrop-blur">
                <p className="text-white font-semibold text-sm">{s.value}</p>
                <p className="text-indigo-300 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-xs relative z-10">© 2025 Velora. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-field" placeholder="alex@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email" autoFocus required />
            </div>

            <div>
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
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 text-sm">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Secure login — your data stays private.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
