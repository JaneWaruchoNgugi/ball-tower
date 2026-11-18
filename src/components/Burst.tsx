import { type CSSProperties, useMemo } from 'react';
import { reducedMotion } from '../lib/bingo';

/** A short burst of gold sparks for a win. Re-mount (new key) to replay. */
export function Burst({ big = false }: { big?: boolean }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: big ? 26 : 16 }, (_, i) => {
        const a = (i / (big ? 26 : 16)) * Math.PI * 2 + Math.random() * 0.3;
        const d = (big ? 150 : 110) * (0.6 + Math.random() * 0.5);
        return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 4 + Math.random() * 6, delay: Math.random() * 90 };
      }),
    [big],
  );
  if (reducedMotion()) return null;
  return (
    <span className="burst" aria-hidden="true">
      {sparks.map((p, i) => (
        <i
          key={i}
          style={{ '--x': `${p.x}px`, '--y': `${p.y}px`, '--sz': `${p.s}px`, animationDelay: `${p.delay}ms` } as CSSProperties}
        />
      ))}
    </span>
  );
}
