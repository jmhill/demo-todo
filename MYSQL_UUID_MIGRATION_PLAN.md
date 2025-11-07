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
- 🔸 **High** - Requires schema changes, data migration, code updates across all layers
- 🔸 Estimated effort: 3-5 days for implementation + thorough testing
- 🔸 Risk level: Medium-High (touching core data model)

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

### Option A: Blue-Green Deployment (Recommended for Production)
**Pros**: Zero downtime, easy rollback
**Cons**: More complex, requires dual-write period

### Option B: Maintenance Window (Simpler)
**Pros**: Simpler implementation, one-shot migration
**Cons**: Requires downtime
**Recommendation**: Use this for development/staging environment

We'll design for **Option B** initially, with notes for adapting to Option A.

---

## Implementation Phases

### Phase 1: Schema Migration (Database Layer)
**Estimated Time**: 2-3 hours
**Risk**: High

#### Step 1.1: Create New Migration File
**File**: `apps/todo-api/src/database/migrations/003-add-integer-pks-and-uuid-columns.ts`

**Actions**:
1. **Users table**:
   - Add new `id_new BIGINT AUTO_INCREMENT` column (temporary name)
   - Add new `uuid CHAR(36) UNIQUE NOT NULL` column
   - Populate `uuid` with existing `id` values (copy UUID → uuid)
   - Create index on `uuid` column

2. **Todos table**:
   - Add new `id_new BIGINT AUTO_INCREMENT` column
   - Add new `uuid CHAR(36) UNIQUE NOT NULL` column
   - Add new `user_id_new BIGINT` column
   - Populate `uuid` with existing `id` values
   - Map `user_id_new` by joining users table (UUID → integer)
   - Create index on `uuid` column

**SQL Pseudo-code**:
```sql
-- Users table
ALTER TABLE users
  ADD COLUMN id_new BIGINT AUTO_INCREMENT UNIQUE,
  ADD COLUMN uuid CHAR(36) UNIQUE NOT NULL;

UPDATE users SET uuid = id;
CREATE INDEX users_uuid_index ON users(uuid);

-- Todos table
ALTER TABLE todos
  ADD COLUMN id_new BIGINT AUTO_INCREMENT UNIQUE,
  ADD COLUMN uuid CHAR(36) UNIQUE NOT NULL,
  ADD COLUMN user_id_new BIGINT;

UPDATE todos SET uuid = id;

-- Map user_id_new from UUID to integer
UPDATE todos t
JOIN users u ON t.user_id = u.uuid
SET t.user_id_new = u.id_new;

CREATE INDEX todos_uuid_index ON todos(uuid);
```

#### Step 1.2: Drop Old Constraints and Rename Columns
**File**: `apps/todo-api/src/database/migrations/004-swap-pks-to-integers.ts`

**Actions**:
1. Drop foreign key constraint on `todos.user_id`
2. Drop primary keys on both tables
3. Drop old `id` and `user_id` columns
4. Rename `id_new` → `id` and `user_id_new` → `user_id`
5. Re-add primary key constraints on new integer `id` columns
6. Re-add foreign key constraint `todos.user_id` → `users.id`
7. Recreate indexes that were affected

**SQL Pseudo-code**:
```sql
-- Drop FK constraint
ALTER TABLE todos DROP FOREIGN KEY todos_user_id_fk;

-- Drop PKs
ALTER TABLE users DROP PRIMARY KEY;
ALTER TABLE todos DROP PRIMARY KEY;

-- Drop old columns
ALTER TABLE users DROP COLUMN id;
ALTER TABLE todos DROP COLUMN id, DROP COLUMN user_id;

-- Rename new columns
ALTER TABLE users CHANGE COLUMN id_new id BIGINT AUTO_INCREMENT;
ALTER TABLE todos CHANGE COLUMN id_new id BIGINT AUTO_INCREMENT;
ALTER TABLE todos CHANGE COLUMN user_id_new user_id BIGINT NOT NULL;

-- Re-add PKs
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE todos ADD PRIMARY KEY (id);

-- Re-add FK
ALTER TABLE todos ADD CONSTRAINT todos_user_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate indexes
CREATE INDEX todos_user_id_index ON todos(user_id);
CREATE INDEX todos_user_id_completed_index ON todos(user_id, completed);
```

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

### Automated Rollback (Development)
**Trigger**: Any migration failure or test failure
**Action**: Run migration down commands

```bash
# Rollback both migrations
npm run db:migrate:down --workspace=todo-api
npm run db:migrate:down --workspace=todo-api
```

### Manual Rollback (Production)
**Scenario**: Issue discovered after deployment

1. **Immediate**: Deploy previous application version
2. **Database**: Restore from backup taken before migration
3. **Validation**: Verify all data integrity checks pass

### Down Migration Scripts
Each migration file must include comprehensive `down()` function:

```typescript
export async function down({ context: queryInterface }: MigrationContext) {
  // Reverse all changes in exact opposite order
  // 004: Restore old PK structure
  // 003: Remove new columns
}
```

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
- [ ] Review and approve this plan with team
- [ ] Schedule time for implementation (3-5 days)
- [ ] Set up development database copy for testing
- [ ] Ensure all existing tests pass
- [ ] Create database backup
- [ ] Document current table sizes and record counts

### During Implementation
- [ ] Work on feature branch: `claude/mysql-database-update-plan-011CUsjVGuHPkUSrYFU7LcJ3`
- [ ] Commit after each phase completion
- [ ] Run `npm run quality` after each phase
- [ ] Test migrations thoroughly before proceeding
- [ ] Keep team updated on progress

### After Implementation
- [ ] All tests passing (unit, integration)
- [ ] Performance benchmarks completed
- [ ] Documentation updated
- [ ] Rollback tested successfully
- [ ] Create PR for review
- [ ] Schedule production deployment with maintenance window

---

## Questions for Review

1. **Downtime Acceptable?**: Can we afford a maintenance window, or do we need zero-downtime deployment?
2. **Performance Priority?**: Are there specific query patterns we should optimize for?
3. **Existing Data Volume?**: How many users and todos exist in production?
4. **UUID Version?**: Continue with UUID v4, or consider UUID v7 (time-sortable)?
5. **Sharding Plans?**: Any plans for database sharding that would benefit from integer PKs?

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

## Approval Sign-off

- [ ] **Technical Lead**: Reviewed and approved
- [ ] **Database Admin**: Reviewed and approved
- [ ] **Product Owner**: Aware of potential downtime
- [ ] **QA Lead**: Testing strategy approved

**Approved By**: _________________
**Date**: _________________

---

## Next Steps

1. **Review this plan** with the team
2. **Answer questions** in the "Questions for Review" section
3. **Get approvals** from stakeholders
4. **Create implementation branch** (already created)
5. **Begin Phase 1**: Schema migration implementation
