import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import {
  FREE_FEATURES,
  PREMIUM_FEATURES,
  PREMIUM_PRICE,
  TRIAL_DAYS,
  usePlan,
} from '../../utils/plan';
import Modal from './Modal';

async function refreshUser() {
  await useAuthStore.getState().fetchMe();
}

export async function startPremiumTrial() {
  try {
    const { data } = await api.post('/extras/plan/trial');
    await refreshUser();
    toast.success(data.message || `${TRIAL_DAYS}-day Premium trial started`);
    return true;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Could not start trial');
    return false;
  }
}

export async function joinPremiumWaitlist() {
  try {
    const { data } = await api.post('/extras/plan/waitlist');
    await refreshUser();
    toast.success(data.message || 'You are on the Premium waitlist');
    return true;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Could not join waitlist');
    return false;
  }
}

export function PlanActions({ className = '' }) {
  const { isPremium, trialUsed, waitlist, isTrial, daysLeft } = usePlan();
  const [busy, setBusy] = useState(false);

  if (isPremium) {
    return (
      <p className={`text-sm text-emerald-600 ${className}`}>
        {isTrial ? `Premium trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'You are on Premium'}
      </p>
    );
  }

  const onClick = async () => {
    setBusy(true);
    try {
      if (!trialUsed) await startPremiumTrial();
      else await joinPremiumWaitlist();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button type="button" disabled={busy || waitlist} className="btn-primary" onClick={onClick}>
        {busy ? 'Please wait…' : !trialUsed ? `Start ${TRIAL_DAYS}-day trial` : waitlist ? 'On the waitlist' : 'Join Premium waitlist'}
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Checkout is not live yet. {PREMIUM_PRICE} when payments open. We will email you — keep using Free until then.
      </p>
    </div>
  );
}

export function UpgradeCard({ title = 'Premium feature', blurb, preview, currency = 'INR' }) {
  return (
    <div className="card p-5 space-y-3 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(400px 160px at 100% 0%, rgba(13,148,136,0.12), transparent 60%)' }}
      />
      <div className="relative z-10 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-600">
          <Sparkles size={15} className="text-white" />
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
      </div>
      {preview != null && Number.isFinite(Number(preview)) && (
        <div className="relative z-10">
          <p className="text-3xl font-bold text-teal-700 dark:text-teal-300 num-lg blur-[6px] select-none pointer-events-none">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(preview))}
          </p>
          <p className="absolute inset-0 flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            Unlock to see net worth
          </p>
        </div>
      )}
      <p className="relative z-10 text-sm text-slate-500">{blurb || 'Included with Premium. Core tracking stays free.'}</p>
      <div className="relative z-10">
        <PlanActions />
      </div>
      <Link to="/settings" className="relative z-10 text-xs font-semibold text-teal-700 dark:text-teal-300">Compare plans in Settings</Link>
    </div>
  );
}

export function PlanCompare() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Free</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">₹0</p>
        <ul className="space-y-2">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'linear-gradient(180deg, rgba(13,148,136,0.12), transparent)' }}>
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Premium</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{PREMIUM_PRICE}</p>
        <ul className="space-y-2">
          {PREMIUM_FEATURES.map((f) => (
            <li key={f} className="flex gap-2 text-sm text-gray-700 dark:text-gray-200">
              <Check size={15} className="text-indigo-500 shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <PlanActions />
      </div>
    </div>
  );
}

export default function UpgradeModal({ open, onClose, title = 'Upgrade to Premium' }) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Keep unlimited accounts and manual books on Free. Premium adds capture, insights, household, CA export, and unlimited budgets.
        </p>
        <PlanCompare />
      </div>
    </Modal>
  );
}
