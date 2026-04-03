import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, BarChart3,
  Target, TrendingDown, Briefcase, RefreshCw, Flag,
  CalendarDays, Settings, LogOut, ChevronLeft, Wallet,
  X, TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/accounts', icon: CreditCard, label: 'Accounts' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
      { to: '/income', icon: Wallet, label: 'Income' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budgets', icon: Target, label: 'Budgets' },
      { to: '/goals', icon: Flag, label: 'Goals' },
      { to: '/debts', icon: TrendingDown, label: 'Debts' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { to: '/investments', icon: TrendingUp, label: 'Investments' },
      { to: '/subscriptions', icon: RefreshCw, label: 'Subscriptions' },
    ],
  },
];

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 group relative
        ${isActive
          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
        }
        ${collapsed ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="nav-active"
              className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            />
          )}
          <Icon size={18} className="shrink-0 relative z-10" />
          {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">Velora</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <span className="text-white font-bold text-sm">V</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${collapsed ? 'rotate-180' : ''}`}
        >
          <ChevronLeft size={15} className="text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onMobileClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800 shrink-0 space-y-0.5">
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={onMobileClose} />

        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl bg-gray-50 dark:bg-gray-800/60">
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.currency}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 h-screen sticky top-0 transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 z-50 lg:hidden border-r border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    <span className="text-white font-bold text-sm">V</span>
                  </div>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">Velora</span>
                </div>
                <button onClick={onMobileClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <X size={17} className="text-gray-500" />
                </button>
              </div>
              <div className="h-[calc(100%-4rem)]"><SidebarContent /></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
