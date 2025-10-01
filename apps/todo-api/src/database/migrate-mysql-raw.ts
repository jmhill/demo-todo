#!/usr/bin/env tsx

/**
 * Raw SQL Migration Script
 *
 * This is a simplified example of database migration using raw SQL.
 * It demonstrates the manual approach to database schema management.
 *
 * PURPOSE:
 * - Educational example of the "raw SQL" approach
 * - Shows manual schema creation without migration frameworks
 * - Kept as a simple alternative to the Umzug/Sequelize approach
 *
 * COMPARISON TO migrate.ts (Umzug):
 * - This script: Simple, direct SQL execution, no tracking
 * - migrate.ts: Migration history, rollbacks, versioning
 *
 * FOR PRODUCTION APPLICATIONS:
 * Use proper migration tools instead of this approach:
 * - Umzug (see migrate.ts) - Flexible, JS-based migrations
 * - Flyway - Java-based, SQL or Java migrations
 * - Liquibase - XML/YAML/JSON based migrations
 * - Sequelize CLI - Includes migration generation
 *
 * WHY MIGRATION FRAMEWORKS?
 * - Track which migrations have run
 * - Enable rollback of schema changes
 * - Prevent duplicate execution
 * - Support team collaboration
 * - Enable automated deployment pipelines
 *
 * ANTI-PATTERN WARNING:
 * Do NOT run schema creation during app startup (as the old MySQL store did).
 * Schema migrations should be:
 * - Run separately from app startup
 * - Part of deployment pipeline
 * - Versioned and tracked
 * - Testable independently
 */

import mysql from 'mysql2/promise';
import { loadConfig } from '../config/index.js';

async function runRawMigration() {
  console.log('🔧 Running raw SQL migration...');

  // Load config to get database settings
  const config = await loadConfig();

  // Create connection
  const connection = await mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  });

  try {
    console.log('📝 Creating users table...');

    // Create table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      )
    `);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run migration
runRawMigration();
