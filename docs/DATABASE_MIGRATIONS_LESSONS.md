# Database Migrations: Lessons Learned

## Problem Summary

When implementing the todos table migration with a foreign key reference to users.id, we encountered a subtle but blocking issue with charset/collation compatibility between MySQL and SQLite.

### The Error

```
Referencing column 'user_id' and referenced column 'id' in foreign key constraint 'todos_ibfk_1' are incompatible.
```

## Root Cause Analysis

### What Happened

1. **Initial Users Table Creation**: The users.id column was created with:

   ```sql
   `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
   ```

2. **Todos Table Attempt**: We initially tried to create todos.user_id with:

   ```typescript
   user_id: {
     type: DataTypes.UUID, // Sequelize converts to CHAR(36)
     references: { model: 'users', key: 'id' }
   }
   ```

3. **MySQL's Complaint**: The generated SQL was:

   ```sql
   `user_id` CHAR(36) BINARY  -- Different charset/collation!
   ```

   MySQL requires foreign key columns to have **identical** type, charset, and collation to their referenced columns.

4. **First Fix Attempt**: Hardcoded the full type definition:

   ```typescript
   type: 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin';
   ```

   This worked for MySQL but broke SQLite:

   ```
   SQLITE_ERROR: near "CHARACTER": syntax error
   ```

5. **Final Solution**: Dialect-aware migration:

   ```typescript
   const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

   user_id: {
     type: isMySql
       ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
       : DataTypes.CHAR(36),
     // ...
   }
   ```

### Why It Happened

1. **Sequelize Abstraction Leakage**: Sequelize's `DataTypes.UUID` doesn't consistently handle charset/collation across dialects
2. **Multi-Dialect Testing**: We run migrations against both SQLite (unit tests) and MySQL (acceptance tests)
3. **Implicit Schema Decisions**: The users table's charset/collation was set implicitly by Sequelize's defaults
4. **Lack of Schema Visibility**: No easy way to inspect the actual generated schema until runtime errors occur
5. **Dialect-Specific Requirements**: MySQL's strict foreign key compatibility requirements aren't shared by SQLite

## Impact

- **Development Friction**: Had to drop and recreate test databases multiple times
- **Testing Delays**: Unit tests failed, blocking the entire quality pipeline
- **Hidden Complexity**: The error message didn't immediately reveal the charset/collation mismatch
- **Cognitive Load**: Developers must understand database-specific nuances beyond Sequelize's abstraction

## Mitigation Strategies

### Short-Term Solutions

#### 1. Explicit Column Definitions for UUIDs

Create a helper for consistent UUID columns:

```typescript
// src/database/column-types.ts
import { DataTypes, type QueryInterface } from 'sequelize';

export const createUuidColumn = (queryInterface: QueryInterface) => {
  const isMySql = queryInterface.sequelize.getDialect() === 'mysql';

  return isMySql
    ? 'CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'
    : DataTypes.CHAR(36);
};

// In migrations:
import { createUuidColumn } from '../column-types.js';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.createTable('todos', {
    id: {
      type: createUuidColumn(queryInterface),
      primaryKey: true,
    },
    user_id: {
      type: createUuidColumn(queryInterface),
      references: { model: 'users', key: 'id' },
    },
  });
};
```

#### 2. Migration Testing Script

Create a script to validate migrations before running tests:

```typescript
// src/scripts/validate-migrations.ts
import { createSequelize } from '../database/sequelize-config.js';
import { createMigrator } from '../database/migrator.js';

async function validateMigrations() {
  console.log('Testing migrations against SQLite...');
  const sqliteSeq = new Sequelize({ dialect: 'sqlite', storage: ':memory:' });
  await createMigrator(sqliteSeq).up();

  console.log('Testing migrations against MySQL...');
  const mysqlSeq = createSequelize(mysqlTestConfig);
  await createMigrator(mysqlSeq).up();

  console.log('✓ All migrations valid');
}
```

#### 3. Schema Inspection Helper

Add a command to inspect actual database schemas:

```typescript
// npm run db:schema:inspect
async function inspectSchema() {
  const tables = await queryInterface.showAllTables();

  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    const columns = await queryInterface.describeTable(table);
    console.table(columns);
  }
}
```

### Long-Term Solutions

#### 1. Single Dialect for All Tests

**Recommendation**: Use MySQL with testcontainers for both unit and acceptance tests.

**Pros**:

- Consistent behavior across all test environments
- Tests match production environment
- No dialect-specific workarounds in migrations
- Foreign key constraints work correctly in all tests

**Cons**:

- Slightly slower test startup (testcontainers overhead)
- Requires Docker to be running
- More complex CI/CD setup

**Implementation**:

```typescript
// vitest.unit.config.ts
export default defineConfig({
  test: {
    globalSetup: ['./tests/helpers/global-setup.ts'], // Use testcontainers
  },
});
```

#### 2. Migration Linting/Validation

Create a tool to validate migrations before they're committed:

```typescript
// .husky/pre-commit
npm run migrate:validate
```

Features:

- Detect missing charset/collation on foreign key columns
- Warn about dialect-specific syntax
- Verify up/down migrations are reversible
- Check for data loss operations

#### 3. Schema-First Approach

Instead of migrations, consider using Sequelize's sync with a single source of truth:

```typescript
// Only for development
if (config.environment === 'development') {
  await sequelize.sync({ alter: true });
}
```

**Pros**:

- Single definition of schema (models)
- No migration files to maintain
- Automatic schema updates

**Cons**:

- Not suitable for production
- Can lose data during sync
- Doesn't support complex migrations (data transformations)

#### 4. Better Migration Abstractions

Create higher-level migration helpers:

```typescript
// src/database/migration-helpers.ts
export const createTable = (
  queryInterface: QueryInterface,
  tableName: string,
  schema: Schema,
) => {
  const dialect = queryInterface.sequelize.getDialect();
  const normalizedSchema = normalizeSchemaForDialect(schema, dialect);

  return queryInterface.createTable(tableName, normalizedSchema);
};

