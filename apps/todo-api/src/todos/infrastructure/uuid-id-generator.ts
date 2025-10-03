import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import type { IdGenerator } from '../domain/id-generator.js';

// Adapter: Implements domain port using uuid library
export function createUuidIdGenerator(): IdGenerator {
  return {
    generate: () => uuidv4(),
    validate: (id: string) => uuidValidate(id),
  };
}
