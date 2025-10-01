import mysql from 'mysql2/promise';
import type { User, UserWithHashedPassword } from './user-schemas.js';
import type { UserStore } from './user-store.js';

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function createMySQLUserStore(
  config: MySQLConfig,
): Promise<UserStore> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  // Initialize schema if needed
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  return {
    async save(user: UserWithHashedPassword): Promise<void> {
      await connection.execute(
        `INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         username = VALUES(username),
         password_hash = VALUES(password_hash),
         updated_at = VALUES(updated_at)`,
        [
          user.id,
          user.email.toLowerCase(),
          user.username.toLowerCase(),
          user.passwordHash,
          user.createdAt,
          user.updatedAt,
        ],
      );
    },

    async findById(id: string): Promise<User | null> {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [id],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.id,
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByEmail(email: string): Promise<User | null> {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER(?)',
        [email],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.id,
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async findByUsername(username: string): Promise<User | null> {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
        [username],
      );

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.id,
        email: row.email,
        username: row.username,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
  };
}
