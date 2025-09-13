
# TypeScript Dependency Injection: Factory Functions vs Containers

## Executive Summary

**Use simple factory functions with parameter injection for TypeScript applications - always.** They provide better type safety, easier debugging, and clearer code flow. DI containers in TypeScript are a misguided import from C#/Java that trade compile-time safety for perceived convenience that rarely materializes. Even in complex applications with 50+ services, explicit wiring with factory functions remains superior.

## The Core Trade-off

TypeScript's type information doesn't exist at runtime. DI containers need runtime type information to work their magic. This fundamental mismatch means containers in TypeScript will always involve compromises that don't exist in languages like C# or Java.

## Simple Factory Functions

### When to Use
- **Always** - This is not just the default choice, it's the right choice
- All Node.js/Express applications regardless of size
- When type safety matters (it always should)
- When debugging production issues
- When you want your architecture to be explicit and traceable

### Pros
- **Type safety preserved** - All dependencies checked at compile time
- **Explicit and traceable** - Follow function calls to understand object creation
- **Simple debugging** - No magic, no proxies, no decorators
- **Refactoring safety** - IDE can track and update all usages
- **Easy testing** - Just pass different implementations as parameters
- **No learning curve** - Just functions and parameters

### Cons (Often Overstated)
- **Manual wiring seems repetitive** - But it's explicit documentation of your architecture
- **No automatic lifecycle management** - Easy to implement with patterns like `once()`
- **Circular dependencies require refactoring** - This is good! Circular dependencies are design flaws

### Example Implementation

```typescript
// ============= Clean Factory Function Approach =============
// app.ts - Full type safety with factory functions

import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Interfaces define contracts
interface Database {
  query<T>(sql: string, params: any[]): Promise<T[]>;
  transaction<T>(fn: (client: Database) => Promise<T>): Promise<T>;
}

interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Omit<User, 'id'>): Promise<User>;
}

// Factory functions with explicit dependencies
function createDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });
  
  return {
    async query<T>(sql: string, params: any[]): Promise<T[]> {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    async transaction<T>(fn: (client: Database) => Promise<T>): Promise<T> {
      // Implementation...
    }
  };
}

function createCacheService(redisUrl: string): CacheService {
  const redis = new Redis(redisUrl);
  
  return {
    async get<T>(key: string): Promise<T | null> {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    },
    async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    },
    async invalidate(pattern: string): Promise<void> {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    }
  };
}

function createUserRepository(db: Database, cache: CacheService): UserRepository {
  return {
    async findById(id: string): Promise<User | null> {
      const cached = await cache.get<User>(`user:${id}`);
      if (cached) return cached;
      
      const users = await db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      const user = users[0] || null;
      if (user) {
        await cache.set(`user:${id}`, user, 300);
      }
      return user;
    },
    // ... other methods
  };
}

// Bootstrap with compile-time checking
async function bootstrap() {
  // Wire dependencies - order matters and TypeScript enforces it
  const db = createDatabase(process.env.DATABASE_URL!);
  const cache = createCacheService(process.env.REDIS_URL!);
  const userRepo = createUserRepository(db, cache);
  
  // These would all fail at COMPILE time:
  // ❌ const userRepo = createUserRepository(cache, db); // Wrong order
  // ❌ const userRepo = createUserRepository(db); // Missing parameter
  // ❌ const userRepo = createUserRepository(db, db); // Wrong type
  
  const app = express();
  // ... setup routes with access to typed services
}

// Testing is trivial
const mockCache: CacheService = {
  async get() { return null; },
  async set() { },
  async invalidate() { }
};
const testRepo = createUserRepository(realDb, mockCache);
```

## DI Containers (e.g., Awilix)

### When to Use
**Never.** This isn't hyperbole - there is no TypeScript application where a DI container provides genuine value over factory functions. The perceived benefits don't materialize in practice, while the costs are real and significant.

### Why People Think They Need Them
- Coming from C#/Java where they make sense
- Mistaking "explicit" for "boilerplate"
- Not realizing factory functions can handle lifecycle management
- Believing complex applications need "magic" to manage dependencies
- Following outdated advice from before TypeScript matured

### Pros
- Less boilerplate for complex dependency graphs
- Automatic lifecycle management (singleton/transient/scoped)
- Can handle circular dependencies
- Convention-based wiring reduces configuration

