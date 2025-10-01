import { Sequelize } from 'sequelize';
import type { AppConfig } from '../config/schema.js';

export type DatabaseConfig = AppConfig['database'];

export function createSequelize(config: DatabaseConfig): Sequelize {
  return new Sequelize({
    dialect: 'mysql',
    host: config.host,
    port: config.port,
    username: config.user,
    password: config.password,
    database: config.database,
    logging: false, // Disable SQL logging in production
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}
