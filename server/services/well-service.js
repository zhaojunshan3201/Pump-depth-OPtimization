const db = require('../db');
const { mapWell } = require('./formatters');

const VALID_STATUSES = new Set(['producing', 'maintenance', 'shutdown']);
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
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_CASE_FIELDS)) {
    if (normalized[camelKey] === undefined && normalized[snakeKey] !== undefined) {
      normalized[camelKey] = normalized[snakeKey];
    }
  }
  return normalized;
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

module.exports = { listWells, getWell, createWell, importWells, updateWell, getDynamicLevel };
