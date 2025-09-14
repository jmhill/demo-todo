import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configureRateLimiting } from './rate-limiting.js';

describe('Rate Limiting', () => {
  const app = express();
  const rateLimitConfig = {
    enabled: true,
    windowMs: 60000, // 1 minute
    max: 5, // 5 requests per minute for testing
  };
  configureRateLimiting(app, rateLimitConfig);
  app.get('/test', (_req, res) => res.send('ok'));

  it('should include rate limit headers in response', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
  });

  it('should have configured rate limit of 5 requests', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.headers['x-ratelimit-limit']).toBe('5');
  });

  it('should include standard rate limit headers', async () => {
    const response = await request(app).get('/test').expect(200);

    expect(response.headers['ratelimit-limit']).toBeDefined();
    expect(response.headers['ratelimit-remaining']).toBeDefined();
  });
});
