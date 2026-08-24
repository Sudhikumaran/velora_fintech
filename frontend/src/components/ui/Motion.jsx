import { motion, useReducedMotion } from 'framer-motion';
import { easeOut, fadeUp, hoverLift, stagger } from '../../utils/motion';

export function FadeUp({ children, delay = 0, className = '', as: Tag = motion.div, ...props }) {
  const reduce = useReducedMotion();
  return (
    <Tag
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: easeOut }}
      className={className}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function Stagger({ children, className = '', delay = 0.04, staggerBy = 0.06 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? undefined : stagger(delay, staggerBy)}
      initial={reduce ? false : 'hidden'}
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '', ...props }) {
  return (
    <motion.div variants={fadeUp} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export function HoverLift({ children, className = '', ...props }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'tap'}
      variants={reduce ? undefined : hoverLift}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FloatingOrbs() {
  const reduce = useReducedMotion();
  const blob = (className, animate, duration) => (
    <motion.div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      animate={reduce ? undefined : animate}
      transition={reduce ? undefined : { duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  );

  return (
    <>
      {blob('w-72 h-72 bg-white/25 -top-16 -right-10', { x: [0, 24, 0], y: [0, 18, 0], scale: [1, 1.08, 1] }, 10)}
      {blob('w-80 h-80 bg-violet-300/20 -bottom-20 -left-16', { x: [0, -18, 0], y: [0, -22, 0], scale: [1, 1.12, 1] }, 14)}
      {blob('w-40 h-40 bg-white/15 top-1/2 right-10', { y: [0, -28, 0], opacity: [0.4, 0.7, 0.4] }, 8)}
    </>
  );
}

export function PulseRing({ className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`absolute inset-0 rounded-2xl border-2 border-indigo-400/50 ${className}`}
      animate={reduce ? undefined : { scale: [1, 1.35], opacity: [0.55, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
    />
  );
}
