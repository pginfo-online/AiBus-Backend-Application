import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { idempotencyMiddleware } from '../../src/app/middleware/idempotency';

describe('Idempotency Middleware Unit Tests', () => {
  it('should pass through normal requests without Idempotency-Key header', async () => {
    const app = express();
    app.use(express.json());
    app.use(idempotencyMiddleware());

    let count = 0;
    app.post('/test', (_req, res) => {
      count++;
      res.json({ count });
    });

    const res1 = await request(app).post('/test').send({ data: 1 });
    expect(res1.status).toBe(200);
    expect(res1.body.count).toBe(1);

    const res2 = await request(app).post('/test').send({ data: 1 });
    expect(res2.status).toBe(200);
    expect(res2.body.count).toBe(2);
  });
});
