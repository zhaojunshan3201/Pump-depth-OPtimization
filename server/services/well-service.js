const db = require('../db');
const { mapWell } = require('./formatters');
const ExcelJS = require('exceljs');

const VALID_STATUSES = new Set(['producing', 'maintenance', 'shutdown']);
const WELL_IMPORT_FIELDS = [
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
];
const NUMERIC_FIELDS = new Set([
  'depth',
  'pumpDepth',
  'pumpEfficiency',
  'dynamicLevel',
  'submergence',
  'current',
  'load',
  'strokeRate',
  'strokeLength',
  'backPressure',
  'dailyOil',
  'dailyWater',
  'waterCut',
  'reservoirPressure',
  'bubblePointPressure',
  'AOF'
]);
const TEXT_UPDATE_FIELDS = new Set(['name', 'zone', 'lastOverhaul']);
const REQUIRED_CREATE_FIELDS = [
  'id',
  'name',
  'zone',
  'status',
  'depth',
  'pumpDepth',
  'pumpEfficiency',
  'dynamicLevel',
  'submergence',
  'current',
  'load',
  'strokeRate',
  'strokeLength',
  'backPressure',
  'dailyOil',
  'dailyWater',
  'waterCut',
  'lastOverhaul',
  'reservoirPressure',
  'bubblePointPressure',
  'AOF'
];
const SNAKE_CASE_FIELDS = {
  pump_depth: 'pumpDepth',
  pump_efficiency: 'pumpEfficiency',
  dynamic_level: 'dynamicLevel',
  current_value: 'current',
  load_value: 'load',
  stroke_rate: 'strokeRate',
  stroke_length: 'strokeLength',
  back_pressure: 'backPressure',
  daily_oil: 'dailyOil',
  daily_water: 'dailyWater',
  water_cut: 'waterCut',
  last_overhaul: 'lastOverhaul',
  reservoir_pressure: 'reservoirPressure',
  bubble_point_pressure: 'bubblePointPressure',
  aof: 'AOF'
};
const IMPORT_FIELD_ALIASES = {
  id: 'id',
  name: 'name',
  zone: 'zone',
  status: 'status',
  depth: 'depth',
  pump_depth: 'pumpDepth',
  pump_efficiency: 'pumpEfficiency',
  dynamic_level: 'dynamicLevel',
  submergence: 'submergence',
  current_value: 'current',
  load_value: 'load',
  stroke_rate: 'strokeRate',
  stroke_length: 'strokeLength',
  back_pressure: 'backPressure',
  daily_oil: 'dailyOil',
  daily_water: 'dailyWater',
  water_cut: 'waterCut',
  last_overhaul: 'lastOverhaul',
  reservoir_pressure: 'reservoirPressure',
  bubble_point_pressure: 'bubblePointPressure',
  aof: 'AOF',
  '井号': 'id',
  '区块': 'zone',
  '油井类型': 'status',
  '井底深度': 'depth',
  '泵挂深度': 'pumpDepth',
  '泵效': 'pumpEfficiency',
  '动液面': 'dynamicLevel',
  '沉没度': 'submergence',
  '电流': 'current',
  '最大载荷': 'load',
  '冲次': 'strokeRate',
  '冲程': 'strokeLength',
  '回压': 'backPressure',
  '日产油': 'dailyOil',
  '日产水': 'dailyWater',
  '含水': 'waterCut',
  '最近作业日期': 'lastOverhaul',
  '地层压力': 'reservoirPressure',
  '饱和压力': 'bubblePointPressure'
};
const STATUS_ALIASES = {
  '生产': 'producing',
  '正常': 'producing',
  producing: 'producing',
  '作业': 'maintenance',
  '维护': 'maintenance',
  maintenance: 'maintenance',
  '关停': 'shutdown',
  '停井': 'shutdown',
  shutdown: 'shutdown'
};
const WELL_COLUMNS = `
  id, name, zone, status, depth, pump_depth, pump_efficiency, dynamic_level,
  submergence, current_value, load_value, stroke_rate, stroke_length,
  back_pressure, daily_oil, daily_water, water_cut, last_overhaul,
  reservoir_pressure, bubble_point_pressure, aof
`;

function validationError(error) {
  const err = new Error(error);
  err.statusCode = 400;
  return err;
}

function requireWellId(id) {
  if (!id) {
    throw validationError('井号不能为空');
  }
}