### Cons (Why You Shouldn't Use Them)
- **Runtime failures** - Wiring errors only caught when resolving
- **Lost type safety** - String-based resolution, no compile-time checks
- **Poor IDE support** - Can't navigate to definitions, no refactoring support
- **Debugging difficulty** - Stack traces through proxy/container internals
- **Testing complexity** - Must configure container for tests
- **Hidden dependencies** - Not obvious what a service needs
- **Learning curve** - Team must understand container conventions
- **Obscured architecture** - Dependencies hidden in configuration
- **False economy** - Often more total code after registration boilerplate
- **Against ecosystem grain** - TypeScript/JS evolved without them for good reasons
- **Performance overhead** - Proxy objects and reflection have runtime cost
- **Version conflicts** - Another dependency that can break

### Container Implementation (Problems Highlighted)

```typescript
// ============= Awilix Container Approach =============
// app-with-container.ts - Runtime failures and lost type safety

import { createContainer, asClass, asFunction, InjectionMode } from 'awilix';

// Classes needed for Awilix (prefers classes over functions)
class PostgresDatabase implements Database {
  constructor({ connectionString }: { connectionString: string }) {
    // PROBLEM: Constructor params aren't type-checked against registration
  }
  // ... methods
}

class UserRepository {
  constructor(
    private database: Database,      // PROBLEM: Must match registered name
    private cacheService: CacheService  // Fragile string-based matching
  ) {}
  // ... methods
}

class UserService {
  constructor(
    private userRepository: UserRepository,  // If param name doesn't match: runtime error
    private authService: AuthService,
    private emailService: EmailService
  ) {}
  // ... methods
}

// Container setup
async function bootstrap() {
  const container = createContainer({
    injectionMode: InjectionMode.PROXY  // Magic proxy-based wiring
  });
  
  container.register({
    database: asClass(PostgresDatabase).singleton(),
    cacheService: asClass(RedisCache).singleton(),
    // PROBLEM: Forgot to register emailService - TypeScript won't catch this!
    userRepository: asClass(UserRepository).singleton(),
    userService: asClass(UserService).singleton(),
  });
  
  const app = express();
  
  app.post('/api/users', async (req, res) => {
    try {
      // COMPILES but RUNTIME ERROR: Cannot resolve 'emailService'
      const userService = container.resolve('userService');
      // Error happens here, deep in the call stack
      await userService.createUser(...);
    } catch (error) {
      // Cryptic error: "Cannot read property 'sendWelcome' of undefined"
    }
  });
  
  // PROBLEM: Type safety lost during resolution
  const something = container.resolve('userService'); // Type: any/unknown
  const wrong = container.resolve<AuthService>('userService'); // TypeScript allows this!
}
```

## Specific Problems with Containers in TypeScript

### 1. Runtime Wiring Failures
```typescript
// Compiles fine, fails at runtime
container.register({
  userService: asClass(UserService).singleton(),
  // Forgot authService - only discovered when resolved
});
```

### 2. String-Based Resolution
```typescript
// No compile-time checking of these strings
const service = container.resolve('userSrevice'); // Typo = runtime error
```

### 3. Parameter Name Coupling
```typescript
class Service {
  // Change 'cache' to 'cacheService' = runtime error
  constructor(private cache: CacheService) {}
}
```

### 4. Lost IDE Support
- Can't Cmd+Click on `'userService'` to go to definition
- Refactoring tools don't understand string-based wiring
- No autocomplete for container.resolve()

### 5. Decorator Metadata Issues
```typescript
@injectable()
class UserService {
  // Only works with classes, not interfaces
  // Requires experimental TypeScript features
  constructor(@inject("IUserRepo") repo: IUserRepository) {}
}
```

### 6. Complex Error Messages
```
AwilixResolutionError: Could not resolve 'emailService'.

Resolution path: userService -> emailService

Visit the documentation for more information: ...
```
vs. TypeScript's clear:
```
Argument of type 'Database' is not assignable to parameter of type 'CacheService'
```

## Decision Framework

### Use Factory Functions When:
- Building any TypeScript application (which is always)

### Why Complex Applications Need Factories Even More:
The argument that complex applications benefit from DI containers is backwards. As complexity increases, you need:

1. **More clarity, not less** - Explicit wiring becomes more valuable when debugging 50+ services
2. **Visible architecture** - The dependency graph IS your architecture documentation
3. **Compile-time safety** - Runtime failures become more costly as systems grow
4. **Traceable initialization** - Understanding startup order is critical in complex systems

