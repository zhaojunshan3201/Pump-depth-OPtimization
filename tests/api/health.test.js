import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../../server/db');
const { createApp } = require('../../server/app');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('health api', () => {
  test('returns ok when database query succeeds', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ ok: 1 }] });
    const app = createApp();

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });

  test('allows local file pages to call api routes', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ ok: 1 }] });
    const app = createApp();

    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'null');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('does not expose package metadata through static serving', async () => {
    const app = createApp();

    const res = await request(app).get('/package.json');

    expect(res.status).toBe(404);
  });

  test('does not expose server source through static serving', async () => {
    const app = createApp();

    const res = await request(app).get('/server/db.js');

    expect(res.status).toBe(404);
  });

  test('continues serving the frontend entry point', async () => {
    const app = createApp();

    const res = await request(app).get('/index.html');

    expect(res.status).toBe(200);
  });
});
