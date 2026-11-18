import { type ReactNode, useEffect, useRef } from 'react';

/** "How to play" sheet with the rules and every payout. */
export function Rules({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div className="sheet-body">{children}</div>
        <button ref={btn} className="play slim" onClick={onClose}>
          <span className="pl-main">Got it</span>
        </button>
      </div>
    </div>
  );
}
