# MySQL Database Schema Migration Plan
## Autoincrement Integer PKs with UUID Public Identifiers

**Created:** 2025-11-07
**Status:** Planning Phase
**Objective:** Update database schema to use autoincrement integer primary keys for internal operations while maintaining UUIDs as unique public identifiers

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Implementation Phases](#implementation-phases)
6. [Rollback Plan](#rollback-plan)
7. [Testing Strategy](#testing-strategy)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Current State
The application currently uses **UUIDs as primary keys** for both `users` and `todos` tables. While this approach provides good security and distribution properties, it has performance implications for:
- Index size and efficiency
- Join operations
- Foreign key lookups
- Database clustering and sharding

### Proposed Change
Implement a **dual-key strategy**:
- **Internal**: Autoincrement `BIGINT` primary keys for database operations
- **External**: UUID unique identifiers for API responses and client interactions

### Benefits
- ✅ **Performance**: Smaller indexes, faster joins, better clustering
- ✅ **Security**: UUIDs prevent ID enumeration attacks
- ✅ **Flexibility**: Integer PKs easier for database replication and sharding
- ✅ **Compatibility**: API remains stable (still uses UUIDs externally)

### Complexity
- 🔸 **Medium** - Requires schema changes, code updates across all layers
- 🔸 Simplified for development: Can use database reset instead of complex migration
- 🔸 Estimated effort: 2-3 days for implementation + testing
- 🔸 Risk level: Medium (development-only, no production data concerns)

---

## Current State Analysis

### Database Schema

#### Users Table (`apps/todo-api/src/database/migrations/001-create-users-table.ts`)
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY,              -- Currently UUID
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Todos Table (`apps/todo-api/src/database/migrations/002-create-todos-table.ts`)
```sql
CREATE TABLE todos (
  id           CHAR(36) PRIMARY KEY,                           -- Currently UUID string
  user_id      CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,  -- FK to users(id)
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  completed    BOOLEAN DEFAULT false,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX todos_user_id_index ON todos(user_id);
CREATE INDEX todos_completed_index ON todos(completed);
CREATE INDEX todos_user_id_completed_index ON todos(user_id, completed);
```

### Code Layer Analysis

#### Domain Schemas
**Location**: `apps/todo-api/src/{users|todos}/domain/*-schemas.ts`

Currently expects UUID strings:
```typescript
// User
id: z.string().uuid()
// Todo
id: z.string().uuid()
userId: z.string().uuid()
```

#### API Contracts
**Location**: `libs/api-contracts/src/*-schemas.ts`

API responses expose UUIDs:
```typescript
TodoResponseSchema = z.object({
  id: z.string().uuid(),       // Public identifier
  userId: z.string().uuid(),   // Public user reference
  // ... other fields
});
```

#### API Endpoints
**Location**: `libs/api-contracts/src/todo-contract.ts`

```
GET    /todos              - List all user todos
POST   /todos              - Create new todo
GET    /todos/:id          - Get todo by UUID
PATCH  /todos/:id/complete - Complete todo by UUID
```

**Critical**: All endpoints use UUID in URL path parameters

#### Data Stores
**Location**: `apps/todo-api/src/database/models/*.ts`

Sequelize models currently use:
```typescript
id: {
  type: DataTypes.UUID,
  primaryKey: true,
}
```

#### ID Generation
**Location**: `@demo-todo/infrastructure`

Current ID generation:
```typescript
const userIdGenerator = createUuidIdGenerator();
const todoIdGenerator = createUuidIdGenerator();
```

---

## Target Architecture

### New Schema Design

#### Users Table (Target)
```sql
CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,  -- New: integer PK
  uuid          CHAR(36) UNIQUE NOT NULL,           -- New: public identifier
  email         VARCHAR(255) UNIQUE NOT NULL,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX users_uuid_index (uuid),                    -- New: fast UUID lookup
  UNIQUE INDEX users_email_unique (email),
  UNIQUE INDEX users_username_unique (username)
);
```

#### Todos Table (Target)
```sql
CREATE TABLE todos (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,   -- New: integer PK
  uuid         CHAR(36) UNIQUE NOT NULL,            -- New: public identifier
  user_id      BIGINT NOT NULL,                     -- New: integer FK
  title        VARCHAR(500) NOT NULL,
  description  TEXT,
  completed    BOOLEAN DEFAULT false,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX todos_uuid_index (uuid),                    -- New: fast UUID lookup
  INDEX todos_user_id_index (user_id),              -- Updated: now integer
  INDEX todos_completed_index (completed),
  INDEX todos_user_id_completed_index (user_id, completed)
);
```

### Key Changes
1. **Primary Keys**: `id` column becomes `BIGINT AUTO_INCREMENT`
2. **Public Identifiers**: New `uuid` column (CHAR(36), UNIQUE, NOT NULL)
3. **Foreign Keys**: `user_id` in todos table now references integer PK
4. **Indexes**: New indexes on `uuid` columns for fast lookups

---

## Migration Strategy

### Development-Only Context
**Context**: This application is not deployed to production, so downtime is not a concern.

**Approach**: Direct migration with database reset option

**Two Implementation Paths**:

#### Path A: Fresh Start (Recommended for Development)
- Delete existing migrations `001-create-users-table.ts` and `002-create-todos-table.ts`
- Create new migrations with target schema (integer PKs + UUID v7 columns)
- Run `npm run db:reset --workspace=todo-api` to recreate database
- Seed data populates with UUID v7 identifiers

**Benefits**:
- ✅ Cleanest implementation
- ✅ No complex data migration logic
- ✅ Fast iteration

#### Path B: Additive Migration (Learning Experience)
- Keep existing migrations for reference
- Create new migrations that alter tables (add columns, migrate data, swap PKs)
- Provides practice with production-style migrations
- More complex but teaches migration techniques

**Recommendation**: Use **Path A** for faster development, unless you want to practice complex migrations.

---

## UUID v7: Why Upgrade from UUID v4?

### Current State: UUID v4
The application currently uses **UUID v4** (random UUIDs):
- 122 random bits
- No time or ordering information
- Good randomness and collision resistance

### Target: UUID v7 (Time-Ordered UUIDs)
**Decision**: Upgrade to UUID v7 for better database performance

### UUID v7 Benefits

#### 1. **Time-Ordered / Sortable**
```
UUID v4: 8f3e4a21-1234-4567-89ab-0123456789ab (random)
UUID v7: 018c2b4e-f9a0-7xxx-xxxx-xxxxxxxxxxxx (time-prefix)
         ^^^^^^^^^^ Unix timestamp milliseconds
```
- First 48 bits = Unix timestamp (milliseconds)
- Naturally sorted by creation time
- UUIDs created at similar times are clustered together

#### 2. **Database Index Performance**
- **Sequential writes**: New records append to index (vs. random insertion for v4)
- **Better page utilization**: Reduces index fragmentation
- **Improved cache locality**: Related records stored near each other
- **Faster range queries**: Time-based queries are more efficient

#### 3. **B-Tree Optimization**
MySQL B-Tree indexes work best with sequential keys:
- UUID v4: Random insertion causes page splits, fragmentation
- UUID v7: Sequential insertion, minimal page splits, compact indexes

#### 4. **Same Security Properties**
- Still globally unique
- Still 128 bits
- Remaining 74 bits are random (sufficient collision resistance)
- Time component doesn't leak sensitive information (millisecond precision only)

### Implementation

#### Update ID Generator
**File**: `libs/infrastructure/src/id-generator.ts`

```typescript
import { v7 as uuidv7, validate as uuidValidate } from 'uuid';  // Update import

export const createUuidIdGenerator = (): IdGenerator => {
  return {
    generate: () => uuidv7(),  // Changed from uuidv4()
    validate: (id: string) => uuidValidate(id),
  };
};
```

**Note**: The `uuid` package (v11.0.5) already installed supports UUID v7.

### Migration Impact
- **Existing data**: Can remain as UUID v4 (mixed v4/v7 is fine)
- **New data**: Will use UUID v7 from implementation forward
- **Validation**: Both v4 and v7 pass `uuid.validate()`
- **API**: No breaking changes (still string UUIDs)

---

## Implementation Phases

### Phase 0: Upgrade to UUID v7 (Prerequisite)
**Estimated Time**: 15 minutes
**Risk**: Very Low

This phase can be done independently and provides immediate benefits even before the schema migration.

#### Step 0.1: Update UUID Generator
**File**: `libs/infrastructure/src/id-generator.ts`

**Change**:
```typescript
// Before
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export const createUuidIdGenerator = (): IdGenerator => {
  return {
    generate: () => uuidv4(),
    validate: (id: string) => uuidValidate(id),
  };
};

// After
import { v7 as uuidv7, validate as uuidValidate } from 'uuid';  // ← Change import

export const createUuidIdGenerator = (): IdGenerator => {
  return {
    generate: () => uuidv7(),  // ← Change from uuidv4() to uuidv7()
    validate: (id: string) => uuidValidate(id),
  };
};
```

#### Step 0.2: Update Tests (if needed)
Most tests should continue to work since:
- UUID v7 is still a valid UUID string
- Same format (36 characters with dashes)
- Passes all UUID validation

**Only update tests that**:
- Assert specific UUID format (unlikely)
- Mock UUID generation (update mocks to use v7 format)

#### Step 0.3: Reset Database with New UUIDs
```bash
npm run db:reset --workspace=todo-api
```

All newly seeded data will now use UUID v7!

**Verification**:
- Create a new user/todo
- Check database: UUID should start with time-based prefix
- Example UUID v7: `018c2b4e-f9a0-7xxx-xxxx-xxxxxxxxxxxx`
- Compare to UUID v4: `8f3e4a21-1234-4567-89ab-0123456789ab`

**Benefits of doing this first**:
- ✅ Immediate index performance improvement (even with UUID PKs)
- ✅ Can be deployed independently
- ✅ No breaking changes
- ✅ Easy to verify

---

### Phase 1: Schema Migration (Database Layer)
**Estimated Time**: 1-2 hours (using Path A: Fresh Start)
**Risk**: Low (development only, using db:reset)

**Approach**: Since we're in development, we'll **replace** the existing migrations with new ones that implement the target schema directly.

#### Step 1.1: Delete Old Migration Files (Optional)
You can either:
1. **Delete** old migrations `001-*` and `002-*` (clean slate)
2. **Keep** them for reference and create `003-*` and `004-*` (historical record)

**Recommendation**: Delete old migrations for cleaner codebase.

```bash
# Backup first (optional)
cp apps/todo-api/src/database/migrations/001-create-users-table.ts apps/todo-api/src/database/migrations/001-create-users-table.ts.backup
cp apps/todo-api/src/database/migrations/002-create-todos-table.ts apps/todo-api/src/database/migrations/002-create-todos-table.ts.backup

# Delete old migrations
rm apps/todo-api/src/database/migrations/001-create-users-table.ts
rm apps/todo-api/src/database/migrations/002-create-todos-table.ts
```

#### Step 1.2: Create New Users Table Migration
**File**: `apps/todo-api/src/database/migrations/001-create-users-table.ts`

**Implementation**: Direct target schema with integer PK and UUID v7 column

```typescript
export async function up({ context: queryInterface }: MigrationContext) {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Create indexes
  await queryInterface.addIndex('users', ['uuid'], {
    name: 'users_uuid_index',
    unique: true,
  });
  await queryInterface.addIndex('users', ['email'], {
    name: 'users_email_unique',
    unique: true,
  });
  await queryInterface.addIndex('users', ['username'], {
    name: 'users_username_unique',
    unique: true,
  });
}
```

#### Step 1.3: Create New Todos Table Migration
**File**: `apps/todo-api/src/database/migrations/002-create-todos-table.ts`

**Implementation**: Direct target schema with integer PK, FK, and UUID v7 column

```typescript
export async function up({ context: queryInterface }: MigrationContext) {
  await queryInterface.createTable('todos', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Create indexes
  await queryInterface.addIndex('todos', ['uuid'], {
    name: 'todos_uuid_index',
    unique: true,
  });
  await queryInterface.addIndex('todos', ['user_id'], {
    name: 'todos_user_id_index',
  });
  await queryInterface.addIndex('todos', ['completed'], {
    name: 'todos_completed_index',
  });
  await queryInterface.addIndex('todos', ['user_id', 'completed'], {
    name: 'todos_user_id_completed_index',
  });
}
```

#### Step 1.4: Reset Database
```bash
npm run db:reset --workspace=todo-api
```

This will:
1. Destroy existing MySQL container and volume
2. Create new MySQL container
3. Run new migrations (creates tables with target schema)
4. Seed test users with UUID v7 identifiers

### Phase 2: Data Layer (Sequelize Models)
**Estimated Time**: 1-2 hours
**Risk**: Medium

#### Step 2.1: Update User Model
**File**: `apps/todo-api/src/database/models/user-model.ts`

**Changes**:
```typescript
// Before
id: {
  type: DataTypes.UUID,
  primaryKey: true,
}

// After
id: {
  type: DataTypes.BIGINT,
  primaryKey: true,
  autoIncrement: true,
},
uuid: {
  type: DataTypes.CHAR(36),
  allowNull: false,
  unique: true,
  field: 'uuid',
}
```

#### Step 2.2: Update Todo Model
**File**: `apps/todo-api/src/database/models/todo-model.ts`

**Changes**:
```typescript
// Before
id: {
  type: DataTypes.UUID,
  primaryKey: true,
},
userId: {
  type: DataTypes.UUID,
  allowNull: false,
  field: 'user_id',
}

// After
id: {
  type: DataTypes.BIGINT,
  primaryKey: true,
  autoIncrement: true,
},
uuid: {
  type: DataTypes.CHAR(36),
  allowNull: false,
  unique: true,
  field: 'uuid',
},
userId: {
  type: DataTypes.BIGINT,
  allowNull: false,
  field: 'user_id',
}
```

### Phase 3: Domain Layer
**Estimated Time**: 2-3 hours
**Risk**: Medium

#### Step 3.1: Update Domain Schemas
**Files**:
- `apps/todo-api/src/users/domain/user-schemas.ts`
- `apps/todo-api/src/todos/domain/todo-schemas.ts`

**Strategy**: Maintain UUID as primary identifier in domain, add internal ID

```typescript
// User domain schema
export const UserSchema = z.object({
  id: z.string().uuid(),           // Keep UUID as domain identifier
  internalId: z.number().int().positive().optional(),  // Add internal ID (optional for now)
  email: z.string().email(),
  username: z.string().min(3).max(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Todo domain schema
export const TodoSchema = z.object({
  id: z.string().uuid(),           // Keep UUID as domain identifier
  internalId: z.number().int().positive().optional(),  // Add internal ID
  userId: z.string().uuid(),       // Keep UUID for user reference
  userInternalId: z.number().int().positive().optional(),  // Add for internal ops
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
});
```

**Important Decision**: The domain layer should primarily use UUIDs (public identifiers) to maintain clean separation. Internal IDs are optional for optimization.

### Phase 4: Store Layer (Repository Pattern)
**Estimated Time**: 2-3 hours
**Risk**: Medium-High

#### Step 4.1: Update User Store
**File**: `apps/todo-api/src/users/infra/user-store.ts`

**Key Changes**:
1. Update type mappings: `id` remains UUID (maps to `uuid` column), add `internalId` mapping
2. Update `findById()`: Look up by `uuid` column instead of `id` column
3. Update `save()`: Handle UUID generation for new users
4. Update associations/joins to use integer PKs internally

```typescript
// Example transformation
function toDomain(model: UserModel): User {
  return {
    id: model.uuid,              // Map uuid column to domain id
    internalId: model.id,        // Map id column to internalId (optional)
    email: model.email,
    username: model.username,
    // ... rest of mapping
  };
}

function toPersistence(user: User): Partial<UserModelAttributes> {
  return {
    uuid: user.id,               // Map domain id to uuid column
    id: user.internalId,         // Map internalId to id column (for updates)
    email: user.email,
    username: user.username,
    // ... rest of mapping
  };
}
```

#### Step 4.2: Update Todo Store
**File**: `apps/todo-api/src/todos/infra/todo-store.ts`

**Key Changes**:
1. Update lookups by UUID (`uuid` column) instead of `id`
2. Update foreign key references to use integer `user_id`
3. Update query methods to use efficient integer joins

```typescript
async findById(todoId: string): Promise<Todo | null> {
  // Before: WHERE id = todoId
  // After: WHERE uuid = todoId
  const model = await TodoModel.findOne({ where: { uuid: todoId } });
  return model ? this.toDomain(model) : null;
}

async findByUserId(userId: string): Promise<Todo[]> {
  // Need to resolve userId (UUID) to internal user ID first
  const user = await UserModel.findOne({ where: { uuid: userId } });
  if (!user) return [];

  // Use integer FK for efficient query
  const models = await TodoModel.findAll({
    where: { user_id: user.id }  // Integer FK lookup
  });
  return models.map(m => this.toDomain(m));
}
```

### Phase 5: API Layer (No Changes Required!)
**Estimated Time**: 30 minutes (verification only)
**Risk**: Low

**Good News**: The API contracts already use UUIDs exclusively. No changes needed to:
- API endpoint paths (`/todos/:id` still uses UUID)
- Request/response schemas (all use `z.string().uuid()`)
- API contracts and OpenAPI docs

**Verification Required**:
- Test all endpoints still accept/return UUIDs correctly
- Verify error messages for invalid UUIDs still work

### Phase 6: Seed Data
**Estimated Time**: 1 hour
**Risk**: Low

#### Step 6.1: Update Seed Script
**File**: `apps/todo-api/src/scripts/seed-test-users.ts`

**Changes**:
- UUIDs are still generated and used as public identifiers
- Remove `id` from seed data (will be auto-generated by DB)
- Keep UUID generation for the `uuid` field

```typescript
// Before
const user = {
  id: userId,  // UUID
  email: 'alice@example.com',
  // ...
};

// After
const user = {
  uuid: userId,  // UUID (public identifier)
  // id will be auto-generated by database
  email: 'alice@example.com',
  // ...
};
```

### Phase 7: Testing & Validation
**Estimated Time**: 4-6 hours
**Risk**: Medium

See [Testing Strategy](#testing-strategy) section below.

---

## Rollback Plan

### Development Rollback (Simple)
**Context**: Since we're in development without production data, rollback is straightforward.

#### Option 1: Database Reset (Recommended)
**Use when**: Something goes wrong, and you want to start fresh

```bash
# Simply reset the database - destroys everything and recreates
npm run db:reset --workspace=todo-api
```

This will:
1. Destroy MySQL container and volume
2. Recreate from scratch
3. Run all migrations
4. Re-seed test data

#### Option 2: Git Revert + Reset
**Use when**: You want to go back to the old schema

```bash
# Revert code changes
git revert HEAD  # or git reset --hard <previous-commit>

# Reset database with old schema
npm run db:reset --workspace=todo-api
```

#### Option 3: Migration Rollback (Learning)
**Use when**: You want to practice rollback procedures

```bash
# Rollback migrations one by one
npm run db:migrate:down --workspace=todo-api
npm run db:migrate:down --workspace=todo-api
```

**Note**: Each migration should have a `down()` function that reverses the `up()` changes.

### No Production Concerns
Since this is development-only:
- ❌ No need for backup/restore procedures
- ❌ No need for zero-downtime rollback
- ❌ No need for data preservation
- ✅ Can always recreate from scratch

---

## Testing Strategy

### 1. Unit Tests
**Update existing tests**:
- `apps/todo-api/src/users/domain/*.test.ts`
- `apps/todo-api/src/todos/domain/*.test.ts`
- `apps/todo-api/src/users/infra/*.test.ts`
- `apps/todo-api/src/todos/infra/*.test.ts`

**Verify**:
- Domain models work with new schema
- Store mapping functions (toDomain/toPersistence) work correctly
- UUID lookups function properly

### 2. Integration Tests
**Test flows**:
1. Create user → returns UUID → can fetch by UUID
2. Create todo → returns UUID → can fetch by UUID
3. List todos → all have valid UUIDs
4. Complete todo by UUID → updates correctly
5. Delete user → cascades to todos

### 3. Migration Tests
**Create dedicated test**:
- Start with old schema + seed data
- Run migrations up
- Verify all UUIDs preserved in `uuid` columns
- Verify all relationships intact
- Run migrations down
- Verify rollback successful

### 4. Performance Tests
**Benchmarks**:
- Compare query performance before/after
- Measure join operations on todos ↔ users
- Test index usage with `EXPLAIN` queries

**Expected improvements**:
- Faster joins (integer comparison vs. string)
- Smaller index size (8 bytes vs. 36 bytes)
- Better clustering/sequential scans

### 5. API Contract Tests
**Verify**:
- All endpoints still accept UUIDs
- All responses return UUIDs
- Error handling for invalid UUIDs works
- OpenAPI docs still accurate

### 6. Manual QA Checklist
- [ ] Create new user via API
- [ ] Login with new user
- [ ] Create todo
- [ ] List todos
- [ ] Get single todo by ID
- [ ] Complete todo
- [ ] Verify data in database (UUIDs in uuid columns)
- [ ] Check database indexes exist
- [ ] Verify foreign key constraints work
- [ ] Test cascade delete (delete user → todos deleted)

---

## Risk Assessment

### High Risk Areas
1. **Data Migration**: Mapping UUID FKs to integer FKs must be perfect
   - **Mitigation**: Extensive testing, validation queries, backup before migration

2. **Foreign Key Relationships**: Risk of orphaned records during migration
   - **Mitigation**: Use transactions, verify counts before/after

3. **Store Layer**: Complex mapping between domain (UUID) and persistence (int)
   - **Mitigation**: Comprehensive unit tests, integration tests

### Medium Risk Areas
4. **Sequelize Model Changes**: Type mismatches could cause runtime errors
   - **Mitigation**: TypeScript compilation checks, thorough testing

5. **Performance**: Unexpected performance issues with new schema
   - **Mitigation**: Performance benchmarks, explain query analysis

### Low Risk Areas
6. **API Layer**: No changes required (uses UUIDs throughout)
7. **Domain Layer**: Minimal changes (just add optional internal ID)

### Risk Mitigation Checklist
- [ ] Full database backup before migration
- [ ] Test migration on copy of production data
- [ ] Implement comprehensive rollback procedure
- [ ] Monitor query performance after deployment
- [ ] Staged rollout (dev → staging → production)

---

## Prerequisites

### Before Starting
- [ ] Ensure all existing tests pass: `npm run quality`
- [ ] Current database is running: `docker ps` (should see MySQL container)
- [ ] Allocate time for implementation: 2-3 days
- [ ] Familiarize yourself with current schema (read existing migration files)

### During Implementation
- [ ] Work on feature branch: `claude/mysql-database-update-plan-011CUsjVGuHPkUSrYFU7LcJ3`
- [ ] Commit after each phase completion
- [ ] Run `npm run quality` after each phase to ensure no regressions
- [ ] Test database operations after schema changes
- [ ] Keep git history clean with descriptive commits

### After Implementation
- [ ] All tests passing: `npm run quality`
- [ ] Manual testing completed (see Testing Strategy section)
- [ ] Database reset works: `npm run db:reset --workspace=todo-api`
- [ ] API endpoints work with UUID identifiers
- [ ] Seed data populates correctly
- [ ] Create PR for review
- [ ] Update this plan document with any lessons learned

---

## Questions for Review

### Answered ✓

1. **Downtime Acceptable?**: ✅ Yes - application is not deployed to production
2. **Performance Priority?**: ✅ No specific query patterns to optimize for
3. **Existing Data Volume?**: ✅ Not in production - development data only
4. **UUID Version?**: ✅ **Use UUID v7** (time-sortable, better performance)
5. **Sharding Plans?**: N/A - not applicable for development

### Decisions Made
- **Migration Approach**: Use database reset (Path A) for clean implementation
- **UUID Strategy**: Upgrade to UUID v7 for better index performance
- **Risk Level**: Medium (no production data concerns)
- **Timeline**: 2-3 days implementation + testing

---

## References

### Key Files
- **Migrations**: `apps/todo-api/src/database/migrations/*.ts`
- **Models**: `apps/todo-api/src/database/models/*.ts`
- **Domain Schemas**: `apps/todo-api/src/{users|todos}/domain/*-schemas.ts`
- **Stores**: `apps/todo-api/src/{users|todos}/infra/*-store.ts`
- **API Contracts**: `libs/api-contracts/src/*-contract.ts`

### Migration Framework
- **Umzug**: `apps/todo-api/src/database/migrator.ts`
- **CLI**: `apps/todo-api/src/database/migrate.ts`
- **Commands**:
  ```bash
  npm run db:migrate --workspace=todo-api        # Run pending migrations
  npm run db:migrate:down --workspace=todo-api   # Rollback one migration
  npm run db:reset --workspace=todo-api          # Full reset + seed
  ```

---

## Next Steps

Ready to implement! Follow these phases in order:

### Quick Start (Immediate Value)
1. **Phase 0: Upgrade to UUID v7** (~15 minutes)
   - Update `libs/infrastructure/src/id-generator.ts`
   - Change `v4` to `v7` in imports and function call
   - Run `npm run quality` to ensure no breaks
   - Reset database: `npm run db:reset --workspace=todo-api`
   - Benefit: Immediate index performance improvement

### Full Implementation (After Phase 0)
2. **Phase 1: Schema Migration** (1-2 hours)
   - Replace migration files with new target schema
   - Reset database to apply new schema

3. **Phase 2: Update Sequelize Models** (1-2 hours)
   - Modify UserModel and TodoModel
   - Add `uuid` field, change `id` to BIGINT

4. **Phase 3: Update Domain Layer** (2-3 hours)
   - Update domain schemas (keep UUID as primary identifier)
   - Optional: Add internal ID fields

5. **Phase 4: Update Store Layer** (2-3 hours)
   - Modify mapping functions (toDomain/toPersistence)
   - Update queries to use UUID lookups

6. **Phase 5: Verify API Layer** (30 minutes)
   - Test endpoints (should work without changes)

7. **Phase 6: Update Seed Data** (1 hour)
   - Modify seed script to use `uuid` field

8. **Phase 7: Testing** (4-6 hours)
   - Run all tests, fix any failures
   - Manual QA testing
   - Performance verification

### Branch & Commit Strategy
- Already on: `claude/mysql-database-update-plan-011CUsjVGuHPkUSrYFU7LcJ3`
- Commit after each phase
- Run `npm run quality` before each commit
- Create PR when all phases complete
