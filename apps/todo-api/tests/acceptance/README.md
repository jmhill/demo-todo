# Acceptance Tests

This directory contains acceptance tests that test the full application stack, including all middleware and configurations as they would run in production.

## Structure

- `security/` - Tests for security middleware interactions
- `helpers/` - Shared test utilities and helpers

## Running Tests

```bash
# Run all acceptance tests
npm run test:acceptance

# Run with watch mode
npm run test:watch:acceptance

# Run with coverage
npm run test:coverage:acceptance
```

## Important Notes

### Rate Limiting

The application uses in-memory rate limiting (100 requests per 15 minutes per IP). This can cause tests to fail with 429 (Too Many Requests) errors when:

1. Running tests multiple times in quick succession
2. Tests make many requests (e.g., the rate limiting test itself makes 100 requests)

**Solutions:**

- Tests run sequentially using `singleFork: true` to minimize conflicts
- Consider restarting the dev server between test runs if you encounter persistent 429 errors
- In production testing environments, consider using a test-specific rate limit configuration

### Test Isolation

Acceptance tests import the real application (`app` from `main.ts`), which means:

- All middleware is configured exactly as in production
- State can persist between tests (e.g., rate limiting counters)
- Tests validate real-world behavior, not isolated components

## Writing Acceptance Tests

When writing acceptance tests:

1. **Use test helpers** - Import utilities from `helpers/test-helpers.ts` for common operations
2. **Test interactions** - Focus on how middleware components work together
3. **Validate security posture** - Ensure security headers are present even in error conditions
4. **Consider rate limits** - Be aware that making too many requests will trigger rate limiting

## Difference from Unit Tests

- **Unit tests** (`src/**/*.test.ts`): Test individual middleware in isolation with fresh Express instances
- **Acceptance tests** (`tests/**/*.test.ts`): Test the complete application with all middleware configured

Both test types are valuable:

- Unit tests provide fast feedback and precise error location
- Acceptance tests ensure the complete system works as expected
