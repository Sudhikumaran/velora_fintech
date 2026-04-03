import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { CURRENCIES } from '../../utils/constants';

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
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#6366f1 0%,#7c3aed 60%,#4f46e5 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(-30%,30%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Velora</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Your finances,<br />beautifully organized.
            </h2>
            <p className="text-indigo-200 mt-3 text-sm leading-relaxed">
              Track accounts, budgets, debts, investments and more — all in one elegant dashboard.
            </p>
          </div>

          <div className="space-y-3">
            {['Track every rupee you earn & spend', 'Set budgets that actually work', 'Visualize your financial growth'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
                <span className="text-indigo-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-xs relative z-10">© 2025 Velora. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input-field" placeholder="e.g. Alex Johnson"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="name" required />
            </div>

            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input-field" placeholder="alex@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email" required />
            </div>

            <div>
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
            </div>

            <div>
              <label className="label">Default Currency</label>
              <select className="input-field" value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} — {c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 mt-2 text-sm">
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            By signing up you agree to our Terms & Privacy Policy.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
