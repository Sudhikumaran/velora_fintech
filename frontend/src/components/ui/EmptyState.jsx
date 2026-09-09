import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

/** Soft line-art backdrop so empty pages feel intentional, not broken. */
function EmptyArt() {
  return (
    <svg width="140" height="88" viewBox="0 0 140 88" fill="none" aria-hidden className="mb-5">
      <rect x="18" y="22" width="104" height="52" rx="12" className="stroke-gray-200 dark:stroke-gray-700" strokeWidth="1.5" fill="none" />
      <path d="M34 48h28M34 56h18" className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" strokeLinecap="round" />
      <circle cx="98" cy="48" r="12" className="stroke-indigo-300 dark:stroke-indigo-700" strokeWidth="1.5" fill="none" />
      <path d="M92 48h12M98 42v12" className="stroke-indigo-400 dark:stroke-indigo-500" strokeWidth="1.75" strokeLinecap="round" />
      <rect x="40" y="10" width="28" height="8" rx="4" className="fill-gray-100 dark:fill-gray-800" />
      <rect x="72" y="10" width="16" height="8" rx="4" className="fill-indigo-50 dark:fill-indigo-950" />
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
        <div className="w-10 h-10 -mt-2 mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Icon size={18} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  );
}
