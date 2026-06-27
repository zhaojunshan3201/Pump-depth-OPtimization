import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createRequire } from 'module';

vi.mock('../../server/services/well-service', () => ({
  getWell: vi.fn()
}));

const require = createRequire(import.meta.url);
const wellService = require('../../server/services/well-service');
const { createApp } = require('../../server/app');
const originalGetWell = wellService.getWell;

const validWell = {
  id: 'G3-4',
  name: 'G3-4 well',
  zone: 'G3',
  status: 'producing',
  depth: 1800,
  pumpDepth: 1200,
  pumpEfficiency: 45,
  dynamicLevel: 900,
  submergence: 300,
  current: 32,
  load: 55,
  strokeRate: 4.5,
  strokeLength: 3,
  backPressure: 1.2,
  dailyOil: 8.5,
  dailyWater: 12,
  waterCut: 58.5,
  lastOverhaul: '2026-06-01',
  reservoirPressure: 15,
  bubblePointPressure: 9,
  AOF: 18
};

beforeEach(() => {
  vi.clearAllMocks();
  wellService.getWell = vi.fn().mockResolvedValue(validWell);
});

afterEach(() => {
  wellService.getWell = originalGetWell;
});

describe('nodal api', () => {
  test('GET /api/nodal/:id returns nodal analysis for one well', async () => {
    const app = createApp();

    const res = await request(app).get('/api/nodal/G3-4');

    expect(res.status).toBe(200);
    expect(res.body.well).toBe('G3-4');
    expect(res.body.iprCurve.length).toBeGreaterThan(10);
    expect(res.body.vlpCurve.length).toBeGreaterThan(10);
  });

  test('GET /api/nodal/:id returns 404 for missing well', async () => {
    wellService.getWell = vi.fn().mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/nodal/MISSING');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: '井不存在' });
  });
});
