import { Header } from './components/Header';
import { BallTower } from './games/tower/BallTower';

export function App() {
  return (
    <div className="wrap">
      <Header />
      <BallTower />
      <footer>Ball Tower is a prototype using demo KES. Balances have no cash value and cannot be deposited or withdrawn.</footer>
    </div>
  );
}
