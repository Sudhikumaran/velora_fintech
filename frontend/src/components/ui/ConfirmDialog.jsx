import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', confirmVariant = 'danger' }) {
  const variants = {
    danger: 'btn-danger',
    primary: 'btn-primary',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 w-full max-w-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={() => { onConfirm(); onClose(); }} className={variants[confirmVariant]}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
