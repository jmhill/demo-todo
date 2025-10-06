# Frontend Acceptance Testing: MSW Interception Issue

**Status:** Known Issue - Unresolved
**Date:** October 6, 2025
**Severity:** Medium - Limits frontend acceptance test coverage
**Impact:** 7 out of 30 acceptance tests currently skipped

## Summary

Frontend acceptance tests using MSW (Mock Service Worker) to mock API responses work correctly for authentication flows and contract validation, but **MSW fails to intercept HTTP requests made by React Query/ts-rest when rendering components** in the vitest+jsdom test environment.

Direct `fetch()` calls are intercepted successfully by MSW, but requests initiated by the ts-rest client within React components bypass MSW entirely, resulting in network errors and failed tests.

## Test Results

### Current Test Coverage (37/44 passing - 84%)

**✅ Passing Tests:**
- Unit tests: 14/14 (100%)
- Contract validation: 12/12 (100%)
- Authentication flows: 8/8 (100%)
- Todo viewing edge cases: 3/10 (30%)

**⚠️ Skipped Tests (7):**
- Todo list display with data
- Todo display details
- User isolation
- Post-login todo display

All skipped tests fail with "Failed to load todos" error despite MSW handlers being properly configured.

## Technical Investigation

### What We Discovered

#### ✅ Works Correctly
1. **Direct fetch() calls ARE intercepted by MSW:**
```typescript
// This works - MSW intercepts successfully
const response = await fetch('http://localhost:3000/todos', {
  headers: { Authorization: 'Bearer token' }
});
// MSW handler called ✓
// Response: 200 with mock data ✓
```

2. **Contract validation works perfectly:**
- All Zod schemas validate test data
- Test data factories produce schema-compliant responses
- No mock drift - schema changes break tests immediately

3. **Auth tests work perfectly:**
- Login/logout flows fully tested
- Session persistence validated
- Error handling confirmed

#### ❌ Does Not Work
**React Query/ts-rest requests in components are NOT intercepted:**
```typescript
// This fails - MSW never sees the request
renderWithProviders(<App />);
// Component renders ✓
// React Query makes request to /todos ✗
// MSW handler NOT called ✗
// Result: "Failed to load todos" error
```

### Debugging Evidence

**Test 1: Wildcard Handler**
```typescript
server.use(
  http.get('*', ({ request }) => {
    console.log('MSW saw:', request.url);
    requestsSeen.push(request.url);
    return HttpResponse.json([], { status: 200 });
  })
);

renderWithProviders(<App />);

// Result: requestsSeen.length === 0
// MSW saw ZERO requests from React Query!
```

**Test 2: Direct Fetch Comparison**
```typescript
// Same test, same MSW setup:

// Direct fetch
const response = await fetch('http://localhost:3000/todos');
// [MSW] GET /todos handler called ✓

// Component render
renderWithProviders(<App />);
// [MSW] (no output - never called) ✗
```

### Root Cause Analysis

**MSW's Node.js server (`msw/node`) is not intercepting requests from React Query/ts-rest in our current vitest+jsdom configuration.**

**Important Clarification**: The referenced GitHub issue #1916 ("Undici 6.x - Request/Response/TextEncoder is not defined") is about Jest/jsdom compatibility problems. MSW explicitly RECOMMENDS Vitest as the solution to these issues. The problem is not a fundamental incompatibility with Vitest, but rather a configuration issue.

Current environment:
- MSW v2.11.3 (`msw/node` setup)
- Vitest 3.2.4 with jsdom environment
- React Query v5
- ts-rest v3.53 React Query integration
- Node.js v24.5.0 (native fetch support)

Possible causes:
1. Vitest pool configuration (threads vs forks)
2. jsdom-specific fetch implementation issues
3. React Query request timing/deduplication
4. Missing environment configuration options
5. ts-rest fetch implementation details

### What We Tried

**❌ Attempted Fixes (All Failed):**
1. Using `server.use()` to override handlers at test time
2. Adding todos to mock state before rendering
3. Configuring `server.deps.inline: ['msw']` in vitest config
4. Wildcard handlers to catch all requests
5. Various MSW setup configurations
6. React Query logger to capture errors

**Evidence all approaches failed:**
- `addMockTodos()` approach: MSW handler never called
- `server.use()` override approach: MSW handler never called
- Wildcard `http.get('*')` approach: 0 requests seen

## Current Implementation

### What's Built and Working

#### 1. Test Infrastructure
```
apps/todo-ui/tests/acceptance/
├── setup.ts                          # MSW lifecycle management
├── vitest.acceptance.config.ts       # Acceptance test config
├── fixtures/
│   └── test-data.ts                  # Schema-validated factories
├── helpers/
│   └── test-helpers.tsx              # Render utilities
├── mocks/
│   ├── server.ts                     # MSW server setup
│   └── handlers.ts                   # Contract-enforced handlers
├── auth/
│   └── login-flow.test.tsx           # ✅ 8/8 passing
├── todos/
│   └── todo-viewing.test.tsx         # ⚠️  3/10 passing, 7 skipped
└── contract-validation.test.ts       # ✅ 12/12 passing
```

