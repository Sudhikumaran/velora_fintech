import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between mb-5 lg:mb-7">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: easeOut }}
        className="hidden lg:block"
      >
        <h1 className="text-[22px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">{subtitle}</p>
        )}
      </motion.div>
      {subtitle && (
        <p className="lg:hidden text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.2, ease: easeOut }}
          className="w-full lg:w-auto shrink-0 page-header-actions"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}
