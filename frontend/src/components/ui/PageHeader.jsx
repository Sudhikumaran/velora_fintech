import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: easeOut }}
            className="text-sm text-gray-400 dark:text-gray-500 mt-0.5"
          >
            {subtitle}
          </motion.p>
        )}
      </motion.div>
      {action && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: easeOut }}
          className="shrink-0"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}
