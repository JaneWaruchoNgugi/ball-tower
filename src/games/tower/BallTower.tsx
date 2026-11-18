import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { CheckIcon, CrossIcon, InfoIcon, StarIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { useCountUp } from '../../hooks/useCountUp';
import { fmt, fmtM, letterOf, money, reducedMotion } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, useBalance, wallet } from '../../lib/wallet';
import { MAX_MULT, MAX_ROWS, ROW_TYPES, RTP, type Row, fairStep, newRow, safeChance, towerMult } from './tower';

type Status = 'idle' | 'playing' | 'lost' | 'cashed';

interface Run {
  status: Status;
  bet: number;
  rows: Row[];
  /** Column picked in each row so far (the last one is the blocker if lost). */
  picks: number[];
}

/** Rows shown below and above the row you are playing. */
const BELOW = 2;
const ABOVE = 4;

/** Keep enough rows dealt above the player for the window. */
const dealAhead = (rows: Row[], current: number): Row[] => {
  const out = [...rows];
  while (out.length < current + ABOVE + BELOW + 1) out.push(newRow());
  return out;
};

/**
 * Ball Tower: an endless climb. Each row has its own risk (2 to 4 sealed balls, 1 or 2 blockers)
 * and its own multiplier. Clear a row and the tower slides down as a new row drops in on top.
 */
