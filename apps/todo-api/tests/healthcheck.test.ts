import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/main.js';
import type { HealthCheckResponse } from '../src/healthcheck.js';

describe('Health Check Endpoint', () => {
  it('should return 200 status code', async () => {
    await request(app).get('/health').expect(200);
  });

  it('should return JSON content type', async () => {
    await request(app)
      .get('/health')
      .expect('Content-Type', /application\/json/);
  });

  it('should return correct health check structure', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('node');
    expect(body).toHaveProperty('memory');
  });

  it('should return healthy status', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;
    expect(body.status).toBe('healthy');
  });

  it('should return correct service name and version', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;
    expect(body.service).toBe('todo-api');
    expect(body.version).toBe('1.0.0');
  });

  it('should return valid memory information', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;
    expect(body.memory).toHaveProperty('used');
    expect(body.memory).toHaveProperty('total');
    expect(body.memory).toHaveProperty('percentage');

    expect(typeof body.memory.used).toBe('number');
    expect(typeof body.memory.total).toBe('number');
    expect(typeof body.memory.percentage).toBe('number');

    expect(body.memory.used).toBeGreaterThan(0);
    expect(body.memory.total).toBeGreaterThan(0);
    expect(body.memory.percentage).toBeGreaterThanOrEqual(0);
    expect(body.memory.percentage).toBeLessThanOrEqual(100);
  });

  it('should return valid timestamp', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;
    const timestamp = new Date(body.timestamp);

    expect(timestamp.toString()).not.toBe('Invalid Date');
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should return non-negative uptime', async () => {
    const response = await request(app).get('/health').expect(200);

    const body: HealthCheckResponse = response.body;
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
