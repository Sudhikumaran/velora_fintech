import { useState, useEffect } from 'react';
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
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const sync = () => setHidden(document.body.classList.contains('modal-open'));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-[#0f1419]/92 backdrop-blur-xl border-t border-black/[0.06] dark:border-white/[0.06] mobile-tab-bar"
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
                active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.4 : 1.75} />
              {tab.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-400"
        >
          <Menu size={20} strokeWidth={1.75} />
          More
        </button>
      </div>
    </nav>
  );
}
