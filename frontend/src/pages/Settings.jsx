import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Palette, Globe, Download, LogOut, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { CURRENCIES } from '../utils/constants';
import api from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import AvatarUpload from '../components/ui/AvatarUpload';

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Palette },
  { id: 'data', label: 'Data', icon: Download },
];

export default function Settings() {
  const { user, updateProfile, updatePassword, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', currency: user?.currency || 'USD', timezone: user?.timezone || 'UTC', avatar: user?.avatar || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saved, setSaved] = useState(false);

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
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl">
                    <p className="font-medium text-red-700 dark:text-red-400">Danger Zone</p>
                    <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">Deleting your account is permanent and cannot be undone.</p>
                    <button className="btn-danger text-sm mt-3" onClick={() => toast.error('Account deletion not available in demo')}>
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
