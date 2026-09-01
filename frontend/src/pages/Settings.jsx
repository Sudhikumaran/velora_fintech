import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Palette, Globe, Download, LogOut, Check, RefreshCw, RotateCcw, Smartphone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { CURRENCIES } from '../utils/constants';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import AvatarUpload from '../components/ui/AvatarUpload';
import { isNativeApp } from '../utils/native';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import PaymentCapture from '../plugins/paymentCapture';
import {
  isAutoPayEnabled,
  setAutoPayEnabled,
  getAutoPayAccountId,
  setAutoPayAccountId,
  flushPendingPayments,
  enableBankSmsCapture,
} from '../utils/paymentCapture';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'data', label: 'Data', icon: Download },
];

export default function Settings() {
  const { user, updateProfile, updatePassword, logout, deleteAccount } = useAuthStore();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', currency: user?.currency || 'USD', timezone: user?.timezone || 'UTC', avatar: user?.avatar || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [saved, setSaved] = useState(false);
  const { fetchAccounts, accounts } = useAccountStore();
  const { fetchTransactions, repairBalances } = useTransactionStore();
  const [repairing, setRepairing] = useState(false);
  const [autoPay, setAutoPay] = useState(() => isAutoPayEnabled());
  const [autoPayAccount, setAutoPayAccount] = useState(() => getAutoPayAccountId());
  const [notifyAccess, setNotifyAccess] = useState(false);
  const [smsAccess, setSmsAccess] = useState(false);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    const sync = async () => {
      try {
        const { enabled, sms } = await PaymentCapture.isAccessEnabled();
        setNotifyAccess(!!enabled);
        setSmsAccess(!!sms);
      } catch {
        setNotifyAccess(false);
        setSmsAccess(false);
      }
    };
    sync();
    const t = setInterval(sync, 2500);
    return () => clearInterval(t);
  }, []);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      await api.post('/analytics/import', json);
      toast.success('Import complete');
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const success = await updateProfile(profileForm);
    if (success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const success = await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (success) setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/analytics/export');
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `velora-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-56 shrink-0">
          <div className="card p-2 space-y-0.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <s.icon size={16} />
                {s.label}
              </button>
            ))}
            <hr className="my-1 border-gray-100 dark:border-gray-800" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6"
          >
            {activeSection === 'profile' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>

                {/* Avatar upload */}
                <div className="mb-6">
                  <AvatarUpload
                    userId={user?._id}
                    currentAvatar={profileForm.avatar}
                    name={profileForm.name}
                    onUploaded={(url) => setProfileForm((f) => ({ ...f, avatar: url }))}
                  />
                </div>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Full Name</label>
                      <input className="input-field" value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} required />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" className="input-field opacity-60" value={profileForm.email} disabled />
                    </div>
                    <div>
                      <label className="label">Currency</label>
                      <select className="input-field" value={profileForm.currency}
                        onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}>
                        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Timezone</label>
                      <select className="input-field" value={profileForm.timezone}
                        onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}>
                        {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'].map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className={`btn-primary flex items-center gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                    {saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'security' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Security</h2>
                <form onSubmit={handlePasswordSave} className="space-y-4 max-w-md">
                  <div>
                    <label className="label">Current Password</label>
                    <input type="password" className="input-field" value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input-field" value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input-field" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                  </div>
                  <button type="submit" className="btn-primary">Update Password</button>
                </form>
              </div>
            )}

            {activeSection === 'preferences' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                      <p className="text-sm text-gray-500">Toggle light/dark mode from the top bar</p>
                    </div>
                    <Palette size={20} className="text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Currency</p>
                      <p className="text-sm text-gray-500">Currently: {user?.currency}</p>
                    </div>
                    <Globe size={20} className="text-gray-400" />
                  </div>
                  {isNativeApp() && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="font-medium text-gray-900 dark:text-white">Prompt after bank & UPI payments</p>
                      <p className="text-sm text-gray-500 mt-1">
                        When you pay, Velora opens a form with amount, date, and description already filled. You pick the category (or split one payment into two categories) and save. The next time that merchant appears, the last category is pre-selected. Bank statement CSVs can be imported from Transactions if an SMS was missed.
                      </p>
                      <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={autoPay}
                          onChange={async (e) => {
                            const on = e.target.checked;
                            setAutoPay(on);
                            setAutoPayEnabled(on);
                            if (!on) return;
                            if (!notifyAccess) {
                              toast('Turn on notification access for Velora, then return here.');
                              try { await PaymentCapture.openAccessSettings(); } catch { /* ignore */ }
                            }
                            const smsOk = await enableBankSmsCapture();
                            setSmsAccess(smsOk);
                            if (!smsOk) toast('Allow SMS so bank debit messages can open the add-payment form.');
                            flushPendingPayments();
                          }}
                        />
                        Open add-payment popup when I pay
                      </label>
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Default bank / account</p>
                        <select
                          className="input-field text-sm"
                          value={autoPayAccount}
                          onChange={(e) => {
                            setAutoPayAccount(e.target.value);
                            setAutoPayAccountId(e.target.value);
                          }}
                        >
                          <option value="">Prefer a bank account automatically</option>
                          {accounts.filter((a) => !a.isArchived).map((a) => (
                            <option key={a._id} value={a._id}>{a.name}{a.type === 'bank' || a.type === 'savings' ? ' (bank)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <p className={`text-xs mt-2 ${notifyAccess ? 'text-green-600' : 'text-amber-600'}`}>
                        {notifyAccess ? 'Notification access is on.' : 'Notification access is off — UPI app alerts cannot be read yet.'}
                      </p>
                      <p className={`text-xs mt-1 ${smsAccess ? 'text-green-600' : 'text-amber-600'}`}>
                        {smsAccess ? 'SMS access is on — bank debit messages will open the add form.' : 'SMS access is off — bank SMS will not open the form until you allow it.'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="btn-secondary text-sm inline-flex items-center gap-2"
                          onClick={() => PaymentCapture.openAccessSettings()}
                        >
                          <Smartphone size={14} /> Notification access
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-sm inline-flex items-center gap-2"
                          onClick={async () => {
                            const smsOk = await enableBankSmsCapture();
                            setSmsAccess(smsOk);
                            toast[smsOk ? 'success' : 'error'](smsOk ? 'Bank SMS capture is on' : 'SMS permission was not granted');
                          }}
                        >
                          Allow bank SMS
                        </button>
                      </div>
                    </div>
                  )}
                  {isNativeApp() && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="font-medium text-gray-900 dark:text-white">App updates</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        This APK includes the app UI. Reinstall a new APK after icon or native changes.
                      </p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="btn-secondary mt-3"
                      >
                        <RefreshCw size={15} /> Reload
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'data' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Data Management</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
                        <p className="text-sm text-gray-500">Download all your financial data as JSON</p>
                      </div>
                      <Download size={20} className="text-gray-400" />
                    </div>
                    <button onClick={handleExport} className="btn-primary text-sm flex items-center gap-2 mt-3">
                      <Download size={14} /> Export JSON
                    </button>
                    <label className="btn-secondary text-sm mt-3 inline-flex cursor-pointer">
                      Import JSON
                      <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
                    </label>
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">Restore account balances</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Removes extra auto-posted recurring/subscription copies from 24 Aug onward and puts the money back on your accounts.
                      </p>
                      <button
                        type="button"
                        disabled={repairing}
                        onClick={async () => {
                          if (!window.confirm('Remove extra auto-posted transactions and restore balances?')) return;
                          setRepairing(true);
                          try {
                            const result = await repairBalances();
                            if (result) {
                              await fetchAccounts();
                              await fetchTransactions({ page: 1 });
                            }
                          } finally {
                            setRepairing(false);
                          }
                        }}
                        className="btn-secondary text-sm mt-3 inline-flex items-center gap-2"
                      >
                        <RotateCcw size={14} /> {repairing ? 'Restoring…' : 'Restore balances'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl">
                    <p className="font-medium text-red-700 dark:text-red-400">Danger Zone</p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Deleting your account is permanent and cannot be undone.</p>
                    <input type="password" className="input-field mt-3" placeholder="Confirm with your password"
                      value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                    <button className="btn-danger text-sm mt-3" onClick={async () => {
                      const ok = await deleteAccount(deletePassword);
                      if (ok) navigate('/login');
                    }}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
