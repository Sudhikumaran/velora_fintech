import { Menu, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'react-router-dom';
import { SearchTrigger } from '../ui/GlobalSearch';
import NotificationCenter from '../ui/NotificationCenter';

const pageTitles = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/analytics': 'Analytics',
  '/budgets': 'Budgets',
  '/debts': 'Debts',
  '/income': 'Income',
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
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors lg:hidden"
        >
          <Menu size={19} className="text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-base font-bold text-gray-900 dark:text-white hidden sm:block">{title}</h2>
      </div>

      <div className="flex items-center gap-2">
        <SearchTrigger />
        <NotificationCenter />
        <button
          onClick={onToggleTheme}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={17} className="text-gray-500 dark:text-gray-400" />
            : <Moon size={17} className="text-gray-500" />
          }
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-gray-100 dark:border-gray-800 ml-1">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{user?.name?.split(' ')[0]}</p>
            <p className="text-xs text-gray-400">{user?.currency}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