Consider: In a system with 50+ services, would you rather debug:
- An explicit function call you can step through, or
- "AwilixResolutionError: Could not resolve 'emailService'" with a stack trace through proxy internals?

The answer is obvious. The more complex your system, the more you need explicitness, not magic.

## Achieving "Container Benefits" with Factory Functions

People claim DI containers provide unique benefits. Here's how to achieve the same results with factory functions, but with type safety:

### Lifecycle Management

```typescript
// Singleton pattern with lazy initialization
function once<T>(factory: () => T): () => T {
  let instance: T;
  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

// Request-scoped services
function createRequestScope(baseServices: BaseServices) {
  return (req: Request) => ({
    ...baseServices,
    requestId: generateId(),
    user: extractUser(req),
    logger: baseServices.logger.child({ requestId })
  });
}

// Usage
const createDb = once(() => new Database(config.dbUrl));
const createCache = once(() => new RedisCache(config.redisUrl));

// Application bootstrap
function bootstrap() {
  const db = createDb();  // Created once
  const cache = createCache();  // Created once
  
  // Request handler
  app.use((req, res, next) => {
    req.scope = createRequestScope({ db, cache })(req);
    next();
  });
}
```

### Auto-wiring and Service Discovery

```typescript
// Service registry pattern - still type-safe!
interface ServiceRegistry {
  db: Database;
  cache: CacheService;
  userRepo: UserRepository;
  authService: AuthService;
  userService: UserService;
}

function createServices(config: Config): ServiceRegistry {
  // Level 0: Infrastructure
  const db = createDatabase(config.db);
  const cache = createCache(config.redis);
  
  // Level 1: Repositories  
  const userRepo = createUserRepository(db, cache);
  
  // Level 2: Services
  const authService = createAuthService(config.jwtSecret);
  const userService = createUserService(userRepo, authService);
  
  return { db, cache, userRepo, authService, userService };
}

// Now you have a typed registry without any magic
const services = createServices(config);
services.userService.createUser(...);  // Full type safety
```

### Plugin Systems

```typescript
// Plugin interface
interface Plugin {
  name: string;
  initialize(deps: CoreDependencies): PluginServices;
}

// Core services that plugins can use
interface CoreDependencies {
  db: Database;
  cache: CacheService;
  logger: Logger;
}

// Plugin loader with factory functions
function loadPlugins(plugins: Plugin[], core: CoreDependencies) {
  const pluginServices = new Map<string, PluginServices>();
  
  for (const plugin of plugins) {
    const services = plugin.initialize(core);
    pluginServices.set(plugin.name, services);
  }
  
  return pluginServices;
}

// A plugin implementation
const analyticsPlugin: Plugin = {
  name: 'analytics',
  initialize({ db, logger }) {
    return {
      trackEvent: async (event: Event) => {
        await db.query('INSERT INTO events...', [event]);
        logger.info('Event tracked', event);
      }
    };
  }
};
```

### Configuration Swapping for Different Environments

```typescript
// Environment-specific factories
type EnvironmentFactories = {
  createDatabase: () => Database;
  createCache: () => CacheService;
  createEmailService: () => EmailService;
};

function getEnvironmentFactories(env: string): EnvironmentFactories {
  switch (env) {
    case 'test':
      return {
        createDatabase: () => createInMemoryDatabase(),
        createCache: () => createMockCache(),
        createEmailService: () => createMockEmailService()
      };
    case 'development':
      return {
        createDatabase: () => createDatabase('postgresql://localhost/dev'),
        createCache: () => createRedisCache('localhost:6379'),
        createEmailService: () => createConsoleEmailService()
      };
    case 'production':
      return {
        createDatabase: () => createDatabase(process.env.DATABASE_URL!),
        createCache: () => createRedisCache(process.env.REDIS_URL!),
        createEmailService: () => createSendGridService(process.env.SENDGRID_KEY!)
      };
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}

// Bootstrap with environment-specific services
function bootstrap(env: string) {
  const factories = getEnvironmentFactories(env);
  const db = factories.createDatabase();
  const cache = factories.createCache();
  const email = factories.createEmailService();
  
  return createAllServices(db, cache, email);
}
```

### Handling Complex Initialization Order

