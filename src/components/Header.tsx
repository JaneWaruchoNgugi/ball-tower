import { useEffect, useRef, useState } from 'react';
import { fmt } from '../lib/bingo';
import { sound } from '../lib/sound';
import { START_BALANCE, useBalance, wallet } from '../lib/wallet';
import { useCountUp } from '../hooks/useCountUp';
import { GearIcon, SpeakerIcon } from './Icons';

/** Logo, demo balance (animated), mute and a settings menu. */
export function Header() {
  const balance = useBalance();
  const shown = useCountUp(balance, 650);
  const prev = useRef(balance);
  const [delta, setDelta] = useState<{ v: number; id: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState({ ...sound.cfg });

  useEffect(() => {
    const d = balance - prev.current;
    prev.current = balance;
    if (Math.abs(d) < 0.005) return;
    setDelta({ v: d, id: Date.now() });
    const t = setTimeout(() => setDelta(null), 1800);
    return () => clearTimeout(t);
  }, [balance]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !(e.target as Element).closest('.menu-wrap') && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (k: 'on' | 'caller' | 'music' | 'ui') => {
    sound.cfg[k] = !sound.cfg[k];
    sound.save();
    setCfg({ ...sound.cfg });
  };

  return (
    <header className="top">
      <div className="logo" aria-label="Bingo Arcade">
        <span className="logo-ball" aria-hidden="true">
          75
        </span>
        <span className="logo-txt">
          BINGO<em>ARCADE</em>
        </span>
      </div>
      <div className="top-right">
        <div className={`wallet${delta ? (delta.v > 0 ? ' up' : ' down') : ''}`} title="Demo balance">
          <span className="cur">KES</span>
          <span className="bal">{fmt(shown)}</span>
          {delta && delta.v > 0 && (
            <span key={delta.id} className="wdelta">
              +{fmt(delta.v)}
            </span>
          )}
        </div>
        <button className="icon-btn" aria-label={cfg.on ? 'Mute sound' : 'Turn sound on'} aria-pressed={!cfg.on} onClick={() => toggle('on')}>
          <SpeakerIcon muted={!cfg.on} />
        </button>
        <div className="menu-wrap">
          <button className="icon-btn" aria-label="Settings" aria-expanded={open} onClick={() => setOpen(!open)}>
            <GearIcon />
          </button>
          {open && (
            <div className="menu" role="dialog" aria-label="Settings">
              <div className="menu-head">Settings</div>
              {(
                [
                  ['on', 'Sound'],
                  ['caller', 'Caller voice'],
                  ['music', 'Background music'],
                  ['ui', 'Button clicks'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="menu-row">
                  <span>{label}</span>
                  <span className="switch">
                    <input type="checkbox" checked={cfg[k]} onChange={() => toggle(k)} />
                    <span aria-hidden="true" />
                  </span>
                </label>
              ))}
              <button
                className="menu-btn"
                onClick={() => {
                  wallet.reset();
                  setOpen(false);
                }}
              >
                Reset balance to KES {fmt(START_BALANCE, 0)}
              </button>
              <p className="menu-note">Demo money only. Balances have no cash value.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
