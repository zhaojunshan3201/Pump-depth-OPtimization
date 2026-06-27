const express = require('express');
const db = require('../db');

const router = express.Router();
const VALID_STATUSES = new Set(['success', 'warning', 'danger']);

const RECORD_COLUMNS = `
  id, well_id, record_date, prev_depth, new_depth, delta, reason, effect,
  status, created_at
`;

function mapNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapDate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function mapTimestamp(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapOptimizationRecord(row) {
  return {
    id: mapNumber(row.id),
    wellId: row.well_id,
    recordDate: mapDate(row.record_date),
    prevDepth: mapNumber(row.prev_depth),
    newDepth: mapNumber(row.new_depth),
    delta: mapNumber(row.delta),
    reason: row.reason,
    effect: row.effect,
    status: row.status,
    createdAt: mapTimestamp(row.created_at)
  };
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function parseNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    if (value.trim() === '') {
      return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function handleError(error, res) {
  if (error.statusCode) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: 'Server error' });
}

function validateRecord(payload) {
  const prevDepth = parseNumber(payload.prevDepth);
  const newDepth = parseNumber(payload.newDepth);
  const delta = parseNumber(payload.delta);

  if (
    isBlank(payload.wellId) ||
    isBlank(payload.recordDate) ||
    prevDepth === null ||
    newDepth === null ||
    delta === null ||
    isBlank(payload.reason) ||
    isBlank(payload.effect) ||
    !VALID_STATUSES.has(payload.status)
  ) {
    throw validationError('Invalid request');
  }

  return {
    wellId: payload.wellId,
    recordDate: payload.recordDate,
    prevDepth,
    newDepth,
    delta,
    reason: payload.reason,
    effect: payload.effect,
    status: payload.status
  };
}

router.get('/', async (req, res) => {
  try {
    const { wellId } = req.query;
    const result = wellId
      ? await db.query(
        `select ${RECORD_COLUMNS}
        from optimization_records
        where well_id = $1
        order by record_date desc`,
        [wellId]
      )
      : await db.query(`select ${RECORD_COLUMNS} from optimization_records order by record_date desc`);

    res.json(result.rows.map(mapOptimizationRecord));
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const record = validateRecord(req.body);
    const result = await db.query(
      `insert into optimization_records (
        well_id, record_date, prev_depth, new_depth, delta, reason, effect, status
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      returning ${RECORD_COLUMNS}`,
      [
        record.wellId,
        record.recordDate,
        record.prevDepth,
        record.newDepth,
        record.delta,
        record.reason,
        record.effect,
        record.status
      ]
    );

    res.status(201).json(mapOptimizationRecord(result.rows[0]));
  } catch (error) {
    handleError(error, res);
  }
});

module.exports = router;
