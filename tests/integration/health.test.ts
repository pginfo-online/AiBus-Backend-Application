import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('Health & Root Integration Tests', () => {
  const app = createApp();

  it('GET / should return operational status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'aibus-backend');
    expect(res.body).toHaveProperty('status', 'operational');
  });

  it('GET /health/live should pass liveness probe', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/v1/search should validate input and return 400 when missing params', async () => {
    const res = await request(app).get('/api/v1/search');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/search with valid params should return bus search results', async () => {
    const res = await request(app).get('/api/v1/search?fromCityId=4292&toCityId=4562&journeyDate=2026-12-01');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('results');
    expect(Array.isArray(res.body.data.results)).toBe(true);
    expect(res.body.data.results.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/buses/6901/chart should return seat layout', async () => {
    const res = await request(app).get('/api/v1/buses/6901/chart');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('BusId', 6901);
    expect(Array.isArray(res.body.data.Layout)).toBe(true);
  });
});
