import { motion } from 'framer-motion';
import { easeOut } from '../../utils/motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 float-icon"
        >
          <Icon size={28} className="text-gray-400" />
        </motion.div>
      )}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}
