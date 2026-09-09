// Motion language: short, flat, and mostly opacity. Movement is a hint that
// something arrived, not an effect — nothing travels further than ~8px and
// nothing overshoots.
export const easeOut = [0.16, 1, 0.3, 1];

export const springSoft = { type: 'spring', stiffness: 400, damping: 34, mass: 0.7 };
export const springPop = { type: 'spring', stiffness: 520, damping: 38, mass: 0.6 };
export const springSnappy = { type: 'spring', stiffness: 700, damping: 42, mass: 0.5 };

export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.26, ease: easeOut } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: easeOut } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.98, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: springPop },
};

export const slideRight = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.24, ease: easeOut } },
};

export const stagger = (delayChildren = 0.02, staggerChildren = 0.03) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren, staggerChildren },
  },
});

export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
  transition: { duration: 0.18, ease: easeOut },
};

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const modalPanel = {
  initial: { opacity: 0, scale: 0.985, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.99, y: 4 },
  transition: springPop,
};

export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -2, transition: { duration: 0.18, ease: easeOut } },
  tap: { y: 0, transition: { duration: 0.06 } },
};
