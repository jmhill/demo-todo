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

This project requires the following tools:

#### Required Software

- **Node.js 18+** - JavaScript runtime for both API and UI
- **Docker** - For running MySQL database container

#### Optional (Recommended)

- **[Devbox](https://www.jetify.com/devbox)** - Provides isolated development environment with:
  - Automatic Node.js installation
  - TypeScript language server
  - Auto-starts MySQL container on shell activation

To use Devbox:

```bash
# Install devbox (see https://www.jetify.com/devbox/docs/installing_devbox/)
# Then start the devbox shell
devbox shell

# This automatically:
# - Installs Node.js and TypeScript language server
# - Starts MySQL container via docker-compose
```

#### Manual Setup (Without Devbox)

If not using Devbox, manually start the database:

```bash
# Start MySQL container
docker compose up -d mysql

# This creates:
# - MySQL 8.0 container on port 3306
# - Database: todo_dev
# - Root password: dev
# - Persistent volume: mysql-data
```

### Installation

This project uses **NPM Workspaces** for monorepo management. Workspaces allow multiple packages to share dependencies and be developed together.

```bash
# From repository root - installs all workspace dependencies
npm install
```

#### How NPM Workspaces Work

**Structure:**

```
demo-todo/                    # Repository root (main package.json)
├── apps/                     # Application workspaces
│   ├── todo-api/            # Express API workspace
│   └── todo-ui/             # React UI workspace
└── libs/                     # Library workspaces
    ├── api-contracts/        # Shared TS-REST contracts
    └── infrastructure/       # Shared utilities
```

**What happens when you run `npm install`:**

1. **Dependency Resolution** - NPM analyzes all workspace package.json files
2. **Hoisting** - Common dependencies are installed once at the root `node_modules`
3. **Workspace Linking** - Internal workspace dependencies are symlinked
4. **Deduplication** - Shared dependencies use single version when possible

**Example:** When `todo-api` depends on `@demo-todo/api-contracts`:

- NPM creates a symlink from `node_modules/@demo-todo/api-contracts` → `libs/api-contracts`
- Changes to contracts immediately reflect in the API without rebuilding
- TypeScript sees real-time updates across workspace boundaries

**Key Benefits:**

- ✅ Single `npm install` for entire project
- ✅ Shared dependencies reduce disk usage
- ✅ Atomic changes across packages
- ✅ No need to publish/version internal packages

### Development

#### Starting the Development Environment

```bash
npm run dev
```

**What `npm run dev` does:**

1. **Runs concurrently** - Uses `concurrently` package to run multiple processes in parallel
2. **Starts API server** (`npm run dev --workspace=todo-api`):
   - Runs database migrations (`npm run db:migrate`)
   - Seeds test users (`npm run seed:users`)
   - Starts TypeScript watch mode with `tsx watch`
   - Auto-reloads on code changes
   - Listens on http://localhost:3000
3. **Starts UI dev server** (`npm run dev --workspace=todo-ui`):
   - Runs Vite development server
   - Hot Module Replacement (HMR) enabled
   - Auto-refreshes on code changes
   - Serves on http://localhost:5173
4. **Color-coded output** - API logs in blue, UI logs in magenta

**Test Users** automatically seeded:

- Username: `alice`, Password: `password123`
- Username: `bob`, Password: `password123`
- Username: `charlie`, Password: `password123`

#### Database Management

```bash
# Reset database (removes all data and re-runs migrations)
npm run db:reset --workspace=todo-api

# Run migrations
npm run db:migrate --workspace=todo-api

# Check migration status
npm run db:migrate:status --workspace=todo-api
```

### Quality Checks

```bash
npm run quality
```

**What the quality script does:**

The quality script runs a comprehensive suite of checks to ensure code meets project standards:

1. **Format Check** (`npm run format`):
   - Runs Prettier to check code formatting
   - Ensures consistent style across all files
   - Fails if any files need reformatting

2. **Lint Check** (`npm run lint`):
   - Runs ESLint with TypeScript parser
   - Catches potential bugs and code smells
   - Enforces coding standards and best practices

3. **Type Check** (`npm run typecheck`):
   - Runs TypeScript compiler in check mode (`tsc --noEmit`)
   - Validates all type annotations
   - Ensures type safety across workspaces
   - Runs for all workspaces with typecheck script

4. **Test Suite** (`npm test`):
   - Runs both unit and acceptance tests
   - Executes tests for all workspaces
   - Ensures functionality works as expected

**Fix Issues Automatically:**

```bash
# Auto-fix formatting and linting issues, then re-run quality checks
npm run quality:fix
```

**When to run:**

- Before committing code
- Before opening pull requests
- After significant refactoring
- As part of CI/CD pipeline

### Testing

#### Testing Philosophy

This project uses two distinct testing approaches for different purposes:

##### Unit Tests

**Purpose:** Test individual functions and modules in isolation

**Characteristics:**

- Fast execution (milliseconds)
- No external dependencies (database, network)
- Use mocks/stubs for dependencies
- Test pure business logic
- Located in `*.test.ts` files alongside source code

**Example:**

```typescript
// libs/infrastructure/src/config.test.ts
describe('mergeConfigs', () => {
  it('should merge nested objects correctly', () => {
    const base = { db: { host: 'localhost' } };
    const override = { db: { port: 3306 } };
    const result = mergeConfigs(base, override);
    expect(result).toEqual({ db: { host: 'localhost', port: 3306 } });
  });
});
```

**Run unit tests:**

```bash
npm run test:unit --workspace=todo-api
```

##### Acceptance Tests

**Purpose:** Test complete user scenarios through the full stack

**Characteristics:**

- Slower execution (seconds)
- Use real infrastructure (TestContainers for MySQL)
- Test through HTTP API endpoints
- Validate end-to-end workflows
- Located in `tests/acceptance/` directories

**Example:**

```typescript
// apps/todo-api/tests/acceptance/auth/login-logout.test.ts
describe('Authentication Flow', () => {
  it('should allow user to login and access protected routes', async () => {
    // Create user through domain service
    await userService.createUser({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    });

    // Login via HTTP endpoint
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ usernameOrEmail: 'testuser', password: 'password123' });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');

    // Access protected route with token
    const profileResponse = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.username).toBe('testuser');
  });
});
```

**Run acceptance tests:**

```bash
npm run test:acceptance --workspace=todo-api
```

#### Test Infrastructure

**TestContainers** for acceptance tests:

- Spins up real MySQL containers for each test suite
- Ensures test isolation
- Provides production-like environment
- Automatically cleans up after tests

**Coverage Goals:**

- Unit tests: Cover business logic edge cases
- Acceptance tests: Cover user workflows
- Combined: Achieve comprehensive coverage without testing implementation details

#### Running Tests

```bash
# All tests in all workspaces
npm test

# Specific workspace tests
npm run test --workspace=todo-api
npm run test --workspace=todo-ui

# Watch mode for TDD
npm run test:watch:unit --workspace=todo-api

# With coverage report
npm run test:coverage --workspace=todo-api
```

## Hexagonal Architecture in Practice

This project demonstrates hexagonal architecture (Ports & Adapters) with concrete examples showing how domain logic remains independent of infrastructure.

### Core Architecture Principles

#### 1. Domain Model with Zod Schemas

The domain model is defined using Zod schemas, providing both runtime validation and compile-time types:

```typescript
// libs/api-contracts/src/todos/todo-schemas.ts
export const TodoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Todo = z.infer<typeof TodoSchema>;

// Domain-specific validation rules
export const CreateTodoSchema = TodoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

**Benefits of Schema-First:**

- ✅ Single source of truth for data shape
- ✅ Automatic TypeScript type generation
- ✅ Runtime validation at boundaries
- ✅ Self-documenting contracts

#### 2. Domain Services Define Operations

Services encapsulate business logic and define the core operations:

```typescript
// apps/todo-api/src/todos/todo-service.ts
export class TodoService {
  constructor(private todoStore: TodoStore) {}

  createTodo(data: CreateTodoRequest): ResultAsync<Todo, TodoError> {
    // Business logic: validate, transform, persist
    return this.validateTodoData(data)
      .andThen((validData) => this.todoStore.create(validData))
      .andThen((todo) => this.enrichTodoWithMetadata(todo))
      .map((todo) => this.toTodoDto(todo));
  }

  listTodosForUser(userId: string): ResultAsync<Todo[], TodoError> {
    // Business logic: authorization, filtering, sorting
    return this.todoStore
      .findByUserId(userId)
      .map((todos) => this.applyBusinessRules(todos))
      .map((todos) => todos.map(this.toTodoDto));
  }
}
```

**Service Characteristics:**

- Pure business logic, no HTTP/DB concerns
- Returns Result types for explicit error handling
- Depends on abstractions (TodoStore interface)
- Easily unit testable with mock stores

#### 3. Multiple Drivers (Ports In)

The same domain logic is exposed through multiple entry points:

##### HTTP API Driver

```typescript
// apps/todo-api/src/todos/todo-router.ts
export const todoRouter = s.router(todoContract, {
  createTodo: async ({ body, headers }) => {
    const userId = getUserIdFromToken(headers.authorization);
    const result = await todoService.createTodo({ ...body, userId });

    return result.match(
      (todo) => ({ status: 201, body: todo }),
      (error) => ({ status: 400, body: { message: error.message } }),
    );
  },
});
```

##### Development Seeder Driver

```typescript
// apps/todo-api/src/scripts/seed-test-todos.ts
export async function seedTestTodos() {
  const users = await userService.getAllUsers();

  for (const user of users) {
    // Uses the SAME domain service as HTTP API
    const result = await todoService.createTodo({
      userId: user.id,
      title: 'Sample Todo',
      description: 'Seeded through domain service',
    });

    result.match(
      (todo) => console.log(`Created todo: ${todo.id}`),
      (error) => console.error(`Failed: ${error.message}`),
    );
  }
}
```

**Key Insight:** Both the HTTP API and seeder use the same `todoService.createTodo()` method, ensuring business rules are always applied regardless of entry point.

#### 4. Multiple Adapter Implementations (Ports Out)

The domain defines interfaces (ports) that can have multiple implementations:

##### Port Definition

```typescript
// apps/todo-api/src/todos/todo-store.ts
export interface TodoStore {
  create(data: CreateTodoData): ResultAsync<Todo, StoreError>;
  findById(id: string): ResultAsync<Todo | null, StoreError>;
  findByUserId(userId: string): ResultAsync<Todo[], StoreError>;
  update(id: string, data: UpdateTodoData): ResultAsync<Todo, StoreError>;
  delete(id: string): ResultAsync<void, StoreError>;
}
```

##### MySQL Implementation (Production)

```typescript
// apps/todo-api/src/todos/adapters/sequelize-todo-store.ts
export class SequelizeTodoStore implements TodoStore {
  create(data: CreateTodoData): ResultAsync<Todo, StoreError> {
    return ResultAsync.fromPromise(
      TodoModel.create({
        id: uuid(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      (error) => new StoreError('Failed to create todo', error),
    ).map((model) => model.toJSON() as Todo);
  }

  // ... other methods
}
```

##### In-Memory Implementation (Testing)

```typescript
// apps/todo-api/src/todos/adapters/in-memory-todo-store.ts
export class InMemoryTodoStore implements TodoStore {
  private todos: Map<string, Todo> = new Map();

  create(data: CreateTodoData): ResultAsync<Todo, StoreError> {
    const todo: Todo = {
      id: uuid(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.todos.set(todo.id, todo);
    return okAsync(todo);
  }

  // ... other methods
}
```

##### Redis Implementation (Caching - Example)

```typescript
// Could easily add a Redis implementation
export class RedisTodoStore implements TodoStore {
  constructor(
    private redisClient: RedisClient,
    private fallbackStore: TodoStore,
  ) {}

  create(data: CreateTodoData): ResultAsync<Todo, StoreError> {
    return this.fallbackStore
      .create(data)
      .andThen((todo) => this.cacheInRedis(todo).map(() => todo));
  }

  // ... implement caching strategies
}
```

### Dependency Injection and Wiring

The application wires everything together at startup:

```typescript
// apps/todo-api/src/main.ts
async function createApp() {
  // Choose implementation based on environment
  const todoStore =
    process.env.NODE_ENV === 'test'
      ? new InMemoryTodoStore()
      : new SequelizeTodoStore();

  // Inject dependencies into service
  const todoService = new TodoService(todoStore);

  // Wire service to HTTP router
  const app = express();
  createExpressEndpoints(todoContract, todoRouter(todoService), app);

  return app;
}
```

### Testing Strategy with Hexagonal Architecture

#### Unit Tests (Domain Logic)

```typescript
// apps/todo-api/src/todos/todo-service.test.ts
describe('TodoService', () => {
  it('should enforce business rules when creating todos', async () => {
    // Use in-memory store for fast, isolated tests
    const store = new InMemoryTodoStore();
    const service = new TodoService(store);

    const result = await service.createTodo({
      userId: 'user-123',
      title: '', // Invalid - empty title
      description: 'Test',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('Title required');
  });
});
```

#### Acceptance Tests (Full Stack)

```typescript
// apps/todo-api/tests/acceptance/todos/todo-crud.test.ts
describe('Todo CRUD Operations', () => {
  let container: StartedMySqlContainer;
  let app: Express;

  beforeAll(async () => {
    // Use TestContainers for real database
    container = await new MySqlContainer().start();

    // Wire up real implementations
    const todoStore = new SequelizeTodoStore(container.getConnectionUri());
    const todoService = new TodoService(todoStore);
    app = createApp(todoService);
  });

  it('should create and retrieve todos', async () => {
    // Test through HTTP API with real database
    const createResponse = await request(app)
      .post('/todos')
      .send({ title: 'Buy milk', description: 'From the store' });

    expect(createResponse.status).toBe(201);

    const getResponse = await request(app).get(
      `/todos/${createResponse.body.id}`,
    );

    expect(getResponse.body.title).toBe('Buy milk');
  });
});
```

### Benefits of This Architecture

1. **Testability**: Domain logic tested in isolation with in-memory stores
2. **Flexibility**: Swap MySQL for PostgreSQL without changing domain code
3. **Consistency**: Business rules enforced regardless of entry point
4. **Maintainability**: Clear boundaries make code easy to understand
5. **Evolution**: Add new adapters (Redis cache, EventStore) without touching domain

## Error Handling with neverthrow

### Railway-Oriented Programming

neverthrow implements the Railway-Oriented Programming pattern, where operations flow on a "success track" or switch to an "error track":

```typescript
// Traditional try-catch approach (problems: hidden errors, nested try blocks)
async function traditionalApproach(email: string, password: string) {
  try {
    const user = await findUserByEmail(email); // might throw
    try {
      const isValid = await verifyPassword(user, password); // might throw
      if (!isValid) {
        throw new Error('Invalid password');
      }
      const token = generateToken(user); // might throw
      return { token, user };
    } catch (passwordError) {
      logError(passwordError);
      throw new AuthError('Authentication failed');
    }
  } catch (userError) {
    logError(userError);
    throw new AuthError('User not found');
  }
}

// neverthrow approach (explicit, composable, type-safe)
function railwayApproach(
  email: string,
  password: string,
): ResultAsync<LoginResult, AuthError> {
  return findUserByEmail(email) // Returns ResultAsync<User, UserError>
    .mapErr((e) => new AuthError('User not found')) // Convert UserError to AuthError
    .andThen(
      (
        user, // Only runs if previous succeeded
      ) => verifyPassword(user, password).map((isValid) => ({ user, isValid })),
    )
    .andThen(
      (
        { user, isValid }, // Chain operations
      ) => (isValid ? ok(user) : err(new AuthError('Invalid password'))),
    )
    .andThen(
      (
        user, // Generate token
      ) => generateToken(user).map((token) => ({ token, user })),
    );
}
```

### Error Handling Patterns

#### 1. Explicit Error Types

```typescript
// Define domain-specific errors
export class TodoError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_FAILED',
    public details?: unknown
  ) {
    super(message);
  }
}

// Service methods return specific error types
createTodo(data: CreateTodoData): ResultAsync<Todo, TodoError> {
  if (!data.title) {
    return errAsync(new TodoError(
      'Title is required',
      'VALIDATION_FAILED'
    ));
  }
  // ...
}
```

#### 2. Error Transformation

```typescript
// Transform infrastructure errors to domain errors
class SequelizeTodoStore implements TodoStore {
  create(data: CreateTodoData): ResultAsync<Todo, TodoError> {
    return ResultAsync.fromPromise(
      TodoModel.create(data),
      // Transform Sequelize error to domain error
      (error) => {
        if (error.name === 'SequelizeValidationError') {
          return new TodoError('Invalid data', 'VALIDATION_FAILED', error);
        }
        return new TodoError('Database error', 'INTERNAL_ERROR', error);
      },
    );
  }
}
```

#### 3. Error Aggregation

```typescript
// Collect multiple validation errors
function validateTodo(data: unknown): Result<ValidTodo, TodoError[]> {
  const errors: TodoError[] = [];

  if (!data.title || data.title.length === 0) {
    errors.push(new TodoError('Title required', 'VALIDATION_FAILED'));
  }

  if (data.title && data.title.length > 200) {
    errors.push(new TodoError('Title too long', 'VALIDATION_FAILED'));
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(data as ValidTodo);
}
```

#### 4. HTTP Error Mapping

```typescript
// Map domain errors to HTTP responses
function toHttpResponse<T>(result: Result<T, TodoError>): {
  status: number;
  body: T | ErrorResponse;
} {
  return result.match(
    // Success case
    (data) => ({ status: 200, body: data }),

    // Error cases mapped to appropriate HTTP status
    (error) => {
      switch (error.code) {
        case 'NOT_FOUND':
          return { status: 404, body: { message: error.message } };
        case 'UNAUTHORIZED':
          return { status: 401, body: { message: error.message } };
        case 'VALIDATION_FAILED':
          return {
            status: 400,
            body: {
              message: error.message,
              details: error.details,
            },
          };
        default:
          return { status: 500, body: { message: 'Internal server error' } };
      }
    },
  );
}
```

### Benefits of neverthrow

1. **Type Safety**: Errors are part of the type signature
2. **Explicit Flow**: Success and error paths are clear
3. **Composability**: Chain operations with `andThen`, `map`, `mapErr`
4. **No Hidden Exceptions**: All errors must be handled
5. **Better Testing**: Test both success and error paths easily

## Benefits Realized

### End-to-End Type Safety with ts-rest

**Traditional API Development Pain Points:**

- Manual type definitions duplicated between frontend and backend
- API changes break frontend silently at runtime
- Request/response shapes drift out of sync
- No autocomplete for API endpoints

**ts-rest Solution:**

```typescript
// 1. Define contract ONCE (libs/api-contracts)
export const authContract = c.router({
  login: {
    method: 'POST',
    path: '/auth/login',
    body: LoginRequestSchema,
    responses: {
      200: LoginResponseSchema,
      401: ErrorResponseSchema,
    },
  },
});

// 2. Backend implements contract (compile-time checked!)
createExpressEndpoints(authContract, authRouter, app);

// 3. Frontend gets full type safety automatically
const tsr = initTsrReactQuery(authContract, { baseUrl });
const mutation = tsr.login.useMutation();
//    ^-- Fully typed! No manual type definitions needed
```

**Benefits:**

- ✅ **Breaking changes caught at compile time** - Rename a field? TypeScript errors guide you to every affected call site
- ✅ **Autocomplete everywhere** - IDE knows all endpoints, request/response shapes, status codes
- ✅ **Zero type duplication** - Write the contract once, types flow to both ends
- ✅ **Refactor fearlessly** - Compiler ensures frontend stays in sync with backend
- ✅ **Self-documenting** - Contract serves as API documentation

### Domain-Driven Data Seeding

**Traditional Seeding Approach (Direct Database):**

```sql
-- ❌ Bypasses business logic
INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
VALUES (uuid(), 'alice@example.com', 'alice', '$2b$10$...', NOW(), NOW());
```

**Problems:**

- ❌ Bypasses validation rules
- ❌ Skips password hashing
- ❌ Misses audit trails
- ❌ Breaks when domain logic changes
- ❌ Doesn't enforce business invariants

**Our Approach (Domain Service Layer):**

```typescript
// ✅ Seed through domain services
const testUsers = [
  { email: 'alice@example.com', username: 'alice', password: 'password123' },
];

for (const testUser of testUsers) {
  const result = await userService.createUser(testUser);
  // ✅ Password gets hashed
  // ✅ Email gets validated
  // ✅ Uniqueness gets checked
  // ✅ Timestamps get set correctly
  // ✅ All business rules applied
}
```

**Benefits:**

- ✅ **Business logic guaranteed** - Every validation, transformation, and side effect happens correctly
- ✅ **Consistency across environments** - Test data created exactly like production data
- ✅ **Refactor-safe** - Domain logic changes automatically apply to seeding
- ✅ **Testing alignment** - Seed scripts use same code paths as tests
- ✅ **Type safety** - Compiler ensures seed data matches domain contracts

**Real Example from This Project:**

```typescript
// apps/todo-api/seed-data/test-users.json
[
  {
    email: 'alice@example.com',
    username: 'alice',
    password: 'password123', // ← Plain text in seed file
  },
];

// apps/todo-api/src/scripts/seed-test-users.ts
const result = await userService.createUser(testUser);
// ✅ Password hashed with bcrypt
// ✅ Email validated
// ✅ Username uniqueness checked
// ✅ Timestamps generated
// ✅ ID generated with UUID
```

**Location**: See `apps/todo-api/src/scripts/seed-test-users.ts` and `apps/todo-api/seed-data/test-users.json`

### Type Safety

- ✅ End-to-end types from database to UI
- ✅ Refactor with confidence - breaking changes caught at compile time
- ✅ Autocomplete everywhere in the stack
- ✅ Zero manual type duplication between frontend and backend
- ✅ API contracts enforce consistency across teams

### Error Handling

- ✅ Errors are values, not exceptions
- ✅ All error cases explicit in types
- ✅ Compiler enforces error handling

### Maintainability

- ✅ Business logic pure and testable
- ✅ Infrastructure easily swappable
- ✅ Clear boundaries between layers
- ✅ Self-documenting code via schemas and types
- ✅ Seed data evolves with domain logic

### Developer Experience

- ✅ Fast feedback loop (TypeScript catches issues immediately)
- ✅ IntelliSense guides development
- ✅ Minimal boilerplate
- ✅ Single source of truth for schemas and contracts
- ✅ Test data setup mirrors production code paths