export const addForeignKey = (
  queryInterface: QueryInterface,
  tableName: string,
  columnName: string,
  references: { table: string; column: string },
) => {
  // Automatically ensure column types match
  const referencedColumn = await getColumnDefinition(
    queryInterface,
    references.table,
    references.column,
  );

  return queryInterface.addColumn(tableName, columnName, {
    type: referencedColumn.type,
    references,
  });
};
```

## Frictionless Development Database Updates

### Current Pain Points

1. **Manual Database Drops**: Had to manually drop test databases to clear stale schemas
2. **Migration State Confusion**: Umzug tracks which migrations ran, but stale tables from failed migrations linger
3. **No Rollback Strategy**: Errors during migration leave database in broken state
4. **Slow Feedback Loop**: Only discover migration issues when running full test suite

### Recommended Workflow

#### Development Mode: Auto-Migration

For local development, add an auto-migration mode:

```typescript
// src/database/auto-migrate.ts
export async function autoMigrate(sequelize: Sequelize) {
  const env = process.env.NODE_ENV;

  if (env !== 'development' && env !== 'test') {
    throw new Error('Auto-migration only allowed in development/test');
  }

  // Drop all tables and recreate
  await sequelize.drop();

  // Run all migrations from scratch
  const migrator = createMigrator(sequelize);
  await migrator.up();

  console.log('✓ Database auto-migrated');
}

// In development server startup:
if (
  config.environment === 'development' &&
  process.env.AUTO_MIGRATE === 'true'
) {
  await autoMigrate(sequelize);
}
```

Usage:

```bash
# Fresh database every time
AUTO_MIGRATE=true npm run dev

# Or as a separate command
npm run db:reset
```

#### Test Mode: Ephemeral Databases

For tests, always start with a clean database:

```typescript
// tests/helpers/global-setup.ts
export async function setup() {
  // Start fresh container or drop/create database
  const sequelize = await setupTestDatabase();

  // Always run all migrations
  await sequelize.drop();
  const migrator = createMigrator(sequelize);
  await migrator.up();
}
```

#### Production Mode: Safe Migrations

For production, maintain current approach:

- Manual migration review
- Run migrations during deployment
- Rollback capability
- Schema verification before/after

### Tooling Improvements

#### 1. Migration Status Dashboard

```bash
npm run db:status

📊 Migration Status
====================
✓ 001-create-users-table.ts
✓ 002-create-todos-table.ts
⧗ 003-add-user-roles.ts (pending)

Database: todo_dev
Dialect: mysql
Tables: users, todos
```

#### 2. Migration Dry-Run

```bash
npm run db:migrate:dry-run

🔍 Dry Run: 003-add-user-roles.ts
================================
ALTER TABLE `users` ADD COLUMN `role` VARCHAR(50);
ALTER TABLE `users` ADD COLUMN `permissions` JSON;
CREATE INDEX `users_role_index` ON `users` (`role`);

⚠️  This will modify: users
Continue? (y/N)
```

#### 3. Schema Diff Tool

```bash
npm run db:diff

📋 Schema Differences
=====================
Local (MySQL):
  users.role: VARCHAR(50) ✓
  users.permissions: JSON ✓

Production (MySQL):
  users.role: <missing> ⚠️
  users.permissions: <missing> ⚠️

Pending migrations: 1
```

## Key Takeaways

1. **Multi-Dialect is Hard**: Supporting multiple database dialects adds significant complexity to migrations
2. **Be Explicit**: Don't rely on Sequelize defaults for critical schema properties like charset/collation
3. **Test Early**: Validate migrations against all target dialects before committing
4. **Automate Cleanup**: In development/test, always start with a clean database state
5. **Abstract Complexity**: Create helpers to hide dialect-specific details from migration authors
6. **Consider Single Dialect**: For most applications, the simplicity of a single dialect outweighs multi-dialect flexibility

## Recommended Next Steps

1. **Immediate**: Document the `createUuidColumn` helper and use it in all new migrations
2. **Short-term**: Add `npm run db:reset` command for frictionless development
3. **Medium-term**: Implement migration validation in pre-commit hooks
4. **Long-term**: Evaluate moving to MySQL-only for all tests using testcontainers
5. **Future**: Build or adopt a migration framework with better abstractions than raw Sequelize
