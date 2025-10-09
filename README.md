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
const tsr = initTsrReactQuery(authContract, { baseUrl: '...' });

// Fully typed mutation with React Query
const loginMutation = tsr.auth.login.useMutation();
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
│   │   │   ├── auth/      # Auth domain (application + domain layers)
│   │   │   ├── users/     # User domain (application + domain + infrastructure)
│   │   │   ├── todos/     # Todo domain (application + domain + infrastructure)
│   │   │   ├── security/  # Cross-cutting concerns
│   │   │   ├── config/    # Configuration management
│   │   │   └── database/  # Database models and migrations
│   │   └── tests/
│   │       └── acceptance/
│   └── todo-ui/           # React + Vite frontend
│       ├── src/
│       │   ├── components/
│       │   └── lib/
│       └── tests/
│           └── acceptance/
└── libs/
    ├── api-contracts/     # Shared ts-rest contracts (no build step!)
    │   └── src/
    │       ├── auth-contract.ts
    │       ├── auth-schemas.ts
    │       ├── todo-contract.ts
    │       └── todo-schemas.ts
    └── infrastructure/    # Shared utilities (Clock, IdGenerator, etc.)
        └── src/
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
- See [Error Handling with neverthrow](#error-handling-with-neverthrow) for detailed patterns

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

**Example 1: Testing Utility Functions**

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

**Example 2: Testing Domain Services with In-Memory Stores**

Domain services can be tested quickly and thoroughly by using in-memory implementations of store interfaces:

```typescript
// apps/todo-api/src/todos/todo-service.test.ts
describe('TodoService', () => {
  it('should enforce business rules when creating todos', async () => {
    // Use in-memory store for fast, isolated tests
    const todoStore = new InMemoryTodoStore();
    const service = new TodoService(todoStore);

    const result = await service.createTodo({
      userId: 'user-123',
      title: '', // Invalid - violates business rule
      description: 'Test',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain('Title required');
  });

  it('should successfully create valid todos', async () => {
    const todoStore = new InMemoryTodoStore();
    const service = new TodoService(todoStore);

    const result = await service.createTodo({
      userId: 'user-123',
      title: 'Buy groceries',
      description: 'Milk, eggs, bread',
    });

    expect(result.isOk()).toBe(true);
    const todo = result._unsafeUnwrap();
    expect(todo.title).toBe('Buy groceries');
    expect(todo.userId).toBe('user-123');
    expect(todo.completed).toBe(false);
  });
});
```

**Benefits of In-Memory Stores for Unit Testing:**

- ✅ **Fast** - No database connection or I/O overhead
- ✅ **Isolated** - Each test gets a fresh, independent store
- ✅ **Deterministic** - No flakiness from database state or timing
- ✅ **Focused** - Tests only business logic, not infrastructure
- ✅ **Simple** - No setup/teardown of test databases

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
// apps/todo-api/src/todos/domain/todo-schemas.ts
export const TodoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;

// Domain command - used by TodoService
export const CreateTodoCommandSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoCommand = z.infer<typeof CreateTodoCommandSchema>;
```

**Benefits of Schema-First:**

- ✅ Single source of truth for data shape
- ✅ Automatic TypeScript type generation
- ✅ Runtime validation at boundaries
- ✅ Self-documenting contracts

#### 2. Domain Services Define Operations

Services encapsulate business logic and define the core operations:

```typescript
// apps/todo-api/src/todos/domain/todo-service.ts
export interface TodoService {
  createTodo(command: CreateTodoCommand): ResultAsync<Todo, CreateTodoError>;
  listTodos(userId: string): ResultAsync<Todo[], ListTodosError>;
  getTodoById(options: {
    todoId: string;
    userId: string;
  }): ResultAsync<Todo, GetTodoByIdError>;
  completeTodo(options: {
    todoId: string;
    userId: string;
  }): ResultAsync<Todo, CompleteTodoError>;
}

export function createTodoService(
  todoStore: TodoStore,
  idGenerator: IdGenerator,
  clock: Clock,
): TodoService {
  return {
    createTodo(command: CreateTodoCommand): ResultAsync<Todo, CreateTodoError> {
      const now = clock.now();
      const todo: Todo = {
        id: idGenerator.generate(),
        userId: command.userId,
        title: command.title,
        description: command.description,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      return ResultAsync.fromPromise(
        todoStore.save(todo),
        (error): CreateTodoError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error saving todo',
          cause: error,
        }),
      ).map(() => todo);
    },

    listTodos(userId: string): ResultAsync<Todo[], ListTodosError> {
      return ResultAsync.fromPromise(
        todoStore.findByUserId(userId),
        (error): ListTodosError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching todos',
          cause: error,
        }),
      );
    },
  };
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
// apps/todo-api/src/todos/application/todo-router.ts
const s = initServer();