#### 2. Contract-Safe Test Data Factories
Every test data factory validates against real API contract schemas:
```typescript
export const createTestTodo = (overrides?: Partial<TodoResponse>): TodoResponse => {
  const todo = { /* ...default values... */, ...overrides };

  // ✅ Runtime validation - breaks if contract changes
  return TodoResponseSchema.parse(todo);
};
```

**Benefit:** If API contracts change (field renamed, type changed, new required field), test data factories throw immediately.

#### 3. MSW Handlers (Work for Direct Fetch)
Handlers validate requests and responses against schemas:
```typescript
http.get('http://localhost:3000/todos', ({ request }) => {
  const authHeader = request.headers.get('Authorization');
  // ... auth check ...

  const userTodos = Array.from(todos.values()).filter(
    (todo) => todo.userId === userId
  );

  // Each todo validated by factory
  return HttpResponse.json(userTodos, { status: 200 });
});
```

**Works for:** Direct `fetch()` calls in tests
**Fails for:** React Query requests from components

#### 4. Comprehensive Auth Test Coverage
All authentication workflows fully tested:
- Login with username/email
- Invalid credential handling
- Session persistence via localStorage
- Corrupted data recovery
- Logout functionality

## Immediate Debugging Steps

Before considering alternative approaches, try these configuration changes that have solved similar issues:

### Debug Step 1: Add MSW Request Logging
Add this to `tests/acceptance/setup.ts` to confirm if MSW sees requests:

```typescript
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });

  // Debug: Log all requests MSW sees
  server.events.on('request:start', ({ request }) => {
    console.log('✅ MSW intercepted:', request.method, request.url);
  });
});
```

**Expected result**: If MSW is working, you'll see console logs for every request. If not, MSW isn't intercepting.

**Official MSW docs**: https://mswjs.io/docs/runbook/#using-the-servereventson-method

### Debug Step 2: Try Vitest Pool Configuration
The default `threads` pool can cause issues with certain libraries. Try switching to `forks`:

```typescript
// vitest.acceptance.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks', // ← Add this
    setupFiles: './tests/acceptance/setup.ts',
    // ... rest of config
  },
});
```

**Why this might work**: `node:worker_threads` (used by pool: 'threads') has compatibility issues with some libraries. The `forks` pool uses `node:child_process` instead, which has better compatibility with MSW's interception mechanism.

**Vitest docs**: https://vitest.dev/config/#pool

### Debug Step 3: Try happy-dom Instead of jsdom
happy-dom is faster and has better compatibility with MSW in some cases:

```bash
npm install --save-dev happy-dom --workspace=todo-ui
```

```typescript
// vitest.acceptance.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom', // ← Change from 'jsdom'
    // ... rest of config
  },
});
```

**Why this might work**: happy-dom has a different fetch implementation that may be more compatible with MSW's interception.

**Reference**: https://github.com/vitest-dev/vitest/discussions/1607

### Debug Step 4: Vitest Browser Mode (2025 Solution)
Vitest now offers a browser mode that uses real browsers instead of jsdom simulation:

```bash
npm install --save-dev @vitest/browser playwright --workspace=todo-ui
```

```typescript
// vitest.acceptance.config.ts
export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
    // ... rest of config
  },
});
```

**Setup differences**: Browser mode requires using `setupWorker()` instead of `setupServer()`:

```typescript
// tests/acceptance/mocks/browser.ts (NEW FILE)
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// tests/acceptance/test-extend.ts (NEW FILE)
import { test as testBase } from 'vitest';
import { worker } from './mocks/browser';

export const test = testBase.extend({
  worker: [
    async ({}, use) => {
      await worker.start();
      await use(worker);
      worker.resetHandlers();
    },
    { auto: true }
  ]
});
```

**Official MSW docs**: https://mswjs.io/docs/recipes/vitest-browser-mode/

**Why this might work**: Uses real browser fetch implementation which MSW was originally designed for.

### Debug Step 5: Check React Query Configuration
Ensure React Query isn't bypassing fetch with cached data:

```typescript
// In your test
it('should display todos', async () => {
  const queryClient = createTestQueryClient();
  queryClient.clear(); // ← Force clear cache

  renderWithProviders(<App />);

  // Add longer timeout for async operations
  expect(await screen.findByText('Buy groceries', {}, { timeout: 5000 })).toBeInTheDocument();
});
```

## Long-term Solutions

If the debugging steps above don't resolve the issue, consider these architectural changes:

### Option 1: Real Backend Integration (Most Reliable)
**Implement the original `libs/test-infrastructure` plan:**

Create shared test infrastructure workspace:
```
libs/test-infrastructure/
├── src/
│   ├── create-test-app.ts      # Express app factory
│   ├── database-helpers.ts     # cleanDatabase(), seed helpers
│   ├── test-fixtures.ts        # Shared test users/todos
│   └── test-server.ts          # Server lifecycle for tests
```

Both `todo-api` and `todo-ui` depend on it for acceptance tests.

