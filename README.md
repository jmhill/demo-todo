# Demo Todo

A demonstration project showcasing clean architecture principles with end-to-end type safety and functional error handling.

## Architecture Philosophy

This project is inspired by **Hexagonal Architecture** (also known as Ports and Adapters), emphasizing:

- **Domain-driven design** - Business logic isolated from infrastructure concerns
- **Dependency inversion** - Core domain depends on nothing; adapters depend on the core
- **Explicit boundaries** - Clear separation between application layers
- **Testability** - Pure business logic that's easy to test in isolation

## Technology Stack

### Core Technologies

#### [Zod](https://zod.dev) - Schema-First Development

Zod provides runtime validation and static type inference from a single source of truth.

**Benefits:**

- **Single source of truth** - Define schemas once, derive TypeScript types automatically
- **Runtime safety** - Validate data at system boundaries (API requests, database responses)
- **Compile-time safety** - Full TypeScript type checking from schemas
- **Self-documenting** - Schemas serve as clear contracts and documentation

**Usage in this project:**

```typescript
// Define schema
const LoginRequestSchema = z.object({
  usernameOrEmail: z.string().min(1),
  password: z.string().min(1),
});

// Derive type automatically
type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Validate at boundaries
const parseLoginRequest = (body: unknown): Result<LoginRequest, AuthError> => {
  const result = LoginRequestSchema.safeParse(body);
  // ...
};
```

#### [ts-rest](https://ts-rest.com) - End-to-End Type Safety

ts-rest enables type-safe contract-first API development with shared contracts between server and client.

**Benefits:**

- **Contract-first** - Define API contracts once, share across backend and frontend
- **Full type safety** - Request/response types automatically inferred on both ends
- **Autocomplete everywhere** - IDEs provide full IntelliSense for API calls
- **Refactor with confidence** - Breaking changes caught at compile time
- **No code generation** - Pure TypeScript, no build step needed for contracts

**Usage in this project:**

```typescript
// Shared contract (libs/api-contracts)
export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/auth/login',
    responses: { 200: LoginResponseSchema },
    body: LoginRequestSchema,
  },
});

// Backend (apps/todo-api)
const authRouter = s.router(authContract, {
  login: async ({ body }) => {
    // body is fully typed as LoginRequest
    const result = await authService.login(body.usernameOrEmail, body.password);
    return { status: 200, body: result }; // Type-checked!
  },
});

// Frontend (apps/todo-ui)
const apiClient = initQueryClient(authContract, { baseUrl: '...' });

// Fully typed mutation with React Query
const loginMutation = apiClient.login.useMutation();
loginMutation.mutate({ body: { usernameOrEmail, password } });
```

#### [neverthrow](https://github.com/supermacro/neverthrow) - Functional Error Handling

neverthrow brings Railway-Oriented Programming to TypeScript with explicit error handling using Result types.

**Benefits:**

- **Explicit errors** - Errors are part of the type signature, not hidden exceptions
- **Composable** - Chain operations with `andThen`, `map`, `mapErr`
- **Type-safe** - Both success and error paths are type-checked
- **Railway-oriented** - Operations flow on success, short-circuit on failure
- **No try-catch** - Errors handled functionally, not imperatively

**Usage in this project:**

```typescript
// Domain service returns Result
const login = (
  usernameOrEmail: string,
  password: string,
): ResultAsync<LoginResult, AuthError> => {
  return findUser(usernameOrEmail)
    .andThen((user) => verifyPassword(user, password))
    .andThen((user) => generateToken(user))
    .map((token) => ({ token, user }));
};

// Handlers match on success/error
result.match(
  (data) => ({ status: 200, body: data }),
  (error) => ({ status: 401, body: { message: error.message } }),
);
```

## How They Work Together

These three technologies create a powerful foundation for clean architecture:

### 1. **Boundaries are Explicit and Safe**

```
┌─────────────────────────────────────────┐
│  HTTP Request (unknown)                  │
└──────────────┬──────────────────────────┘
               │ Zod validates at boundary
               ▼
┌─────────────────────────────────────────┐
│  LoginRequest (typed, validated)         │
└──────────────┬──────────────────────────┘
               │ ts-rest ensures contract
               ▼
┌─────────────────────────────────────────┐
│  Domain Service (pure business logic)   │
│  Returns: Result<LoginResult, AuthError>│
└──────────────┬──────────────────────────┘
               │ neverthrow handles errors
               ▼
┌─────────────────────────────────────────┐
│  HTTP Response (200 | 401 | 500)        │
└─────────────────────────────────────────┘
```