export const createTodoRouter = (todoService: TodoService) => {
  return s.router(todoContract, {
    createTodo: async ({ body, req }) => {
      // req.auth is set by auth middleware
      const userId = req.auth!.user.id;

      const result = await todoService.createTodo({
        userId,
        title: body.title,
        description: body.description,
      });

      if (result.isErr()) {
        return {
          status: 500,
          body: { message: 'Internal server error', code: 'UNEXPECTED_ERROR' },
        };
      }

      return {
        status: 201,
        body: toTodoResponse(result.value),
      };
    },
  });
};
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
// apps/todo-api/src/todos/domain/todo-service.ts
export interface TodoStore {
  save(todo: Todo): Promise<void>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string): Promise<Todo[]>;
  update(todo: Todo): Promise<void>;
}
```

##### MySQL Implementation (Production)

```typescript
// apps/todo-api/src/todos/infrastructure/todo-store-sequelize.ts
export function createSequelizeTodoStore(sequelize: Sequelize): TodoStore {
  const TodoModel = defineTodoModel(sequelize);

  const toTodo = (model: Model): Todo => {
    const data = model.get({ plain: true }) as Todo & {
      description: string | null;
      completedAt: Date | null;
    };
    return {
      id: data.id,
      userId: data.userId,
      title: data.title,
      description: data.description ?? undefined,
      completed: data.completed,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      completedAt: data.completedAt ?? undefined,
    };
  };

  return {
    async save(todo: Todo): Promise<void> {
      await TodoModel.create({
        id: todo.id,
        userId: todo.userId,
        title: todo.title,
        description: todo.description,
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        completedAt: todo.completedAt,
      });
    },

    async findById(id: string): Promise<Todo | null> {
      const model = await TodoModel.findByPk(id);
      return model ? toTodo(model) : null;
    },

    // ... other methods
  };
}
```

##### In-Memory Implementation (Testing)

```typescript
// apps/todo-api/src/todos/domain/todo-store.ts
export function createInMemoryTodoStore(): TodoStore {
  const todos = new Map<string, Todo>();
  const userIdIndex = new Map<string, Set<string>>();

  return {
    async save(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);

      // Update user index
      if (!userIdIndex.has(todo.userId)) {
        userIdIndex.set(todo.userId, new Set());
      }
      userIdIndex.get(todo.userId)?.add(todo.id);
    },

    async findById(id: string): Promise<Todo | null> {
      return todos.get(id) ?? null;
    },

    async findByUserId(userId: string): Promise<Todo[]> {
      const todoIds = userIdIndex.get(userId);
      if (!todoIds) return [];

      const userTodos: Todo[] = [];
      for (const todoId of todoIds) {
        const todo = todos.get(todoId);
        if (todo) {
          userTodos.push(todo);
        }
      }
      return userTodos;
    },

    async update(todo: Todo): Promise<void> {
      todos.set(todo.id, todo);
    },
  };
}
```

##### Redis Implementation (Caching - Example)

```typescript
// Could easily add a Redis implementation with caching
export function createRedisTodoStore(
  redisClient: RedisClient,
  fallbackStore: TodoStore,
): TodoStore {
  return {
    async save(todo: Todo): Promise<void> {
      await fallbackStore.save(todo);
      // Cache the saved todo
      await redisClient.set(`todo:${todo.id}`, JSON.stringify(todo));
    },

    async findById(id: string): Promise<Todo | null> {
      // Try cache first
      const cached = await redisClient.get(`todo:${id}`);
      if (cached) return JSON.parse(cached);

      // Fall back to database
      const todo = await fallbackStore.findById(id);
      if (todo) {
        await redisClient.set(`todo:${id}`, JSON.stringify(todo));
      }
      return todo;
    },

    // ... implement other methods with caching strategies
  };
}
```

### Dependency Injection and Wiring

The application wires everything together at startup:

```typescript
// apps/todo-api/src/app.ts
export function createApp(config: AppConfig): Express {
  // Create Sequelize instance (connection pool)
  const sequelize = createSequelize(config.database);

  // Create stores and services
  const userStore = createSequelizeUserStore(sequelize);
  const userService = createUserService(
    userStore,
    createBcryptPasswordHasher(),
    createUuidIdGenerator(),
    createSystemClock(),
  );

  // Create todo dependencies
  const todoStore = createSequelizeTodoStore(sequelize);
  const todoIdGenerator = createUuidIdGenerator();
  const todoService = createTodoService(
    todoStore,
    todoIdGenerator,
    createSystemClock(),
  );

  const app = express();

  // Wire service to HTTP router
  const todoRouter = createTodoRouter(todoService);
  createExpressEndpoints(todoContract, todoRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth],
  });

  return app;
}
```

### Benefits of This Architecture

1. **Testability**: Domain logic tested in isolation with in-memory stores
2. **Flexibility**: Swap MySQL for PostgreSQL without changing domain code
3. **Consistency**: Business rules enforced regardless of entry point
4. **Maintainability**: Clear boundaries make code easy to understand
5. **Evolution**: Add new adapters (Redis cache, EventStore) without touching domain

## Adapter Contract Testing

### The Challenge: Ensuring Adapter Parity

In hexagonal architecture, the domain defines interfaces (ports) that can have multiple implementations (adapters). But how do we guarantee that all adapters behave identically?

**The Problem:**
- UserStore has 3 implementations: Sequelize (ORM), MySQL (raw SQL), in-memory (Map)
- TodoStore has 2 implementations: Sequelize, in-memory
- OrganizationStore has 2 implementations: Sequelize, in-memory
- MembershipStore has 2 implementations: Sequelize, in-memory

**Traditional approach problems:**
- ❌ Duplicate test suites for each adapter
- ❌ Subtle behavior differences slip through
- ❌ Adding new adapters requires rewriting tests
- ❌ Contract violations discovered at runtime

### The Solution: Shared Contract Test Suites

We use **shared contract test suites** that run against all implementations, ensuring every adapter behaves identically.

#### Pattern Overview

```typescript
// 1. Define the contract test suite ONCE
export function runUserStoreContractTests(options: {
  createStore: () => UserStore | Promise<UserStore>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}) {
  let userStore: UserStore;

  beforeEach(async () => {
    if (options.beforeEach) await options.beforeEach();
    userStore = await options.createStore();
  });

  describe('UserStore Contract', () => {
    it('should save a user with hashed password', async () => {
      const user = { id: 'uuid', email: 'test@example.com', ... };
      await userStore.save(user);
      const found = await userStore.findById(user.id);
      expect(found?.email).toBe('test@example.com');
    });

    it('should find by email case-insensitively', async () => {
      await userStore.save({ email: 'Test@Example.com', ... });
      const found = await userStore.findByEmail('test@example.com');
      expect(found).not.toBeNull();
    });

    // ... 18 more contract tests
  });
}
```

#### Running Against Multiple Adapters

Each adapter runs the same contract tests:

**Sequelize Adapter:**
```typescript
// apps/todo-api/src/users/infrastructure/user-store-sequelize.test.ts
describe('SequelizeUserStore', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize(/* TestContainer MySQL */);
  });

  runUserStoreContractTests({
    createStore: () => createSequelizeUserStore(sequelize),
    beforeEach: async () => {
      await sequelize.getQueryInterface().bulkDelete('users', {});
    },
  });
});
```

**MySQL Adapter:**
```typescript
// apps/todo-api/src/users/infrastructure/user-store-mysql.test.ts
describe('MySQLUserStore', () => {
  runUserStoreContractTests({
    createStore: () => createMySQLUserStore(config),
    beforeEach: async () => {
      const connection = await mysql.createConnection(config);
      await connection.execute('DELETE FROM users');
      await connection.end();
    },
  });
});
```

**In-Memory Adapter:**
```typescript
// apps/todo-api/src/users/infrastructure/user-store-in-mem.test.ts
describe('InMemoryUserStore', () => {
  runUserStoreContractTests({
    createStore: () => createInMemoryUserStore(),
    // No beforeEach needed - each test gets fresh store
  });
});
```

### Real-World Example: TodoStore Contract

The TodoStore interface demonstrates how we handle adapters with foreign key constraints:

```typescript
export function runTodoStoreContractTests(options: {
  createStore: () => TodoStore | Promise<TodoStore>;
  setupDependencies?: (data: {
    organizationId: string;
    userId: string;
  }) => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
}) {
  // Contract tests for save, findById, findByOrganizationId, update, delete
  // All 12 tests run against both Sequelize and in-memory implementations
}
```

**Key insight:** The `setupDependencies` hook allows database adapters to create required foreign key records (users, organizations), while in-memory adapters can skip this entirely.

### Test Results: Guaranteed Parity

Running all store contract tests:

```bash
$ npm run test:unit --workspace=todo-api -- store

