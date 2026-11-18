import { type CSSProperties, useState } from 'react';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { CheckIcon, CrossIcon, InfoIcon, StarIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { useCountUp } from '../../hooks/useCountUp';
import { fmt, fmtM, letterOf, money } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, useBalance, wallet } from '../../lib/wallet';
import { COLS, ROWS, type TowerLayout, newTower, towerMult } from './tower';

type Status = 'idle' | 'playing' | 'lost' | 'cashed';

interface Run {
  status: Status;
  bet: number;
  layout: TowerLayout;
  /** Column picked in each row so far (the last one is the blocker if lost). */
  picks: number[];
}

/**
 * Ball Tower: climb 10 rows. In each row pick one of 3 sealed balls; one is a blocker.
 * Every safe pick raises the multiplier. Cash out any time, or lose the bet on a blocker.
 */
export function BallTower() {
  const balance = useBalance();
  const [betText, setBetText] = useState('10');
  const [err, setErr] = useState('');
  const [run, setRun] = useState<Run>(() => ({ status: 'idle', bet: 0, layout: newTower(), picks: [] }));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rules, setRules] = useState(false);

  const playing = run.status === 'playing';
  const done = run.status === 'lost' || run.status === 'cashed';
  const cleared = run.status === 'lost' ? run.picks.length - 1 : run.picks.length;
  const mult = towerMult(cleared);
  const shownMult = useCountUp(mult, 450);
  const bet = parseBet(betText);

  const start = () => {
    const e = betError(bet, balance);
    setErr(e);
    if (e || !wallet.take(bet)) return;
    sound.play('bet');
    sound.play('go');
    setOutcome(null);
    setRun({ status: 'playing', bet, layout: newTower(), picks: [] });
  };

  const cashOut = (r: Run) => {
    const lv = r.picks.length;
    if (r.status !== 'playing' || lv === 0) return;
    const m = towerMult(lv);
    const payout = money(r.bet * m);
    wallet.pay(payout);
    sound.play(lv >= 6 ? 'bigwin' : 'win');
    setRun({ ...r, status: 'cashed' });
    setOutcome({
      win: true,
      title: lv === ROWS ? `Top of the tower · ${fmtM(m)}×` : `Cashed out · ${fmtM(m)}×`,
      detail: `Cleared ${lv} of ${ROWS} rows`,
      net: money(payout - r.bet),
      id: Date.now(),
    });
  };

  const pick = (col: number) => {
    if (!playing) return;
    const row = run.picks.length;
    const picks = [...run.picks, col];
    if (run.layout.blockers[row] === col) {
      sound.play('lose');
      setRun({ ...run, status: 'lost', picks });
      setOutcome({ win: false, title: 'Blocker ball', detail: `Stopped on row ${row + 1} of ${ROWS}`, net: -run.bet, id: Date.now() });
      return;
    }
    const n = run.layout.numbers[row]?.[col] ?? 1;
    sound.play('land');
    sound.call(`${letterOf(n)}, ${n}.`);
    const next = { ...run, picks };
    if (picks.length === ROWS) cashOut(next);
    else setRun(next);
  };

  const rows = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);
  const nextMult = cleared < ROWS ? towerMult(cleared + 1) : null;

  return (
    <div className="game game-tower">
      <section className={`board tower-board ${run.status}`} aria-label="Ball Tower">
        <ResultBar
          outcome={outcome}
          idle={playing ? 'Pick one ball in the glowing row' : 'Set a bet and start the climb'}
        />
        <div className="hud">
          <div className="hud-item">
            <small>Row</small>
            <b>
              {Math.min(cleared + (playing ? 1 : 0), ROWS)}
              <i>/{ROWS}</i>
            </b>
          </div>
          <div className={`hud-mult${cleared > 0 ? ' live' : ''}`}>
            <small>Multiplier</small>
            <b key={cleared}>{fmtM(Math.round(shownMult * 100) / 100)}×</b>
          </div>
          <div className="hud-item right">
            <small>{playing ? 'Next row' : 'Top prize'}</small>
            <b>{playing ? (nextMult ? `${fmtM(nextMult)}×` : '—') : `${fmtM(towerMult(ROWS))}×`}</b>
          </div>
        </div>

        <div className="tower">
          {rows.map((row) => {
            const isCleared = row < cleared;
            const isLost = run.status === 'lost' && row === run.picks.length - 1;
            const active = playing && row === run.picks.length;
            return (
              <div
                key={row}
                className={`t-row${active ? ' active' : ''}${isCleared ? ' cleared' : ''}${isLost ? ' lost' : ''}`}
                style={{ '--d': `${(ROWS - 1 - row) * 35}ms` } as CSSProperties}
              >
                <span className="t-mult">
                  {isCleared ? <CheckIcon size={14} /> : null}
                  {fmtM(towerMult(row + 1))}×
                </span>
                <div className="t-cells">
                  {Array.from({ length: COLS }, (_, col) => {
                    const blocker = run.layout.blockers[row] === col;
                    const picked = run.picks[row] === col;
                    const n = run.layout.numbers[row]?.[col] ?? 1;
                    const open = picked || done;
                    return (
                      <button
                        key={col}
                        className={`t-cell${open ? ' open' : ''}${picked ? ' picked' : ''}${open && blocker ? ' blocker' : ''}`}
                        disabled={!active}
                        aria-label={active ? `Row ${row + 1}, ball ${col + 1} of 3` : undefined}
                        onClick={() => pick(col)}
                        style={{ '--rd': `${(ROWS - 1 - row) * 40 + col * 30}ms` } as CSSProperties}
                      >
                        <span className="t-inner">
                          {!open ? (
                            <span className="sealed">
                              <StarIcon size={14} />
                            </span>
                          ) : blocker ? (
                            <span className="blk" role="img" aria-label="Blocker">
                              <CrossIcon size={16} />
                            </span>
                          ) : (
                            <Ball n={n} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {run.status === 'cashed' && outcome && <Burst key={outcome.id} big={cleared >= 6} />}
      </section>

      <aside className="console">
        <div className="console-head">
          <span>Ball Tower</span>
          <button className="info-btn" onClick={() => setRules(true)} aria-label="How to play Ball Tower">
            <InfoIcon /> Rules
          </button>
        </div>
        <BetBox value={betText} onChange={setBetText} disabled={playing} />
        <p className="err" role="alert">
          {err}
        </p>
        {playing ? (
          <div className="btn-pair">
            <button
              className="btn-alt"
              onClick={() => {
                sound.play('click');
                pick(Math.floor(Math.random() * COLS));
              }}
            >
              Random
            </button>
            <button className="play cash" disabled={cleared === 0} onClick={() => cashOut(run)}>
              <span className="pl-main">Cash out</span>
              <span className="pl-sub">{cleared === 0 ? 'Clear a row first' : `KES ${fmt(run.bet * mult)}`}</span>
            </button>
          </div>
        ) : (
          <button className="play" onClick={start}>
            <span className="pl-main">{done ? 'Climb again' : 'Start climb'}</span>
            <span className="pl-sub">
              KES {fmt(bet || 0)} · top pays KES {fmt((bet || 0) * towerMult(ROWS))}
            </span>
          </button>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Ball Tower" onClose={() => setRules(false)}>
          <p>Set your bet and press Start climb. Each row has 3 sealed balls: 2 are safe and 1 is a blocker.</p>
          <p>Pick a ball in the glowing row. A safe ball moves you up a row and raises your multiplier. You can cash out after any row. A blocker ends the climb and you lose the bet.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Row</th>
                <th>Pays</th>
                <th>Chance to reach</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }, (_, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{fmtM(towerMult(i + 1))}×</td>
                  <td>{(100 * (2 / 3) ** (i + 1)).toFixed(i < 4 ? 0 : 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">Return to player is about 97% at every row. Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
