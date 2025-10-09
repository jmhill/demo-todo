import { describe } from 'vitest';
import { createInMemoryMembershipStore } from './membership-store-in-mem.js';
import { runMembershipStoreContractTests } from './membership-store-contract-tests.js';

describe('InMemoryMembershipStore', () => {
  // Run shared contract tests against in-memory implementation
  // No setupDependencies needed - in-memory has no FK constraints
  runMembershipStoreContractTests({
    createStore: () => createInMemoryMembershipStore(),
  });

  // In-memory specific tests can be added here if needed
  // Example: test memory efficiency, synchronous guarantees, etc.
});
