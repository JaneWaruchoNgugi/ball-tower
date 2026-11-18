import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { AutoRounds, ModeSwitch } from '../../components/AutoControls';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { InfoIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { Steps } from '../../components/Steps';
import { useAutoPlay } from '../../hooks/useAutoPlay';
import { GROUP_COLOR, GROUP_NAME, LETTERS, type Letter, fmt, fmtM, money, reducedMotion } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, wallet } from '../../lib/wallet';
import { WheelSvg } from './WheelSvg';
import { COLOUR_PAYS, NUMBER_PAYS, SEGMENTS, SEG_DEG, WHEEL_RANGE, type WheelBet, rotationFor, spinNumber, wheelLetter, wheelPays, wheelWins } from './wheel';

const SPIN_MS = 5200;

/** Ease-out with a soft landing, like a heavy wheel coming to rest. */
const ease = (t: number) => 1 - (1 - t) ** 4;

/**
 * Lucky Wheel 55: bet on a colour group (4.85×) or one exact number (53×), then spin.
 * The wheel turns with requestAnimationFrame, the pointer flicks on every segment, and
 * the caller reads out the ball that stops under it.
 */
export function LuckyWheel() {
  const [betText, setBetText] = useState('10');
  const [kind, setKind] = useState<WheelBet['kind']>('colour');
  const [colour, setColour] = useState<Letter>('G');
  const [num, setNum] = useState(40);
  const [err, setErr] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [landed, setLanded] = useState<number | null>(null);
  const [history, setHistory] = useState<{ n: number; win: boolean }[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [auto, setAuto] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [rules, setRules] = useState(false);

  const wheel = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const rot = useRef(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const wager = useMemo<WheelBet>(() => (kind === 'colour' ? { kind, pick: colour } : { kind, pick: num }), [kind, colour, num]);
  const pays = wheelPays(wager);
  const bet = parseBet(betText);

  const spin = (): boolean => {
    if (spinning) return false;
    const e = betError(bet, wallet.get());
    setErr(e);
    if (e || !wallet.take(bet)) return false;
    const ball = spinNumber();
    const stake = { bet, wager };
    const from = rot.current;
    const to = rotationFor(ball, from, 6, Math.random() * 2 - 1);
    const dur = reducedMotion() ? 250 : SPIN_MS;
    sound.play('bet');
    sound.play('go');
    setSpinning(true);
    setLanded(null);
    setOutcome(null);

    const t0 = performance.now();
    let lastSeg = Math.floor(from / SEG_DEG);
    let lastTick = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const r = from + (to - from) * ease(t);
      rot.current = r;
      if (wheel.current) wheel.current.style.transform = `rotate(${r}deg)`;
      const seg = Math.floor(r / SEG_DEG);
      if (seg !== lastSeg) {
        lastSeg = seg;
        // Flick the pointer and tick, but not faster than the ear can follow.
        if (now - lastTick > 45) {
          lastTick = now;
          sound.play('tick');
          const p = pointer.current;
          if (p) {
            p.classList.remove('flick');
            void p.offsetWidth;
            p.classList.add('flick');
          }
        }
      }
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else settle(ball, stake);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(frame);
    return true;
  };

  const settle = (ball: number, stake: { bet: number; wager: WheelBet }) => {
    const L = wheelLetter(ball);
    const win = wheelWins(stake.wager, ball);
    const payout = win ? money(stake.bet * wheelPays(stake.wager)) : 0;
    if (payout) wallet.pay(payout);
    sound.play('land');
    sound.play(win ? (stake.wager.kind === 'number' ? 'bigwin' : 'win') : 'lose');
    setTimeout(() => sound.call(`${L}, ${ball}.`), 250);
    setLanded(ball);
    setHistory((h) => [{ n: ball, win }, ...h].slice(0, 16));
    setSpinning(false);
    const w = stake.wager;
    const detail =
      w.kind === 'colour'
        ? win
          ? `Landed on ${ball}: ${GROUP_NAME[L]}, your colour`
          : `Landed on ${ball}: ${GROUP_NAME[L]}, you picked ${GROUP_NAME[w.pick]}`
        : win
          ? `Landed exactly on your number`
          : `Landed on ${ball}, you picked ${w.pick}`;
    setOutcome({
      win,
      title: `${L}-${ball} · ${win ? `you win ${fmtM(wheelPays(w))}×` : 'you lose'}`,
      detail,
      net: money(payout - stake.bet),
      id: Date.now(),
    });
  };

  const autoplay = useAutoPlay(spin, outcome?.id, 1400);
  const running = autoplay.left > 0;
  const locked = spinning || running;

  // Keep the chosen number centred in its strip.
  useEffect(() => {
    if (kind !== 'number') return;
    const el = strip.current?.querySelector<HTMLElement>(`[data-n="${num}"]`);
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }, [num, kind]);

  const target = kind === 'colour' ? `${GROUP_NAME[colour]} (${WHEEL_RANGE[colour][0]}–${WHEEL_RANGE[colour][1]})` : `number ${num}`;

  return (
    <div className="game game-wheel">
      <section className={`board wheel-board${spinning ? ' spinning' : ''}`} aria-label="Lucky Wheel 55">
        <ResultBar outcome={outcome} idle={spinning ? 'Spinning… watch the gold pointer' : `You win if the pointer stops on ${target} · pays ${fmtM(pays)}×`} />
        <div className="wheel-stage">
          <div className="wheel-wrap">
            <span className="w-glow" aria-hidden="true" />
            <span ref={pointer} className="w-pointer" aria-hidden="true" />
            <div ref={wheel} className="wheel">
              <WheelSvg bet={wager} />
            </div>
            <span className={`w-win${landed && outcome ? (outcome.win ? ' win' : ' lose') : ''}`} aria-hidden="true" />
            <div className="w-hub">
              {landed ? (
                <Ball key={landed + (outcome?.id ?? 0)} n={landed} letter={wheelLetter(landed)} className="hub-ball" />
              ) : (
                <span className="w-hub-txt">{spinning ? '' : '55'}</span>
              )}
            </div>
            {outcome?.win && <Burst key={outcome.id} big={kind === 'number'} />}
          </div>
        </div>
        <div className="hist" aria-label="Previous balls">
          <small>Previous</small>
          <div className="hist-row">
            {history.length === 0 ? (
              <Steps steps={['Pick a colour or one number', 'Press Spin', 'Win if the pointer stops on your pick']} />
            ) : (
              history.map((h, i) => <Ball key={history.length - i} n={h.n} letter={wheelLetter(h.n)} className={h.win ? 'hit' : ''} />)
            )}
          </div>
        </div>
      </section>

      <aside className="console">
        <div className="console-head">
          <ModeSwitch auto={auto} setAuto={setAuto} locked={locked} />
          <button className="info-btn" onClick={() => setRules(true)} aria-label="How to play Lucky Wheel 55">
            <InfoIcon /> Rules
          </button>
        </div>
        <BetBox value={betText} onChange={setBetText} disabled={locked} />
        <div className="seg tall" role="tablist" aria-label="What do you bet on?">
          {(
            [
              ['colour', 'A colour', COLOUR_PAYS, '11 balls · 1 in 5'],
              ['number', 'One number', NUMBER_PAYS, '1 ball · 1 in 55'],
            ] as const
          ).map(([k, label, m, odds]) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              disabled={locked}
              onClick={() => {
                sound.play('click');
                setKind(k);
              }}
            >
              <span className="bt-top">
                {label} <em>{fmtM(m)}×</em>
              </span>
              <small>{odds}</small>
            </button>
          ))}
        </div>
        {kind === 'colour' ? (
          <div className="colour-picks" role="radiogroup" aria-label="Colour group">
            {LETTERS.map((L) => (
              <button
                key={L}
                role="radio"
                aria-checked={colour === L}
                disabled={locked}
                style={{ '--c': GROUP_COLOR[L] } as CSSProperties}
                onClick={() => {
                  sound.play('click');
                  setColour(L);
                }}
                aria-label={`${GROUP_NAME[L]}, ${WHEEL_RANGE[L][0]} to ${WHEEL_RANGE[L][1]}`}
              >
                <b>{L}</b>
                <small>
                  {WHEEL_RANGE[L][0]}–{WHEEL_RANGE[L][1]}
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="num-strip" ref={strip} role="radiogroup" aria-label="Number 1 to 55">
            {Array.from({ length: SEGMENTS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                data-n={n}
                role="radio"
                aria-checked={num === n}
                disabled={locked}
                style={{ '--c': GROUP_COLOR[wheelLetter(n)] } as CSSProperties}
                onClick={() => {
                  sound.play('click');
                  setNum(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        {auto && <AutoRounds rounds={autoRounds} setRounds={setAutoRounds} running={running} />}
        <p className="err" role="alert">
          {err}
        </p>
        {auto ? (
          <button
            className={`play${running ? ' stop' : ''}`}
            onClick={() => (running ? autoplay.stop() : autoplay.start(autoRounds))}
            disabled={!running && spinning}
          >
            <span className="pl-main">{running ? 'Stop auto' : 'Start auto'}</span>
            <span className="pl-sub">
              {running ? `${autoplay.left} of ${autoRounds} spins left · stops if your balance runs low` : `${autoRounds} spins · KES ${fmt(bet || 0)} on ${target}`}
            </span>
          </button>
        ) : (
          <button className="play" disabled={spinning} onClick={() => spin()}>
            <span className="pl-main">{spinning ? 'Spinning' : 'Spin'}</span>
            <span className="pl-sub">
              {target} · win KES {fmt((bet || 0) * pays)}
            </span>
          </button>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Lucky Wheel 55" onClose={() => setRules(false)}>
          <p>The wheel holds 55 numbered balls in five colour groups of 11: B 1–11, I 12–22, N 23–33, G 34–44 and O 45–55. Choose a bet, then spin. The ball that stops under the gold pointer is called.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Bet</th>
                <th>Wins on</th>
                <th>Chance</th>
                <th>Pays</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Colour</td>
                <td>Any of its 11 balls</td>
                <td>20%</td>
                <td>{COLOUR_PAYS}×</td>
              </tr>
              <tr>
                <td>Number</td>
                <td>That one ball</td>
                <td>1.82%</td>
                <td>{NUMBER_PAYS}×</td>
              </tr>
            </tbody>
          </table>
          <p>Auto spins the same bet for the number of spins you choose. It stops early if you press Stop or your balance is too low.</p>
          <p className="fine">Return to player is 97% on colours and 96.4% on numbers. Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
