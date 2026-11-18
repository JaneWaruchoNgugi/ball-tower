import type { CSSProperties } from 'react';
import { GROUP_COLOR, letterOf } from '../lib/bingo';

interface Props {
  n: number;
  /** Pixel size. Leave out to size it from CSS (--s). */
  size?: number;
  className?: string;
}

/** Glossy bingo ball with a white face showing its letter and number. */
export function Ball({ n, size, className = '' }: Props) {
  const L = letterOf(n);
  const style = { '--c': GROUP_COLOR[L], ...(size ? { '--s': `${size}px` } : {}) } as CSSProperties;
  return (
    <span className={`ball ${className}`} style={style} role="img" aria-label={`${L} ${n}`}>
      <span className="ball-face">
        <small>{L}</small>
        <b>{n}</b>
      </span>
    </span>
  );
}
