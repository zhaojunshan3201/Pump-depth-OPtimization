function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 3) {
  return Number(toNumber(value).toFixed(digits));
}

function isActiveWell(well) {
  return well && well.status !== 'shutdown';
}

function getPumpEfficiencyVsSubmergence(wells = []) {
  return wells.map((well) => ({
    well: well.id,
    pumpEfficiency: well.pumpEfficiency,
    submergence: well.submergence,
    status: well.status
  }));
}

function getProductionStats(wells = []) {
  const producing = wells.filter((well) => well.status === 'producing');
  const totalEfficiency = wells.reduce((sum, well) => sum + toNumber(well.pumpEfficiency), 0);

  return {
    dailyOil: wells.reduce((sum, well) => sum + toNumber(well.dailyOil), 0),
    dailyWater: wells.reduce((sum, well) => sum + toNumber(well.dailyWater), 0),
    wells: wells.length,
    producingWells: producing.length,
    avgEfficiency: wells.length ? totalEfficiency / wells.length : 0
  };
}

function getPotentialWells(wells = []) {
  return wells.filter((well) =>
    isActiveWell(well) &&
    toNumber(well.pumpEfficiency) < 40 &&
    toNumber(well.submergence) < 200
  );
}

function getAlertWells(wells = []) {
  return wells.filter((well) =>
    isActiveWell(well) &&
    (toNumber(well.pumpEfficiency) < 30 || toNumber(well.submergence) < 50)
  );
}

function getZoneSummary(wells = []) {
  const stats = getProductionStats(wells);
  const avgSubmergence = wells.length
    ? wells.reduce((sum, well) => sum + toNumber(well.submergence), 0) / wells.length
    : 0;
  const avgDynamicLevel = wells.length
    ? wells.reduce((sum, well) => sum + toNumber(well.dynamicLevel), 0) / wells.length
    : 0;

  return {
    totalWells: stats.wells,
    producingWells: stats.producingWells,
    dailyOil: stats.dailyOil.toFixed(1),
    dailyWater: stats.dailyWater.toFixed(1),
    avgEfficiency: stats.avgEfficiency.toFixed(1),
    avgSubmergence: avgSubmergence.toFixed(0),
    potentialCount: getPotentialWells(wells).length,
    alertCount: getAlertWells(wells).length,
    avgDynamicLevel: avgDynamicLevel.toFixed(0)
  };
}

function getRecentOptimizations(optimizationRecords = [], limit = 5) {
  return [...optimizationRecords]
    .sort((a, b) => new Date(b.recordDate || b.date) - new Date(a.recordDate || a.date))
    .slice(0, limit)
    .map((record) => ({
      id: record.id,
      wellId: record.wellId || record.well,
      recordDate: record.recordDate || record.date,
      prevDepth: record.prevDepth,
      newDepth: record.newDepth,
      delta: record.delta,
      reason: record.reason,
      effect: record.effect,
      status: record.status
    }));
}

function generateDeepenPlan(well, deepenAmount = 0) {
  if (!well) return null;

  const amount = toNumber(deepenAmount);
  const currentEfficiency = toNumber(well.pumpEfficiency);
  const newPumpDepth = toNumber(well.pumpDepth) + amount;
  const efficiencyGain = Math.min((amount / 100) * 3, 15);
  const estimatedEfficiency = Math.min(currentEfficiency + efficiencyGain, 85);
  const oilGain = ((estimatedEfficiency - currentEfficiency) / 100) * toNumber(well.dailyOil) * 0.6;
  const load = toNumber(well.load);
  const currentLoadRatio = load === 0 ? Infinity : toNumber(well.current) / load;

  return {
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    currentPumpDepth: well.pumpDepth,
    newPumpDepth,
    deepenAmount: amount,
    currentEfficiency: well.pumpEfficiency,
    estimatedEfficiency: estimatedEfficiency.toFixed(1),
    efficiencyGain: efficiencyGain.toFixed(1),
    currentOil: well.dailyOil,
    estimatedOil: (toNumber(well.dailyOil) + oilGain).toFixed(2),
    oilGain: oilGain.toFixed(2),
    safetyFactor: currentLoadRatio < 1.2 ? '安全' : '需校核',
    currentSubmergence: well.submergence,
    estimatedSubmergence: (toNumber(well.submergence) + amount * 0.3).toFixed(0),
    currentDynamicLevel: well.dynamicLevel
  };
}

