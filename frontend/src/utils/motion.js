export const easeOut = [0.22, 1, 0.36, 1];

export const springSoft = { type: 'spring', stiffness: 280, damping: 26, mass: 0.8 };
export const springPop = { type: 'spring', stiffness: 420, damping: 28, mass: 0.7 };
export const springSnappy = { type: 'spring', stiffness: 520, damping: 32 };

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: easeOut } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: springPop },
};

export const slideRight = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: easeOut } },
};

export const stagger = (delayChildren = 0.06, staggerChildren = 0.07) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren, staggerChildren },
  },
});

export const pageTransition = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.32, ease: easeOut },
};

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const modalPanel = {
  initial: { opacity: 0, scale: 0.92, y: 24 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 12 },
  transition: springPop,
};

export const hoverLift = {
  rest: { y: 0, scale: 1 },
  hover: { y: -5, scale: 1.012, transition: { duration: 0.28, ease: easeOut } },
  tap: { scale: 0.985, y: 0 },
};
