import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { BingoDice } from './games/dice/BingoDice';
import { BallTower } from './games/tower/BallTower';
import { LuckyWheel } from './games/wheel/LuckyWheel';
import { sound } from './lib/sound';

const GAMES = [
  { id: 'tower', name: 'Ball Tower', short: 'Tower', blurb: 'Climb and cash out', Comp: BallTower },
  { id: 'wheel', name: 'Lucky Wheel 75', short: 'Wheel 75', blurb: 'Spin for a colour or a number', Comp: LuckyWheel },
  { id: 'dice', name: 'Bingo Dice', short: 'Dice', blurb: 'Two balls, over or under', Comp: BingoDice },
] as const;

type GameId = (typeof GAMES)[number]['id'];

const fromHash = (): GameId => {
  const h = location.hash.slice(1);
  return GAMES.some((g) => g.id === h) ? (h as GameId) : 'tower';
};

export function App() {
  const [game, setGame] = useState<GameId>(fromHash);
  useEffect(() => {
    const on = () => setGame(fromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const active = GAMES.find((g) => g.id === game) ?? GAMES[0];
  const Comp = active.Comp;

  return (
    <div className="wrap">
      <Header />
      <nav className="game-tabs" aria-label="Games">
        {GAMES.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            aria-current={g.id === game ? 'page' : undefined}
            onClick={() => sound.play('click')}
          >
            <b className="long">{g.name}</b>
            <b className="short" aria-hidden="true">{g.short}</b>
            <small>{g.blurb}</small>
          </a>
        ))}
      </nav>
      {/* key resets a game's state when switching away and back. */}
      <Comp key={game} />
      <footer>Bingo Arcade is a prototype using demo KES. Balances have no cash value and cannot be deposited or withdrawn.</footer>
    </div>
  );
}
