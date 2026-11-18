import { useEffect, useRef, useState } from 'react';
import { AutoRounds, ModeSwitch } from '../../components/AutoControls';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { InfoIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { useAutoPlay } from '../../hooks/useAutoPlay';
import { useCountUp } from '../../hooks/useCountUp';
import { fmt, fmtM, letterOf, money, randBall, reducedMotion } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, wallet } from '../../lib/wallet';
import { MAX_TOTAL, MIN_TOTAL, type Side, diceChance, diceMult, drawPair } from './dice';

const ROLL_MS = 1150;
const T_MIN = 20;
const T_MAX = 132;

/**
 * Bingo Dice: two different balls are drawn. Bet that their total lands over or under a
 * target. Moving the target trades chance for payout, shown live.
 */
export function BingoDice() {
  const [betText, setBetText] = useState('10');
  const [side, setSide] = useState<Side>('over');
  const [target, setTarget] = useState(90);
  const [err, setErr] = useState('');
  const [rolling, setRolling] = useState(false);
  const [balls, setBalls] = useState<[number, number]>([24, 51]);
  const [total, setTotal] = useState<number | null>(null);
  const [history, setHistory] = useState<{ t: number; win: boolean; id: number }[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [auto, setAuto] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [rules, setRules] = useState(false);
  const shuffle = useRef<number>(0);
  const done = useRef<number>(0);

  useEffect(
    () => () => {
      clearInterval(shuffle.current);
      clearTimeout(done.current);
    },
    [],
  );

  const chance = diceChance(side, target);
  const mult = diceMult(chance);
  const bet = parseBet(betText);
  const shownTotal = useCountUp(total ?? 0, 650);

  const roll = (): boolean => {
    if (rolling) return false;
    const e = betError(bet, wallet.get());
    setErr(e);
    if (e || !wallet.take(bet)) return false;
    const [a, b] = drawPair();
    const dur = reducedMotion() ? 150 : ROLL_MS;
    const stake = { bet, side, target, mult };
    sound.play('bet');
    sound.play('go');
    setRolling(true);
    setOutcome(null);
    setTotal(null);
    clearInterval(shuffle.current);
    shuffle.current = window.setInterval(() => {
      setBalls([randBall(), randBall()]);
      sound.play('tick');
    }, 80);
    done.current = window.setTimeout(() => {
      clearInterval(shuffle.current);
      const t = a + b;
      const win = stake.side === 'over' ? t > stake.target : t < stake.target;
      const payout = win ? money(stake.bet * stake.mult) : 0;
      if (payout) wallet.pay(payout);
      setBalls([a, b]);
      setTotal(t);
      setRolling(false);
      const id = Date.now();
      setHistory((h) => [{ t, win, id }, ...h].slice(0, 16));
      sound.play('land');
      sound.play(win ? (stake.mult >= 8 ? 'bigwin' : 'win') : 'lose');
      setTimeout(() => sound.call(`${letterOf(a)} ${a}, ${letterOf(b)} ${b}. Total, ${t}.`), 250);
      setOutcome({
        win,
        title: `Total ${t} · ${win ? `you won ${fmtM(stake.mult)}×` : 'no win'}`,
        detail: `Your bet: ${stake.side} ${stake.target}`,
        net: money(payout - stake.bet),
        id,
      });
    }, dur);
    return true;
  };

  const autoplay = useAutoPlay(roll, outcome?.id, 1100);
  const running = autoplay.left > 0;
  const locked = rolling || running;

  // Positions on the 3–149 track, as percentages.
  const pos = (v: number) => ((v - MIN_TOTAL) / (MAX_TOTAL - MIN_TOTAL)) * 100;
  const zone = side === 'over' ? { left: `${pos(target)}%`, right: '0%' } : { left: '0%', right: `${100 - pos(target)}%` };
  const settled = total !== null && outcome;

  return (
    <div className="game game-dice">
      <section className={`board dice-board${rolling ? ' rolling' : ''}`} aria-label="Bingo Dice">
        <ResultBar outcome={outcome} idle={rolling ? 'Drawing two balls…' : `Win if the total is ${side} ${target}`} />
        <div className="dice-stage">
          <div className="dice-balls">
            <span className="d-slot">
              <Ball n={balls[0]} className={rolling ? 'tumble' : total ? 'drop' : ''} />
            </span>
            <span className="op" aria-hidden="true">
              +
            </span>
            <span className="d-slot">
              <Ball n={balls[1]} className={rolling ? 'tumble b2' : total ? 'drop b2' : ''} />
            </span>
          </div>
          <div className={`d-total${settled ? (outcome.win ? ' win' : ' lose') : ''}`} aria-live="off">
            <small>Total</small>
            <b>{total === null ? (rolling ? '··' : '—') : Math.round(shownTotal)}</b>
          </div>
          {outcome?.win && <Burst key={outcome.id} big={mult >= 8} />}
        </div>

        <div className="track-wrap">
          <div className="track" aria-hidden="true">
            <span className="zone" style={zone} />
            {total !== null && <span className={`hit${outcome?.win ? ' win' : ' lose'}`} style={{ left: `${pos(total)}%` }} />}
          </div>
          <input
            className="tslider"
            type="range"
            min={T_MIN}
            max={T_MAX}
            value={target}
            disabled={locked}
            aria-label={`Target total, ${target}`}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <div className="track-ends" aria-hidden="true">
            <span>{MIN_TOTAL}</span>
            <span className="t-target" style={{ left: `${pos(target)}%` }}>
              {target}
            </span>
            <span>{MAX_TOTAL}</span>
          </div>
        </div>

        <div className="hist" aria-label="Previous totals">
          <small>Previous</small>
          <div className="hist-row">
            {history.length === 0 ? (
              <span className="hist-empty">Totals appear here</span>
            ) : (
              history.map((h) => (
                <span key={h.id} className={`hist-tot ${h.win ? 'win' : 'lose'}`}>
                  {h.t}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <aside className="console">
        <div className="console-head">
          <ModeSwitch auto={auto} setAuto={setAuto} locked={locked} />
          <button className="info-btn" onClick={() => setRules(true)} aria-label="How to play Bingo Dice">
            <InfoIcon /> Rules
          </button>
        </div>
        <BetBox value={betText} onChange={setBetText} disabled={locked} />
        <div className="seg" role="tablist" aria-label="Over or under">
          {(['under', 'over'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={side === s}
              disabled={locked}
              onClick={() => {
                sound.play('click');
                setSide(s);
              }}
            >
              {s === 'over' ? 'Over' : 'Under'} <em>{target}</em>
            </button>
          ))}
        </div>
        <div className="stats">
          <div>
            <small>Chance</small>
            <b>{(chance * 100).toFixed(1)}%</b>
          </div>
          <div>
            <small>Pays</small>
            <b>{fmtM(mult)}×</b>
          </div>
          <div>
            <small>Win</small>
            <b>{fmt((bet || 0) * mult)}</b>
          </div>
        </div>
        {auto && <AutoRounds rounds={autoRounds} setRounds={setAutoRounds} running={running} />}
        <p className="err" role="alert">
          {err}
        </p>
        {auto ? (
          <button
            className={`play${running ? ' stop' : ''}`}
            onClick={() => (running ? autoplay.stop() : autoplay.start(autoRounds))}
            disabled={!running && rolling}
          >
            <span className="pl-main">{running ? 'Stop auto' : 'Start auto'}</span>
            <span className="pl-sub">
              {running ? `${autoplay.left} of ${autoRounds} draws left · stops if your balance runs low` : `${autoRounds} draws · ${side} ${target} · KES ${fmt(bet || 0)}`}
            </span>
          </button>
        ) : (
          <button className="play" disabled={rolling} onClick={() => roll()}>
            <span className="pl-main">{rolling ? 'Drawing' : 'Draw'}</span>
            <span className="pl-sub">
              {side === 'over' ? 'Over' : 'Under'} {target} · win KES {fmt((bet || 0) * mult)}
            </span>
          </button>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Bingo Dice" onClose={() => setRules(false)}>
          <p>Two different balls from 1 to 75 are drawn, so the total is between 3 and 149.</p>
          <p>Choose Over or Under and drag the slider to set the target. The chance and payout update as you move it: a harder target pays more. A total equal to the target loses.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Bet</th>
                <th>Chance</th>
                <th>Pays</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['under', 40],
                ['under', 60],
                ['over', 76],
                ['over', 100],
                ['over', 120],
                ['over', 132],
              ].map(([s, t]) => {
                const c = diceChance(s as Side, t as number);
                return (
                  <tr key={`${s}${t}`}>
                    <td>
                      {s === 'over' ? 'Over' : 'Under'} {t}
                    </td>
                    <td>{(c * 100).toFixed(1)}%</td>
                    <td>{fmtM(diceMult(c))}×</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="fine">Every target returns about 97% to the player. Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
