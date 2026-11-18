import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Ball } from '../../components/Ball';
import { BetBox, parseBet } from '../../components/BetBox';
import { Burst } from '../../components/Burst';
import { InfoIcon } from '../../components/Icons';
import { type Outcome, ResultBar } from '../../components/ResultBar';
import { Rules } from '../../components/Rules';
import { useCountUp } from '../../hooks/useCountUp';
import { GROUP_COLOR, GROUP_NAME, LETTERS, type Letter, fmt, fmtM, letterOf, money, randBall, reducedMotion } from '../../lib/bingo';
import { sound } from '../../lib/sound';
import { betError, wallet } from '../../lib/wallet';
import { MAX_HITS, hitChance, isHit, streakMult } from './streak';

type Status = 'idle' | 'playing' | 'busted' | 'banked';
const DRAW_MS = 650;

interface Run {
  status: Status;
  bet: number;
  colours: Letter[];
  balls: number[];
}

/**
 * Hot Streak: cover 1 to 4 colour groups, then draw balls one at a time. Every ball in your
 * colours grows the multiplier; the first ball outside them ends the run. Bank any time.
 */
export function HotStreak() {
  const [betText, setBetText] = useState('10');
  const [colours, setColours] = useState<Letter[]>(['B', 'I', 'N']);
  const [err, setErr] = useState('');
  const [run, setRun] = useState<Run>({ status: 'idle', bet: 0, colours: [], balls: [] });
  const [drawing, setDrawing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [rules, setRules] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const playing = run.status === 'playing';
  const k = playing || run.status !== 'idle' ? run.colours.length : colours.length;
  const hits = run.status === 'busted' ? run.balls.length - 1 : run.balls.length;
  const mult = streakMult(k, hits);
  const shownMult = useCountUp(mult, 500);
  const bet = parseBet(betText);
  const last = run.balls[0];
  const lastHit = last !== undefined && run.status !== 'busted';

  const toggle = (L: Letter) => {
    if (playing) return;
    sound.play('click');
    setColours((c) => (c.includes(L) ? (c.length > 1 ? c.filter((x) => x !== L) : c) : c.length < 4 ? [...c, L] : c));
  };

  const bank = (r: Run) => {
    const n = r.balls.length;
    if (r.status !== 'playing' || n === 0) return;
    const m = streakMult(r.colours.length, n);
    const payout = money(r.bet * m);
    wallet.pay(payout);
    sound.play(m >= 10 ? 'bigwin' : 'win');
    setRun({ ...r, status: 'banked' });
    setOutcome({ win: true, title: `Banked · ${fmtM(m)}×`, detail: `${n} ball${n === 1 ? '' : 's'} in a row`, net: money(payout - r.bet), id: Date.now() });
  };

  const draw = (r: Run) => {
    setDrawing(true);
    const ball = randBall();
    sound.play('go');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(
      () => {
        setDrawing(false);
        const balls = [ball, ...r.balls];
        const L = letterOf(ball);
        setTimeout(() => sound.call(`${L}, ${ball}.`), 200);
        if (!isHit(ball, r.colours)) {
          sound.play('lose');
          setRun({ ...r, status: 'busted', balls });
          setOutcome({
            win: false,
            title: `${L}-${ball} · streak over`,
            detail: r.balls.length ? `Lost a ${fmtM(streakMult(r.colours.length, r.balls.length))}× streak` : 'Not one of your colours',
            net: -r.bet,
            id: Date.now(),
          });
          return;
        }
        sound.play('land');
        const next = { ...r, balls };
        if (balls.length >= MAX_HITS) bank(next);
        else setRun(next);
      },
      reducedMotion() ? 80 : DRAW_MS,
    );
  };

  const start = () => {
    const e = betError(bet, wallet.get());
    setErr(e);
    if (e || !wallet.take(bet)) return;
    sound.play('bet');
    setOutcome(null);
    const r: Run = { status: 'playing', bet, colours: [...colours], balls: [] };
    setRun(r);
    draw(r);
  };

  const heat = Math.min(1, hits / 8);
  const covered = run.status === 'idle' ? colours : run.colours;

  return (
    <div className="game game-streak">
      <section className={`board streak-board ${run.status}`} aria-label="Hot Streak" style={{ '--heat': heat } as CSSProperties}>
        <ResultBar
          outcome={outcome}
          idle={drawing ? 'Drawing…' : playing ? 'Draw another ball or bank your win' : 'Cover your colours, then start the streak'}
        />
        <div className="hud">
          <div className="hud-item">
            <small>Streak</small>
            <b>{hits}</b>
          </div>
          <div className={`hud-mult${hits > 0 ? ' live' : ''}`}>
            <small>Multiplier</small>
            <b key={hits}>{fmtM(Math.round(shownMult * 100) / 100)}×</b>
          </div>
          <div className="hud-item right">
            <small>Next ball</small>
            <b>{hits < MAX_HITS ? `${fmtM(streakMult(k, hits + 1))}×` : '—'}</b>
          </div>
        </div>

        <div className="well">
          <span className="well-heat" aria-hidden="true" />
          <div className={`well-ball${drawing ? ' drawing' : ''}`}>
            {drawing ? (
              <span className="well-blank" aria-label="Drawing a ball" />
            ) : last ? (
              <Ball key={run.balls.length} n={last} className={`well-pop ${lastHit ? 'hit' : 'miss'}`} />
            ) : (
              <span className="well-blank idle" />
            )}
          </div>
          {last !== undefined && !drawing && (
            <span key={`t${run.balls.length}`} className={`well-tag ${lastHit ? 'hit' : 'miss'}`}>
              {lastHit ? 'In your colours' : 'Outside your colours'}
            </span>
          )}
          {run.status === 'banked' && outcome && <Burst key={outcome.id} big={mult >= 10} />}
        </div>

        <div className="covered" aria-label="Your colours">
          {LETTERS.map((L) => (
            <span key={L} className={covered.includes(L) ? 'on' : ''} style={{ '--c': GROUP_COLOR[L] } as CSSProperties}>
              {L}
            </span>
          ))}
        </div>

        <div className="pips" aria-label={`${hits} of ${MAX_HITS} balls`}>
          {Array.from({ length: MAX_HITS }, (_, i) => (
            <i key={i} className={i < hits ? 'on' : ''} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>

        <div className="hist" aria-label="This run">
          <small>This run</small>
          <div className="hist-row">
            {run.balls.length === 0 ? (
              <span className="hist-empty">Drawn balls line up here</span>
            ) : (
              run.balls.map((n, i) => <Ball key={run.balls.length - i} n={n} className={i === 0 && run.status === 'busted' ? 'miss' : 'hit'} />)
            )}
          </div>
        </div>
      </section>

      <aside className="console">
        <div className="console-head">
          <span>Hot Streak</span>
          <button className="info-btn" onClick={() => setRules(true)} aria-label="How to play Hot Streak">
            <InfoIcon /> Rules
          </button>
        </div>
        <BetBox value={betText} onChange={setBetText} disabled={playing} />
        <div className="colour-picks multi" role="group" aria-label="Your colours, pick 1 to 4">
          {LETTERS.map((L) => (
            <button
              key={L}
              aria-pressed={colours.includes(L)}
              disabled={playing}
              style={{ '--c': GROUP_COLOR[L] } as CSSProperties}
              onClick={() => toggle(L)}
              aria-label={GROUP_NAME[L]}
            >
              <b>{L}</b>
              <small>{GROUP_NAME[L]}</small>
            </button>
          ))}
        </div>
        <div className="stats">
          <div>
            <small>Each ball</small>
            <b>{Math.round(hitChance(colours.length) * 100)}%</b>
          </div>
          <div>
            <small>1st ball</small>
            <b>{fmtM(streakMult(colours.length, 1))}×</b>
          </div>
          <div>
            <small>5 in a row</small>
            <b>{fmtM(streakMult(colours.length, 5))}×</b>
          </div>
        </div>
        <p className="err" role="alert">
          {err}
        </p>
        {playing ? (
          <div className="btn-pair">
            <button className="btn-alt" disabled={drawing} onClick={() => draw(run)}>
              Next ball
            </button>
            <button className="play cash" disabled={drawing || hits === 0} onClick={() => bank(run)}>
              <span className="pl-main">Bank</span>
              <span className="pl-sub">{hits === 0 ? 'Drawing…' : `KES ${fmt(run.bet * mult)}`}</span>
            </button>
          </div>
        ) : (
          <button className="play" onClick={start}>
            <span className="pl-main">{run.status === 'idle' ? 'Start streak' : 'New streak'}</span>
            <span className="pl-sub">
              {colours.join(' ')} · first ball pays {fmtM(streakMult(colours.length, 1))}×
            </span>
          </button>
        )}
      </aside>

      {rules && (
        <Rules title="How to play Hot Streak" onClose={() => setRules(false)}>
          <p>Cover 1 to 4 colour groups and set your bet. Start the streak and a ball is drawn from all 75.</p>
          <p>If it is one of your colours, your multiplier grows and you choose: draw another ball, or bank your win. The first ball outside your colours ends the streak and you lose the bet. The streak banks itself after {MAX_HITS} balls.</p>
          <table className="pay">
            <thead>
              <tr>
                <th>Colours</th>
                <th>Each ball</th>
                <th>1 ball</th>
                <th>3 balls</th>
                <th>5 balls</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4].map((c) => (
                <tr key={c}>
                  <td>{c}</td>
                  <td>{c * 20}%</td>
                  <td>{fmtM(streakMult(c, 1))}×</td>
                  <td>{fmtM(streakMult(c, 3))}×</td>
                  <td>{fmtM(streakMult(c, 5))}×</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">Every ball is drawn from all 75, so each draw is independent. Return to player is about 97%. Demo KES only.</p>
        </Rules>
      )}
    </div>
  );
}
