import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-6">
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: easeOut }}
        className="hidden lg:block"
      >
        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </motion.div>
      {subtitle && (
        <p className="lg:hidden text-sm text-gray-500 dark:text-gray-500">{subtitle}</p>
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
