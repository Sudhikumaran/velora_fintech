import { motion } from 'framer-motion';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Icon size={28} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && action}
    </motion.div>
  );
}
