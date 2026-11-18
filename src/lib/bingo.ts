/** Bingo groups, colours and number helpers shared by every game. */
export type Letter = 'B' | 'I' | 'N' | 'G' | 'O';
export const LETTERS: readonly Letter[] = ['B', 'I', 'N', 'G', 'O'];

export const GROUP_COLOR: Record<Letter, string> = { B: '#4a5cff', I: '#ff2d6f', N: '#8a9896', G: '#1fd16a', O: '#ff9418' };
export const GROUP_NAME: Record<Letter, string> = { B: 'Blue', I: 'Red', N: 'Grey', G: 'Green', O: 'Orange' };
export const GROUP_RANGE: Record<Letter, readonly [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

export const letterOf = (n: number): Letter => LETTERS[Math.min(4, Math.floor((n - 1) / 15))] ?? 'B';

export const money = (v: number): number => Math.round(v * 100) / 100;
export const fmt = (v: number, decimals = 2): string =>
  v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
/** Multiplier label: 1.94, 12.5, 72. */
export const fmtM = (m: number): string => (Number.isInteger(m) ? String(m) : m.toFixed(2).replace(/0$/, ''));

/** Uniform integer in [0, n) from the browser's crypto RNG. */
export function randInt(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  do crypto.getRandomValues(buf);
  while ((buf[0] ?? 0) >= limit);
  return (buf[0] ?? 0) % n;
}

/** A random ball 1–75. */
export const randBall = (): number => randInt(75) + 1;

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
export const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;
