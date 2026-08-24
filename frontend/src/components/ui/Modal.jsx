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
        const show = Keyboard.addListener('keyboardWillShow', (ev) => apply(ev.keyboardHeight || readViewport()));
        const shown = Keyboard.addListener('keyboardDidShow', (ev) => apply(ev.keyboardHeight || readViewport()));
        const hide = Keyboard.addListener('keyboardWillHide', () => apply(0));
        const hidden = Keyboard.addListener('keyboardDidHide', () => apply(0));
        removeKeyboard = () => {
          show.then((h) => h.remove());
          shown.then((h) => h.remove());
          hide.then((h) => h.remove());
          hidden.then((h) => h.remove());
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
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ paddingBottom: keyboardInset }}
        >
          <motion.div
            {...modalOverlay}
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-md"
          />
          <motion.div
            {...modalPanel}
            className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col`}
            style={{
              boxShadow: '0 24px 80px rgba(99,102,241,.16), 0 8px 24px rgba(0,0,0,.08)',
              maxHeight: keyboardInset ? `min(92dvh, calc(100dvh - ${keyboardInset}px))` : '92dvh',
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">{title}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {headerAction && (
                  <div className="sm:hidden">{headerAction}</div>
                )}
                {!headerAction && footer && (
                  <div className="sm:hidden [&_button]:px-3.5 [&_button]:py-2 [&_button]:text-sm [&_button]:w-auto [&_button]:whitespace-nowrap">
                    {footer}
                  </div>
                )}
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
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 px-5 sm:px-6 py-5 overscroll-contain">
              {children}
            </div>
            {footer && (
              <div
                className="shrink-0 px-5 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
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