### 2. **Ports and Adapters Pattern**

**Domain Core (Ports):**

- Defines interfaces like `UserStore`, `PasswordHasher`, `TokenStore`
- Uses `Result` types for explicit error handling
- Zero infrastructure dependencies

**Infrastructure (Adapters):**

- Implements ports: `SequelizeUserStore`, `BcryptPasswordHasher`, `InMemoryTokenStore`
- Validates external data with Zod schemas
- Adapts infrastructure to domain interfaces

**Application Layer:**

- Uses ts-rest to expose domain services via HTTP
- Translates domain errors to HTTP status codes
- Validates requests, invokes domain, returns responses

### 3. **Type Safety Across Layers**

```typescript
// Contract defines the shape (libs/api-contracts)
const contract = {
  /* ... */
};

// Backend implements the contract (apps/todo-api)
s.router(contract, {
  login: async ({ body }) => {
    /* types flow here */
  },
});

// Frontend consumes the contract (apps/todo-ui)
apiClient.login.useMutation(); // Same types, zero duplication
```

### 4. **Functional Error Flow**

```typescript
// Domain returns Result
createUser(data): Result<User, UserError>

// Chain operations safely
return validateEmail(email)
  .andThen((validEmail) => checkUniqueness(validEmail))
  .andThen((email) => hashPassword(password))
  .andThen((hash) => saveUser({ email, hash }))
  .map((user) => toUserDto(user));

// Match at the boundary
result.match(
  (user) => ({ status: 201, body: user }),
  (error) => toErrorResponse(error)
);
```

## Project Structure

```
demo-todo/
├── apps/
│   ├── todo-api/          # Express API with hexagonal architecture
│   │   ├── src/
│   │   │   ├── auth/      # Auth domain + adapters
│   │   │   ├── users/     # User domain + adapters
│   │   │   ├── todos/     # Todo domain + adapters
│   │   │   └── security/  # Cross-cutting concerns
│   │   └── tests/
│   └── todo-ui/           # React + Vite frontend
│       └── src/
│           ├── components/
│           └── lib/
└── libs/
    └── api-contracts/     # Shared ts-rest contracts (no build step!)
        └── src/
            ├── auth-contract.ts
            └── auth-schemas.ts
```

## Key Architectural Decisions

### ✅ Schema-First

- All data shapes defined with Zod schemas first
- Types derived from schemas, never written manually
- Runtime validation at all boundaries

### ✅ Contract-First API

- ts-rest contracts define API surface
- Single source of truth for request/response shapes
- Shared between backend and frontend via npm workspace

### ✅ Functional Error Handling

- Domain services return `Result<T, E>`
- Errors are explicit in type signatures
- No hidden exceptions in business logic

### ✅ Dependency Inversion

- Domain defines interfaces (ports)
- Infrastructure implements interfaces (adapters)
- Dependency direction: Infrastructure → Domain

### ✅ No Premature Abstractions

- Utilities created when pattern emerges 3+ times
- Abstract based on semantic meaning, not structural similarity
- DRY = Don't Repeat Knowledge, not code appearance

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+

### Installation

```bash
npm install
```

### Development

Run both API and UI in parallel:

```bash
npm run dev
```

This starts:

- **API**: http://localhost:3000
- **UI**: http://localhost:5173

### Testing

```bash
npm test              # All tests
npm run quality       # Format, lint, typecheck, test
```

## Benefits Realized

### Type Safety

- ✅ End-to-end types from database to UI
- ✅ Refactor with confidence - breaking changes caught at compile time
- ✅ Autocomplete everywhere in the stack

### Error Handling

- ✅ Errors are values, not exceptions
- ✅ All error cases explicit in types
- ✅ Compiler enforces error handling

### Maintainability

- ✅ Business logic pure and testable
- ✅ Infrastructure easily swappable
- ✅ Clear boundaries between layers
- ✅ Self-documenting code via schemas and types

### Developer Experience

- ✅ Fast feedback loop (TypeScript catches issues immediately)
- ✅ IntelliSense guides development
- ✅ Minimal boilerplate
- ✅ Single source of truth for schemas and contracts
