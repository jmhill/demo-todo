import type { Clock } from '../domain/clock.js';

// Adapter: Implements domain port using system time
export function createSystemClock(): Clock {
  return {
    now: () => new Date(),
  };
}
