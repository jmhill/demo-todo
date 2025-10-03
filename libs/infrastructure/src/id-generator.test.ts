import { describe, it, expect } from 'vitest';
import {
  createUuidIdGenerator,
  createSequentialIdGenerator,
} from './id-generator.js';

describe('IdGenerator implementations', () => {
  describe('createUuidIdGenerator', () => {
    it('should generate a valid UUID v4', () => {
      const generator = createUuidIdGenerator();
      const id = generator.generate();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV4Regex);
    });

    it('should generate unique UUIDs on successive calls', () => {
      const generator = createUuidIdGenerator();
      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should validate a valid UUID', () => {
      const generator = createUuidIdGenerator();
      const id = generator.generate();

      const isValid = generator.validate(id);

      expect(isValid).toBe(true);
    });

    it('should reject an invalid UUID', () => {
      const generator = createUuidIdGenerator();

      expect(generator.validate('not-a-uuid')).toBe(false);
      expect(generator.validate('12345')).toBe(false);
      expect(generator.validate('')).toBe(false);
      expect(generator.validate('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(
        false,
      );
    });

    it('should validate a well-formed UUID v4', () => {
      const generator = createUuidIdGenerator();
      const wellFormedUuid = '550e8400-e29b-41d4-a716-446655440000';

      const isValid = generator.validate(wellFormedUuid);

      expect(isValid).toBe(true);
    });
  });

  describe('createSequentialIdGenerator', () => {
    it('should generate sequential IDs with default prefix', () => {
      const generator = createSequentialIdGenerator();

      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();

      expect(id1).toBe('test-id-1');
      expect(id2).toBe('test-id-2');
      expect(id3).toBe('test-id-3');
    });

    it('should generate sequential IDs with custom prefix', () => {
      const generator = createSequentialIdGenerator('user');

      const id1 = generator.generate();
      const id2 = generator.generate();
      const id3 = generator.generate();

      expect(id1).toBe('user-1');
      expect(id2).toBe('user-2');
      expect(id3).toBe('user-3');
    });

    it('should maintain independent counters for different generators', () => {
      const generator1 = createSequentialIdGenerator('gen1');
      const generator2 = createSequentialIdGenerator('gen2');

      const gen1_id1 = generator1.generate();
      const gen2_id1 = generator2.generate();
      const gen1_id2 = generator1.generate();
      const gen2_id2 = generator2.generate();

      expect(gen1_id1).toBe('gen1-1');
      expect(gen1_id2).toBe('gen1-2');
      expect(gen2_id1).toBe('gen2-1');
      expect(gen2_id2).toBe('gen2-2');
    });

    it('should validate IDs with matching prefix', () => {
      const generator = createSequentialIdGenerator('todo');
      const id = generator.generate();

      const isValid = generator.validate(id);

      expect(isValid).toBe(true);
    });

    it('should validate any ID starting with the prefix', () => {
      const generator = createSequentialIdGenerator('todo');

      expect(generator.validate('todo-1')).toBe(true);
      expect(generator.validate('todo-999')).toBe(true);
      expect(generator.validate('todo-abc')).toBe(true);
      expect(generator.validate('todo-')).toBe(true);
    });

    it('should reject IDs with different prefix', () => {
      const generator = createSequentialIdGenerator('todo');

      expect(generator.validate('user-1')).toBe(false);
      expect(generator.validate('other-1')).toBe(false);
      expect(generator.validate('1')).toBe(false);
      expect(generator.validate('')).toBe(false);
    });

    it('should reject IDs that do not start with prefix', () => {
      const generator = createSequentialIdGenerator('todo');

      expect(generator.validate('tod-1')).toBe(false);
      expect(generator.validate('to-1')).toBe(false);
      expect(generator.validate('t-1')).toBe(false);
    });
  });
});
