import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../../server/db');
const wellService = require('../../server/services/well-service');
const { createApp } = require('../../server/app');

const well = {
  id: 'G3-1',
  name: 'G3-1 well',
  pumpDepth: 1200,
  pumpEfficiency: 35,
  submergence: 120,
  dailyOil: 8.5,
  current: 32,
  load: 55,
  dynamicLevel: 900
};

const deepenPlanRow = {
  id: '7',
  well_id: 'G3-1',
  deepen_amount: '100',
  current_pump_depth: '1200',
  new_pump_depth: '1300',
  current_efficiency: '35',
  estimated_efficiency: '38',
  efficiency_gain: '3',
  current_oil: '8.5',
  estimated_oil: '8.65',
  oil_gain: '0.15',
  current_submergence: '120',
  estimated_submergence: '150',
  safety_factor: 'safe',
  created_at: '2026-06-20T10:00:00.000Z'
};

const optimizationRecordRow = {
  id: '9',
  well_id: 'G3-1',
  record_date: '2026-06-20T00:00:00.000Z',
  prev_depth: '1200',
  new_depth: '1300',
  delta: '100',
  reason: 'low submergence',
  effect: 'oil gain',
  status: 'success',
  created_at: '2026-06-20T10:00:00.000Z'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('records and deepen plans api', () => {
  test('POST /api/deepen-plans/preview returns generated plan for a well and amount', async () => {
    vi.spyOn(wellService, 'getWell').mockResolvedValue(well);
    const app = createApp();

    const res = await request(app)
      .post('/api/deepen-plans/preview')
      .send({ wellId: 'G3-1', deepenAmount: 100 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      wellId: 'G3-1',
      deepenAmount: 100,
      currentPumpDepth: 1200,
      newPumpDepth: 1300,
      currentEfficiency: 35
    }));
    expect(wellService.getWell).toHaveBeenCalledWith('G3-1');
  });

  test('POST /api/deepen-plans validates missing well id before querying', async () => {
    const query = vi.spyOn(db, 'query');
    const getWell = vi.spyOn(wellService, 'getWell');
    const app = createApp();

    const res = await request(app)
      .post('/api/deepen-plans/preview')
      .send({ deepenAmount: 100 });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
    expect(getWell).not.toHaveBeenCalled();
  });

  test.each([null, false, []])(
    'POST /api/deepen-plans/preview rejects invalid deepenAmount %s before querying',
    async (deepenAmount) => {
      const query = vi.spyOn(db, 'query');
      const getWell = vi.spyOn(wellService, 'getWell');
      const app = createApp();

      const res = await request(app)
        .post('/api/deepen-plans/preview')
        .send({ wellId: 'G3-1', deepenAmount });

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
      expect(getWell).not.toHaveBeenCalled();
    }
  );

  test('POST /api/deepen-plans saves generated plan and returns 201', async () => {
    vi.spyOn(wellService, 'getWell').mockResolvedValue(well);
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [deepenPlanRow] });
    const app = createApp();

    const res = await request(app)
      .post('/api/deepen-plans')
      .send({ wellId: 'G3-1', deepenAmount: 100 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      id: 7,
      wellId: 'G3-1',
      deepenAmount: 100,
      currentPumpDepth: 1200,
      newPumpDepth: 1300,
      estimatedEfficiency: 38,
      safetyFactor: 'safe',
      createdAt: '2026-06-20T10:00:00.000Z'
    }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('insert into deepen_plans'), [
      'G3-1',
      100,
      1200,
      1300,
      35,
      '38.0',
      '3.0',
      8.5,
      '8.65',
      '0.15',
      120,
      '150',
      expect.any(String)
    ]);
  });

  test.each([null, false, []])(
    'POST /api/deepen-plans rejects invalid deepenAmount %s before querying',
    async (deepenAmount) => {
      const query = vi.spyOn(db, 'query');
      const getWell = vi.spyOn(wellService, 'getWell');
      const app = createApp();

      const res = await request(app)
        .post('/api/deepen-plans')
        .send({ wellId: 'G3-1', deepenAmount });

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
      expect(getWell).not.toHaveBeenCalled();
    }
  );

  test('GET /api/deepen-plans returns plans ordered by created_at desc in camelCase', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [deepenPlanRow] });
    const app = createApp();

    const res = await request(app).get('/api/deepen-plans');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: 7,
        wellId: 'G3-1',
        deepenAmount: 100,
        estimatedOil: 8.65,
        createdAt: '2026-06-20T10:00:00.000Z'
      })
    ]);
    expect(res.body[0]).not.toHaveProperty('well_id');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('order by created_at desc'));
  });

  test('GET /api/optimization-records returns records ordered by record_date desc', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [optimizationRecordRow] });
    const app = createApp();

    const res = await request(app).get('/api/optimization-records');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: 9,
        wellId: 'G3-1',
        recordDate: '2026-06-20',
        prevDepth: 1200,
        newDepth: 1300,
        delta: 100,
        status: 'success'
      })
    ]);
    expect(res.body[0]).not.toHaveProperty('well_id');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('order by record_date desc'));
  });

  test('GET /api/optimization-records filters by wellId when provided', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [optimizationRecordRow] });
    const app = createApp();

    const res = await request(app).get('/api/optimization-records?wellId=G3-1');

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('where well_id = $1'), ['G3-1']);
  });

  test('POST /api/optimization-records validates, inserts, and returns saved record', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [optimizationRecordRow] });
    const app = createApp();

    const res = await request(app)
      .post('/api/optimization-records')
      .send({
        wellId: 'G3-1',
        recordDate: '2026-06-20',
        prevDepth: 1200,
        newDepth: 1300,
        delta: 100,
        reason: 'low submergence',
        effect: 'oil gain',
        status: 'success'
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({
      id: 9,
      wellId: 'G3-1',
      recordDate: '2026-06-20',
      prevDepth: 1200,
      newDepth: 1300,
      delta: 100,
      reason: 'low submergence',
      effect: 'oil gain',
      status: 'success'
    }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('insert into optimization_records'), [
      'G3-1',
      '2026-06-20',
      1200,
      1300,
      100,
      'low submergence',
      'oil gain',
      'success'
    ]);
  });

  test('POST /api/optimization-records rejects invalid status before querying', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app)
      .post('/api/optimization-records')
      .send({
        wellId: 'G3-1',
        recordDate: '2026-06-20',
        prevDepth: 1200,
        newDepth: 1300,
        delta: 100,
        reason: 'low submergence',
        effect: 'oil gain',
        status: 'bad'
      });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test.each([
    ['prevDepth', null],
    ['prevDepth', false],
    ['prevDepth', []],
    ['newDepth', null],
    ['newDepth', false],
    ['newDepth', []],
    ['delta', null],
    ['delta', false],
    ['delta', []]
  ])(
    'POST /api/optimization-records rejects invalid %s %s before querying',
    async (field, value) => {
      const query = vi.spyOn(db, 'query');
      const app = createApp();

      const res = await request(app)
        .post('/api/optimization-records')
        .send({
          wellId: 'G3-1',
          recordDate: '2026-06-20',
          prevDepth: 1200,
          newDepth: 1300,
          delta: 100,
          reason: 'low submergence',
          effect: 'oil gain',
          status: 'success',
          [field]: value
        });

      expect(res.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    }
  );
});
