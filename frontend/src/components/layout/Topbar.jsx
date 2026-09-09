import { Menu, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';
import { SearchTrigger } from '../ui/GlobalSearch';
import NotificationCenter from '../ui/NotificationCenter';
import { isNativeApp } from '../../utils/native';

const pageTitles = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/ledger': 'Ledger',
  '/analytics': 'Analytics',
  '/budgets': 'Budgets',
  '/debts': 'Debts',
  '/reports': 'Reports',
  '/income-planner': 'Income Planner',
  '/investments': 'Investments',
  '/subscriptions': 'Subscriptions',
  '/goals': 'Goals',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
  '/payments': 'Waiting payments',
};

export default function Topbar({ onMenuClick, theme, onToggleTheme }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Velora';

  return (
    <header className="h-16 bg-white/75 dark:bg-[#0f1419]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 relative">
      <motion.div
        key={location.pathname}
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ scaleX: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }, opacity: { delay: 0.35, duration: 0.25 } }}
        className="absolute left-0 top-0 h-[2px] origin-left bg-teal-500 w-full"
      />
      <div className="flex items-center gap-3 min-w-0">
        {!isNativeApp() && (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors lg:hidden"
          >
            <Menu size={19} className="text-slate-600 dark:text-slate-400" />
          </button>
        )}
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-[15px] font-bold text-slate-900 dark:text-white truncate max-w-[46vw] tracking-tight"
          >
            {title}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <SearchTrigger />
        <NotificationCenter />
        <button
          onClick={onToggleTheme}
          className="p-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-xl transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={17} className="text-slate-400" />
            : <Moon size={17} className="text-slate-500" />
          }
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-black/[0.06] dark:border-white/[0.06] ml-1">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-teal-600 text-white text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{user?.name?.split(' ')[0]}</p>
            <p className="text-[11px] text-slate-400">{user?.currency}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