✓ UserStore (3 adapters × 20 tests = 60 tests)
  ✓ InMemoryUserStore (20 tests) - 3ms
  ✓ MySQLUserStore (20 tests) - 111ms
  ✓ SequelizeUserStore (20 tests) - 118ms

✓ TodoStore (2 adapters × 12 tests = 24 tests)
  ✓ InMemoryTodoStore (12 tests) - 3ms
  ✓ SequelizeTodoStore (12 tests) - 183ms

✓ OrganizationStore (2 adapters × 9 tests = 18 tests)
  ✓ InMemoryOrganizationStore (9 tests) - 2ms
  ✓ SequelizeOrganizationStore (9 tests) - 91ms

✓ MembershipStore (2 adapters × 13 tests = 26 tests)
  ✓ InMemoryMembershipStore (13 tests) - 3ms
  ✓ SequelizeMembershipStore (13 tests) - 221ms

Total: 133 tests passed ✅
```

**What this proves:**
- ✅ All adapters implement the contract identically
- ✅ In-memory stores are drop-in replacements for databases in tests
- ✅ Business logic tested against in-memory (3ms) gets same behavior as production database (200ms)
- ✅ Adding a new adapter (PostgreSQL, Redis) requires zero new test code

### Benefits Realized

1. **Single Source of Truth**
   - Contract defined once, tested everywhere
   - Adding tests improves all adapters simultaneously

2. **Guaranteed Behavioral Parity**
   - All adapters pass identical tests
   - Catches subtle differences (case sensitivity, null handling, etc.)

3. **Fast Feedback Loop**
   - In-memory tests run in milliseconds
   - Full confidence they match database behavior

4. **Trivial to Add Adapters**
   - Import contract, run tests, done
   - No need to rewrite test suite

5. **Refactor Fearlessly**
   - Change adapter implementation
   - Contract tests ensure nothing broke

6. **Self-Documenting Contracts**
   - Tests serve as executable specification
   - New team members see exactly what the port requires

### Implementation Pattern

Every store in the project follows this pattern:

```
apps/todo-api/src/{domain}/infrastructure/
├── {domain}-store-contract-tests.ts    # Shared contract suite
├── {domain}-store-sequelize.test.ts    # Runs contract against Sequelize
├── {domain}-store-mysql.test.ts        # Runs contract against MySQL (if exists)
├── {domain}-store-in-mem.test.ts       # Runs contract against in-memory
├── {domain}-store-sequelize.ts         # Sequelize implementation
├── {domain}-store-mysql.ts             # MySQL implementation (if exists)
└── {domain}-store-in-mem.ts            # In-memory implementation
```

**Location**: See examples in:
- `apps/todo-api/src/users/infrastructure/user-store-contract-tests.ts`
- `apps/todo-api/src/todos/infrastructure/todo-store-contract-tests.ts`
- `apps/todo-api/src/organizations/infrastructure/organization-store-contract-tests.ts`
- `apps/todo-api/src/organizations/infrastructure/membership-store-contract-tests.ts`

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

## Multi-Tenant Authorization

### Why Multi-Tenancy?

The application implements a multi-tenant architecture where multiple users can collaborate within organizations:

- **Organizations as collaboration spaces** - Todos belong to organizations, not individual users
- **Flexible membership** - Users can belong to multiple organizations with different roles
- **Granular permissions** - Fine-grained control over what users can do within each organization
- **Separation of concerns** - Authorization logic stays separate from business logic

### Permission-Based Authorization Model

Rather than role hierarchies, the system uses **permission-based authorization** with roles as bundles of permissions:

```typescript
// Granular, atomic permissions
export const PermissionSchema = z.enum([
  'todos:create',
  'todos:read',
  'todos:update',
  'todos:delete',
  'todos:complete',
  'org:members:read',
  'org:members:invite',
  'org:members:remove',
  'org:settings:update',
]);

