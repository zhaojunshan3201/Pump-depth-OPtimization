import { describe, expect, test } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  getPotentialWells,
  diagnoseWell,
  generateDeepenPlan,
  getMonthlyProductionTrend,
  getVLPCurve,
  solveNodal
} = require('../../server/services/analysis-service');

const wells = [
  { id: 'A', name: 'A井', status: 'producing', pumpEfficiency: 32, submergence: 110, dailyOil: 2, pumpDepth: 1000, current: 10, load: 20, dynamicLevel: 800, depth: 1200, waterCut: 80, backPressure: 0.8, reservoirPressure: 15, bubblePointPressure: 9, AOF: 6 },
  { id: 'B', name: 'B井', status: 'shutdown', pumpEfficiency: 20, submergence: 20, dailyOil: 1, pumpDepth: 1000, current: 10, load: 20, dynamicLevel: 800, depth: 1200, waterCut: 98, backPressure: 1.2, reservoirPressure: 15, bubblePointPressure: 9, AOF: 3 }
];

describe('analysis service', () => {
  test('screens potential wells and excludes shutdown wells', () => {
    expect(getPotentialWells(wells).map((well) => well.id)).toEqual(['A']);
  });

  test('diagnoses low submergence and low pump efficiency', () => {
    const diagnosis = diagnoseWell(wells[0]);
    expect(diagnosis.overallHealth).toBe('一般');
    expect(diagnosis.issues.map((issue) => issue.type)).toContain('warning');
  });

  test('generates deepen plan with expected new depth', () => {
    const plan = generateDeepenPlan(wells[0], 60);
    expect(plan.newPumpDepth).toBe(1060);
    expect(plan.safetyFactor).toBe('安全');
    expect(Number(plan.estimatedEfficiency)).toBeGreaterThan(32);
  });

  test('solves nodal analysis with curve data', () => {
    const result = solveNodal(wells[0]);
    expect(result.Qnode).toBeGreaterThanOrEqual(0);
    expect(result.iprCurve.length).toBeGreaterThan(10);
    expect(result.vlpCurve.length).toBeGreaterThan(10);
  });

  test('solveNodal exposes camelCase nodal fields and sensitivity shape', () => {
    const result = solveNodal(wells[0]);

    expect(result.qCurrent).toBe(result.Qcurrent);
    expect(result.qNode).toBe(result.Qnode);
    expect(result.pwfCurrent).toBe(result.PwfCurrent);
    expect(result.pwfNode).toBe(result.PwfNode);
    expect(result.reservoirPressure).toBe(result.Pr);
    expect(result.bubblePointPressure).toBe(result.Pb);
    expect(result.aof).toBe(result.AOF);
    expect(result.iprSensitivity.sensitivities.length).toBeGreaterThan(0);
    expect(result.vlpSensitivity.sensitivities.length).toBeGreaterThan(0);
  });

  test('AOF=0 returns insufficient unsolved result', () => {
    const result = solveNodal({ ...wells[0], AOF: 0 });

    expect(result.status).toBe('insufficient-data');
    expect(result.reason).toBeTruthy();
    expect(result.qNode).toBe(0);
    expect(result.Qnode).toBe(0);
    expect(result.isReasonable).toBe(false);
    expect(result.potentialGain).toBe(0);
  });

  test('dailyOil=0 keeps VLP and solve result bounded', () => {
    const zeroRateWell = { ...wells[0], dailyOil: 0 };
    const vlpCurve = getVLPCurve(zeroRateWell);
    const result = solveNodal(zeroRateWell);

    expect(result.status).toBe('insufficient-data');
    expect(result.isReasonable).toBe(false);
    expect(Math.max(...vlpCurve.map((point) => point.pwf))).toBeLessThan(1000);
  });

  test('monthly production trend is deterministic', () => {
    expect(getMonthlyProductionTrend()).toEqual(getMonthlyProductionTrend());
  });
});