function validateRequiredCreateFields(payload) {
  const hasMissingField = REQUIRED_CREATE_FIELDS.some((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });

  if (hasMissingField) {
    throw validationError('井号不能为空');
  }
}

function validateStatus(status) {
  if (status !== undefined && status !== null && !VALID_STATUSES.has(status)) {
    throw validationError('状态不合法');
  }
}

function isBlankString(value) {
  return typeof value === 'string' && value.trim() === '';
}

function isValidNumericUpdateValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return !isBlankString(value) && Number.isFinite(Number(value));
  }

  return false;
}

function validateUpdatePayload(payload) {
  for (const [field, value] of Object.entries(payload)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (NUMERIC_FIELDS.has(field)) {
      if (!isValidNumericUpdateValue(value)) {
        throw validationError('数值不合法');
      }
      continue;
    }

    if (TEXT_UPDATE_FIELDS.has(field) && isBlankString(value)) {
      throw validationError('井号不能为空');
    }
  }
}

function toDbValues(payload) {
  return [
    payload.id,
    payload.name,
    payload.zone,
    payload.status,
    payload.depth,
    payload.pumpDepth,
    payload.pumpEfficiency,
    payload.dynamicLevel,
    payload.submergence,
    payload.current,
    payload.load,
    payload.strokeRate,
    payload.strokeLength,
    payload.backPressure,
    payload.dailyOil,
    payload.dailyWater,
    payload.waterCut,
    payload.lastOverhaul,
    payload.reservoirPressure,
    payload.bubblePointPressure,
    payload.AOF
  ];
}

function normalizeWellPayload(payload) {
  const normalized = { ...payload };
  for (const [sourceKey, targetKey] of Object.entries(IMPORT_FIELD_ALIASES)) {
    if (normalized[targetKey] === undefined && normalized[sourceKey] !== undefined) {
      normalized[targetKey] = normalized[sourceKey];
    }
  }
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_CASE_FIELDS)) {
    if (normalized[camelKey] === undefined && normalized[snakeKey] !== undefined) {
      normalized[camelKey] = normalized[snakeKey];
    }
  }
  if (normalized.name === undefined && normalized.id !== undefined) {
    normalized.name = normalized.id;
  }
  if (normalized.status !== undefined && normalized.status !== null) {
    normalized.status = STATUS_ALIASES[String(normalized.status).trim()] || normalized.status;
  }
  if (normalized.AOF === undefined || normalized.AOF === null || normalized.AOF === '') {
    const dailyOil = Number(normalized.dailyOil || 0);
    normalized.AOF = Number.isFinite(dailyOil) && dailyOil > 0 ? Number((dailyOil * 3).toFixed(2)) : 0;
  }
  return normalized;
}

async function createImportTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('油井数据');
  const rows = [
    WELL_IMPORT_FIELDS,
    [
      'REAL-1',
      '真实井-1',
      '采油作业一区',
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
    ]
  ];
  rows[1] = [
    1,
    'REAL-1',
    '采油作业一区',
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
  ];
  rows.forEach((row) => worksheet.addRow(row));
  WELL_IMPORT_FIELDS.forEach((field, index) => {
    worksheet.getColumn(index + 1).width = Math.max(field.length + 2, 14);
  });
  worksheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function normalizeCellValue(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object') {
    if (value.text) return value.text;
    if (value.result !== undefined) return value.result;
  }
  return value;
}

async function readWellsFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw validationError('Excel模板不能为空');
  }

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell, index) => {
    headers[index - 1] = String(cell.value || '').trim();
  });
  const wells = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const well = {};
    headers.forEach((header, index) => {
      if (!header || header === '序号') return;
      well[header] = normalizeCellValue(row.getCell(index + 1).value);
    });
    if (String(well.id || well['井号'] || '').trim() !== '') wells.push(well);
  });
  return wells;
}

async function listWells() {
  const result = await db.query(`select ${WELL_COLUMNS} from wells order by id`);
  return result.rows.map(mapWell);
}

async function getWell(id) {
  requireWellId(id);
  const result = await db.query(`select ${WELL_COLUMNS} from wells where id = $1`, [id]);
  return result.rows[0] ? mapWell(result.rows[0]) : null;
}

