import { memo } from 'react';
import { GROUP_COLOR, LETTERS } from '../../lib/bingo';
import { PER_COLOUR, SEGMENTS, SEG_DEG, type WheelBet, wheelLetter } from './wheel';

/** Geometry, in SVG units (viewBox is 460 × 460, centre 230). */
const C = 230;
const R = 200; // segment outer edge
const RIM = 222; // outer edge of the gold rim
const BALL_R = 172; // where the number balls sit
const BAND_IN = 92;
const BAND_OUT = 122; // letter band

function pt(deg: number, r: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** Ring slice between two radii and two angles. */
function slice(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = pt(a0, r1);
  const [x1, y1] = pt(a1, r1);
  const [x2, y2] = pt(a1, r0);
  const [x3, y3] = pt(a0, r0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
}

/**
 * The 45-number wheel. Each segment is a deep-to-bright colour wedge with a glossy numbered
 * ball near the rim, gold dividers, and a ring of bulbs that chase while it spins.
 * Segments your bet covers keep full colour and gold-ringed balls; the others sit back.
 */
export const WheelSvg = memo(function WheelSvg({ bet }: { bet: WheelBet }) {
  const covers = (n: number) => (bet.kind === 'colour' ? wheelLetter(n) === bet.pick : n === bet.pick);
  const nums = Array.from({ length: SEGMENTS }, (_, i) => i + 1);

  return (
    <svg viewBox="0 0 460 460" className="wheel-svg" aria-hidden="true">
      <defs>
        {LETTERS.map((L) => (
          <radialGradient key={L} id={`wg-${L}`} cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse">
            <stop offset="0.35" stopColor={GROUP_COLOR[L]} stopOpacity="0.35" />
            <stop offset="0.75" stopColor={GROUP_COLOR[L]} stopOpacity="0.85" />
            <stop offset="1" stopColor={GROUP_COLOR[L]} />
          </radialGradient>
        ))}
        <linearGradient id="wg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1b0" />
          <stop offset="0.35" stopColor="#ffcb45" />
          <stop offset="0.7" stopColor="#b8730a" />
          <stop offset="1" stopColor="#ffd86a" />
        </linearGradient>
        <radialGradient id="wg-ball" cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#eef2ee" />
          <stop offset="1" stopColor="#c3ccc4" />
        </radialGradient>
      </defs>

      {/* Gold rim and its dark inner lip. */}
      <circle cx={C} cy={C} r={RIM} fill="url(#wg-gold)" />
      <circle cx={C} cy={C} r={R + 4} fill="#061416" />

      {/* Segments. */}
      {nums.map((n) => {
        const L = wheelLetter(n);
        const a0 = (n - 1) * SEG_DEG;
        const on = covers(n);
        return (
          <g key={n} className={`seg ${on ? 'on' : 'off'}`}>
            <path d={slice(a0, a0 + SEG_DEG, BAND_OUT, R)} fill={`url(#wg-${L})`} />
            {(n - 1) % 2 === 1 && <path d={slice(a0, a0 + SEG_DEG, BAND_OUT, R)} fill="rgba(0,0,0,.14)" />}
          </g>
        );
      })}

      {/* Shade the segments your bet does not cover (drawn once, so it never looks muddy). */}
      {nums.filter((n) => !covers(n)).map((n) => (
        <path key={n} d={slice((n - 1) * SEG_DEG, n * SEG_DEG, BAND_OUT, R)} className="seg-shade" />
      ))}

      {/* Gold dividers between colour groups, thin ones between numbers. */}
      {nums.map((n) => {
        const a = (n - 1) * SEG_DEG;
        const [x0, y0] = pt(a, BAND_OUT);
        const [x1, y1] = pt(a, R);
        const major = (n - 1) % PER_COLOUR === 0;
        return <line key={n} x1={x0} y1={y0} x2={x1} y2={y1} className={major ? 'div-major' : 'div-minor'} />;
      })}

      {/* Number balls. */}
      {nums.map((n) => {
        const mid = (n - 0.5) * SEG_DEG;
        const [x, y] = pt(mid, BALL_R);
        const on = covers(n);
        const pick = bet.kind === 'number' && on;
        return (
          <g key={n} className={`nball${on ? ' on' : ''}${pick ? ' pick' : ''}`} transform={`rotate(${mid} ${x} ${y})`}>
            <circle cx={x} cy={y} r={pick ? 15.5 : 13.5} fill="url(#wg-ball)" />
            <text x={x} y={y + 0.5} className="nball-txt">
              {n}
            </text>
          </g>
        );
      })}

      {/* Letter band. */}
      {LETTERS.map((L, g) => {
        const a0 = g * PER_COLOUR * SEG_DEG;
        const a1 = a0 + PER_COLOUR * SEG_DEG;
        const mid = (a0 + a1) / 2;
        const [x, y] = pt(mid, (BAND_IN + BAND_OUT) / 2);
        const on = bet.kind === 'colour' ? bet.pick === L : wheelLetter(bet.pick) === L;
        return (
          <g key={L} className={`band${on ? ' on' : ''}`}>
            <path d={slice(a0, a1, BAND_IN, BAND_OUT)} fill={GROUP_COLOR[L]} />
            <text x={x} y={y} transform={`rotate(${mid} ${x} ${y})`} className="band-txt">
              {L}
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r={BAND_OUT} className="band-edge" />

      {/* Gold arc over the segments your bet covers. */}
      {(() => {
        const covered = nums.filter(covers);
        const a0 = ((covered[0] ?? 1) - 1) * SEG_DEG;
        const a1 = (covered[covered.length - 1] ?? 1) * SEG_DEG;
        const [x0, y0] = pt(a0, R + 1);
        const [x1, y1] = pt(a1, R + 1);
        return <path className="w-rim" d={`M${x0},${y0} A${R + 1},${R + 1} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1},${y1}`} />;
      })()}

      {/* Bulbs on the rim, one per divider. */}
      {nums.map((n) => {
        const [x, y] = pt((n - 1) * SEG_DEG, (R + 4 + RIM) / 2);
        return <circle key={n} cx={x} cy={y} r="4.2" className={`bulb b${n % 2}`} />;
      })}
    </svg>
  );
});
