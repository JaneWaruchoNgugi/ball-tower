import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { AutoRounds, ModeSwitch } from '../../components/AutoControls';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { InfoIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { useAutoPlay } from '../../hooks/useAutoPlay';
import { GROUP_COLOR, LETTERS, fmt, fmtM, letterOf, money, reducedMotion } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, wallet } from '../../lib/wallet';
import { DUEL_PAYS, type Deal, type DuelBet, type DuelResult, deal, duelWins, playOut } from './duel';

/** Pause after a ball that marks a line, and after one that marks nothing. */
const MARK_MS = 560;
const PASS_MS = 150;
const BETS: ReadonlyArray<[DuelBet, string, string]> = [
  ['you', 'You', 'Your line first'],
  ['house', 'House', 'House line first'],
  ['blowout', 'Blowout', 'Loser has 0–1 marked'],
];

/** One bingo line: five numbers, one per column, daubed as they are called. */
function Line({ who, nums, called, won, lost }: { who: string; nums: number[]; called: Set<number>; won: boolean; lost: boolean }) {
  const marked = nums.filter((n) => called.has(n)).length;
  return (
    <div className={`line ${who}${won ? ' won' : ''}${lost ? ' lost' : ''}`}>
      <div className="line-head">
        <b>{who === 'you' ? 'Your line' : 'House line'}</b>
        <span className="line-count">
          {marked}
          <i>/5</i>
        </span>
      </div>
      <div className="line-cells">
        {nums.map((n, i) => {
          const L = LETTERS[i]!;
          const hit = called.has(n);
          return (
            <span key={n} className={`cell${hit ? ' marked' : ''}`} style={{ '--c': GROUP_COLOR[L] } as CSSProperties}>
              <small>{L}</small>
              <b>{n}</b>
              {hit && <span className="daub" aria-hidden="true" />}
            </span>
          );
        })}
      </div>
      <div className="line-bar" aria-hidden="true">
        <span style={{ width: `${marked * 20}%` }} />
      </div>
    </div>
  );
}

/**
 * Bingo Duel: you and the house each hold a 5-number line. Balls are called until one line is
 * full. Bet on who finishes first, or on a Blowout.
 */
