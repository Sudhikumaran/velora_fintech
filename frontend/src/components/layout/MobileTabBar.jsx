import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, FileText, Menu,
} from 'lucide-react';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home', end: true },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Money' },
  { to: '/accounts', icon: CreditCard, label: 'Accounts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
];

export default function MobileTabBar({ onMore }) {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const active = tab.end
            ? location.pathname === '/' || location.pathname === '/dashboard'
            : location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.4 : 2} />
              {tab.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-gray-400"
        >
          <Menu size={20} />
          More
        </button>
      </div>
    </nav>
  );
}
