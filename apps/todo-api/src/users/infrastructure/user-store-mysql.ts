/**
 * Raw SQL User Store Implementation
 *
 * This is a simple example of implementing the UserStore interface using
 * raw SQL queries with the mysql2 driver. It demonstrates the fundamentals
 * without an ORM layer.
 *
 * Key characteristics:
 * - Uses connection pooling for better performance and resource management
 * - Synchronous creation (no schema management during initialization)
 * - Schema must be created separately via migrate-mysql-raw.ts
 * - Strips passwordHash before returning User objects (type safety)
 *
 * For production applications, consider using:
 * - An ORM like Sequelize (see user-store-sequelize.ts)
 * - Proper migration tools like Umzug, Flyway, or Liquibase
 * - Connection pool configuration tuning
 * - Query optimization and prepared statements
 */
import mysql from 'mysql2/promise';
import type { User, UserWithHashedPassword } from '../domain/user-schemas.js';
import type { UserStore } from '../domain/user-service.js';

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function createMySQLUserStore(config: MySQLConfig): UserStore {
  // Create connection pool (synchronous)
  // Pool manages multiple connections for concurrent requests
  const pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return {
    async save(user: UserWithHashedPassword): Promise<void> {
      // Insert with UUID, let database auto-generate integer PK
      await pool.execute(
        `INSERT INTO users (uuid, email, username, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         username = VALUES(username),
         password_hash = VALUES(password_hash),
         updated_at = VALUES(updated_at)`,
        [
          user.id, // domain id maps to database uuid column
          user.email.toLowerCase(),
          user.username.toLowerCase(),
          user.passwordHash,
          user.createdAt,
          user.updatedAt,
        ],
      );
    },

    async findById(id: string): Promise<User | null> {
      // Query by uuid column, not integer PK
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE uuid = ?',
        [id],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.uuid, // Map database uuid to domain id
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByEmail(email: string): Promise<User | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
        [email],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.uuid, // Map database uuid to domain id
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByUsername(username: string): Promise<User | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
        [username],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.uuid, // Map database uuid to domain id
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByEmailWithPassword(
      email: string,
    ): Promise<UserWithHashedPassword | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
        [email],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.uuid, // Map database uuid to domain id
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByUsernameWithPassword(
      username: string,
    ): Promise<UserWithHashedPassword | null> {
      const [rows] = await pool.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
        [username],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.uuid, // Map database uuid to domain id
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
  };
}
