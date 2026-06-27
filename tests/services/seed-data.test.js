import { describe, expect, test } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const { wells, dynamicLevelReadings, optimizationRecords } = require('../../server/data/seed-data');

describe('seed data', () => {
  test('contains the current 20 wells and known records', () => {
    expect(wells).toHaveLength(20);
    expect(wells.find((well) => well.id === 'G3-4')).toMatchObject({
      name: '高3-4井',
      status: 'producing',
      pumpDepth: 1860,
      pumpEfficiency: 32.1
    });
    expect(dynamicLevelReadings.filter((row) => row.wellId === 'G3-1')).toHaveLength(24);
    expect(optimizationRecords).toHaveLength(8);
  });

  test('dynamic level readings reference known wells with full hourly coverage', () => {
    const wellIds = new Set(wells.map((well) => well.id));
    const readingsByWell = new Map();

    for (const reading of dynamicLevelReadings) {
      expect(wellIds.has(reading.wellId)).toBe(true);
      expect(reading.hourIndex).toBeGreaterThanOrEqual(0);
      expect(reading.hourIndex).toBeLessThanOrEqual(23);

      if (!readingsByWell.has(reading.wellId)) {
        readingsByWell.set(reading.wellId, []);
      }
      readingsByWell.get(reading.wellId).push(reading.hourIndex);
    }

    for (const hourIndexes of readingsByWell.values()) {
      expect(hourIndexes).toHaveLength(24);
      expect(new Set(hourIndexes).size).toBe(24);
    }
  });

  test('optimization records reference known wells and use unique ids', () => {
    const wellIds = new Set(wells.map((well) => well.id));
    const recordIds = new Set();

    for (const record of optimizationRecords) {
      expect(wellIds.has(record.wellId)).toBe(true);
      recordIds.add(record.id);
    }

    expect(recordIds.size).toBe(optimizationRecords.length);
  });
});

describe('init db script', () => {
  test('updates optimization seed rows and repairs the bigserial sequence', () => {
    const initDbScript = readFileSync('server/scripts/init-db.js', 'utf8');
    const optimizationInsertStart = initDbScript.indexOf('insert into optimization_records');
    const optimizationInsertEnd = initDbScript.indexOf('async function repairOptimizationRecordSequence');
    const optimizationInsertBlock = initDbScript.slice(optimizationInsertStart, optimizationInsertEnd);

    expect(initDbScript).toContain("setval(pg_get_serial_sequence('optimization_records', 'id')");
    expect(optimizationInsertStart).toBeGreaterThanOrEqual(0);
    expect(optimizationInsertEnd).toBeGreaterThan(optimizationInsertStart);
    expect(optimizationInsertBlock).toContain('on conflict (id) do update set');
    expect(optimizationInsertBlock).toContain('well_id = excluded.well_id');
    expect(optimizationInsertBlock).toContain('record_date = excluded.record_date');
    expect(optimizationInsertBlock).toContain('status = excluded.status');
  });
});