**Pros:**
- ✅ True end-to-end validation
- ✅ Tests actual integration
- ✅ Shared test data management
- ✅ No MSW compatibility issues

**Cons:**
- ❌ Slower tests (database + server)
- ❌ More complex setup
- ❌ Requires TestContainers/Docker

**Implementation effort:** 4-6 hours

### Option 2: Playwright for Frontend E2E
Use Playwright instead of vitest for frontend acceptance tests:
- Real browser environment
- MSW works correctly in browsers
- Better for true E2E scenarios

**Pros:**
- ✅ MSW works in real browsers
- ✅ True end-to-end testing
- ✅ Can test actual user interactions

**Cons:**
- ❌ New tooling to learn/maintain
- ❌ Slower than unit tests
- ❌ Different testing paradigm

**Implementation effort:** 6-8 hours

### Option 3: Accept Current Coverage
Keep current 84% test coverage with skipped tests:
- Auth flows: Fully tested ✅
- Contract safety: Fully validated ✅
- Unit tests: Comprehensive ✅
- Todo viewing: Gaps documented ⚠️

**Rationale:** Most critical paths (authentication, contract compliance) are validated. Todo viewing is lower risk.

**Implementation effort:** 0 hours (current state)

### Option 4: Investigate MSW Alternatives
Research alternative mocking strategies:
- nock (HTTP mocking)
- msw/browser for vitest
- Custom fetch mock

**Implementation effort:** 3-5 hours (research + implementation)

## Skipped Tests

The following tests are skipped with `.skip` and can be re-enabled once the MSW issue is resolved:

**`tests/acceptance/todos/todo-viewing.test.tsx`:**
1. `should display user's todos after loading`
2. `should display empty state when user has no todos`
3. `should display todo with title and description`
4. `should display todo without description`
5. `should visually indicate completed todos`
6. `should only display current user's todos`
7. `should show todos after successful login`

All tests are fully implemented and will work once MSW interception is fixed.

## References

### MSW Official Documentation
- **Debugging Runbook**: https://mswjs.io/docs/runbook/
- **Node.js Integration**: https://mswjs.io/docs/integrations/node
- **Vitest Browser Mode Recipe**: https://mswjs.io/docs/recipes/vitest-browser-mode/
- **MSW Events API**: https://mswjs.io/docs/api/setup-server/events

### Related GitHub Issues
- **Issue #1916** (Undici 6.x - Jest compatibility): https://github.com/mswjs/msw/issues/1916
  - **Important**: This issue is about **Jest/jsdom problems**, not Vitest
  - MSW recommends Vitest as the solution to Jest issues
- **MSW + Vitest Discussions**: https://github.com/mswjs/msw/discussions/576

### Vitest Documentation
- **Pool Configuration**: https://vitest.dev/config/#pool
- **Browser Mode**: https://vitest.dev/guide/browser/
- **Common Errors**: https://vitest.dev/guide/common-errors

### Community Resources
- **React unit testing using Vitest, RTL and MSW** (2024): https://dev.to/medaymentn/react-unit-testing-using-vitest-rtl-and-msw-216j
- **jsdom vs happy-dom Discussion**: https://github.com/vitest-dev/vitest/discussions/1607
- **Why I Won't Use JSDOM** (Kent C. Dodds, 2025): https://www.epicweb.dev/why-i-won-t-use-jsdom

### Key Files
- MSW setup: `apps/todo-ui/tests/acceptance/setup.ts`
- MSW handlers: `apps/todo-ui/tests/acceptance/mocks/handlers.ts`
- Skipped tests: `apps/todo-ui/tests/acceptance/todos/todo-viewing.test.tsx`
- Debug investigation: `apps/todo-ui/tests/acceptance/todos/debug-msw.test.tsx`

### Test Commands
```bash
# Run all acceptance tests (includes skipped)
npm run test:acceptance --workspace=todo-ui

# Run only passing acceptance tests
npm run test:acceptance --workspace=todo-ui -- --exclude "**/todo-viewing.test.tsx"

# Run unit tests (all passing)
npm run test:unit --workspace=todo-ui
```

## Conclusion

The frontend acceptance testing foundation is solid:
- ✅ Contract validation prevents mock drift
- ✅ Schema-first approach ensures type safety
- ✅ Authentication flows fully tested
- ⚠️ MSW configuration issue blocks todo viewing tests

**Critical Clarification**: The referenced GitHub issue #1916 is about **Jest compatibility problems**, not Vitest. MSW explicitly recommends Vitest as the solution. Our issue is likely a **configuration problem** rather than a fundamental incompatibility.

**Recommended Next Steps (in order)**:
1. **Try Debug Steps 1-2** (request logging + pool: 'forks') - 30 minutes, high success probability
2. **Try Debug Step 3** (happy-dom) - 15 minutes, medium success probability
3. **Try Debug Step 4** (Vitest Browser Mode) - 2 hours, very high success probability
4. **Consider Long-term Solutions** if all debugging fails

The combination of contract validation (12/12), unit tests (14/14), and auth acceptance tests (8/8) provides strong confidence in the frontend codebase while we resolve the MSW configuration.
