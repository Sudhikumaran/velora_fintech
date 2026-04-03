import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeftRight, CreditCard, Target, TrendingDown, TrendingUp, RefreshCw, Flag, X, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

const TYPE_CONFIG = {
  transaction:  { icon: ArrowLeftRight, color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-900/20',  path: '/transactions' },
  account:      { icon: CreditCard,     color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',      path: '/accounts' },
  budget:       { icon: Target,         color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',    path: '/budgets' },
  debt:         { icon: TrendingDown,   color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',        path: '/debts' },
  investment:   { icon: TrendingUp,     color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20',path: '/investments' },
  subscription: { icon: RefreshCw,      color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20',  path: '/subscriptions' },
  goal:         { icon: Flag,           color: 'text-pink-500',    bg: 'bg-pink-50 dark:bg-pink-900/20',      path: '/goals' },
};

async function globalSearch(query) {
  if (!query.trim() || query.length < 2) return [];
  const q = encodeURIComponent(query);
  const [txRes, accRes] = await Promise.allSettled([
    api.get(`/transactions?search=${q}&limit=5`),
    api.get(`/accounts`),
  ]);

  const results = [];
  if (txRes.status === 'fulfilled') {
    txRes.value.data.data.forEach((tx) => results.push({
      type: 'transaction', id: tx._id,
      title: tx.description || tx.category,
      subtitle: `${tx.type} · ${tx.account?.name || ''}`,
      amount: tx.amount, txType: tx.type,
    }));
  }
  if (accRes.status === 'fulfilled') {
    accRes.value.data.data
      .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .forEach((acc) => results.push({
        type: 'account', id: acc._id,
        title: acc.name, subtitle: `${acc.type} account`, amount: acc.balance,
      }));
  }
  return results;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(''); setResults([]); setSelected(0); }
  }, [open]);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try { setResults(await globalSearch(query)); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (result) => {
    navigate(TYPE_CONFIG[result.type]?.path || '/');
    setOpen(false);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, results.length - 1));
    if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0));
    if (e.key === 'Enter' && results[selected]) go(results[selected]);
  };

  return (
    <>
      {/* Trigger button in topbar — exported separately below */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
              style={{ boxShadow: '0 24px 64px rgba(0,0,0,.15)' }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
                  placeholder="Search transactions, accounts, budgets…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                  onKeyDown={handleKey}
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                    <X size={15} />
                  </button>
                )}
                <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono">Esc</kbd>
              </div>

              {/* Results */}
              {query.length >= 2 && (
                <div className="max-h-80 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : results.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-sm text-gray-400">
                      <Search size={24} className="mb-2 opacity-40" />
                      No results for "{query}"
                    </div>
                  ) : (
                    <div className="py-2">
                      {results.map((r, i) => {
                        const cfg = TYPE_CONFIG[r.type];
                        return (
                          <button
                            key={r.id + r.type}
                            onClick={() => go(r)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg?.bg}`}>
                              {cfg && <cfg.icon size={16} className={cfg.color} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.title}</p>
                              <p className="text-xs text-gray-400 capitalize">{r.subtitle}</p>
                            </div>
                            {r.amount !== undefined && (
                              <p className={`text-sm font-semibold shrink-0 ${
                                r.txType === 'income' ? 'text-emerald-600' : r.txType === 'expense' ? 'text-red-500' : 'text-gray-900 dark:text-white'
                              }`}>
                                {r.txType === 'income' ? '+' : r.txType === 'expense' ? '−' : ''}
                                {formatCurrency(r.amount, user?.currency)}
                              </p>
                            )}
                            {i === selected && <CornerDownLeft size={14} className="text-gray-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!query && (
                <div className="px-4 py-4">
                  <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Quick navigation</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => { navigate(cfg.path); setOpen(false); }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                          <cfg.icon size={14} className={cfg.color} />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{key}s</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
      className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm text-gray-400"
    >
      <Search size={14} />
      <span>Search…</span>
      <kbd className="flex items-center gap-0.5 text-xs text-gray-400 font-mono ml-1">⌘K</kbd>
    </button>
  );
}
