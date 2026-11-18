import { sound } from '../lib/sound';

const OPTIONS = [10, 25, 50, 100] as const;

interface Props {
  rounds: number;
  setRounds: (n: number) => void;
  running: boolean;
}

/** Rounds picker for auto-play. The limit is always visible and never changes mid-run. */
export function AutoRounds({ rounds, setRounds, running }: Props) {
  return (
    <div className="chips rounds" role="group" aria-label="Number of auto rounds">
      {OPTIONS.map((r) => (
        <button
          key={r}
          className={rounds === r ? 'on' : undefined}
          disabled={running}
          onClick={() => {
            sound.play('click');
            setRounds(r);
          }}
        >
          {r} <small>rounds</small>
        </button>
      ))}
    </div>
  );
}

/** Manual / Auto switch. */
export function ModeSwitch({ auto, setAuto, locked }: { auto: boolean; setAuto: (a: boolean) => void; locked: boolean }) {
  return (
    <div className="mode" role="tablist" aria-label="Play mode" data-on={auto ? 'auto' : 'manual'}>
      <span className="mode-ind" aria-hidden="true" />
      {(['manual', 'auto'] as const).map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={(m === 'auto') === auto}
          disabled={locked && (m === 'auto') !== auto}
          onClick={() => {
            sound.play('click');
            setAuto(m === 'auto');
          }}
        >
          {m === 'auto' ? 'Auto' : 'Manual'}
        </button>
      ))}
    </div>
  );
}