// Roles are static permission bundles
export const RoleDefinitions = {
  owner: [
    'todos:create',
    'todos:read',
    'todos:update',
    'todos:delete',
    'todos:complete',
    'org:members:read',
    'org:members:invite',
    'org:members:remove',
    'org:settings:update',
  ],
  admin: [
    'todos:create',
    'todos:read',
    'todos:update',
    'todos:delete',
    'todos:complete',
    'org:members:read',
    'org:members:invite',
  ],
  member: [
    'todos:create',
    'todos:read',
    'todos:update',
    'todos:complete',
    'org:members:read',
  ],
  viewer: ['todos:read', 'org:members:read'],
} as const;
```

**Benefits of permission-based approach:**

- ✅ **Flexible** - Easy to add new permissions or customize role bundles
- ✅ **Explicit** - Clear what each role can do
- ✅ **Maintainable** - No complex role hierarchies to reason about
- ✅ **Testable** - Permission checks are pure functions

### Middleware-Based Authorization

Authorization is implemented as middleware at the application layer, keeping domain services pure:

```typescript
// Request Flow:
//
// HTTP Request
//   ↓
// requireAuth (global)
//   → Verifies JWT, attaches req.auth.user
//   ↓
// requireOrgMembership (global for org routes)
//   → Fetches membership, resolves permissions
//   → Attaches req.auth.orgContext
//   ↓
// requirePermissions('todos:create') (per-endpoint)
//   → Checks specific permission(s)
//   → Fails fast if missing
//   ↓
// Handler
//   → Fetch resource (if needed)
//   → Resource-specific authorization (if needed)
//   → Call domain service
//   → Map Result to HTTP response
```

**Example: Declarative permission checks**

```typescript
// Simple case: Check permission via middleware
createTodo: {
  middleware: [requirePermissions('todos:create')],
  handler: async ({ body, req }) => {
    const { user, orgContext } = extractAuthAndOrgContext(req).value;

    const result = await todoService.createTodo({
      organizationId: orgContext.organizationId,
      createdBy: user.id,
      title: body.title,
      description: body.description,
    });

    return result.match(
      (todo) => ({ status: 201, body: toTodoResponse(todo) }),
      (error) => ({ status: 500, body: { message: error.message } })
    );
  },
}
```

**Example: Resource-specific authorization**

```typescript
// Complex case: Creator OR permission
completeTodo: {
  handler: async ({ params, req }) => {
    const { orgContext } = extractAuthAndOrgContext(req).value;

    // Fetch resource first
    const todoResult = await todoService.getTodoById(params.id);
    if (todoResult.isErr()) {
      return { status: 404, body: { message: 'Not found' } };
    }

    const todo = todoResult.value;

    // Resource-specific check: creator OR has permission
    const authResult = requireCreatorOrPermission('todos:complete')(
      orgContext,
      { createdBy: todo.createdBy }
    );

    if (authResult.isErr()) {
      return { status: 403, body: { message: 'Forbidden' } };
    }

    // Now execute business logic
    const result = await todoService.completeTodo(params.id);
    return result.match(/* ... */);
  },
}
```

### Type-Safe Context Extraction

Authorization context is extracted using helper functions that return `Result` types, eliminating manual type assertions:

```typescript
// No more req.auth! assertions
const contextResult = extractAuthAndOrgContext(req);