export function BingoDuel() {
  const [betText, setBetText] = useState('10');
  const [pick, setPick] = useState<DuelBet>('you');
  const [d, setD] = useState<Deal>(deal);
  const [shown, setShown] = useState(0);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [auto, setAuto] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [rules, setRules] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const bet = parseBet(betText);
  const called = new Set(d.order.slice(0, shown));
  const current = shown > 0 ? d.order[shown - 1] : undefined;
  const finished = !!result && shown >= result.drawn && !running;

  const play = (): boolean => {
    if (running) return false;
    const e = betError(bet, wallet.get());
    setErr(e);
    if (e || !wallet.take(bet)) return false;
    // A finished duel deals fresh lines; otherwise play the lines on screen.
    const next = result ? deal() : d;
    const r = playOut(next);
    const stake = { bet, pick };
    const ys = new Set(next.you);
    const hs = new Set(next.house);
    sound.play('bet');
    sound.play('go');
    setD(next);
    setResult(r);
    setOutcome(null);
    setShown(0);
    setRunning(true);
    let i = 0;
    const step = () => {
      i++;
      setShown(i);
      const n = next.order[i - 1]!;
      const marks = ys.has(n) || hs.has(n);
      if (marks) {
        sound.play('land');
        sound.call(`${letterOf(n)}, ${n}.`);
      } else sound.play('tick');
      if (i < r.drawn) {
        timer.current = window.setTimeout(step, marks ? MARK_MS : PASS_MS);
        return;
      }
      {
        setRunning(false);
        const win = duelWins(stake.pick, r);
        const payout = win ? money(stake.bet * DUEL_PAYS[stake.pick]) : 0;
        if (payout) wallet.pay(payout);
        setTimeout(() => sound.play(win ? (stake.pick === 'blowout' ? 'bigwin' : 'win') : 'lose'), 150);
        setOutcome({
          win,
          title: `${r.winner === 'you' ? 'Your line' : 'House line'} wins${r.loserMarked <= 1 ? ' · blowout' : ''}`,
          detail: `${r.drawn} balls · ${r.loserMarked}/5 on the other line · you bet ${BETS.find((b) => b[0] === stake.pick)![1]}`,
          net: money(payout - stake.bet),
          id: Date.now(),
        });
      }
    };
    clearTimeout(timer.current);
    if (reducedMotion()) {
      i = r.drawn - 1;
      step();
    } else timer.current = window.setTimeout(step, PASS_MS);
    return true;
  };

  const autoplay = useAutoPlay(play, outcome?.id, 1500);
  const autoOn = autoplay.left > 0;
  const locked = running || autoOn;
  const recent = d.order.slice(Math.max(0, shown - 12), shown).reverse();

  return (
    <div className="game game-duel">
      <section className={`board duel-board${running ? ' running' : ''}`} aria-label="Bingo Duel">
        <ResultBar
          outcome={outcome}
          idle={running ? `Ball ${shown} · first full line wins` : 'Pick a side and start the duel'}
        />
        <Line who="you" nums={d.you} called={called} won={finished && result?.winner === 'you'} lost={finished && result?.winner === 'house'} />
        <div className="caller">
          <span className="caller-count">
            <small>Ball</small>
            <b>{shown || '—'}</b>
          </span>
          <span className="caller-ball">
            {current ? <Ball key={shown} n={current} className="call-pop" /> : <span className="well-blank idle" />}
          </span>
          <span className="caller-vs" aria-hidden="true">
            VS
          </span>
          {outcome?.win && <Burst key={outcome.id} big={pick === 'blowout'} />}
        </div>
        <Line who="house" nums={d.house} called={called} won={finished && result?.winner === 'house'} lost={finished && result?.winner === 'you'} />
        <div className="hist" aria-label="Called balls">
          <small>Called</small>
          <div className="hist-row">
            {recent.length === 0 ? (
              <span className="hist-empty">Called balls appear here</span>
            ) : (
              recent.map((n) => <Ball key={n} n={n} className={d.you.includes(n) || d.house.includes(n) ? 'hit' : ''} />)
            )}
          </div>
        </div>
      </section>

      <aside className="console">
        <div className="console-head">
          <ModeSwitch auto={auto} setAuto={setAuto} locked={locked} />
          <button className="info-btn" onClick={() => setRules(true)} aria-label="How to play Bingo Duel">
            <InfoIcon /> Rules
          </button>
        </div>
        <BetBox value={betText} onChange={setBetText} disabled={locked} />
        <div className="duel-bets" role="radiogroup" aria-label="Your bet">
          {BETS.map(([k, label, hint]) => (
            <button
              key={k}
              role="radio"
              aria-checked={pick === k}
              disabled={locked}
              className={k}
              onClick={() => {
                sound.play('click');
                setPick(k);
              }}
            >
              <b>{label}</b>
              <em>{fmtM(DUEL_PAYS[k])}×</em>
              <small>{hint}</small>
            </button>
          ))}
        </div>
        {auto && <AutoRounds rounds={autoRounds} setRounds={setAutoRounds} running={autoOn} />}
        <p className="err" role="alert">
          {err}
        </p>
        {auto ? (
          <button className={`play${autoOn ? ' stop' : ''}`} disabled={!autoOn && running} onClick={() => (autoOn ? autoplay.stop() : autoplay.start(autoRounds))}>
            <span className="pl-main">{autoOn ? 'Stop auto' : 'Start auto'}</span>
            <span className="pl-sub">
              {autoOn ? `${autoplay.left} of ${autoRounds} duels left · stops if your balance runs low` : `${autoRounds} duels · KES ${fmt(bet || 0)} on ${pick}`}
            </span>
          </button>
        ) : (
          <div className="btn-pair">
            <button
              className="btn-alt"
              disabled={running}
              onClick={() => {
                sound.play('click');
                setD(deal());
                setResult(null);
                setShown(0);
                setOutcome(null);
              }}
            >
              New lines
            </button>
            <button className="play" disabled={running} onClick={() => play()}>
              <span className="pl-main">{running ? 'Calling' : 'Duel'}</span>
              <span className="pl-sub">
                {BETS.find((b) => b[0] === pick)![1]} · win KES {fmt((bet || 0) * DUEL_PAYS[pick])}
              </span>
            </button>
          </div>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Bingo Duel" onClose={() => setRules(false)}>
          <p>You and the house each hold a line of 5 numbers, one from each of B, I, N, G and O. The lines never share a number. Balls are called one by one until one line is full.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Bet</th>
                <th>Wins when</th>
                <th>Chance</th>
                <th>Pays</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>You</td>
                <td>Your line fills first</td>
                <td>50%</td>
                <td>{DUEL_PAYS.you}×</td>
              </tr>
              <tr>
                <td>House</td>
                <td>The house line fills first</td>
                <td>50%</td>
                <td>{DUEL_PAYS.house}×</td>
              </tr>
              <tr>
                <td>Blowout</td>
                <td>Either line fills while the other has 0 or 1 marked</td>
                <td>4.8%</td>
                <td>{DUEL_PAYS.blowout}×</td>
              </tr>
            </tbody>
          </table>
          <p>New lines deals two fresh lines before you play; it does not change the odds. After a duel, the next one deals new lines automatically.</p>
          <p className="fine">Return to player is 97% on You and House and 95.2% on Blowout. Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
