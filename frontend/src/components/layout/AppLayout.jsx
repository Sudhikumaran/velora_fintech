import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import QuickAdd from '../ui/QuickAdd';
import GlobalSearch from '../ui/GlobalSearch';
import Onboarding from '../ui/Onboarding';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAccountStore } from '../../store/accountStore';
import { pageTransition } from '../../utils/motion';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('velora_theme') || 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('velora_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const location = useLocation();
  const { fetchAccounts } = useAccountStore();
  const [showOnboarding, completeOnboarding] = useOnboarding();
  useEffect(() => { fetchAccounts(); }, []);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 relative">
          <div className="pointer-events-none absolute inset-0 auth-mesh opacity-60 dark:opacity-30" />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              {...pageTransition}
              className="relative z-10"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        <QuickAdd />
        <GlobalSearch />
        {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      </div>
    </div>
  );
}
