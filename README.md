# Bingo Arcade

Five bingo-themed game prototypes in one React + TypeScript app. Demo KES only: no deposits, withdrawals or real-money play. Real money would need a gaming licence.

- **Ball Tower:** an endless climb. Each row is Easy (3 of 4 safe), Normal (2 of 3), Hard (1 of 2) or Extreme (1 of 3), and shows the multiplier you get for clearing it. Clear a row and a new one drops in on top. The house keeps a fixed 4% edge at every row (96% RTP); max 1000×.
- **Lucky Wheel 55:** a 55-ball wheel, 11 numbers per colour. Bet on a colour group (4.85×) or one exact number (53×). Manual or auto spins.
- **Hot Streak:** cover 1 to 4 colour groups and draw balls one at a time. Each ball in your colours grows the multiplier; the first one outside ends the run. Bank any time.
- **Bingo Duel:** your 5-number line against the house line. Bet on who fills first (1.94×) or a Blowout (20×). Manual or auto.
- **Bingo Dice:** two different balls are drawn. Bet that the total is over or under a target you set; chance and payout update live. Manual or auto draws.

All five return about 96–97% to the player. Outcomes use the browser's crypto RNG; in a real product they would come from a server.

## Structure

```
src/
  main.tsx, App.tsx       entry and game switcher (#tower, #wheel, #dice, #streak, #duel)
  components/             Header, Ball, BetBox, ResultBar, Burst, Rules, AutoControls, Icons
  games/
    tower/                tower.ts (rules and payouts), BallTower.tsx
    wheel/                wheel.ts, WheelSvg.tsx, LuckyWheel.tsx
    dice/                 dice.ts, BingoDice.tsx
    streak/               streak.ts, HotStreak.tsx
    duel/                 duel.ts, BingoDuel.tsx
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
