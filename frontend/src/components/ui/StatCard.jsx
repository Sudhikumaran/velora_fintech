import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

const colorMap = {
  indigo:  { bg: 'bg-indigo-50  dark:bg-indigo-900/20',  icon: 'text-indigo-600 dark:text-indigo-400',  border: 'border-indigo-100 dark:border-indigo-800/40' },
  green:   { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800/40' },
  red:     { bg: 'bg-red-50     dark:bg-red-900/20',     icon: 'text-red-500    dark:text-red-400',      border: 'border-red-100    dark:border-red-800/40' },
  yellow:  { bg: 'bg-amber-50   dark:bg-amber-900/20',   icon: 'text-amber-600  dark:text-amber-400',    border: 'border-amber-100  dark:border-amber-800/40' },
  purple:  { bg: 'bg-violet-50  dark:bg-violet-900/20',  icon: 'text-violet-600 dark:text-violet-400',   border: 'border-violet-100 dark:border-violet-800/40' },
  blue:    { bg: 'bg-blue-50    dark:bg-blue-900/20',    icon: 'text-blue-600   dark:text-blue-400',     border: 'border-blue-100   dark:border-blue-800/40' },
};

export default function StatCard({ title, value, subtitle, trend, icon: Icon, color = 'indigo', delay = 0, rawValue }) {
  const c = colorMap[color] || colorMap.indigo;
  const isUp   = trend?.direction === 'up';
  const isDown = trend?.direction === 'down';
  const animated = useAnimatedCounter(typeof rawValue === 'number' ? rawValue : 0, 1000, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="card p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
            <Icon size={18} className={c.icon} />
          </div>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums">{value}</p>
        {(trend || subtitle) && (
          <div className="flex items-center gap-2 mt-1.5">
            {trend && (
              <span className={isUp ? 'change-up' : isDown ? 'change-down' : 'inline-flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full'}>
                {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : null}
                {trend.percent}%
              </span>
            )}
            {subtitle && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