function getTuningReminders(wells = [], date = new Date()) {
  const tuningDays = [5, 15, 25];
  const day = date.getDate();
  const isTuningDay = tuningDays.includes(day);

  if (!isTuningDay) {
    return {
      isTuningDay: false,
      nextTuningDay: tuningDays.find((tuningDay) => tuningDay > day) || tuningDays[0],
      wells: []
    };
  }

  const candidates = wells
    .filter((well) =>
      well.status === 'producing' &&
      (toNumber(well.pumpEfficiency) < 50 || toNumber(well.submergence) < 200 || toNumber(well.submergence) > 500)
    )
    .slice(0, 8)
    .map((well) => {
      let suggestion = '参数合理，维持当前制度';
      if (toNumber(well.submergence) < 150) suggestion = '建议加深泵挂';
      else if (toNumber(well.submergence) > 450) suggestion = '建议调小冲次，节能运行';
      else if (toNumber(well.pumpEfficiency) < 45) suggestion = '建议优化冲次冲程参数';

      return { ...well, suggestion };
    });

  return { isTuningDay: true, nextTuningDay: null, wells: candidates };
}

function diagnoseWell(well) {
  if (!well) return null;

  const issues = [];
  const submergence = toNumber(well.submergence);
  const pumpEfficiency = toNumber(well.pumpEfficiency);
  const waterCut = toNumber(well.waterCut);
  const backPressure = toNumber(well.backPressure);
  const load = toNumber(well.load);
  const currentLoadRatio = load === 0 ? Infinity : toNumber(well.current) / load;

  if (submergence < 100) {
    issues.push({ type: 'danger', msg: `严重供液不足（沉没度${submergence}m），建议立即加深泵挂或调整工作制度` });
  } else if (submergence < 200) {
    issues.push({ type: 'warning', msg: `供液不足（沉没度${submergence}m），建议优化泵挂深度` });
  }

  if (pumpEfficiency < 30) {
    issues.push({ type: 'danger', msg: `泵效极低（${pumpEfficiency}%），需检泵或排查井下故障` });
  } else if (pumpEfficiency < 45) {
    issues.push({ type: 'warning', msg: `泵效偏低（${pumpEfficiency}%），存在优化空间` });
  }

  if (waterCut > 90) {
    issues.push({ type: 'warning', msg: `高含水（${waterCut}%），建议堵水或转注` });
  }

  if (backPressure > 1.0) {
    issues.push({ type: 'warning', msg: `回压偏高（${backPressure}MPa），检查管线结蜡或阀门` });
  }

  if (currentLoadRatio > 1.3) {
    issues.push({ type: 'warning', msg: '载荷比异常，杆柱可能偏磨或结蜡' });
  }

  if (issues.length === 0) {
    issues.push({ type: 'success', msg: '工况正常，各项参数在合理范围内' });
  }

  return {
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    status: well.status,
    issues,
    overallHealth: issues.every((issue) => issue.type === 'success')
      ? '良好'
      : issues.some((issue) => issue.type === 'danger')
        ? '差'
        : '一般'
  };
}

function getMonthlyProductionTrend() {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return months.map((month, index) => ({
    month,
    oil: (55 + Math.sin(index * 0.5) * 8 + Math.cos(index * 0.8) * 2).toFixed(1),
    water: (180 + Math.sin(index * 0.3) * 20 + Math.cos(index * 0.4) * 4).toFixed(1),
    efficiency: (52 + Math.sin(index * 0.4 + 1) * 8 + Math.cos(index * 0.6) * 1.5).toFixed(1)
  }));
}

function vogelIPR(Pwf, Pr, Qmax) {
  if (Pwf >= Pr) return 0;
  if (Pr <= 0) return 0;

  const ratio = Pwf / Pr;
  return Qmax * (1 - 0.2 * ratio - 0.8 * ratio * ratio);
}

function getIPRCurve(well, skinFactor = 0) {
  if (!well) return [];

  const Pr = toNumber(well.reservoirPressure);
  const Qmax = toNumber(well.AOF);
  const effectiveQmax = Math.max(0, Qmax * (1 - toNumber(skinFactor) * 0.05));
  const points = [];
  const steps = 40;

  for (let index = 0; index <= steps; index += 1) {
    const pwf = (Pr * (steps - index)) / steps;
    const q = vogelIPR(pwf, Pr, effectiveQmax);
    points.push({ pwf: round(pwf), q: round(q) });
  }

  return points;
}

