import type { CSSProperties } from 'react';
import { GROUP_COLOR, type Letter, letterOf } from '../lib/bingo';

interface Props {
  n: number;
  /** Pixel size. Leave out to size it from CSS (--s). */
  size?: number;
  className?: string;
  /** Colour group, when the game does not use the 75-ball ranges. */
  letter?: Letter;
}

/** Glossy bingo ball with a white face showing its letter and number. */
export function Ball({ n, size, className = '', letter }: Props) {
  const L = letter ?? letterOf(n);
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
