import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  TEST_ORIGINS,
  requestWithAllowedOrigin,
  requestWithBlockedOrigin,
  testRateLimit,
  createLargePayload,
  createNormalPayload,
  COMMON_TEST_SCENARIOS,
  createTestApp,
} from '../helpers/test-helpers.js';
import {
  validateSuccessfulSecureResponse,
  validateBlockedSecureResponse,
  runTestScenario,
} from '../helpers/validation-helpers.js';

describe('Security Middleware Integration with Helpers (Acceptance)', () => {
  describe('Running common test scenarios', () => {
    COMMON_TEST_SCENARIOS.forEach((scenario) => {
      it(scenario.description, async () => {
        await runTestScenario(scenario);
      });
    });
  });

  describe('CORS and Security Headers interaction', () => {
    it('should handle allowed origins with full security stack', async () => {
      const response = await requestWithAllowedOrigin('get', '/health');
      validateSuccessfulSecureResponse(response);
    });

    it('should handle blocked origins while maintaining security', async () => {
      const response = await requestWithBlockedOrigin('get', '/health');
      expect(response.status).toBe(200);
      validateBlockedSecureResponse(response);
    });

    it('should handle POST requests with payloads correctly', async () => {
      const payload = createNormalPayload({ userId: 123 });
      const response = await requestWithAllowedOrigin(
        'post',
        '/health',
        payload,
      );
      validateSuccessfulSecureResponse(response);
    });
  });

  describe('Rate limiting in production-like context', () => {
    it('should enforce rate limits across the full application stack', async () => {
      // Create a dedicated app instance with realistic rate limits for testing
      const rateLimitApp = await createTestApp({
        security: {
          rateLimiting: {
            windowMs: 60000, // 1 minute
            max: 10, // 10 requests per minute
          },
        },
      });

      const results = await testRateLimit('/health', 15, rateLimitApp);

      // Should have both successful and rate-limited responses
      expect(results.successful.length).toBeGreaterThan(0);
      expect(results.rateLimited.length).toBeGreaterThan(0);

      // Successful responses should have full security posture
      if (results.successful.length > 0 && results.successful[0]) {
        validateSuccessfulSecureResponse(
          results.successful[0],
          TEST_ORIGINS.ALLOWED,
        );
      }
    });
  });

  describe('Request size limits with full middleware stack', () => {
    it('should reject oversized payloads while maintaining security', async () => {
      const largePayload = createLargePayload(2); // 2MB

      const testApp = await createTestApp();
      const response = await request(testApp)
        .post('/health')
        .set('Origin', TEST_ORIGINS.ALLOWED)
        .set('Content-Type', 'application/json')
        .send(largePayload);

      // Should be rejected but still have security headers
      expect([413, 400]).toContain(response.status);
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
    });

    it('should accept normal payloads through full stack', async () => {
      const normalPayload = createNormalPayload();
      const testApp = await createTestApp();
      const response = await requestWithAllowedOrigin(
        'post',
        '/health',
        normalPayload,
        testApp,
      );
      validateSuccessfulSecureResponse(response);
    });
  });

  describe('Edge cases and complex interactions', () => {
    it('should handle preflight requests correctly', async () => {
      const testApp = await createTestApp();
      const response = await request(testApp)
        .options('/health')
        .set('Origin', TEST_ORIGINS.ALLOWED)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        TEST_ORIGINS.ALLOWED,
      );
      expect(response.headers['access-control-allow-methods']).toContain(
        'POST',
      );
      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should maintain security with unusual request patterns', async () => {
      const testApp = await createTestApp();
      const response = await request(testApp)
        .get('/health')
        .set('Origin', TEST_ORIGINS.BLOCKED)
        .set('X-Forwarded-For', '10.0.0.1, 192.168.1.1')
        .set('User-Agent', 'Suspicious Bot 1.0')
        .expect(200);

      validateBlockedSecureResponse(response);
    });

    it('should handle multiple security concerns simultaneously', async () => {
      const testApp = await createTestApp();
      // Test with blocked origin AND suspicious headers
      const response = await request(testApp)
        .post('/health')
        .set('Origin', 'http://suspicious-site.org')
        .set('Content-Type', 'application/json')
        .set('X-Custom-Header', 'malicious-value')
        .send({ test: 'data' })
        .expect(200);

      // CORS should block
      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      // Security headers should be present
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');

      // Application should still function
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });
});
