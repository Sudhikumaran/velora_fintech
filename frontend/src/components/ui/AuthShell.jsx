import { motion } from 'framer-motion';
import { FloatingOrbs } from './Motion';
import { easeOut, stagger, fadeUp } from '../../utils/motion';

export default function AuthShell({ headline, subhead, features = [], stats = [], children }) {
  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg,#6366f1 0%,#7c3aed 60%,#4f46e5 100%)' }}
      >
        <FloatingOrbs />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="relative z-10 flex items-center gap-3"
        >
          <motion.div
            animate={{ rotate: [0, 6, -4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center"
          >
            <span className="text-white font-bold text-lg">V</span>
          </motion.div>
          <span className="text-white font-bold text-xl tracking-tight">Velora</span>
        </motion.div>

        <div className="relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5, ease: easeOut }}>
            <h2 className="text-3xl font-bold text-white leading-snug">{headline}</h2>
            <p className="text-indigo-200 mt-3 text-sm leading-relaxed">{subhead}</p>
          </motion.div>

          {stats.length > 0 && (
            <motion.div
              variants={stagger(0.2, 0.08)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3"
            >
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="bg-white/10 rounded-xl p-3 backdrop-blur"
                >
                  <p className="text-white font-semibold text-sm">{s.value}</p>
                  <p className="text-indigo-300 text-xs mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {features.length > 0 && (
            <motion.div variants={stagger(0.2, 0.1)} initial="hidden" animate="show" className="space-y-3">
              {features.map((f) => (
                <motion.div key={f} variants={fadeUp} className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0"
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </motion.div>
                  <span className="text-indigo-100 text-sm">{f}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <p className="text-indigo-300 text-xs relative z-10">© 2026 Velora. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950 relative overflow-hidden">
        <div className="auth-mesh pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="w-full max-w-sm relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
