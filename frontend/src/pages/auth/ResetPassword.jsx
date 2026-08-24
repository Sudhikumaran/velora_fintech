import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const { resetPassword, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await resetPassword(token, password);
    if (ok) navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
      <div className="auth-mesh absolute inset-0 pointer-events-none" />
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-sm card p-6 space-y-4 relative z-10"
      >
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Choose a new password</h1>
        {!token && <p className="text-sm text-red-500">Missing reset token.</p>}
        <input type="password" className="input-field" placeholder="New password" minLength={6}
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full" disabled={isLoading || !token}>Reset password</button>
        <Link to="/login" className="text-sm text-indigo-600">Back to sign in</Link>
      </motion.form>
    </div>
  );
}
