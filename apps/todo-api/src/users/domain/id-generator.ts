// Port: Domain owns this interface, infrastructure implements it
export interface IdGenerator {
  generate(): string;
  validate(id: string): boolean;
}

// Test implementation for use in tests
export function createSequentialIdGenerator(prefix = 'test-id'): IdGenerator {
  let counter = 0;
  return {
    generate: () => `${prefix}-${++counter}`,
    validate: (id: string) => id.startsWith(prefix),
  };
}
