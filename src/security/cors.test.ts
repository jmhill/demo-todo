import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configureCors } from './cors.js';

describe('CORS Configuration', () => {
  const app = express();
  configureCors(app);
  app.get('/test', (_req, res) => res.send('ok'));

  it('should block requests from unauthorized origins', async () => {
    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://evil.com')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should allow requests from localhost:3001 for development', async () => {
    const response = await request(app)
      .get('/test')
      .set('Origin', 'http://localhost:3001')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('should allow requests with no origin', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});