```typescript
// Async initialization with proper ordering
async function bootstrapAsync() {
  // Parallel initialization where possible
  const [db, cache] = await Promise.all([
    createDatabaseAsync(config.db),
    createCacheAsync(config.redis)
  ]);
  
  // Wait for DB before creating repos
  await db.runMigrations();
  
  const repos = {
    users: createUserRepo(db, cache),
    orders: createOrderRepo(db, cache),
    products: createProductRepo(db, cache)
  };
  
  // Services can be created in parallel
  const [userService, orderService, notificationService] = await Promise.all([
    createUserServiceAsync(repos.users, cache),
    createOrderServiceAsync(repos.orders, repos.products),
    createNotificationServiceAsync(config.notifications)
  ]);
  
  return { db, cache, repos, userService, orderService, notificationService };
}
```

### Partial Application for Dependency Injection

```typescript
// Partial application pattern for cleaner wiring
function createServiceFactories(db: Database, cache: CacheService) {
  return {
    userRepo: () => createUserRepository(db, cache),
    orderRepo: () => createOrderRepository(db, cache),
    productRepo: () => createProductRepository(db, cache),
    
    // Higher-level services can reference lower-level factories
    userService: (authService: AuthService) => 
      createUserService(createUserRepository(db, cache), authService),
  };
}

// Usage
const factories = createServiceFactories(db, cache);
const userRepo = factories.userRepo();
const userService = factories.userService(authService);
```

### Circular Dependencies (That You Should Fix)

```typescript
// If you MUST handle circular dependencies (you shouldn't)
// Use lazy initialization
function createServiceA(getServiceB: () => ServiceB): ServiceA {
  return {
    doSomething() {
      // ServiceB is only accessed when needed
      const serviceB = getServiceB();
      return serviceB.getValue() + 1;
    }
  };
}

function createServiceB(getServiceA: () => ServiceA): ServiceB {
  return {
    getValue() {
      return 42;
    },
    process() {
      const serviceA = getServiceA();
      return serviceA.doSomething();
    }
  };
}

// Wire them up
let serviceA: ServiceA;
let serviceB: ServiceB;
serviceB = createServiceB(() => serviceA);
serviceA = createServiceA(() => serviceB);

// But really, just refactor to remove the circular dependency!
```

### Validating All Services at Startup

```typescript
// Ensure everything initializes correctly
function validateServices(services: ServiceRegistry): void {
  const required = [
    { name: 'database', check: () => services.db.query('SELECT 1', []) },
    { name: 'cache', check: () => services.cache.get('health-check') },
    { name: 'auth', check: () => services.authService.generateToken('test') }
  ];
  
  for (const { name, check } of required) {
    try {
      check();
      console.log(`✅ ${name} initialized successfully`);
    } catch (error) {
      throw new Error(`Failed to initialize ${name}: ${error.message}`);
    }
  }
}

// Bootstrap with validation
async function bootstrap() {
  const services = createServices(config);
  await validateServices(services);
  return services;
}
```

All of these patterns provide the same capabilities as DI containers but with:
- Full type safety at compile time
- Clear, debuggable code paths
- No magic or hidden behavior
- Better IDE support
- No external dependencies

## Best Practices

### For Factory Functions:
1. **Organize factories near their interfaces** - Keep related code together
2. **Create a single bootstrap function** - Wire everything in one place
3. **Use factory composition** - Smaller factories that compose into larger ones
4. **Make dependencies explicit** - No global singletons or service locators
5. **Consider a service registry object** - Return all services from bootstrap
6. **Use `once()` for singletons** - Lazy initialization when needed
7. **Create environment-specific factories** - Clean separation of concerns

```typescript
function bootstrap() {
  const db = createDatabase(config.db);
  const cache = createCache(config.redis);
  const repos = createRepositories(db, cache);
  const services = createServices(repos);
  
  return { db, cache, ...repos, ...services }; // Everything in one place
}
```

### If Someone Insists on a Container:
1. **Challenge the requirement** - Ask specifically what problem it solves that factories don't
2. **Show them this document** - Especially the runtime failure examples
3. **Demonstrate the alternative** - Write the same functionality with factories
4. **Count the actual lines saved** - It's usually negative after all the registration code
5. **Consider their background** - They're probably coming from C#/Java and don't realize TypeScript is different

## Testing Strategies

### Factory Functions - Simple Mocking
```typescript
// Just pass mock implementations
const mockEmail: EmailService = {
  async sendWelcome() { },
  async sendPasswordReset() { }
};

const service = createUserService(mockRepo, mockAuth, mockEmail);
// Test with full type safety
```

