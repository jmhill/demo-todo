import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createSystemClock,
  createIncrementingClock,
  createFixedClock,
} from './clock.js';

describe('Clock implementations', () => {
  describe('createSystemClock', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current system time', () => {
      const fixedDate = new Date('2024-03-15T10:30:00.000Z');
      vi.setSystemTime(fixedDate);

      const clock = createSystemClock();
      const result = clock.now();

      expect(result).toEqual(fixedDate);
    });

    it('should return updated system time on subsequent calls', () => {
      const firstDate = new Date('2024-03-15T10:30:00.000Z');
      const secondDate = new Date('2024-03-15T10:31:00.000Z');

      vi.setSystemTime(firstDate);
      const clock = createSystemClock();
      const firstResult = clock.now();

      vi.setSystemTime(secondDate);
      const secondResult = clock.now();

      expect(firstResult).toEqual(firstDate);
      expect(secondResult).toEqual(secondDate);
    });
  });

  describe('createIncrementingClock', () => {
    it('should return default start time on first call', () => {
      const clock = createIncrementingClock();
      const result = clock.now();

      expect(result).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });

    it('should return custom start time on first call', () => {
      const startTime = new Date('2024-06-15T14:30:00.000Z');
      const clock = createIncrementingClock(startTime);
      const result = clock.now();

      expect(result).toEqual(startTime);
    });

    it('should increment by 1 second on each call', () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const clock = createIncrementingClock(startTime);

      const first = clock.now();
      const second = clock.now();
      const third = clock.now();

      expect(first).toEqual(new Date('2024-01-01T00:00:00.000Z'));
      expect(second).toEqual(new Date('2024-01-01T00:00:01.000Z'));
      expect(third).toEqual(new Date('2024-01-01T00:00:02.000Z'));
    });

    it('should not mutate the original start time', () => {
      const startTime = new Date('2024-01-01T00:00:00.000Z');
      const originalTime = startTime.getTime();
      const clock = createIncrementingClock(startTime);

      clock.now();
      clock.now();

      expect(startTime.getTime()).toBe(originalTime);
    });
  });

  describe('createFixedClock', () => {
    it('should return the fixed time', () => {
      const fixedTime = new Date('2024-12-25T09:00:00.000Z');
      const clock = createFixedClock(fixedTime);

      const result = clock.now();

      expect(result).toBe(fixedTime);
    });

    it('should return the same time on multiple calls', () => {
      const fixedTime = new Date('2024-12-25T09:00:00.000Z');
      const clock = createFixedClock(fixedTime);

      const first = clock.now();
      const second = clock.now();
      const third = clock.now();

      expect(first).toBe(fixedTime);
      expect(second).toBe(fixedTime);
      expect(third).toBe(fixedTime);
    });
  });
});
