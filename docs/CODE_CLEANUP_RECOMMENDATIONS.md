# Code Cleanup Recommendations

This document tracks identified code duplication and cleanup opportunities discovered during codebase review on 2025-10-03.

## Status: Pending Implementation

---

## 1. Schema Duplication

### 1.1 ErrorResponse Schema Duplication (MODERATE PRIORITY)

**Location:**

- `libs/api-contracts/src/auth-contract.ts:7-9`
- `libs/api-contracts/src/user-contract.ts:7-9`
- `libs/api-contracts/src/todo-contract.ts:7-9`

**Issue:** The `ErrorResponseSchema` is defined identically three times:

```typescript
const ErrorResponseSchema = z.object({
  message: z.string(),
});
```

**Recommendation:**

1. Create `libs/api-contracts/src/common-schemas.ts`
2. Export `ErrorResponseSchema` from there
3. Import in all three contract files

**Impact:** Single source of truth for API error responses, easier to extend error schema in the future.

---

## 2. Domain Error Utilities Duplication (MODERATE PRIORITY)

### 2.1 ErrorResponse Type

**Location:**

- `apps/todo-api/src/users/domain/user-errors.ts:13-16`
- `apps/todo-api/src/todos/domain/todo-errors.ts:11-14`
- `apps/todo-api/src/auth/domain/auth-errors.ts:8-11`

**Issue:** All three files define identical `ErrorResponse` type:

```typescript
export type ErrorResponse = {
  statusCode: number;
  body: { message: string };
};
```

### 2.2 validationError Function

**Location:**

- `apps/todo-api/src/users/domain/user-errors.ts:40-50`
- `apps/todo-api/src/todos/domain/todo-errors.ts:34-44`

**Issue:** Near-identical implementation in both files:

```typescript
export const validationError = (zodError: z.ZodError): [Domain]Error => {
  const flattened = zodError.flatten();
  const fieldErrors = Object.entries(flattened.fieldErrors)
    .map(([field, errors]) => `${field}: ${(errors as string[])?.join(', ')}`)
    .join(', ');
  return {
    code: 'VALIDATION_ERROR',
    message: `Validation failed: ${fieldErrors}`,
    details: flattened.fieldErrors,
  };
};
```

### 2.3 unexpectedError Function

**Location:**

- `apps/todo-api/src/users/domain/user-errors.ts`
- `apps/todo-api/src/todos/domain/todo-errors.ts`
- `apps/todo-api/src/auth/domain/auth-errors.ts`

**Issue:** Identical implementation in all three files:

```typescript
export const unexpectedError = (
  message: string,
  cause?: unknown,
): [Domain]Error => ({
  code: 'UNEXPECTED_ERROR',
  message,
  cause,
});
```

**Recommendation:**

1. Create `apps/todo-api/src/shared/error-utils.ts`
2. Extract:
   - `ErrorResponse` type
   - `createValidationError<T>(zodError: z.ZodError, errorCode: string): BaseError<T>` - generic function
   - `createUnexpectedError<T>(message: string, cause?: unknown, errorCode: string): BaseError<T>` - generic function
3. Keep domain-specific error codes and domain error types in domain files
4. Domain files import and use the generic utilities

**Impact:** Reduces ~60 lines of duplicated code, ensures consistent error handling patterns across domains.

---

## 3. Infrastructure Import Pattern Issues (MODERATE PRIORITY)

### 3.1 Redundant Infrastructure Re-exports

**Location:**

- `apps/todo-api/src/users/index.ts:7-9`
- `apps/todo-api/src/todos/index.ts:5-8`

**Issue:** Both files re-export infrastructure utilities:

```typescript
export {
  createUuidIdGenerator,
  createSystemClock,
} from '@demo-todo/infrastructure';
```

Then in `apps/todo-api/src/app.ts:37-38`, these are imported with confusing aliases:

```typescript
import {
  createUuidIdGenerator as createTodoUuidIdGenerator,
  createSystemClock as createTodoSystemClock,
} from './todos/index.js';
```

This creates false coupling between domains and infrastructure.

**Recommendation:**

1. Remove re-exports from `users/index.ts` and `todos/index.ts`
2. Update `app.ts` to import directly from `@demo-todo/infrastructure`
3. Remove aliasing - use utilities directly

