import { useEffect, useRef, useState } from 'react';

export function useAnimatedCounter(target, duration = 900, decimals = 0) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const startValRef = useRef(0);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;

    const from = startValRef.current;
    const diff = target - from;
    startRef.current = null;

    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setValue(parseFloat(current.toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        startValRef.current = target;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, decimals]);

  return value;
}
