import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, BarChart3,
  Target, TrendingDown, RefreshCw, Flag,
  CalendarDays, Settings, LogOut, ChevronLeft,
  X, TrendingUp, BookOpen, ClipboardList, FileText, Inbox,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import BrandMark from '../ui/BrandMark';
import { usePlan } from '../../utils/plan';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/accounts', icon: CreditCard, label: 'Accounts' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
      { to: '/payments', icon: Inbox, label: 'Waiting payments' },
      { to: '/ledger', icon: BookOpen, label: 'Ledger' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/budgets', icon: Target, label: 'Budgets' },
      { to: '/income-planner', icon: ClipboardList, label: 'Income Planner', premium: true },
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

function NavItem({ to, icon: Icon, label, collapsed, onClick, premium }) {
  const isPremiumUser = usePlan().isPremium;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group relative
        ${isActive
          ? 'text-teal-800 dark:text-teal-300 font-semibold'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.05] font-medium'
        }
        ${collapsed ? 'justify-center' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="nav-active"
              className="absolute inset-0 rounded-xl bg-teal-500/10 dark:bg-teal-400/10"
              transition={{ type: 'spring', stiffness: 600, damping: 44, mass: 0.5 }}
            />
          )}
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-teal-600 dark:bg-teal-400" />
          )}
          <span className="shrink-0 relative z-10">
            <Icon size={18} strokeWidth={isActive ? 2.25 : 1.75} />
          </span>
          {!collapsed && (
            <span className="relative z-10 truncate flex-1">{label}</span>
          )}
          {!collapsed && premium && !isPremiumUser && (
            <span className="relative z-10 text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded-md">
              Pro
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { logout, user } = useAuthStore();
  const { isPremium } = usePlan();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = ({ hideBrand }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {!hideBrand && (
        <div className={`flex items-center h-[64px] px-4 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandMark className="w-8 h-8" rounded="rounded-xl" />
              <div className="min-w-0">
                <p className="font-bold text-[15px] text-slate-900 dark:text-white tracking-tight leading-none">Velora</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">Finance</p>
              </div>
            </div>
          ) : (
            <BrandMark className="w-8 h-8" rounded="rounded-xl" />
          )}
          <button
            onClick={onToggle}
            className={`hidden lg:flex p-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-lg transition-colors ${collapsed ? 'rotate-180' : ''}`}
          >
            <ChevronLeft size={15} className="text-slate-400" />
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 px-2.5 scrollbar-hide space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-3 mb-1.5 tracking-wide">
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

      <div className="px-2.5 pb-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] shrink-0 space-y-0.5">
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={onMobileClose} />

        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-teal-600 text-white text-sm font-semibold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{isPremium ? 'Premium' : 'Free'} · {user?.currency}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors duration-150 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col bg-white/80 dark:bg-[#0f1419]/90 backdrop-blur-xl border-r border-black/[0.06] dark:border-white/[0.06] h-screen sticky top-0 transition-[width] duration-200 ease-out shrink-0 ${collapsed ? 'w-[72px]' : 'w-[248px]'}`}
      >
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              className="fixed top-0 left-0 h-full w-[280px] bg-white dark:bg-[#0f1419] z-50 lg:hidden border-r border-black/[0.06] dark:border-white/[0.06]"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="w-8 h-8" rounded="rounded-xl" />
                  <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Velora</span>
                </div>
                <button onClick={onMobileClose} className="p-1.5 hover:bg-black/[0.04] rounded-lg">
                  <X size={17} className="text-slate-500" />
                </button>
              </div>
              <div className="h-[calc(100%-4rem)]"><SidebarContent hideBrand /></div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
