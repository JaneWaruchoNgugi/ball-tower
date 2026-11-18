# Ball Tower

An endless bingo-ball climb, built in React + TypeScript. Demo KES only: no deposits, withdrawals or real-money play. Real money would need a gaming licence.

## How it plays

Each row hides sealed bingo balls, some of them blockers. Pick one ball in the glowing row. A safe ball clears the row, the tower slides down and a new row drops in on top. Cash out after any row; a blocker loses the bet.

| Row | Safe balls | Chance | Raises your win by | Dealt |
|---|---|---|---|---|
| Easy | 3 of 4 | 75% | ×1.33 | 30% |
| Normal | 2 of 3 | 67% | ×1.5 | 40% |
| Hard | 1 of 2 | 50% | ×2 | 22% |
| Extreme | 1 of 3 | 33% | ×3 | 8% |

Multiplier = 0.96 × the product of the fair steps of every cleared row, so the house keeps a fixed 4% edge whenever you cash out (96% RTP). The climb banks itself at 1000× or after 30 rows. Outcomes use the browser's crypto RNG; in a real product they would come from a server.

## Structure

```
src/
  main.tsx, App.tsx
  games/tower/          tower.ts (row types, dealing, payouts), BallTower.tsx (the game)
  components/           Header, Ball, BetBox, ResultBar, Burst, Rules, Icons
  hooks/useCountUp.ts   requestAnimationFrame number tweens
  lib/                  bingo.ts (colours, RNG, formatting), wallet.ts (demo balance), sound.ts
  audio/                Web Audio sound effects and the caller voice
  styles/global.css
tests/tower.test.ts     house edge, dealing and weights
```

The earlier five-game arcade (Wheel, Dice, Hot Streak, Duel) is kept in git under the tag `arcade-5-games`.

## Run it

```
npm install
npm run dev
npm test
npm run build:single   # dist/ball-tower.html, one self-contained file
```
