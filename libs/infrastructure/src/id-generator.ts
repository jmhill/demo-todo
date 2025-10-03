import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// Port: Domain owns this interface, infrastructure implements it
export interface IdGenerator {
  generate(): string;
  validate(id: string): boolean;
}

// Production implementation - uses UUID v4
export const createUuidIdGenerator = (): IdGenerator => {
  return {
    generate: () => uuidv4(),
    validate: (id: string) => uuidValidate(id),
  };
};

// Test implementation - generates sequential IDs for predictable tests
export const createSequentialIdGenerator = (
  prefix = 'test-id',
): IdGenerator => {
  let counter = 0;
  return {
    generate: () => `${prefix}-${++counter}`,
    validate: (id: string) => id.startsWith(prefix),
  };
};
