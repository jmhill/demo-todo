import request from 'supertest';
import type { Express } from 'express';
import mysql from 'mysql2/promise';
import { createApp } from '../../../src/app.js';
import { createTestConfig } from '../../../src/config/index.js';
import { mockGetSecret } from '../../../src/config/test-helpers.js';

// Connection pool for database operations
let connectionPool: mysql.Pool | null = null;

// Get database config from environment (set by global setup)
function getTestDatabaseConfig() {
  const host = process.env.TEST_DB_HOST;
  const port = process.env.TEST_DB_PORT;
  const user = process.env.TEST_DB_USER;
  const password = process.env.TEST_DB_PASSWORD;
  const database = process.env.TEST_DB_DATABASE;

  if (!host || !port || !user || !password || !database) {
    throw new Error(
      'Database config not found in environment. ' +
        'Make sure tests are running with globalSetup configured.',
    );
  }

  return {
    host,
    port: parseInt(port, 10),
    user,
    password,
    database,
  };
}

// Get or create connection pool for database operations
export async function getConnectionPool(): Promise<mysql.Pool> {
  if (!connectionPool) {
    const config = getTestDatabaseConfig();
    connectionPool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return connectionPool;
}

// Clean database between tests
export async function cleanDatabase(): Promise<void> {
  const pool = await getConnectionPool();
  const connection = await pool.getConnection();

  try {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    await connection.execute('TRUNCATE TABLE todos');
    await connection.execute('TRUNCATE TABLE organization_memberships');
    await connection.execute('TRUNCATE TABLE organizations');
    await connection.execute('TRUNCATE TABLE users');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('Failed to clean database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Create a fresh test app instance with optional config overrides
export async function createTestApp(
  overrides: Record<string, unknown> = {},
): Promise<Express> {
  const dbConfig = getTestDatabaseConfig();

  // Create test configuration with database config and any overrides
  const testConfig = createTestConfig(
    {
      ...overrides,
      database: dbConfig, // Database config always comes from shared container
    },
    mockGetSecret,
  );

  // Create app - all wiring happens inside createApp based on config
  return createApp(testConfig);
}

// Common test origins for CORS testing
export const TEST_ORIGINS = {
  ALLOWED: 'http://localhost:5173',
  BLOCKED: 'http://evil.com',
  ANOTHER_BLOCKED: 'http://malicious-site.com',
} as const;

// Common request configurations
export const REQUEST_CONFIGS = {
  WITH_ALLOWED_ORIGIN: {
    Origin: TEST_ORIGINS.ALLOWED,
  },
  WITH_BLOCKED_ORIGIN: {
    Origin: TEST_ORIGINS.BLOCKED,
  },
  WITH_JSON_CONTENT: {
    'Content-Type': 'application/json',
  },
  PREFLIGHT_REQUEST: {
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type',
  },
} as const;

// Helper functions for making requests
export const requestWithAllowedOrigin = async (
  method: 'get' | 'post',
  path: string,
  payload?: unknown,
  app?: Express,
) => {
  const testApp = app || (await createTestApp());
  const req = request(testApp)
    [method](path)
    .set('Origin', TEST_ORIGINS.ALLOWED);

  if (payload && method === 'post') {
    req.set('Content-Type', 'application/json').send(payload);
  }

  return req;
};

export const requestWithBlockedOrigin = async (
  method: 'get' | 'post',
  path: string,
  payload?: unknown,
  app?: Express,
) => {
  const testApp = app || (await createTestApp());
  const req = request(testApp)
    [method](path)
    .set('Origin', TEST_ORIGINS.BLOCKED);

  if (payload && method === 'post') {
    req.set('Content-Type', 'application/json').send(payload);
  }

  return req;
};

export const testRateLimit = async (
  path: string,
  requestCount = 100,
  app?: Express,
) => {
  const testApp = app || (await createTestApp());
  const requests = Array.from({ length: requestCount }, () =>
    request(testApp).get(path).set('Origin', TEST_ORIGINS.ALLOWED),
  );

  const responses = await Promise.all(requests);

  const successfulResponses = responses.filter((r) => r.status === 200);
  const rateLimitedResponses = responses.filter((r) => r.status === 429);

  return {
    successful: successfulResponses,
    rateLimited: rateLimitedResponses,
    total: responses,
  };
};

// Payload creation helpers
export const createLargePayload = (sizeInMB: number) => {
  return {
    data: 'x'.repeat(sizeInMB * 1024 * 1024),
  };
};

export const createNormalPayload = (customData?: Record<string, unknown>) => {
  return {
    test: 'data',
    timestamp: new Date().toISOString(),
    ...customData,
  };
};

// Helper to create an authenticated user and return token
export async function createAuthenticatedUser(
  app: Express,
  userData?: {
    email?: string;
    username?: string;
    password?: string;
  },
): Promise<{
  token: string;
  userId: string;
  user: { id: string; email: string; username: string };
}> {
  const email = userData?.email || 'authuser@example.com';
  const username = userData?.username || 'authuser';
  const password = userData?.password || 'AuthPass123!';

  // Create user directly in database to bypass auth requirement
  const pool = await getConnectionPool();
  const bcrypt = await import('bcrypt');
  const { v4: uuidv4 } = await import('uuid');

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    'INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [userId, email, username, passwordHash],
  );

  // Create a personal organization for the user
  // Using userId as organizationId for Phase 1 simplicity (todos use this in router)
  const organizationId = userId;
  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-');
  await pool.execute(
    'INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [organizationId, `${username}'s Organization`, slug],
  );

  // Create organization membership
  const membershipId = uuidv4();
  await pool.execute(
    "INSERT INTO organization_memberships (id, user_id, organization_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', NOW(), NOW())",
    [membershipId, userId, organizationId],
  );

  // Login to get token
  const loginResponse = await request(app).post('/auth/login').send({
    usernameOrEmail: username,
    password,
  });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Failed to login test user: ${JSON.stringify(loginResponse.body)}`,
    );
  }

  return {
    token: loginResponse.body.token,
    userId,
    user: {
      id: userId,
      email,
      username,
    },
  };
}

// Helper to create an organization
export async function createOrganization(
  app: Express,
  token: string,
  data: { name: string; slug: string },
): Promise<{ id: string; name: string; slug: string }> {
  const response = await request(app)
    .post('/organizations')
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  return response.body;
}

// Helper to add a member to an organization
export async function addOrgMember(
  app: Express,
  ownerToken: string,
  orgId: string,
  data: { userId: string; role: 'owner' | 'admin' | 'member' | 'viewer' },
): Promise<{
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}> {
  const response = await request(app)
    .post(`/organizations/${orgId}/members`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send(data)
    .expect(201);

  return response.body;
}

// Helper to create a todo in an organization
export async function createTodo(
  app: Express,
  token: string,
  orgId: string,
  data: { title: string; description?: string },
): Promise<{
  id: string;
  organizationId: string;
  createdBy: string;
  title: string;
  description?: string;
  completed: boolean;
}> {
  const response = await request(app)
    .post(`/orgs/${orgId}/todos`)
    .set('Authorization', `Bearer ${token}`)
    .send(data)
    .expect(201);

  return response.body;
}

// Test scenario types
export type TestScenario = {
  description: string;
  method: 'get' | 'post';
  path: string;
  headers?: Record<string, string>;
  payload?: unknown;
  expectedStatus?: number;
  shouldHaveCors?: boolean;
};

export const COMMON_TEST_SCENARIOS: TestScenario[] = [
  {
    description: 'GET request with allowed origin',
    method: 'get',
    path: '/health',
    headers: { Origin: TEST_ORIGINS.ALLOWED },
    expectedStatus: 200,
    shouldHaveCors: true,
  },
  {
    description: 'POST request with allowed origin and normal payload',
    method: 'post',
    path: '/health',
    headers: {
      Origin: TEST_ORIGINS.ALLOWED,
      'Content-Type': 'application/json',
    },
    payload: { test: 'data' },
    expectedStatus: 200,
    shouldHaveCors: true,
  },
  {
    description: 'GET request with blocked origin',
    method: 'get',
    path: '/health',
    headers: { Origin: TEST_ORIGINS.BLOCKED },
    expectedStatus: 200,
    shouldHaveCors: false,
  },
  {
    description: 'POST request with blocked origin',
    method: 'post',
    path: '/health',
    headers: {
      Origin: TEST_ORIGINS.BLOCKED,
      'Content-Type': 'application/json',
    },
    payload: { test: 'data' },
    expectedStatus: 200,
    shouldHaveCors: false,
  },
];