async function createWell(payload) {
  payload = normalizeWellPayload(payload);
  validateRequiredCreateFields(payload);
  validateStatus(payload.status);

  const result = await db.query(
    `insert into wells (
      id, name, zone, status, depth, pump_depth, pump_efficiency, dynamic_level,
      submergence, current_value, load_value, stroke_rate, stroke_length,
      back_pressure, daily_oil, daily_water, water_cut, last_overhaul,
      reservoir_pressure, bubble_point_pressure, aof
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      $16, $17, $18, $19, $20, $21
    )
    returning ${WELL_COLUMNS}`,
    toDbValues(payload)
  );

  return mapWell(result.rows[0]);
}

async function importWells(payload) {
  const wells = Array.isArray(payload) ? payload : payload?.wells;
  if (!Array.isArray(wells) || wells.length === 0) {
    throw validationError('导入数据不能为空');
  }

  const imported = [];
  for (const rawWell of wells) {
    const well = normalizeWellPayload(rawWell);
    validateRequiredCreateFields(well);
    validateStatus(well.status);

    const result = await db.query(
      `insert into wells (
        id, name, zone, status, depth, pump_depth, pump_efficiency, dynamic_level,
        submergence, current_value, load_value, stroke_rate, stroke_length,
        back_pressure, daily_oil, daily_water, water_cut, last_overhaul,
        reservoir_pressure, bubble_point_pressure, aof
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21
      )
      on conflict (id) do update set
        name = excluded.name,
        zone = excluded.zone,
        status = excluded.status,
        depth = excluded.depth,
        pump_depth = excluded.pump_depth,
        pump_efficiency = excluded.pump_efficiency,
        dynamic_level = excluded.dynamic_level,
        submergence = excluded.submergence,
        current_value = excluded.current_value,
        load_value = excluded.load_value,
        stroke_rate = excluded.stroke_rate,
        stroke_length = excluded.stroke_length,
        back_pressure = excluded.back_pressure,
        daily_oil = excluded.daily_oil,
        daily_water = excluded.daily_water,
        water_cut = excluded.water_cut,
        last_overhaul = excluded.last_overhaul,
        reservoir_pressure = excluded.reservoir_pressure,
        bubble_point_pressure = excluded.bubble_point_pressure,
        aof = excluded.aof,
        updated_at = now()
      returning ${WELL_COLUMNS}`,
      toDbValues(well)
    );
    imported.push(mapWell(result.rows[0]));
  }

  return imported;
}

async function importWellsFromExcel(payload) {
  if (!payload?.fileBase64) {
    throw validationError('请上传Excel模板文件');
  }

  const buffer = Buffer.from(payload.fileBase64, 'base64');
  const wells = await readWellsFromExcel(buffer);
  return importWells(wells);
}

async function updateWell(id, payload) {
  requireWellId(id);
  validateUpdatePayload(payload);
  validateStatus(payload.status);

  const result = await db.query(
    `update wells set
      name = coalesce($2, name),
      zone = coalesce($3, zone),
      status = coalesce($4, status),
      depth = coalesce($5, depth),
      pump_depth = coalesce($6, pump_depth),
      pump_efficiency = coalesce($7, pump_efficiency),
      dynamic_level = coalesce($8, dynamic_level),
      submergence = coalesce($9, submergence),
      current_value = coalesce($10, current_value),
      load_value = coalesce($11, load_value),
      stroke_rate = coalesce($12, stroke_rate),
      stroke_length = coalesce($13, stroke_length),
      back_pressure = coalesce($14, back_pressure),
      daily_oil = coalesce($15, daily_oil),
      daily_water = coalesce($16, daily_water),
      water_cut = coalesce($17, water_cut),
      last_overhaul = coalesce($18, last_overhaul),
      reservoir_pressure = coalesce($19, reservoir_pressure),
      bubble_point_pressure = coalesce($20, bubble_point_pressure),
      aof = coalesce($21, aof),
      updated_at = now()
    where id = $1
    returning ${WELL_COLUMNS}`,
    [id, ...toDbValues({ ...payload, id }).slice(1)]
  );

  return result.rows[0] ? mapWell(result.rows[0]) : null;
}

async function getDynamicLevel(id) {
  requireWellId(id);
  const result = await db.query(
    `select well_id, hour_index, level_value
    from dynamic_level_readings
    where well_id = $1
    order by hour_index`,
    [id]
  );

  return result.rows.map((row) => ({
    wellId: row.well_id,
    hourIndex: Number(row.hour_index),
    levelValue: Number(row.level_value)
  }));
}

module.exports = {
  listWells,
  getWell,
  createWell,
  importWells,
  importWellsFromExcel,
  createImportTemplateBuffer,
  updateWell,
  getDynamicLevel
};
