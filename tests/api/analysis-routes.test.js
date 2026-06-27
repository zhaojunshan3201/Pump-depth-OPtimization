import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const wellService = require('../../server/services/well-service');
const { createApp } = require('../../server/app');

const originalGetDynamicLevel = wellService.getDynamicLevel;

const wells = [
  {
    id: 'G3-1',
    name: 'G3-1井',
    zone: 'G3',
    status: 'producing',
    pumpEfficiency: 35,
    dynamicLevel: 900,
    submergence: 120,
    current: 32,
    load: 55,
    dailyOil: 8.5,
    dailyWater: 12,
    waterCut: 58.5,
    backPressure: 0.8
  },
  {
    id: 'G3-2',
    name: 'G3-2井',
    zone: 'G3',
    status: 'shutdown',
    pumpEfficiency: 20,
    dynamicLevel: 950,
    submergence: 80,
    current: 30,
    load: 50,
    dailyOil: 2,
    dailyWater: 8,
    waterCut: 95,
    backPressure: 1.2
  }
];

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (originalGetDynamicLevel) {
    wellService.getDynamicLevel = originalGetDynamicLevel;
  } else {
    delete wellService.getDynamicLevel;
  }
});

describe('analysis routes api', () => {
  test('GET /api/dashboard/summary returns summary object from mocked wells', async () => {
    vi.spyOn(wellService, 'listWells').mockResolvedValue(wells);
    const app = createApp();

    const res = await request(app).get('/api/dashboard/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      totalWells: 2,
      producingWells: 1,
      dailyOil: '10.5',
      potentialCount: 1,
      alertCount: 0
    }));
  });

  test('GET /api/screening/potential-wells returns potential wells', async () => {
    vi.spyOn(wellService, 'listWells').mockResolvedValue(wells);
    const app = createApp();

    const res = await request(app).get('/api/screening/potential-wells');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([expect.objectContaining({ id: 'G3-1' })]);
  });

  test('GET /api/tuning/reminders returns reminder object', async () => {
    vi.spyOn(Date.prototype, 'getDate').mockReturnValue(25);
    vi.spyOn(wellService, 'listWells').mockResolvedValue(wells);
    const app = createApp();

    const res = await request(app).get('/api/tuning/reminders');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      isTuningDay: true,
      nextTuningDay: null,
      wells: [expect.objectContaining({ id: 'G3-1' })]
    }));
  });

  test('GET /api/wells/:id/diagnosis returns diagnosis for one mocked well', async () => {
    vi.spyOn(wellService, 'getWell').mockResolvedValue(wells[0]);
    const app = createApp();

    const res = await request(app).get('/api/wells/G3-1/diagnosis');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      well: 'G3-1',
      wellId: 'G3-1',
      wellName: 'G3-1井',
      issues: expect.any(Array)
    }));
  });

  test('GET /api/wells/:id/diagnosis returns 404 for missing well', async () => {
    vi.spyOn(wellService, 'getWell').mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/wells/MISSING/diagnosis');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: '井不存在' });
  });

  test('GET /api/wells/:id/dynamic-level returns stored readings when available', async () => {
    const readings = [
      { wellId: 'G3-1', hourIndex: 0, levelValue: 900 },
      { wellId: 'G3-1', hourIndex: 1, levelValue: 902.5 }
    ];
    wellService.getDynamicLevel = vi.fn().mockResolvedValue(readings);
    const getWell = vi.spyOn(wellService, 'getWell');
    const app = createApp();

    const res = await request(app).get('/api/wells/G3-1/dynamic-level');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(readings);
    expect(getWell).not.toHaveBeenCalled();
  });

  test('GET /api/wells/:id/dynamic-level returns generated 24-hour trend when none are stored', async () => {
    wellService.getDynamicLevel = vi.fn().mockResolvedValue([]);
    vi.spyOn(wellService, 'getWell').mockResolvedValue(wells[0]);
    const app = createApp();

    const res = await request(app).get('/api/wells/G3-1/dynamic-level');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(24);
    expect(res.body[0]).toEqual(expect.objectContaining({ hourIndex: 0, levelValue: expect.any(Number) }));
  });

  test('GET /api/wells/:id/dynamic-level returns 404 for missing well when no readings are stored', async () => {
    wellService.getDynamicLevel = vi.fn().mockResolvedValue([]);
    vi.spyOn(wellService, 'getWell').mockResolvedValue(null);
    const app = createApp();

    const res = await request(app).get('/api/wells/MISSING/dynamic-level');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: '井不存在' });
  });
});
