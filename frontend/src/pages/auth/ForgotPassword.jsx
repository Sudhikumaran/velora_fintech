import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { forgotPassword, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await forgotPassword(email);
    if (ok) setSent(true);
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Forgot password</h1>
        {sent ? (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-gray-500">
            If that email exists, a reset link was sent. Check your inbox.
          </motion.p>
        ) : (
          <>
            <input type="email" className="input-field" placeholder="you@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn-primary w-full" disabled={isLoading}>Send reset link</button>
          </>
        )}
        <Link to="/login" className="text-sm text-indigo-600">Back to sign in</Link>
      </motion.form>
    </div>
  );
}