### Containers - Complex Setup
```typescript
// Must configure entire container
const testContainer = createContainer();
testContainer.register({
  database: asFunction(() => mockDb),
  cacheService: asFunction(() => mockCache),
  emailService: asFunction(() => mockEmail),
  // Must register everything, even unused dependencies
});

const service = testContainer.resolve<UserService>('userService');
// Hope you registered everything correctly
```

## Conclusion

The JavaScript/TypeScript ecosystem evolved without DI containers, and this was the right evolution. Factory functions aren't a compromise or a "simpler alternative" - they're the superior approach for dependency injection in TypeScript.

DI containers in TypeScript are cargo-culting from C#/Java, languages with actual runtime type information. In TypeScript, they transform compile-time errors into runtime errors, hide architectural decisions behind "magic," and make debugging harder - all for perceived benefits that can be achieved more simply with functions.

**Use factory functions. Full stop.** Your code will be more maintainable, your errors will be caught earlier, and your team will thank you when they're debugging production issues and can actually trace through the code.

The fact that major TypeScript applications (VS Code, TypeScript compiler itself, most popular npm packages) don't use DI containers isn't an oversight - it's wisdom.

## Appendix: Cross-Cutting Concerns with Higher-Order Functions

One common argument for DI containers is handling cross-cutting concerns like caching, logging, and authorization through decorators. Here's how TypeScript's higher-order functions provide a superior solution.

### The C# Container Approach (For Reference)

```csharp
// In C#, you typically use decorator classes
public class CachedUserService : IUserService 
{
    private readonly IUserService _inner;
    private readonly IMemoryCache _cache;
    
    public CachedUserService(IUserService inner, IMemoryCache cache) 
    {
        _inner = inner;
        _cache = cache;
    }
    
    public async Task<User> GetUserAsync(string id) 
    {
        return await _cache.GetOrCreateAsync($"user_{id}", 
            async entry => {
                entry.SlidingExpiration = TimeSpan.FromMinutes(5);
                return await _inner.GetUserAsync(id);
            });
    }
}

// Registration with decoration
services.AddScoped<UserService>();
services.Decorate<IUserService, CachedUserService>();
services.Decorate<IUserService, LoggedUserService>();  
services.Decorate<IUserService, AuthorizedUserService>();
```

### The TypeScript Higher-Order Function Approach

