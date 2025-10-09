import { describe } from 'vitest';
import { createInMemoryOrganizationStore } from './organization-store-in-mem.js';
import { runOrganizationStoreContractTests } from './organization-store-contract-tests.js';

describe('InMemoryOrganizationStore', () => {
  // Run shared contract tests against in-memory implementation
  runOrganizationStoreContractTests({
    createStore: () => createInMemoryOrganizationStore(),
  });

  // In-memory specific tests can be added here if needed
  // Example: test memory efficiency, synchronous guarantees, etc.
});
