import { memo } from 'react';
import { LETTERS, type Letter } from '../../lib/bingo';
import { PER_COLOUR, SEGMENTS, SEG_DEG, type WheelBet, wheelLetter } from './wheel';

/** Geometry, in SVG units (viewBox 460 × 460, centre 230). */
const C = 230;
const R = 196; // face edge
const RIM_IN = 198;
const RIM_OUT = 228;
const NUM_R = 166; // number position, reading outwards like a classic wheel
const LET_R = 112; // group letter position
const HUB_R = 74;

/** Classic wheel paint: each group alternates a bright and a deep shade. */
const PAINT: Record<Letter, readonly [string, string]> = {
  B: ['#3550ff', '#1f33c4'],
  I: ['#ff2f6d', '#c4164c'],
  N: ['#a9b6b4', '#7c8987'],
  G: ['#1ccf66', '#0f9a49'],
  O: ['#ff9a1f', '#d97200'],
};

function pt(deg: number, r: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function wedge(a0: number, a1: number, r: number): string {
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a1, r);
  return `M${C},${C} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1} Z`;
}

/**
 * A classic casino money wheel: solid painted wedges with cream dividers, big white numbers,
 * gold pegs at the edge, a polished gold rim with bulbs, and a jewelled hub.
 * The segments your bet covers get a bright gold outline; nothing is dimmed.
 */
export const WheelSvg = memo(function WheelSvg({ bet }: { bet: WheelBet }) {
  const covers = (n: number) => (bet.kind === 'colour' ? wheelLetter(n) === bet.pick : n === bet.pick);
  const nums = Array.from({ length: SEGMENTS }, (_, i) => i + 1);
  const covered = nums.filter(covers);
  const ca0 = ((covered[0] ?? 1) - 1) * SEG_DEG;
  const ca1 = (covered[covered.length - 1] ?? 1) * SEG_DEG;

  return (
    <svg viewBox="0 0 460 460" className="wheel-svg classic" aria-hidden="true">
      <defs>
        <linearGradient id="cw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b8" />
          <stop offset="0.25" stopColor="#f2c14a" />
          <stop offset="0.5" stopColor="#a8660a" />
          <stop offset="0.75" stopColor="#f6cf5e" />
          <stop offset="1" stopColor="#8a5205" />
        </linearGradient>
        <radialGradient id="cw-face" cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0.3" stopColor="#000" stopOpacity="0.38" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0.06" />
          <stop offset="0.93" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
        <radialGradient id="cw-peg" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.5" stopColor="#f2c14a" />
          <stop offset="1" stopColor="#7a4a05" />
        </radialGradient>
        <radialGradient id="cw-bulb" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#fff1b0" />
          <stop offset="1" stopColor="#f0b830" />
        </radialGradient>
      </defs>

      {/* Polished gold rim with a dark groove. */}
      <circle cx={C} cy={C} r={RIM_OUT} fill="url(#cw-gold)" />
      <circle cx={C} cy={C} r={RIM_OUT - 2} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={RIM_IN + 1} fill="#2a1700" />

      {/* Painted wedges. */}
      {nums.map((n) => {
        const L = wheelLetter(n);
        const a0 = (n - 1) * SEG_DEG;
        return <path key={n} d={wedge(a0, a0 + SEG_DEG, R)} fill={PAINT[L][(n - 1) % 2]} />;
      })}
      {/* Depth: darker towards the hub and at the very edge. */}
      <circle cx={C} cy={C} r={R} fill="url(#cw-face)" />

      {/* Cream dividers; gold between colour groups. */}
      {nums.map((n) => {
        const a = (n - 1) * SEG_DEG;
        const [x, y] = pt(a, R);
        const major = (n - 1) % PER_COLOUR === 0;
        return <line key={n} x1={C} y1={C} x2={x} y2={y} className={major ? 'cw-div major' : 'cw-div'} />;
      })}

      {/* Big white numbers, reading outwards from the hub. */}
      {nums.map((n) => {
        const mid = (n - 0.5) * SEG_DEG;
        const [x, y] = pt(mid, NUM_R);
        return (
          <text key={n} x={x} y={y} transform={`rotate(${mid - 90} ${x} ${y})`} className={`cw-num${covers(n) ? ' on' : ''}`}>
            {n}
          </text>
        );
      })}

      {/* Group letters near the hub. */}
      {LETTERS.map((L, g) => {
        const mid = (g * PER_COLOUR + PER_COLOUR / 2) * SEG_DEG;
        const [x, y] = pt(mid, LET_R);
        return (
          <text key={L} x={x} y={y} transform={`rotate(${mid} ${x} ${y})`} className="cw-letter">
            {L}
          </text>
        );
      })}

      {/* Your bet: a bright outline around its segments. */}
      <path
        className="cw-bet"
        d={
          covered.length === SEGMENTS
            ? ''
            : (() => {
                const [x0, y0] = pt(ca0, R - 2);
                const [x1, y1] = pt(ca1, R - 2);
                const [h0x, h0y] = pt(ca0, HUB_R + 6);
                const [h1x, h1y] = pt(ca1, HUB_R + 6);
                const large = ca1 - ca0 > 180 ? 1 : 0;
                return `M${h0x},${h0y} L${x0},${y0} A${R - 2},${R - 2} 0 ${large} 1 ${x1},${y1} L${h1x},${h1y} A${HUB_R + 6},${HUB_R + 6} 0 ${large} 0 ${h0x},${h0y} Z`;
              })()
        }
      />

      {/* Gold pegs at every divider. */}
      {nums.map((n) => {
        const [x, y] = pt((n - 1) * SEG_DEG, R - 5);
        return <circle key={n} cx={x} cy={y} r="4" fill="url(#cw-peg)" className="cw-peg" />;
      })}

      {/* Bulbs in the rim, centred on each segment. */}
      {nums.map((n) => {
        const [x, y] = pt((n - 0.5) * SEG_DEG, (RIM_IN + RIM_OUT) / 2);
        return <circle key={n} cx={x} cy={y} r="5" fill="url(#cw-bulb)" className={`bulb b${n % 2}`} />;
      })}

      {/* Hub ring. */}
      <circle cx={C} cy={C} r={HUB_R + 6} fill="url(#cw-gold)" />
      <circle cx={C} cy={C} r={HUB_R} fill="#071618" />
    </svg>
  );
});
