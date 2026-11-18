import { fmt } from '../lib/bingo';
import { sound } from '../lib/sound';

const QUICK = [10, 50, 100, 500] as const;

interface Props {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

/** Bet amount with − / + steps, quick amounts, and half / double. */
export function BetBox({ value, onChange, disabled }: Props) {
  const v = parseFloat(value) || 0;
  const set = (n: number) => {
    sound.play('click');
    const x = Math.max(1, Math.floor(n * 100) / 100);
    onChange(Number.isInteger(x) ? String(x) : x.toFixed(2));
  };
  const step = (dir: 1 | -1) => {
    const st = v < 100 ? 10 : v < 1000 ? 50 : 100;
    set(Math.max(1, Math.round((v + dir * st) / st) * st));
  };
  return (
    <div className="betbox">
      <label className="lbl" htmlFor="betAmt">
        Bet amount
      </label>
      <div className="box">
        <button className="step" aria-label="Lower bet" disabled={disabled} onClick={() => step(-1)}>
          −
        </button>
        <span className="cur">KES</span>
        <input
          id="betAmt"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button className="step" aria-label="Raise bet" disabled={disabled} onClick={() => step(1)}>
          +
        </button>
      </div>
      <div className="chips">
        {QUICK.map((a) => (
          <button key={a} className={v === a ? 'on' : undefined} disabled={disabled} onClick={() => set(a)}>
            {fmt(a, 0)}
          </button>
        ))}
        <button disabled={disabled} onClick={() => set(v / 2)} aria-label="Half the bet">
          ½
        </button>
        <button disabled={disabled} onClick={() => set(v * 2)} aria-label="Double the bet">
          2×
        </button>
      </div>
    </div>
  );
}

/** Parse the bet text the same way everywhere. */
export const parseBet = (text: string): number => {
  const raw = parseFloat(text.replace(/,/g, ''));
  return Number.isFinite(raw) ? Math.floor(raw * 100) / 100 : NaN;
};
