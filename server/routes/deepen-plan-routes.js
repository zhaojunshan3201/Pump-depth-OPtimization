const express = require('express');
const db = require('../db');
const wellService = require('../services/well-service');
const analysis = require('../services/analysis-service');

const router = express.Router();

const PLAN_COLUMNS = `
  id, well_id, deepen_amount, current_pump_depth, new_pump_depth,
  current_efficiency, estimated_efficiency, efficiency_gain, current_oil,
  estimated_oil, oil_gain, current_submergence, estimated_submergence,
  safety_factor, created_at
`;

function mapNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapTimestamp(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function mapDeepenPlan(row) {
  return {
    id: mapNumber(row.id),
    wellId: row.well_id,
    deepenAmount: mapNumber(row.deepen_amount),
    currentPumpDepth: mapNumber(row.current_pump_depth),
    newPumpDepth: mapNumber(row.new_pump_depth),
    currentEfficiency: mapNumber(row.current_efficiency),
    estimatedEfficiency: mapNumber(row.estimated_efficiency),
    efficiencyGain: mapNumber(row.efficiency_gain),
    currentOil: mapNumber(row.current_oil),
    estimatedOil: mapNumber(row.estimated_oil),
    oilGain: mapNumber(row.oil_gain),
    currentSubmergence: mapNumber(row.current_submergence),
    estimatedSubmergence: mapNumber(row.estimated_submergence),
    safetyFactor: row.safety_factor,
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

async function buildPlan(payload) {
  const { wellId } = payload;
  const deepenAmount = parseNumber(payload.deepenAmount);

  if (isBlank(wellId) || deepenAmount === null) {
    throw validationError('Invalid request');
  }

  const well = await wellService.getWell(wellId);
  if (!well) {
    const error = new Error('Well not found');
    error.statusCode = 404;
    throw error;
  }

  return analysis.generateDeepenPlan(well, deepenAmount);
}

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`select ${PLAN_COLUMNS} from deepen_plans order by created_at desc`);
    res.json(result.rows.map(mapDeepenPlan));
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/preview', async (req, res) => {
  try {
    res.json(await buildPlan(req.body));
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/', async (req, res) => {
  try {
    const plan = await buildPlan(req.body);
    const result = await db.query(
      `insert into deepen_plans (
        well_id, deepen_amount, current_pump_depth, new_pump_depth,
        current_efficiency, estimated_efficiency, efficiency_gain, current_oil,
        estimated_oil, oil_gain, current_submergence, estimated_submergence,
        safety_factor
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      returning ${PLAN_COLUMNS}`,
      [
        plan.wellId,
        plan.deepenAmount,
        plan.currentPumpDepth,
        plan.newPumpDepth,
        plan.currentEfficiency,
        plan.estimatedEfficiency,
        plan.efficiencyGain,
        plan.currentOil,
        plan.estimatedOil,
        plan.oilGain,
        plan.currentSubmergence,
        plan.estimatedSubmergence,
        plan.safetyFactor
      ]
    );

    res.status(201).json(mapDeepenPlan(result.rows[0]));
  } catch (error) {
    handleError(error, res);
  }
});

module.exports = router;