if (contextResult.isErr()) {
  return { status: 401, body: { message: 'Unauthorized' } };
}

// Type-safe access to user and org context
const { user, orgContext } = contextResult.value;
//      ^-- User type
//             ^-- OrgContext type with resolved permissions
```

### Pure Authorization Policies

Authorization logic is implemented as composable, testable pure functions:

```typescript
// Policy: Check single permission
export const requirePermission = (permission: Permission): Policy => {
  return (orgContext) => {
    if (orgContext.permissions.includes(permission)) {
      return ok(undefined);
    }
    return err({
      code: 'MISSING_PERMISSION',
      required: permission,
      available: orgContext.permissions,
    });
  };
};

// Policy: Creator OR permission
export const requireCreatorOrPermission = (permission: Permission): Policy => {
  return (orgContext, resourceContext) => {
    // User created the resource?
    if (resourceContext?.createdBy === orgContext.membership.userId) {
      return ok(undefined);
    }
    // Otherwise check permission
    return requirePermission(permission)(orgContext, resourceContext);
  };
};
```

**Testing is straightforward:**

```typescript
it('should allow creator without permission', () => {
  const policy = requireCreatorOrPermission('todos:complete');

  const result = policy(
    {
      organizationId: 'org-1',
      membership: { userId: 'user-1', role: 'member' },
      permissions: ['todos:read'], // No complete permission
    },
    { createdBy: 'user-1' }, // But user is creator
  );

  expect(result.isOk()).toBe(true);
});
```

### Maintaining Architectural Principles

The authorization system maintains all core architectural principles:

1. **Domain stays pure** - No authorization logic in domain services
2. **Schema-first** - All types derived from Zod schemas
3. **Explicit boundaries** - Authorization at application layer, not domain
4. **Testability** - Pure policies, in-memory stores for unit tests
5. **Type safety** - Full type inference, no manual assertions
6. **Separation of concerns** - Authorization is a cross-cutting concern

**Example: Domain service remains pure**

```typescript
// Domain service has NO authorization logic
export function createTodoService(
  todoStore: TodoStore,
  idGenerator: IdGenerator,
  clock: Clock,
): TodoService {
  return {
    createTodo(command: CreateTodoCommand): ResultAsync<Todo, CreateTodoError> {
      // Pure business logic only
      const todo: Todo = {
        id: idGenerator.generate(),
        organizationId: command.organizationId,
        createdBy: command.createdBy,
        title: command.title,
        description: command.description,
        completed: false,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      };

      return ResultAsync.fromPromise(
        todoStore.save(todo),
        (error): CreateTodoError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error saving todo',
          cause: error,
        }),
      ).map(() => todo);
    },
  };
}
```

### Benefits Realized

- ✅ **Secure by design** - Authorization enforced at entry points, cannot be bypassed
- ✅ **Flexible permissions** - Easy to add new permissions or customize roles
- ✅ **Type-safe** - Compile-time verification of authorization code
- ✅ **Testable** - Pure policies, behavior-focused acceptance tests
- ✅ **Maintainable** - Clear separation between authorization and business logic
- ✅ **Scalable** - Multi-tenant model supports team collaboration

**Location**: Implementation details in `apps/todo-api/src/auth/` and design documentation in `docs/AUTHORIZATION_DESIGN.md`

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

---

**Note:** For detailed information on error handling patterns, see [Error Handling with neverthrow](#error-handling-with-neverthrow). For testing strategies, see [Testing](#testing).
