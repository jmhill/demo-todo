import { describe } from 'vitest';
import { createInMemoryUserStore } from './user-store-in-mem.js';
import { runUserStoreContractTests } from './user-store-contract-tests.js';

describe('InMemoryUserStore', () => {
  // Run shared contract tests against in-memory implementation
  // No beforeEach needed - each test gets a fresh store instance automatically
  runUserStoreContractTests({
    createStore: () => createInMemoryUserStore(),
  });

  // In-memory specific tests can be added here if needed
  // Example: test memory efficiency, synchronous guarantees, etc.
});
