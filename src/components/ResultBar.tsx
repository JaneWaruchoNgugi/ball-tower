import { fmt } from '../lib/bingo';
import { useCountUp } from '../hooks/useCountUp';
import { CheckIcon, CrossIcon } from './Icons';

export interface Outcome {
  win: boolean;
  title: string;
  detail: string;
  /** Net change: payout minus bet. */
  net: number;
  id: number;
}

function Amount({ net }: { net: number }) {
  const v = useCountUp(net, 700);
  return (
    <span className="r-amt">
      {net >= 0 ? '+' : '−'}KES {fmt(Math.abs(v))}
    </span>
  );
}

/** Win/lose banner at the top of the board. Fixed height so nothing below moves. */
export function ResultBar({ outcome, idle }: { outcome: Outcome | null; idle: string }) {
  return (
    <div className="result-slot" aria-live="polite">
      {outcome ? (
        <div key={outcome.id} className={`result ${outcome.win ? 'win' : 'lose'}`} role="status">
          <span className="r-icon">{outcome.win ? <CheckIcon /> : <CrossIcon />}</span>
          <span className="r-text">
            <b>{outcome.title}</b>
            <small>{outcome.detail}</small>
          </span>
          <Amount net={outcome.net} />
        </div>
      ) : (
        <div className="result idle">{idle}</div>
      )}
    </div>
  );
}