**Impact:** Clearer dependency graph, eliminates confusion about where utilities originate.

---

## 4. Configuration & Dependency Issues (MINOR PRIORITY)

### 4.1 Inconsistent uuid Package Versions

**Location:**

- Root `package.json:46` - `"uuid": "^13.0.0"`
- `libs/infrastructure/package.json:13` - `"uuid": "^11.0.5"`

**Issue:** Different versions of uuid package across workspace.

**Recommendation:**

1. Standardize on single uuid version (recommend `^11.0.5` for stability)
2. Remove uuid from root `package.json` if only used in infrastructure lib
3. Or use workspace protocol: `"uuid": "workspace:*"` if managing version centrally

**Impact:** Prevents potential compatibility issues, reduces bundle duplication.

### 4.2 Invalid Config Scripts in Root package.json

**Location:** Root `package.json:18-21`

**Issue:** Scripts reference `src/scripts/print-config.ts` which doesn't exist at root:

```json
"config:print": "tsx src/scripts/print-config.ts",
"config:print:dev": "NODE_ENV=development tsx src/scripts/print-config.ts",
"config:print:test": "NODE_ENV=test tsx src/scripts/print-config.ts",
"config:print:prod": "NODE_ENV=production tsx src/scripts/print-config.ts"
```

These scripts only work in `apps/todo-api/package.json`.

**Recommendation:**

1. Remove config:\* scripts from root package.json
2. Keep only in `apps/todo-api/package.json` where they work
3. Or update to use workspace syntax: `"config:print": "npm run config:print --workspace=todo-api"`

**Impact:** Eliminates confusing non-functional scripts.

---

## 5. Test Organization (MINOR PRIORITY)

### 5.1 Duplicate Security Test Files

**Location:**

- `apps/todo-api/tests/acceptance/security/security-middleware.test.ts` (252 lines)
- `apps/todo-api/tests/acceptance/security/security-middleware-with-helpers.test.ts` (163 lines)

**Issue:** Both files test the same security middleware functionality with different approaches:

- `security-middleware.test.ts` - Direct approach
- `security-middleware-with-helpers.test.ts` - Using helper functions

This suggests an incomplete refactoring where one should have replaced the other.

**Recommendation:**

1. Review both test files
2. Choose the better pattern (likely the helpers approach)
3. Consolidate into single file
4. Delete the other file

**Impact:** Reduces test maintenance burden, eliminates redundancy in test suite.

---

## 6. Type vs Interface Consistency (MINOR PRIORITY)

### 6.1 Inconsistent Port Definition Pattern

**Issue:** Most domain ports use `interface`, but the project guidelines recommend `type`:

- `UserStore`, `PasswordHasher`, `UserService` - all interfaces
- `TodoStore`, `TodoService` - all interfaces
- `TokenStore` - exported as type

**Recommendation:**

1. Standardize on `type` for all port definitions (per TDD guidelines)
2. Convert interfaces to types during next refactoring cycle
3. Update ESLint rules to enforce if desired

**Impact:** Consistency with project guidelines, slightly better type inference in some cases.

---

## Implementation Priority

### High Priority (Do First)

1. **Consolidate ErrorResponse schemas** - Single source of truth for API contracts
2. **Consolidate domain error utilities** - Extract to shared module

### Medium Priority

3. **Fix infrastructure import pattern** - Remove confusing re-exports
4. **Standardize uuid versions** - Single version across workspace

### Low Priority

5. **Consolidate security tests** - Choose one testing approach
6. **Remove invalid config scripts from root** - Clean up package.json
7. **Standardize type vs interface** - Consistency with guidelines

---

## Estimated Impact

**Lines of Code to Remove/Consolidate:** ~150+ lines

- ErrorResponse schema: 3 duplicates → 1 shared
- Error utilities: ~60 lines of duplication
- Infrastructure re-exports: ~10 lines
- Invalid scripts: 4 lines
- Test consolidation: 1 file eliminated

**Maintainability Improvement:**

- Fewer places to update when changing error handling
- Clearer dependency graph
- More consistent codebase
- Easier onboarding for new developers

---

## Notes

- Example/educational files (`user-store-mysql.ts`, `migrate-mysql-raw.ts`) are intentionally kept as this is a demo application
- The `dist/` directory is properly gitignored and not tracked in version control (verified 2025-10-03)
