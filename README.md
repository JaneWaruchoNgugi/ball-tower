# Bingo Arcade

Three bingo-themed game prototypes in one React + TypeScript app. Demo KES only: no deposits, withdrawals or real-money play. Real money would need a gaming licence.

- **Ball Tower:** climb 10 rows. Each row has 3 sealed balls, one of them a blocker. Every safe pick raises the multiplier (1.45× up to 55.93×); cash out any time.
- **Lucky Wheel 75:** a 75-ball wheel. Bet on a colour group (4.85×) or one exact number (72×). Manual or auto spins.
- **Bingo Dice:** two different balls are drawn. Bet that the total is over or under a target you set; chance and payout update live. Manual or auto draws.

All three return about 96–97% to the player. Outcomes use the browser's crypto RNG; in a real product they would come from a server.

## Structure

```
src/
  main.tsx, App.tsx       entry and game switcher (#tower, #wheel, #dice)
  components/             Header, Ball, BetBox, ResultBar, Burst, Rules, AutoControls, Icons
  games/
    tower/                tower.ts (rules and payouts), BallTower.tsx
    wheel/                wheel.ts, WheelSvg.tsx, LuckyWheel.tsx
    dice/                 dice.ts, BingoDice.tsx
  hooks/                  useCountUp (rAF number tweens), useAutoPlay
  lib/                    bingo.ts (groups, RNG, formatting), wallet.ts (shared demo balance), sound.ts
  audio/                  Web Audio sound effects and the caller voice
  styles/global.css
tests/games.test.ts       payouts, RTP and wheel landing maths
```

## Run it

```
npm install
npm run dev
npm test
npm run build:single   # dist/bingo-arcade.html, one self-contained file
```
