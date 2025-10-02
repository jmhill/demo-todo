import { Umzug, SequelizeStorage } from 'umzug';
import type { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a configured Umzug instance for running database migrations
 *
 * @param sequelize - Sequelize instance connected to the target database
 * @param options - Optional configuration
 * @returns Configured Umzug instance
 */
export function createMigrator(
  sequelize: Sequelize,
  options: { logger?: typeof console | undefined } = {},
) {
  return new Umzug({
    migrations: {
      glob: path.join(__dirname, 'migrations/*.ts'),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: options.logger,
  });
}

/**
 * Runs all pending migrations
 *
 * @param sequelize - Sequelize instance connected to the target database
 * @param options - Optional configuration
 */
export async function runMigrations(
  sequelize: Sequelize,
  options: { logger?: typeof console | undefined } = {},
): Promise<void> {
  const migrator = createMigrator(sequelize, options);
  await migrator.up();
}
