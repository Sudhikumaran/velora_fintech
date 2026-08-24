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
};

export default function Topbar({ onMenuClick, theme, onToggleTheme }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Velora';

  return (
    <header className="h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 relative">
      <motion.div
        key={location.pathname}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-0 top-0 h-0.5 origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent w-full"
      />
      <div className="flex items-center gap-3">
        {!isNativeApp() && (
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors lg:hidden"
        >
          <Menu size={19} className="text-gray-600 dark:text-gray-400" />
        </button>
        )}
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="text-base font-bold text-gray-900 dark:text-white truncate max-w-[46vw]"
          >
            {title}
          </motion.h2>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <SearchTrigger />
        <NotificationCenter />
        <motion.button
          whileHover={{ rotate: theme === 'dark' ? 20 : -15, scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={17} className="text-gray-500 dark:text-gray-400" />
            : <Moon size={17} className="text-gray-500" />
          }
        </motion.button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-gray-100 dark:border-gray-800 ml-1">
          <motion.div whileHover={{ scale: 1.08 }} className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </motion.div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-gray-400">{user?.currency}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
