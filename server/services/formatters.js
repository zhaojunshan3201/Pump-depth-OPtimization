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

function mapWell(row) {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    status: row.status,
    depth: mapNumber(row.depth),
    pumpDepth: mapNumber(row.pump_depth),
    pumpEfficiency: mapNumber(row.pump_efficiency),
    dynamicLevel: mapNumber(row.dynamic_level),
    submergence: mapNumber(row.submergence),
    current: mapNumber(row.current_value),
    load: mapNumber(row.load_value),
    strokeRate: mapNumber(row.stroke_rate),
    strokeLength: mapNumber(row.stroke_length),
    backPressure: mapNumber(row.back_pressure),
    dailyOil: mapNumber(row.daily_oil),
    dailyWater: mapNumber(row.daily_water),
    waterCut: mapNumber(row.water_cut),
    lastOverhaul: mapDate(row.last_overhaul),
    reservoirPressure: mapNumber(row.reservoir_pressure),
    bubblePointPressure: mapNumber(row.bubble_point_pressure),
    AOF: mapNumber(row.aof)
  };
}

module.exports = { mapWell };
