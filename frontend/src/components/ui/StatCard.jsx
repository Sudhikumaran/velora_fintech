import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { easeOut } from '../../utils/motion';

const colorMap = {
  indigo:  { bg: 'bg-teal-50  dark:bg-teal-900/20',  icon: 'text-teal-600 dark:text-teal-400' },
  green:   { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400' },
  red:     { bg: 'bg-red-50     dark:bg-red-900/20',     icon: 'text-red-500    dark:text-red-400' },
  yellow:  { bg: 'bg-amber-50   dark:bg-amber-900/20',   icon: 'text-amber-600  dark:text-amber-400' },
  purple:  { bg: 'bg-teal-50  dark:bg-teal-900/20',  icon: 'text-teal-700 dark:text-teal-300' },
  blue:    { bg: 'bg-sky-50    dark:bg-sky-900/20',    icon: 'text-sky-600   dark:text-sky-400' },
};

export default function StatCard({ title, value, subtitle, trend, icon: Icon, color = 'indigo', delay = 0 }) {
  const c = colorMap[color] || colorMap.indigo;
  const isUp   = trend?.direction === 'up';
  const isDown = trend?.direction === 'down';
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ delay, duration: 0.26, ease: easeOut }}
      className="card p-5 flex flex-col gap-4 cursor-default"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.06em]">{title}</p>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg}`}>
            <Icon size={17} className={c.icon} strokeWidth={2} />
          </div>
        )}
      </div>

      <div>
        <p className="text-[26px] font-bold text-slate-900 dark:text-white num-lg leading-none">{value}</p>
        {(trend || subtitle) && (
          <div className="flex items-center gap-2 mt-2.5">
            {trend && (
              <motion.span
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.14, duration: 0.2, ease: easeOut }}
                className={isUp ? 'change-up' : isDown ? 'change-down' : 'inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full'}
              >
                {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : null}
                {trend.percent}%
              </motion.span>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
