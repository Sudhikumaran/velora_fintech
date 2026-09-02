import { useState } from 'react';
import { Lock } from 'lucide-react';
import BrandMark from './BrandMark';
import { hasAppPin, isAppUnlocked, unlockWithPin } from '../../utils/appLock';

export default function AppLock({ children }) {
  const [unlocked, setUnlocked] = useState(() => isAppUnlocked());
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!hasAppPin() || unlocked) return children;

  const submit = async (e) => {
    e.preventDefault();
    const ok = await unlockWithPin(pin);
    if (!ok) {
      setError('Wrong PIN');
      setPin('');
      return;
    }
    setError('');
    setUnlocked(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm card p-6 space-y-4">
        <div className="flex flex-col items-center text-center gap-2">
          <BrandMark />
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <Lock size={18} className="text-indigo-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Unlock Velora</h1>
          <p className="text-sm text-gray-500">Enter your 4–6 digit PIN for this device.</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="input-field text-center tracking-[0.4em] text-lg"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          autoFocus
        />
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={pin.length < 4}>Unlock</button>
      </form>
    </div>
  );
}
