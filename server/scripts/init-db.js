const fs = require('fs/promises');
const path = require('path');
const db = require('../db');
const { wells, dynamicLevelReadings, optimizationRecords } = require('../data/seed-data');

const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');

async function upsertWell(well) {
  await db.query(
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
      updated_at = now()`,
    [
      well.id,
      well.name,
      well.zone,
      well.status,
      well.depth,
      well.pumpDepth,
      well.pumpEfficiency,
      well.dynamicLevel,
      well.submergence,
      well.current,
      well.load,
      well.strokeRate,
      well.strokeLength,
      well.backPressure,
      well.dailyOil,
      well.dailyWater,
      well.waterCut,
      well.lastOverhaul,
      well.reservoirPressure,
      well.bubblePointPressure,
      well.AOF,
    ]
  );
}

async function upsertDynamicLevelReading(reading) {
  await db.query(
    `insert into dynamic_level_readings (well_id, hour_index, level_value)
    values ($1, $2, $3)
    on conflict (well_id, hour_index) do update set
      level_value = excluded.level_value`,
    [reading.wellId, reading.hourIndex, reading.levelValue]
  );
}

async function insertOptimizationRecord(record) {
  await db.query(
    `insert into optimization_records (
      id, well_id, record_date, prev_depth, new_depth, delta, reason, effect, status
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    on conflict (id) do update set
      well_id = excluded.well_id,
      record_date = excluded.record_date,
      prev_depth = excluded.prev_depth,
      new_depth = excluded.new_depth,
      delta = excluded.delta,
      reason = excluded.reason,
      effect = excluded.effect,
      status = excluded.status`,
    [
      record.id,
      record.wellId,
      record.recordDate,
      record.prevDepth,
      record.newDepth,
      record.delta,
      record.reason,
      record.effect,
      record.status,
    ]
  );
}

async function repairOptimizationRecordSequence() {
  await db.query(
    `select setval(pg_get_serial_sequence('optimization_records', 'id'), coalesce((select max(id) from optimization_records), 1), true)`
  );
}

async function initDb() {
  try {
    const schema = await fs.readFile(schemaPath, 'utf8');
    await db.query(schema);

    for (const well of wells) {
      await upsertWell(well);
    }

    for (const reading of dynamicLevelReadings) {
      await upsertDynamicLevelReading(reading);
    }

    for (const record of optimizationRecords) {
      await insertOptimizationRecord(record);
    }

    await repairOptimizationRecordSequence();

    console.log('数据库初始化完成');
  } catch (error) {
    console.error(`数据库初始化失败: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.closePool();
  }
}

initDb();
