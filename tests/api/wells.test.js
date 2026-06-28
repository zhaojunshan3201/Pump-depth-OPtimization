import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const db = require('../../server/db');
const { createApp } = require('../../server/app');
const ExcelJS = require('exceljs');

function parseBinary(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

const dbWell = {
  id: 'G3-1',
  name: 'G3-1井',
  zone: 'G3',
  status: 'producing',
  depth: '1800',
  pump_depth: '1200',
  pump_efficiency: '45.5',
  dynamic_level: '900',
  submergence: '300',
  current_value: '32',
  load_value: '55',
  stroke_rate: '4.5',
  stroke_length: '3',
  back_pressure: '1.2',
  daily_oil: '8.5',
  daily_water: '12',
  water_cut: '58.5',
  last_overhaul: '2026-06-01T00:00:00.000Z',
  reservoir_pressure: '15',
  bubble_point_pressure: '9',
  aof: '18'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('wells api', () => {
  test('returns well list in camelCase including pumpDepth', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const app = createApp();

    const res = await request(app).get('/api/wells');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: 'G3-1',
        name: 'G3-1井',
        pumpDepth: 1200,
        pumpEfficiency: 45.5,
        current: 32,
        load: 55,
        lastOverhaul: '2026-06-01',
        AOF: 18
      })
    ]);
    expect(res.body[0]).not.toHaveProperty('pump_depth');
  });

  test('returns null for null numeric and date well fields', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({
      rows: [
        {
          ...dbWell,
          pump_depth: null,
          last_overhaul: null
        }
      ]
    });
    const app = createApp();

    const res = await request(app).get('/api/wells');

    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(expect.objectContaining({
      pumpDepth: null,
      lastOverhaul: null
    }));
  });

  test('returns one well by id', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const app = createApp();

    const res = await request(app).get('/api/wells/G3-1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ id: 'G3-1', pumpDepth: 1200 }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('where id = $1'), ['G3-1']);
  });

  test('returns 404 when one well does not exist', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [] });
    const app = createApp();

    const res = await request(app).get('/api/wells/NOPE');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: '井不存在' });
  });

  test('creates one well and returns 201', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const app = createApp();

    const res = await request(app).post('/api/wells').send({
      id: 'G3-1',
      name: 'G3-1井',
      zone: 'G3',
      status: 'producing',
      depth: 1800,
      pumpDepth: 1200,
      pumpEfficiency: 45.5,
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
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ id: 'G3-1', pumpDepth: 1200 }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('insert into wells'), expect.any(Array));
  });

  test('imports real wells with snake_case field names and upserts them', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const app = createApp();

    const res = await request(app).post('/api/wells/import').send({
      wells: [{
        id: 'REAL-1',
        name: '真实井-1',
        zone: '一区',
        status: 'producing',
        depth: 1888,
        pump_depth: 1666,
        pump_efficiency: 51.2,
        dynamic_level: 1200,
        submergence: 466,
        current_value: 37.8,
        load_value: 43.2,
        stroke_rate: 4.2,
        stroke_length: 3.0,
        back_pressure: 0.86,
        daily_oil: 4.6,
        daily_water: 10.1,
        water_cut: 68.7,
        last_overhaul: '2026-06-01',
        reservoir_pressure: 15.6,
        bubble_point_pressure: 9.4,
        aof: 16.8
      }]
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      imported: 1,
      wells: [expect.objectContaining({ id: 'G3-1', pumpDepth: 1200 })]
    });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('on conflict (id) do update set'), [
      'REAL-1',
      '真实井-1',
      '一区',
      'producing',
      1888,
      1666,
      51.2,
      1200,
      466,
      37.8,
      43.2,
      4.2,
      3.0,
      0.86,
      4.6,
      10.1,
      68.7,
      '2026-06-01',
      15.6,
      9.4,
      16.8
    ]);
  });

  test('downloads an Excel import template with all required well fields', async () => {
    const app = createApp();

    const res = await request(app).get('/api/wells/import-template').buffer(true).parse(parseBinary);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const sheet = workbook.worksheets[0];
    const headers = sheet.getRow(1).values.slice(1);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(headers).toEqual([
      '序号',
      '井号',
      '区块',
      '油井类型',
      '井底深度',
      '泵挂深度',
      '泵效',
      '动液面',
      '沉没度',
      '电流',
      '最大载荷',
      '冲次',
      '冲程',
      '回压',
      '日产油',
      '日产水',
      '含水',
      '最近作业日期',
      '地层压力',
      '饱和压力'
    ]);
  });

  test('imports real wells from an uploaded Excel workbook', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('油井数据');
    worksheet.addRow([
      '序号',
      '井号',
      '区块',
      '油井类型',
      '井底深度',
      '泵挂深度',
      '泵效',
      '动液面',
      '沉没度',
      '电流',
      '最大载荷',
      '冲次',
      '冲程',
      '回压',
      '日产油',
      '日产水',
      '含水',
      '最近作业日期',
      '地层压力',
      '饱和压力'
    ]);
    worksheet.addRow([
      1,
      'REAL-XLSX-1',
      '一区',
      '生产',
      1888,
      1666,
      51.2,
      1200,
      466,
      37.8,
      43.2,
      4.2,
      3.0,
      0.86,
      4.6,
      10.1,
      68.7,
      '2026-06-01',
      15.6,
      9.4
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const app = createApp();

    const res = await request(app).post('/api/wells/import-excel').send({
      fileName: 'real-wells.xlsx',
      fileBase64: buffer.toString('base64')
    });

    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('on conflict (id) do update set'), [
      'REAL-XLSX-1',
      'REAL-XLSX-1',
      '一区',
      'producing',
      1888,
      1666,
      51.2,
      1200,
      466,
      37.8,
      43.2,
      4.2,
      3,
      0.86,
      4.6,
      10.1,
      68.7,
      '2026-06-01',
      15.6,
      9.4,
      13.8
    ]);
  });

  test('rejects missing well id', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).post('/api/wells').send({ name: 'missing id' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: '井号不能为空' });
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects missing create fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).post('/api/wells').send({
      id: 'G3-1',
      status: 'producing'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: '井号不能为空' });
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects invalid status', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ status: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: '状态不合法' });
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects empty update text fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ name: '' });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects empty update numeric fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: '' });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects non-numeric update numeric fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: 'abc' });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects boolean update numeric fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: true });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects empty array update numeric fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: [] });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('rejects array update numeric fields before querying database', async () => {
    const query = vi.spyOn(db, 'query');
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: [1] });

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('allows numeric string update numeric fields', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ ...dbWell, depth: '1800' }] });
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ depth: '1800' });

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('update wells set'), expect.any(Array));
  });

  test('allows null status as no-change update value', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [dbWell] });
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ status: null });

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('update wells set'), expect.any(Array));
  });

  test('uses route id instead of payload id for update sql parameter', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ ...dbWell, status: 'maintenance' }] });
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ id: 'OTHER', status: 'maintenance' });

    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1][0]).toBe('G3-1');
  });

  test('updates one well by id', async () => {
    vi.spyOn(db, 'query').mockResolvedValue({ rows: [{ ...dbWell, status: 'maintenance' }] });
    const app = createApp();

    const res = await request(app).put('/api/wells/G3-1').send({ status: 'maintenance' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ id: 'G3-1', status: 'maintenance' }));
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('updated_at = now()'), expect.any(Array));
  });
});
