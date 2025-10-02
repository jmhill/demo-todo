#!/usr/bin/env tsx

import { createSequelize } from './sequelize-config.js';
import { loadConfig } from '../config/index.js';
import { createMigrator } from './migrator.js';

async function runMigrations() {
  const command = process.argv[2] || 'up';

  // Load config to get database settings
  const config = loadConfig();

  // Create Sequelize instance
  const sequelize = createSequelize(config.database);

  // Create Umzug instance
  const umzug = createMigrator(sequelize, { logger: console });

  try {
    switch (command) {
      case 'up':
        console.log('Running migrations...');
        await umzug.up();
        console.log('All migrations completed successfully');
        break;

      case 'down':
        console.log('Rolling back last migration...');
        await umzug.down();
        console.log('Rollback completed successfully');
        break;

      case 'pending': {
        console.log('Checking pending migrations...');
        const pending = await umzug.pending();
        if (pending.length === 0) {
          console.log('No pending migrations');
        } else {
          console.log('Pending migrations:');
          pending.forEach((migration) => console.log(`  - ${migration.name}`));
        }
        break;
      }

      case 'executed': {
        console.log('Checking executed migrations...');
        const executed = await umzug.executed();
        if (executed.length === 0) {
          console.log('No executed migrations');
        } else {
          console.log('Executed migrations:');
          executed.forEach((migration) => console.log(`  - ${migration.name}`));
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Usage: npm run db:migrate [up|down|pending|executed]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
