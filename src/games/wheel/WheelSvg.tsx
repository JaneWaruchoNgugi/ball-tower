import { memo } from 'react';
import { GROUP_COLOR, letterOf } from '../../lib/bingo';
import { SEGMENTS, SEG_DEG } from './wheel';

const R = 200;
const C = 210;

function point(deg: number, r: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** The 75-segment wheel, numbers 1–75 clockwise from the top, coloured by group. */
export const WheelSvg = memo(function WheelSvg() {
  return (
    <svg viewBox="0 0 420 420" className="wheel-svg" aria-hidden="true">
      <circle cx={C} cy={C} r={R + 8} fill="#0a1d1e" stroke="#ffcf3d" strokeWidth="3" />
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const n = i + 1;
        const a0 = i * SEG_DEG;
        const a1 = a0 + SEG_DEG;
        const [x0, y0] = point(a0, R);
        const [x1, y1] = point(a1, R);
        const base = GROUP_COLOR[letterOf(n)];
        const fill = shade(base, i % 2 ? 0.78 : 1);
        const mid = a0 + SEG_DEG / 2;
        const [tx, ty] = point(mid, R - 16);
        return (
          <g key={n}>
            <path d={`M${C},${C} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`} fill={fill} stroke="#0a1d1e" strokeWidth="0.8" />
            <text x={tx} y={ty} transform={`rotate(${mid} ${tx} ${ty})`} className="w-num">
              {n}
            </text>
          </g>
        );
      })}
      {/* Group letters on the inner ring. */}
      {(['B', 'I', 'N', 'G', 'O'] as const).map((L, g) => {
        const mid = (g * 15 + 7.5) * SEG_DEG;
        const [x, y] = point(mid, R * 0.62);
        return (
          <text key={L} x={x} y={y} transform={`rotate(${mid} ${x} ${y})`} className="w-letter">
            {L}
          </text>
        );
      })}
      <circle cx={C} cy={C} r={R * 0.4} fill="#0a1d1e" stroke="#1e4a49" strokeWidth="3" />
    </svg>
  );
});
