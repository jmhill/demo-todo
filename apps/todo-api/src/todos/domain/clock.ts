// Port: Domain owns this interface, infrastructure implements it
export interface Clock {
  now(): Date;
}

// Test implementation - returns incrementing times to ensure unique timestamps
export function createIncrementingClock(startTime?: Date): Clock {
  let currentTime = startTime
    ? new Date(startTime)
    : new Date('2024-01-01T00:00:00.000Z');
  return {
    now: () => {
      const time = new Date(currentTime);
      currentTime = new Date(currentTime.getTime() + 1000); // Increment by 1 second
      return time;
    },
  };
}

// Test implementation - returns fixed time
export function createFixedClock(fixedTime: Date): Clock {
  return {
    now: () => fixedTime,
  };
}
