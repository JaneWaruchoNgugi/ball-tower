import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../lib/bingo';

/** Tween a displayed number towards `target` with requestAnimationFrame (ease-out). */
export function useCountUp(target: number, ms = 600): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const shownRef = useRef(target);

  useEffect(() => {
    if (reducedMotion() || ms <= 0) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    from.current = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const e = 1 - (1 - t) ** 3;
      const v = from.current + (target - from.current) * e;
      shownRef.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return shown;
}
