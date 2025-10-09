import { describe } from 'vitest';
import { createInMemoryTodoStore } from './todo-store-in-mem.js';
import { runTodoStoreContractTests } from './todo-store-contract-tests.js';

describe('InMemoryTodoStore', () => {
  // Run shared contract tests against in-memory implementation
  // No beforeEach or setupDependencies needed - in-memory has no FK constraints
  runTodoStoreContractTests({
    createStore: () => createInMemoryTodoStore(),
  });

  // In-memory specific tests can be added here if needed
  // Example: test memory efficiency, synchronous guarantees, etc.
});
