import { useSyncExternalStore } from 'react';
import { money } from './bingo';

export const START_BALANCE = 10_000;
const KEY = 'bingoarcade.balance';

/** Demo KES balance shared by all three games, saved in localStorage. */
class Wallet {
  private value = START_BALANCE;
  private listeners = new Set<() => void>();

  constructor() {
    try {
      const v = Number(localStorage.getItem(KEY));
      if (Number.isFinite(v) && v > 0) this.value = v;
    } catch {
      /* storage blocked */
    }
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.value;

  /** Take a stake. Returns false if the balance is too low. */
  take(amount: number): boolean {
    if (amount > this.value + 1e-9) return false;
    this.set(this.value - amount);
    return true;
  }

  pay(amount: number): void {
    this.set(this.value + amount);
  }

  reset(): void {
    this.set(START_BALANCE);
  }

  private set(v: number): void {
    this.value = money(v);
    try {
      localStorage.setItem(KEY, String(this.value));
    } catch {
      /* storage blocked */
    }
    for (const fn of this.listeners) fn();
  }
}

export const wallet = new Wallet();

export function useBalance(): number {
  return useSyncExternalStore(wallet.subscribe, wallet.get);
}

/** Check a bet amount against the rules and the balance. Returns an error message or ''. */
export function betError(bet: number, balance: number): string {
  if (!(bet >= 1)) return 'The smallest bet is KES 1.';
  if (bet > balance + 1e-9) return 'That bet is more than your balance.';
  return '';
}
