import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay, modalPanel } from '../../utils/motion';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    document.body.classList.toggle('modal-open', isOpen);
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            {...modalOverlay}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
          />
          <motion.div
            {...modalPanel}
            className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col`}
            style={{ boxShadow: '0 24px 80px rgba(99,102,241,.16), 0 8px 24px rgba(0,0,0,.08)' }}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
              <motion.button
                type="button"
                whileHover={{ rotate: 90, scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </motion.button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-5 overscroll-contain">
              {children}
            </div>
            {footer && (
              <div
                className="shrink-0 px-5 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
