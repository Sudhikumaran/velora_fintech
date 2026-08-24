import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalOverlay, modalPanel } from '../../utils/motion';

function useBottomInset(active) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!active) {
      setInset(0);
      return undefined;
    }

    const readViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return 0;
      return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    };

    const apply = (value) => setInset(Math.max(0, value));
    const onViewport = () => apply(readViewport());
    window.visualViewport?.addEventListener('resize', onViewport);
    window.visualViewport?.addEventListener('scroll', onViewport);
    window.addEventListener('resize', onViewport);
    onViewport();

    let removeKeyboard = () => {};
    import('@capacitor/keyboard')
      .then(({ Keyboard }) => {
        const show = Keyboard.addListener('keyboardDidShow', (ev) => apply(ev.keyboardHeight || readViewport()));
        const hide = Keyboard.addListener('keyboardDidHide', () => apply(0));
        removeKeyboard = () => {
          show.then((h) => h.remove());
          hide.then((h) => h.remove());
        };
      })
      .catch(() => {});

    return () => {
      window.visualViewport?.removeEventListener('resize', onViewport);
      window.visualViewport?.removeEventListener('scroll', onViewport);
      window.removeEventListener('resize', onViewport);
      removeKeyboard();
    };
  }, [active]);

  return inset;
}

export default function Modal({ isOpen, onClose, title, children, footer, headerAction, size = 'md' }) {
  const keyboardInset = useBottomInset(isOpen);

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
        <div
          className="fixed inset-0 z-[200] flex items-stretch sm:items-center justify-center p-0 sm:p-4"
          style={{ paddingBottom: keyboardInset }}
        >
          <motion.div
            {...modalOverlay}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
          />
          <motion.div
            {...modalPanel}
            className={`relative w-full h-full sm:h-auto ${sizes[size]} bg-white dark:bg-gray-900 sm:rounded-2xl border-0 sm:border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col`}
            style={{
              boxShadow: '0 24px 80px rgba(99,102,241,.16), 0 8px 24px rgba(0,0,0,.08)',
              maxHeight: keyboardInset ? `calc(100dvh - ${keyboardInset}px)` : '100dvh',
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{title}</h2>
              <motion.button
                type="button"
                whileHover={{ rotate: 90, scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X size={16} />
              </motion.button>
            </div>

            {(headerAction || footer) && (
              <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                {headerAction || footer}
              </div>
            )}

            <div className="overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-5 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
