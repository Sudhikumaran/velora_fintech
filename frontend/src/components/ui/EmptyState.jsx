import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

/** Soft line-art backdrop so empty pages feel intentional, not broken. */
function EmptyArt() {
  return (
    <svg width="140" height="88" viewBox="0 0 140 88" fill="none" aria-hidden className="mb-5">
      <rect x="18" y="22" width="104" height="52" rx="12" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" fill="none" />
      <path d="M34 48h28M34 56h18" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
      <circle cx="98" cy="48" r="12" className="stroke-teal-300 dark:stroke-teal-700" strokeWidth="1.5" fill="none" />
      <path d="M92 48h12M98 42v12" className="stroke-teal-500 dark:stroke-teal-400" strokeWidth="1.75" strokeLinecap="round" />
      <rect x="40" y="10" width="28" height="8" rx="4" className="fill-slate-100 dark:fill-slate-800" />
      <rect x="72" y="10" width="16" height="8" rx="4" className="fill-teal-50 dark:fill-teal-950" />
    </svg>
  );
}

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: easeOut }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <EmptyArt />
      {Icon && (
        <div className="w-10 h-10 -mt-2 mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}