function getVLPCurve(well, tubingPressure = null) {
  if (!well) return [];

  const Pwh = tubingPressure !== null ? toNumber(tubingPressure) : toNumber(well.backPressure);
  const Pr = toNumber(well.reservoirPressure);
  const dailyOil = toNumber(well.dailyOil);
  const maxQ = Math.max(toNumber(well.AOF) * 1.2, 0);

  if (dailyOil <= 0) {
    const points = [];
    const steps = 30;
    for (let index = 0; index <= steps; index += 1) {
      const q = maxQ ? (maxQ * index) / steps : 0;
      points.push({ q: round(q), pwf: round(Math.max(Pr || Pwh, 0)) });
    }
    return points;
  }

  const waterCut = toNumber(well.waterCut) / 100;
  const mixDensity = 850 * (1 - waterCut) + 1000 * waterCut;
  const Qop = dailyOil;
  const dynamicHead = toNumber(well.depth) - toNumber(well.dynamicLevel);
  const PwfOp = Math.max(0.1, (dynamicHead * mixDensity * 9.8) / 1e6 + Pwh);

  const P1 = Pr;
  const Q2 = Qop;
  const P2 = PwfOp;
  const Q3 = Qop * 2;
  const P3 = Math.max(0.1, 2 * PwfOp - Pr);
  const denominator = (Q3 * Q3 * Q2) - (Q2 * Q2 * Q3);
  const c = denominator === 0 ? 0 : ((P3 - P1) * Q2 - (P2 - P1) * Q3) / denominator;
  const b = ((P2 - P1) - c * Q2 * Q2) / Q2;
  const curveMaxQ = Math.max(maxQ, Qop * 2);
  const points = [];
  const steps = 30;

  for (let index = 0; index <= steps; index += 1) {
    const q = (curveMaxQ * index) / steps;
    const pwf = P1 + b * q + c * q * q;
    points.push({ q: round(q), pwf: round(Math.max(pwf, 0)) });
  }

  return points;
}

function interpolateIPRPwf(iprCurve, q) {
  for (let index = 0; index < iprCurve.length - 1; index += 1) {
    const current = iprCurve[index];
    const next = iprCurve[index + 1];
    if (current.q <= q && next.q >= q) {
      const t = (q - current.q) / (next.q - current.q || 1);
      return current.pwf + t * (next.pwf - current.pwf);
    }
    if (current.q >= q) {
      return current.pwf;
    }
  }

  return iprCurve.length ? iprCurve[iprCurve.length - 1].pwf : 0;
}

function addNodalAliases(result) {
  return {
    ...result,
    qCurrent: result.Qcurrent,
    qNode: result.Qnode,
    pwfCurrent: result.PwfCurrent,
    pwfNode: result.PwfNode,
    reservoirPressure: result.Pr,
    bubblePointPressure: result.Pb,
    aof: result.AOF
  };
}

function getUnsolvedNodalResult(well, reason = '缺少有效储层参数') {
  return addNodalAliases({
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    status: 'insufficient-data',
    reason,
    Qcurrent: toNumber(well.dailyOil),
    Qnode: 0,
    PwfCurrent: 0,
    PwfNode: 0,
    Pr: well.reservoirPressure,
    Pb: well.bubblePointPressure,
    AOF: well.AOF,
    estEfficiency: 0,
    minDiff: 0,
    isReasonable: false,
    potentialGain: 0,
    iprCurve: [],
    vlpCurve: getVLPCurve(well)
  });
}

