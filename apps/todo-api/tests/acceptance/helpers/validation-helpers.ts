import { expect } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { TestScenario } from './test-helpers.js';
import { createTestApp, TEST_ORIGINS } from './test-helpers.js';

// Expected security headers for validation
export const EXPECTED_SECURITY_HEADERS = {
  'x-dns-prefetch-control': 'off',
  'x-frame-options': 'SAMEORIGIN',
  'x-download-options': 'noopen',
  'x-content-type-options': 'nosniff',
  'x-xss-protection': '0',
} as const;

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

/**
 * Run a test scenario and validate the response
 */
export const runTestScenario = async (
  scenario: TestScenario,
  app?: Express,
) => {
  const testApp = app || (await createTestApp());
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