```typescript
// Define the service interface
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(dto: CreateUserDto): Promise<User>;
  searchUsers(query: string): Promise<User[]>;
}

// Core implementation factory
function createUserService(repo: UserRepository): UserService {
  return {
    async getUser(id: string) {
      return repo.findById(id);
    },
    async createUser(dto: CreateUserDto) {
      return repo.create(dto);
    },
    async searchUsers(query: string) {
      return repo.search(query);
    }
  };
}

// Caching wrapper - a higher-order function
function withCaching<T extends UserService>(
  createService: () => T,
  cache: CacheService
): T {
  const inner = createService();
  
  return {
    ...inner,  // Preserve any extra methods
    
    async getUser(id: string) {
      const cacheKey = `user_${id}`;
      const cached = await cache.get<User>(cacheKey);
      if (cached) return cached;
      
      const user = await inner.getUser(id);
      await cache.set(cacheKey, user, 300); // 5 min TTL
      return user;
    },
    
    async createUser(dto: CreateUserDto) {
      const user = await inner.createUser(dto);
      await cache.invalidate('users_search_*');
      return user;
    },
    
    async searchUsers(query: string) {
      const cacheKey = `users_search_${query}`;
      const cached = await cache.get<User[]>(cacheKey);
      if (cached) return cached;
      
      const users = await inner.searchUsers(query);
      await cache.set(cacheKey, users, 60); // 1 min TTL
      return users;
    }
  };
}

// Logging wrapper
function withLogging<T extends UserService>(
  createService: () => T,
  logger: Logger
): T {
  const inner = createService();
  
  return {
    ...inner,
    
    async getUser(id: string) {
      logger.info('Getting user', { userId: id });
      try {
        const user = await inner.getUser(id);
        logger.info('Retrieved user', { userId: id });
        return user;
      } catch (error) {
        logger.error('Failed to get user', { userId: id, error });
        throw error;
      }
    },
    
    async createUser(dto: CreateUserDto) {
      logger.info('Creating user', { email: dto.email });
      try {
        const user = await inner.createUser(dto);
        logger.info('Created user', { userId: user.id });
        return user;
      } catch (error) {
        logger.error('Failed to create user', { email: dto.email, error });
        throw error;
      }
    },
    
    async searchUsers(query: string) {
      logger.info('Searching users', { query });
      const users = await inner.searchUsers(query);
      logger.info('Found users', { count: users.length });
      return users;
    }
  };
}

// Authorization wrapper
function withAuthorization<T extends UserService>(
  createService: () => T,
  auth: AuthService
): T {
  const inner = createService();
  
  return {
    ...inner,
    
    async getUser(id: string) {
      const user = auth.getCurrentUser();
      if (!auth.canReadUser(user, id)) {
        throw new UnauthorizedError('Cannot read user');
      }
      return inner.getUser(id);
    },
    
    async createUser(dto: CreateUserDto) {
      const user = auth.getCurrentUser();
      if (!auth.canCreateUser(user)) {
        throw new UnauthorizedError('Cannot create user');
      }
      return inner.createUser(dto);
    },
    
    async searchUsers(query: string) {
      const user = auth.getCurrentUser();
      if (!auth.canSearchUsers(user)) {
        throw new UnauthorizedError('Cannot search users');
      }
      return inner.searchUsers(query);
    }
  };
}

// Generic wrapper that works for ANY service!
function withRetry<T>(
  createService: () => T,
  maxAttempts = 3,
  backoffMs = 100
): T {
  const inner = createService();
  
  return new Proxy(inner, {
    get(target, prop) {
      const original = target[prop as keyof T];
      if (typeof original !== 'function') return original;
      
      return async (...args: any[]) => {
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            return await original.apply(target, args);
          } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, backoffMs * attempt));
            }
          }
        }
        throw lastError;
      };
    }
  });
}

// Compose everything with full type safety
function createFullUserService(
  repo: UserRepository,
  cache: CacheService,
  logger: Logger,
  auth: AuthService
): UserService {
  // Explicit composition - you can see the order!
  return withAuthorization(
    () => withLogging(
      () => withCaching(
        () => createUserService(repo),
        cache
      ),
      logger
    ),
    auth
  );
}

// Or use a compose utility for cleaner syntax
function compose<T>(...wrappers: Array<(next: () => T) => T>) {
  return (base: () => T): T => {
    return wrappers.reduceRight(
      (next, wrapper) => () => wrapper(next),
      base
    )();
  };
}

function createFullUserServiceClean(
  repo: UserRepository,
  cache: CacheService,
  logger: Logger,
  auth: AuthService
): UserService {
  const enhance = compose(
    next => withAuthorization(next, auth),
    next => withLogging(next, logger),
    next => withCaching(next, cache),
    next => withRetry(next)
  );
  
  return enhance(() => createUserService(repo));
}

// Testing individual layers is trivial
describe('UserService', () => {
  it('caches user lookups', async () => {
    const mockRepo = createMockRepo();
    const cache = createMemoryCache();
    
    // Test JUST the caching layer
    const service = withCaching(
      () => createUserService(mockRepo),
      cache
    );
    
    await service.getUser('123');
    await service.getUser('123'); // Should hit cache
    
    expect(mockRepo.findById).toHaveBeenCalledTimes(1);
  });
  
  it('logs operations', async () => {
    const mockRepo = createMockRepo();
    const logger = createMockLogger();
    
    // Test JUST the logging layer
    const service = withLogging(
      () => createUserService(mockRepo),
      logger
    );
    
    await service.getUser('123');
    
    expect(logger.info).toHaveBeenCalledWith('Getting user', { userId: '123' });
  });
  
  it('enforces authorization', async () => {
    const mockRepo = createMockRepo();
    const auth = createMockAuth({ canReadUser: () => false });
    
    // Test JUST the auth layer
    const service = withAuthorization(
      () => createUserService(mockRepo),
      auth
    );
    
    await expect(service.getUser('123')).rejects.toThrow('Cannot read user');
  });
});
```

### Why This Is Superior to DI Containers

1. **Type Safety Preserved** - Each wrapper maintains full type information. No string-based resolution or lost types.

2. **Explicit Composition** - You can see exactly how services are decorated and in what order. No hidden magic.

3. **Testability** - Test each wrapper in complete isolation without configuring an entire container.

4. **Reusability** - Generic wrappers like `withRetry` work for ANY service, not just ones that implement specific interfaces.

5. **Debugging** - Stack traces show your actual functions, not container internals. You can step through each wrapper.

6. **No Registration Required** - The decoration happens in plain code. No need to register decorators with a container.

This pattern gives you all the power of aspect-oriented programming and decorator patterns, but with better type safety, clearer code, and easier debugging than any DI container can provide.
