import { useEffect, useRef, useState } from 'react';

/**
 * Auto-play with a fixed number of rounds. `round` runs one round and returns false if it
 * could not start (for example the balance is too low), which ends the run.
 * The next round starts `gapMs` after `settledKey` changes (a new result).
 */
export function useAutoPlay(round: () => boolean, settledKey: unknown, gapMs = 1200) {
  const [left, setLeft] = useState(0);
  const roundRef = useRef(round);
  roundRef.current = round;

  const next = () => {
    if (roundRef.current()) setLeft((l) => l - 1);
    else setLeft(0);
  };

  useEffect(() => {
    if (left <= 0 || settledKey == null) return;
    const t = setTimeout(next, gapMs);
    return () => clearTimeout(t);
    // Only a new result should schedule the next round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settledKey]);

  return {
    left,
    start(rounds: number) {
      setLeft(rounds);
      if (roundRef.current()) setLeft(rounds - 1);
      else setLeft(0);
    },
    stop() {
      setLeft(0);
    },
  };
}
