import { motion } from 'framer-motion';
import BrandMark from './BrandMark';
import { easeOut, stagger, fadeUp } from '../../utils/motion';

export default function AuthShell({ headline, subhead, features = [], stats = [], children }) {
  return (
    <div className="min-h-screen flex" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: '#042f2e' }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(600px 320px at 20% 10%, rgba(45,212,191,0.18), transparent 60%), radial-gradient(500px 280px at 90% 90%, rgba(13,148,136,0.2), transparent 55%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="relative z-10 flex items-center gap-3"
        >
          <BrandMark className="w-10 h-10" rounded="rounded-2xl" />
          <span className="text-white font-bold text-xl tracking-tight">Velora</span>
        </motion.div>

        <div className="relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.28, ease: easeOut }}>
            <h2 className="text-3xl font-bold text-white leading-snug tracking-tight">{headline}</h2>
            <p className="text-teal-100/70 mt-3 text-sm leading-relaxed">{subhead}</p>
          </motion.div>

          {stats.length > 0 && (
            <motion.div
              variants={stagger(0.12, 0.06)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-3"
            >
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-2xl font-bold text-white num-lg">{s.value}</p>
                  <p className="text-xs text-teal-100/60 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {features.length > 0 && (
            <motion.div
              variants={stagger(0.16, 0.05)}
              initial="hidden"
              animate="show"
              className="space-y-2.5"
            >
              {features.map((f) => (
                <motion.div key={f} variants={fadeUp} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-teal-400/20 flex items-center justify-center shrink-0">
                    <div className="w-1.5 h-1.5 bg-teal-300 rounded-full" />
                  </div>
                  <span className="text-teal-50/85 text-sm">{f}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <p className="text-teal-200/40 text-xs relative z-10">© 2026 Velora</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden app-canvas">
        <div className="auth-mesh pointer-events-none absolute inset-0" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: easeOut }}
          className="w-full max-w-sm relative z-10"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