function solveNodalBase(well, skinFactor = 0, tubingPressure = null) {
  if (!well) return null;
  if (toNumber(well.AOF) <= 0 || toNumber(well.reservoirPressure) <= 0 || toNumber(well.dailyOil) <= 0) {
    return getUnsolvedNodalResult(well);
  }

  const iprCurve = getIPRCurve(well, skinFactor);
  const vlpCurve = getVLPCurve(well, tubingPressure);
  let qNode = 0;
  let pwfNode = 0;
  let minDiff = Infinity;

  for (const point of vlpCurve) {
    if (point.q < 0.01) continue;

    const pwfIPR = interpolateIPRPwf(iprCurve, point.q);
    const diff = Math.abs(point.pwf - pwfIPR);

    if (diff < minDiff) {
      minDiff = diff;
      qNode = point.q;
      pwfNode = (point.pwf + pwfIPR) / 2;
    }
  }

  const waterCut = toNumber(well.waterCut) / 100;
  const mixDensity = 850 * (1 - waterCut) + 1000 * waterCut;
  const dynamicHead = toNumber(well.depth) - toNumber(well.dynamicLevel);
  const Pwh = tubingPressure !== null ? toNumber(tubingPressure) : toNumber(well.backPressure);
  const PwfCurrent = Math.max(0.1, (dynamicHead * mixDensity * 9.8) / 1e6 + Pwh);
  const Qcurrent = toNumber(well.dailyOil);
  const efficiencyRatio = Qcurrent === 0 ? 0 : qNode / Qcurrent;
  const estEfficiency = Math.min(toNumber(well.pumpEfficiency) * efficiencyRatio, 85);
  const potentialGain = Qcurrent === 0 ? 0 : Math.abs((qNode - Qcurrent) / Qcurrent) * 100;

  return addNodalAliases({
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    status: 'solved',
    Qcurrent,
    Qnode: round(qNode, 2),
    PwfCurrent: round(PwfCurrent),
    PwfNode: round(pwfNode),
    Pr: well.reservoirPressure,
    Pb: well.bubblePointPressure,
    AOF: well.AOF,
    estEfficiency: round(estEfficiency, 1),
    minDiff: Number.isFinite(minDiff) ? round(minDiff, 4) : 0,
    isReasonable: minDiff < 0.5,
    potentialGain: round(potentialGain, 1),
    iprCurve,
    vlpCurve
  });
}

function getIPRSensitivity(well) {
  if (!well) return null;

  const sensitivities = [];
  for (let skinFactor = -2; skinFactor <= 3; skinFactor += 1) {
    sensitivities.push({
      label: `S=${skinFactor > 0 ? '+' : ''}${skinFactor}`,
      skinFactor,
      ...solveNodalBase(well, skinFactor)
    });
  }

  return {
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    base: solveNodalBase(well),
    sensitivities
  };
}

function getVLPSensitivity(well) {
  if (!well) return null;

  const pressures = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];
  const sensitivities = pressures.map((tubingPressure) => ({
    label: `Pwh=${tubingPressure}MPa`,
    tubingPressure,
    ...solveNodalBase(well, 0, tubingPressure)
  }));

  return {
    well: well.id,
    wellId: well.id,
    wellName: well.name,
    base: solveNodalBase(well),
    sensitivities
  };
}

function solveNodal(well, skinFactor = 0, tubingPressure = null) {
  const result = solveNodalBase(well, skinFactor, tubingPressure);
  if (!result) return null;

  return {
    ...result,
    iprSensitivity: getIPRSensitivity(well),
    vlpSensitivity: getVLPSensitivity(well)
  };
}

function getNodalComparison(wells = []) {
  return wells.map((well) => solveNodalBase(well)).filter(Boolean);
}

function generateDynamicLevelTrend(well, readings = []) {
  if (!well) return [];

  const wellReadings = readings
    .filter((reading) => reading.wellId === well.id)
    .sort((a, b) => toNumber(a.hourIndex) - toNumber(b.hourIndex));

  if (wellReadings.length > 0) {
    return wellReadings.map((reading) => ({
      hourIndex: reading.hourIndex,
      levelValue: reading.levelValue
    }));
  }

  const baseLevel = toNumber(well.dynamicLevel);
  return Array.from({ length: 24 }, (_, hourIndex) => ({
    hourIndex,
    levelValue: round(baseLevel + Math.sin(hourIndex / 3) * 8 + Math.cos(hourIndex / 5) * 4, 1)
  }));
}

module.exports = {
  getPumpEfficiencyVsSubmergence,
  getProductionStats,
  getPotentialWells,
  getAlertWells,
  getZoneSummary,
  getRecentOptimizations,
  generateDeepenPlan,
  getTuningReminders,
  diagnoseWell,
  getMonthlyProductionTrend,
  vogelIPR,
  getIPRCurve,
  getVLPCurve,
  solveNodal,
  getIPRSensitivity,
  getVLPSensitivity,
  getNodalComparison,
  generateDynamicLevelTrend
};
