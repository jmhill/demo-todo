import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { getDefaultTestApp, createTestApp } from '../helpers/test-helpers.js';

describe('Security Middleware Integration (Acceptance)', () => {
  describe('CORS with complete application stack', () => {
    it('should block unauthorized origins while preserving other middleware functionality', async () => {
      const testApp = await getDefaultTestApp();
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://evil.com')
        .expect(200);

      // CORS should block the origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      // But other security headers should still be present
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();

      // And the endpoint should still function
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should allow authorized origins while maintaining full security posture', async () => {
      const testApp = await getDefaultTestApp();
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://localhost:3001')
        .expect(200);

      // CORS should allow the origin
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );

      // Security headers should still be present
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();

      // Response should be valid
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should handle preflight requests with full middleware stack', async () => {
      const testApp = await getDefaultTestApp();
      const response = await request(testApp)
        .options('/health')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      // CORS preflight response
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
      expect(response.headers['access-control-allow-methods']).toContain(
        'POST',
      );

      // Security headers should still apply
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('Rate limiting with complete application stack', () => {
    it('should enforce rate limits while preserving CORS and security headers', async () => {
      // Create a dedicated app instance with realistic rate limits for testing
      const rateLimitApp = await createTestApp({
        security: {
          rateLimiting: {
            windowMs: 60000, // 1 minute
            max: 10, // 10 requests per minute
          },
        },
      });

      const origin = 'http://localhost:3001';

      // Make requests up to the rate limit
      const requests = [];
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(rateLimitApp).get('/health').set('Origin', origin),
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should succeed with full headers
      const successfulResponses = responses.filter((r) => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);

      for (const response of successfulResponses.slice(0, 5)) {
        // CORS headers should be present
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        // Security headers should be present
        expect(response.headers['x-frame-options']).toBeDefined();
        // Response should be valid
        expect(response.body).toHaveProperty('status', 'healthy');
      }

      // Eventually some should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should still have security headers
      if (rateLimitedResponses.length > 0) {
        const rateLimitedResponse = rateLimitedResponses[0];
        if (rateLimitedResponse) {
          expect(rateLimitedResponse.headers['x-frame-options']).toBeDefined();
          expect(
            rateLimitedResponse.headers['x-content-type-options'],
          ).toBeDefined();
        }
      }
    });
  });

  describe('Request limits with complete application stack', () => {
    it('should enforce JSON payload limits while maintaining security posture', async () => {
      const testApp = await getDefaultTestApp();
      // Create a payload that exceeds the limit
      const largePayload = {
        data: 'x'.repeat(2 * 1024 * 1024), // 2MB payload
      };

      const response = await request(testApp)
        .post('/health')
        .set('Origin', 'http://localhost:3001')
        .set('Content-Type', 'application/json')
        .send(largePayload);

      // Should be rejected due to size limit
      expect([413, 400]).toContain(response.status);

      // But security headers should still be applied
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();

      // CORS should still work
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
    });

    it('should accept normal payloads with full security stack', async () => {
      const testApp = await getDefaultTestApp();
      const normalPayload = {
        test: 'data',
      };

      const response = await request(testApp)
        .post('/health')
        .set('Origin', 'http://localhost:3001')
        .set('Content-Type', 'application/json')
        .send(normalPayload)
        .expect(200);

      // Should succeed with all security measures
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Security headers with complete application stack', () => {
    it('should apply all security headers consistently across different request types', async () => {
      const testApp = await getDefaultTestApp();
      const testCases = [
        { method: 'get' as const, path: '/health' },
        { method: 'post' as const, path: '/health' },
      ];

      for (const testCase of testCases) {
        const req = request(testApp)[testCase.method](testCase.path);
        const response = await req
          .set('Origin', 'http://localhost:3001')
          .expect(200);

        // Verify comprehensive security headers
        expect(response.headers['x-dns-prefetch-control']).toBe('off');
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(response.headers['x-download-options']).toBe('noopen');
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-xss-protection']).toBe('0');
        expect(response.headers['strict-transport-security']).toContain(
          'max-age=',
        );

        // CORS should work
        expect(response.headers['access-control-allow-origin']).toBe(
          'http://localhost:3001',
        );

        // Content should be correct
        expect(response.body).toHaveProperty('status', 'healthy');
      }
    });
  });

  describe('Middleware ordering and interaction', () => {
    it('should handle complex scenarios with all middleware working together', async () => {
      const testApp = await getDefaultTestApp();
      // Test a realistic scenario: authorized origin, normal payload, within rate limits
      const response = await request(testApp)
        .post('/health')
        .set('Origin', 'http://localhost:3001')
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'Test Client')
        .send({ message: 'health check' })
        .expect(200);

      // All middleware should have processed the request successfully
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'todo-api');
    });

    it('should maintain security even when requests are problematic', async () => {
      const testApp = getDefaultTestApp();
      // Test with unauthorized origin and edge-case headers
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://malicious-site.com')
        .set('X-Forwarded-For', '10.0.0.1')
        .expect(200);

      // CORS should block the origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      // But security headers should still protect
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toContain(
        'max-age=',
      );

      // And the application should still respond correctly
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });
});
