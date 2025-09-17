import { expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  MySqlContainer,
  type StartedMySqlContainer,
} from '@testcontainers/mysql';
import { createApp } from '../../../src/app.js';
import { createTestConfig } from '../../../src/config/index.js';
import { mockGetSecret } from '../../../src/config/test-helpers.js';
import { createMySQLUserStore } from '../../../src/users/user-store-mysql.js';
import { createUserService } from '../../../src/users/user-service.js';

// Global container instance for test suite
let mysqlContainer: StartedMySqlContainer | null = null;

// Start MySQL container once for all tests
export async function setupTestDatabase(): Promise<StartedMySqlContainer> {
  if (!mysqlContainer) {
    mysqlContainer = await new MySqlContainer('mysql:8.0')
      .withDatabase('todo_test')
      .withUsername('test')
      .withUserPassword('test')
      .start();
  }
  return mysqlContainer;
}

// Stop container after all tests
export async function teardownTestDatabase(): Promise<void> {
  if (mysqlContainer) {
    await mysqlContainer.stop();
    mysqlContainer = null;
  }
}

// Create a test app with real MySQL database
export const createTestApp = async (overrides = {}) => {
  const container = await setupTestDatabase();

  // Override database config with TestContainer connection details
  const testConfig = createTestConfig(
    {
      ...overrides,
      database: {
        host: container.getHost(),
        port: container.getPort(),
        user: container.getUsername(),
        password: container.getUserPassword(),
        database: container.getDatabase(),
      },
    },
    mockGetSecret,
  );

  // Create real MySQL store
  const userStore = await createMySQLUserStore(testConfig.database);
  const userService = createUserService(userStore);

  return createApp(testConfig, { userStore }, { userService });
};

// Cached test app instance
let cachedTestApp: Express | null = null;

// Get the default test app (creates once, reuses)
export const getDefaultTestApp = async (): Promise<Express> => {
  if (!cachedTestApp) {
    cachedTestApp = await createTestApp();
  }
  return cachedTestApp;
};

// Common test origins for CORS testing
export const TEST_ORIGINS = {
  ALLOWED: 'http://localhost:3001',
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

// Expected security headers for validation
export const EXPECTED_SECURITY_HEADERS = {
  'x-dns-prefetch-control': 'off',
  'x-frame-options': 'SAMEORIGIN',
  'x-download-options': 'noopen',
  'x-content-type-options': 'nosniff',
  'x-xss-protection': '0',
} as const;

/**
 * Make a request with allowed origin and validate CORS + security headers
 */
export const requestWithAllowedOrigin = async (
  method: 'get' | 'post',
  path: string,
  payload?: unknown,
  app?: Express,
) => {
  const testApp = app || (await getDefaultTestApp());
  const req = request(testApp)
    [method](path)
    .set('Origin', TEST_ORIGINS.ALLOWED);

  if (payload && method === 'post') {
    req.set('Content-Type', 'application/json').send(payload);
  }

  return req;
};

/**
 * Make a request with blocked origin and validate security response
 */
export const requestWithBlockedOrigin = async (
  method: 'get' | 'post',
  path: string,
  payload?: unknown,
  app?: Express,
) => {
  const testApp = app || (await getDefaultTestApp());
  const req = request(testApp)
    [method](path)
    .set('Origin', TEST_ORIGINS.BLOCKED);

  if (payload && method === 'post') {
    req.set('Content-Type', 'application/json').send(payload);
  }

  return req;
};

/**
 * Validate that all expected security headers are present
 */
export const validateSecurityHeaders = (
  headers: Record<string, string>,
): void => {
  for (const [headerName, expectedValue] of Object.entries(
    EXPECTED_SECURITY_HEADERS,
  )) {
    expect(headers[headerName]).toBe(expectedValue);
  }

  // Validate HSTS header exists and has max-age
  expect(headers['strict-transport-security']).toContain('max-age=');
};

/**
 * Validate CORS behavior for allowed origins
 */
export const validateAllowedCors = (
  headers: Record<string, string>,
  expectedOrigin = TEST_ORIGINS.ALLOWED,
): void => {
  expect(headers['access-control-allow-origin']).toBe(expectedOrigin);
};

/**
 * Validate CORS behavior for blocked origins
 */
export const validateBlockedCors = (headers: Record<string, string>): void => {
  expect(headers['access-control-allow-origin']).toBeUndefined();
};

/**
 * Test rate limiting by making multiple requests
 */
export const testRateLimit = async (
  path: string,
  requestCount = 100,
  app?: Express,
) => {
  const testApp = app || (await getDefaultTestApp());
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

/**
 * Create large payload for testing request limits
 */
export const createLargePayload = (sizeInMB: number) => {
  return {
    data: 'x'.repeat(sizeInMB * 1024 * 1024),
  };
};

/**
 * Create normal test payload
 */
export const createNormalPayload = (customData?: Record<string, unknown>) => {
  return {
    test: 'data',
    timestamp: new Date().toISOString(),
    ...customData,
  };
};

/**
 * Comprehensive validation for a successful response with full security
 */
export const validateSuccessfulSecureResponse = (
  response: request.Response,
  expectedOrigin = TEST_ORIGINS.ALLOWED,
): void => {
  // Should be successful
  expect(response.status).toBe(200);

  // Should have proper CORS headers
  validateAllowedCors(response.headers, expectedOrigin);

  // Should have all security headers
  validateSecurityHeaders(response.headers);

  // Should have valid response body for health endpoint
  if (response.body && typeof response.body === 'object') {
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('service', 'todo-api');
  }
};

/**
 * Comprehensive validation for a blocked/secure response
 */
export const validateBlockedSecureResponse = (
  response: request.Response,
): void => {
  // CORS should block the origin
  validateBlockedCors(response.headers);

  // But security headers should still be present
  validateSecurityHeaders(response.headers);

  // Response should still work (application functionality preserved)
  if (response.body && typeof response.body === 'object') {
    expect(response.body).toHaveProperty('status', 'healthy');
  }
};

// Type definitions for test scenarios
export type TestScenario = {
  description: string;
  method: 'get' | 'post';
  path: string;
  headers?: Record<string, string>;
  payload?: unknown;
  expectedStatus?: number;
  shouldHaveCors?: boolean;
};

// Common test scenarios for reuse
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

/**
 * Run a test scenario and validate the response
 */
export const runTestScenario = async (
  scenario: TestScenario,
  app?: Express,
) => {
  const testApp = app || (await getDefaultTestApp());
  const req = request(testApp)[scenario.method](scenario.path);

  // Add headers
  if (scenario.headers) {
    Object.entries(scenario.headers).forEach(([key, value]) => {
      req.set(key, value);
    });
  }

  // Add payload for POST requests
  if (scenario.payload && scenario.method === 'post') {
    req.send(scenario.payload);
  }

  const response = await req;

  // Validate expected status
  if (scenario.expectedStatus) {
    expect(response.status).toBe(scenario.expectedStatus);
  }

  // Validate security headers are always present
  validateSecurityHeaders(response.headers);

  // Validate CORS behavior
  if (scenario.shouldHaveCors) {
    validateAllowedCors(response.headers);
  } else {
    validateBlockedCors(response.headers);
  }

  return response;
};