export function BallTower() {
  const balance = useBalance();
  const [betText, setBetText] = useState('10');
  const [err, setErr] = useState('');
  const [run, setRun] = useState<Run>(() => ({ status: 'idle', bet: 0, rows: dealAhead([], 0), picks: [] }));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rules, setRules] = useState(false);
  const stack = useRef<HTMLDivElement>(null);
  const prevLo = useRef(0);

  const playing = run.status === 'playing';
  const done = run.status === 'lost' || run.status === 'cashed';
  const cleared = run.status === 'lost' ? run.picks.length - 1 : run.picks.length;
  const mult = towerMult(run.rows, cleared);
  const shownMult = useCountUp(mult, 450);
  const bet = parseBet(betText);
  const current = run.picks.length; // row being played
  const lo = Math.max(0, Math.min(current, run.rows.length - 1) - BELOW);
  const hi = Math.min(run.rows.length - 1, lo + BELOW + ABOVE);
  const nextRow = run.rows[cleared];

  // When the window moves up a row, slide the whole stack down from where it was.
  useLayoutEffect(() => {
    const el = stack.current;
    const moved = lo - prevLo.current;
    prevLo.current = lo;
    if (!el || moved <= 0 || reducedMotion()) return;
    const first = el.firstElementChild as HTMLElement | null;
    const slot = first ? first.offsetHeight + parseFloat(getComputedStyle(el).rowGap || '4') : 40;
    el.animate([{ transform: `translateY(${-slot * moved}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }, [lo]);

  const start = () => {
    const e = betError(bet, balance);
    setErr(e);
    if (e || !wallet.take(bet)) return;
    sound.play('bet');
    sound.play('go');
    setOutcome(null);
    prevLo.current = 0;
    setRun({ status: 'playing', bet, rows: dealAhead([], 0), picks: [] });
  };

  const cashOut = (r: Run, auto = false) => {
    const lv = r.picks.length;
    if (r.status !== 'playing' || lv === 0) return;
    const m = towerMult(r.rows, lv);
    const payout = money(r.bet * m);
    wallet.pay(payout);
    sound.play(m >= 10 ? 'bigwin' : 'win');
    setRun({ ...r, status: 'cashed' });
    setOutcome({
      win: true,
      title: `${auto ? 'Top reached' : 'Cashed out'} · ${fmtM(m)}×`,
      detail: `Cleared ${lv} row${lv === 1 ? '' : 's'}`,
      net: money(payout - r.bet),
      id: Date.now(),
    });
  };

  const pick = (col: number) => {
    if (!playing) return;
    const row = run.rows[current];
    if (!row) return;
    const picks = [...run.picks, col];
    if (row.blockers.includes(col)) {
      sound.play('lose');
      setRun({ ...run, status: 'lost', picks });
      setOutcome({
        win: false,
        title: 'Blocker · you lose',
        detail: `Row ${current + 1} (${row.type.label}) · lost your ${fmtM(mult)}×`,
        net: -run.bet,
        id: Date.now(),
      });
      return;
    }
    const n = row.numbers[col] ?? 1;
    sound.play('land');
    sound.call(`${letterOf(n)}, ${n}.`);
    const next = { ...run, picks, rows: dealAhead(run.rows, picks.length) };
    if (towerMult(next.rows, picks.length) >= MAX_MULT || picks.length >= MAX_ROWS) cashOut(next, true);
    else setRun(next);
  };

  const visible: number[] = [];
  for (let i = hi; i >= lo; i--) visible.push(i);

  return (
    <div className="game game-tower">
      <section className={`board tower-board ${run.status}`} aria-label="Ball Tower">
        <ResultBar
          outcome={outcome}
          idle={playing ? `Pick a ball in the glowing row · ${nextRow ? `${nextRow.type.balls - nextRow.type.blockers} of ${nextRow.type.balls} are safe` : ''}` : 'Set a bet and start the climb'}
        />
        <div className="hud">
          <div className="hud-item">
            <small>Rows cleared</small>
            <b>{Math.max(0, cleared)}</b>
          </div>
          <div className={`hud-mult${cleared > 0 ? ' live' : ''}`}>
            <small>Multiplier</small>
            <b key={cleared}>{fmtM(Math.round(shownMult * 100) / 100)}×</b>
          </div>
          <div className="hud-item right">
            <small>{playing ? 'Clear this row' : 'Max win'}</small>
            <b>{playing && nextRow ? `${fmtM(towerMult(run.rows, cleared + 1))}×` : `${MAX_MULT}×`}</b>
          </div>
        </div>

        <div className="tower endless">
          <div className="t-stack" ref={stack}>
            {visible.map((i) => {
              const row = run.rows[i]!;
              const isCleared = i < cleared;
              const isLost = run.status === 'lost' && i === run.picks.length - 1;
              const active = playing && i === current;
              const ahead = i > current || (!playing && i >= cleared && !isLost);
              return (
                <div
                  key={i}
                  className={`t-row t-${row.type.id}${active ? ' active' : ''}${isCleared ? ' cleared' : ''}${isLost ? ' lost' : ''}${ahead && !active ? ' ahead' : ''}`}
                >
                  <span className="t-mult">
                    <b>
                      {isCleared ? <CheckIcon size={12} /> : null}
                      {fmtM(towerMult(run.rows, i + 1))}×
                    </b>
                    <small>
                      {row.type.label} · {row.type.balls - row.type.blockers}/{row.type.balls}
                    </small>
                  </span>
                  <div className="t-cells" style={{ gridTemplateColumns: `repeat(${row.type.balls}, 1fr)` }}>
                    {row.numbers.map((n, col) => {
                      const blocker = row.blockers.includes(col);
                      const picked = run.picks[i] === col;
                      const open = picked || (done && i < run.picks.length);
                      return (
                        <button
                          key={col}
                          className={`t-cell${open ? ' open' : ''}${picked ? ' picked' : ''}${open && blocker ? ' blocker' : ''}`}
                          disabled={!active}
                          aria-label={active ? `Row ${i + 1}, ball ${col + 1} of ${row.type.balls}` : undefined}
                          onClick={() => pick(col)}
                          style={{ '--rd': `${(current - i) * 50 + col * 30}ms` } as CSSProperties}
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
        </div>
        {run.status === 'cashed' && outcome && <Burst key={outcome.id} big={mult >= 10} />}
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
                pick(Math.floor(Math.random() * (run.rows[current]?.type.balls ?? 3)));
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
              KES {fmt(bet || 0)} · cash out any time · max {MAX_MULT}×
            </span>
          </button>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Ball Tower" onClose={() => setRules(false)}>
          <p>The tower never ends. Every row hides sealed balls, and some of them are blockers. Pick one ball in the glowing row: a safe ball clears the row, the tower slides down and a new row drops in on top.</p>
          <p>Each row shows its type and the multiplier you will have once it is cleared, so you always see the risk before you pick. Cash out after any row. A blocker ends the climb and you lose the bet.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Row</th>
                <th>Safe balls</th>
                <th>Chance</th>
                <th>Raises win by</th>
                <th>Dealt</th>
              </tr>
            </thead>
            <tbody>
              {ROW_TYPES.map((t) => (
                <tr key={t.id}>
                  <td>{t.label}</td>
                  <td>
                    {t.balls - t.blockers} of {t.balls}
                  </td>
                  <td>{Math.round(safeChance(t) * 100)}%</td>
                  <td>×{fmtM(Math.round(fairStep(t) * 100) / 100)}</td>
                  <td>{t.weight}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Your multiplier is {RTP * 100}% of the fair odds of every row you cleared. That means the house keeps a fixed {Math.round((1 - RTP) * 100)}% edge
            whether you stop after one row or twenty, and the player gets {RTP * 100}% back on average. The climb cashes out by itself at {MAX_MULT}× or after {MAX_ROWS} rows.
          </p>
          <p className="fine">Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
