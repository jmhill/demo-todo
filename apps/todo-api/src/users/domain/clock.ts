// Port: Domain owns this interface, infrastructure implements it
export interface Clock {
  now(): Date;
}

// Test implementation for use in tests
export function createFixedClock(fixedTime: Date): Clock {
  return {
    now: () => fixedTime,
  };
}
