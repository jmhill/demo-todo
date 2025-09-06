import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configureSecureHeaders } from './secure-headers.js';

describe('Secure Headers', () => {
  const app = express();
  configureSecureHeaders(app);
  app.get('/test', (_req, res) => res.send('ok'));

  it('should set X-DNS-Prefetch-Control header', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('should set X-Frame-Options header to prevent clickjacking', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should set X-Content-Type-Options header to prevent MIME sniffing', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set Strict-Transport-Security header for HTTPS enforcement', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('should set X-XSS-Protection header', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-xss-protection']).toBe('0');
  });

  it('should remove X-Powered-By header', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});