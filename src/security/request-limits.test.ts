import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configureRequestLimits } from './request-limits.js';

describe('Request Size Limits', () => {
  const app = express();
  configureRequestLimits(app);
  app.post('/test', (_req, res) => res.send('ok'));

  it('should reject JSON payloads exceeding size limit', async () => {
    const largePayload = { data: 'x'.repeat(20 * 1024 * 1024) }; // 20MB payload

    const response = await request(app)
      .post('/test')
      .send(largePayload)
      .expect(413);

    expect(response.text).toContain('too large');
  });

  it('should accept JSON payloads within size limit', async () => {
    const smallPayload = { data: 'test' };

    await request(app).post('/test').send(smallPayload).expect(200);
  });
});
