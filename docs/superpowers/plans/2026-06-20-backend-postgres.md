# Backend PostgreSQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the current static pump-depth optimization dashboard into a Node.js + Express + PostgreSQL management system with persistent well data, editable records, and API-driven charts.

**Architecture:** Keep the current HTML/CSS/JavaScript frontend and Chart.js visual layer. Add an Express backend that serves static files, exposes REST APIs, runs business calculations, and reads/writes PostgreSQL through `pg`. Use Node scripts to initialize schema and seed the existing 20 wells from the current `DataStore` data.

**Tech Stack:** Node.js, Express, pg, dotenv, Vitest, Supertest, PostgreSQL, vanilla JavaScript, Chart.js.

---

## File Structure

- Create `package.json`: Node scripts and dependencies.
- Create `.env.example`: documented local PostgreSQL defaults.
- Create `server/config.js`: environment configuration.
- Create `server/db.js`: PostgreSQL connection pool wrapper.
- Create `server/app.js`: Express app, JSON middleware, API routes, static frontend hosting.
- Create `server/index.js`: HTTP server entry point.
- Create `server/sql/schema.sql`: database tables.
- Create `server/scripts/init-db.js`: schema creation and seed data import.
- Create `server/data/seed-data.js`: current 20 wells, dynamic level readings, and optimization records converted from `js/data.js`.
- Create `server/services/formatters.js`: snake_case to camelCase mapping.
- Create `server/services/well-service.js`: well CRUD and summaries.
- Create `server/services/analysis-service.js`: potential wells, diagnosis, tuning, deepen plans, nodal analysis.
- Create `server/routes/*.js`: health, wells, dashboard, screening, tuning, nodal, deepen plans, optimization records.
- Create `tests/services/analysis-service.test.js`: unit tests for calculations.
- Create `tests/api/health.test.js`: health API test.
- Create `tests/api/wells.test.js`: well list and detail API tests.
- Create `tests/api/analysis-routes.test.js`: dashboard, screening, tuning, diagnosis, and dynamic level API tests.
- Create `tests/api/records-and-plans.test.js`: deepen plan and optimization record API tests.
- Create `tests/api/nodal.test.js`: nodal analysis API test.
- Modify `index.html`: load the new API-driven `js/data.js` before charts/components/app as it does today.
- Modify `js/data.js`: replace static object with async API client and compatibility methods.
- Modify `js/app.js`: make init and page render flows async, add loading/error states and management actions.
- Modify `js/components.js`: add modal/form helpers for editing wells, adding optimization records, and saving deepen plans.
- Modify `js/charts.js`: keep chart rendering, but accept arrays supplied by async `DataStore`.
- Modify `README.md`: document PostgreSQL setup, initialization, run, and test commands.

---

### Task 1: Node Project And Test Harness

**Files:**
- Create: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Write the failing package script check**

Run:

```powershell
npm test
```

Expected: FAIL because `package.json` does not exist yet.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "pump-depth-optimization-system",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js",
    "init-db": "node server/scripts/init-db.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "pg": "^8.13.1"
  },
  "devDependencies": {
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Create `.env.example`**

```dotenv
PORT=3000
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=123456
PGDATABASE=bgua
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: PASS, `node_modules` and `package-lock.json` are created.

- [ ] **Step 5: Verify test runner is available**

Run:

```powershell
npm test
```

Expected: FAIL with Vitest reporting no test files found. This is acceptable for this step because the test runner is installed.

- [ ] **Step 6: Commit if Git is initialized**

If this folder becomes a Git repository, run:

```powershell
git add package.json package-lock.json .env.example
git commit -m "chore: add node test harness"
```

---

### Task 2: Configuration, App Shell, And Health API

**Files:**
- Create: `server/config.js`
- Create: `server/db.js`
- Create: `server/app.js`
- Create: `server/index.js`
- Create: `server/routes/health-routes.js`
- Test: `tests/api/health.test.js`

- [ ] **Step 1: Write failing health API test**

```js
const request = require('supertest');
const { describe, expect, test, vi } = require('vitest');

vi.mock('../../server/db', () => ({
  query: vi.fn(async () => ({ rows: [{ ok: 1 }] }))
}));

const { createApp } = require('../../server/app');

describe('health api', () => {
  test('returns ok when database query succeeds', async () => {
    const app = createApp();

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/api/health.test.js
```

Expected: FAIL because `server/app.js` does not exist.

- [ ] **Step 3: Implement configuration and database wrapper**

`server/config.js`:

```js
require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3000),
  database: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '123456',
    database: process.env.PGDATABASE || 'bgua'
  }
};

module.exports = { config };
```

`server/db.js`:

```js
const { Pool } = require('pg');
const { config } = require('./config');

const pool = new Pool(config.database);

function query(text, params) {
  return pool.query(text, params);
}

async function closePool() {
  await pool.end();
}

module.exports = { query, closePool, pool };
```

- [ ] **Step 4: Implement app and health route**

`server/routes/health-routes.js`:

```js
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await db.query('select 1 as ok');
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'error', error: '数据库连接失败' });
  }
});

module.exports = router;
```

`server/app.js`:

```js
const path = require('path');
const express = require('express');
const healthRoutes = require('./routes/health-routes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', healthRoutes);
  app.use(express.static(path.join(__dirname, '..')));
  return app;
}

module.exports = { createApp };
```

`server/index.js`:

```js
const { createApp } = require('./app');
const { config } = require('./config');

const app = createApp();

app.listen(config.port, () => {
  console.log(`泵挂深度动态优化管理系统已启动：http://localhost:${config.port}`);
});
```

- [ ] **Step 5: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/api/health.test.js
```

Expected: PASS.

---

### Task 3: Database Schema And Seed Script

**Files:**
- Create: `server/sql/schema.sql`
- Create: `server/data/seed-data.js`
- Create: `server/scripts/init-db.js`
- Test: `tests/services/seed-data.test.js`

- [ ] **Step 1: Write failing seed data shape test**

```js
const { describe, expect, test } = require('vitest');
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
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/services/seed-data.test.js
```

Expected: FAIL because `server/data/seed-data.js` does not exist.

- [ ] **Step 3: Add schema SQL**

Use the exact table names and columns from the design spec. Include these constraints:

```sql
create table if not exists wells (
  id text primary key,
  name text not null,
  zone text not null,
  status text not null check (status in ('producing', 'maintenance', 'shutdown')),
  depth numeric not null,
  pump_depth numeric not null,
  pump_efficiency numeric not null,
  dynamic_level numeric not null,
  submergence numeric not null,
  current_value numeric not null,
  load_value numeric not null,
  stroke_rate numeric not null,
  stroke_length numeric not null,
  back_pressure numeric not null,
  daily_oil numeric not null,
  daily_water numeric not null,
  water_cut numeric not null,
  last_overhaul date not null,
  reservoir_pressure numeric not null,
  bubble_point_pressure numeric not null,
  aof numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dynamic_level_readings (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  hour_index integer not null check (hour_index >= 0 and hour_index <= 23),
  level_value numeric not null,
  created_at timestamptz not null default now(),
  unique (well_id, hour_index)
);

create table if not exists optimization_records (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  record_date date not null,
  prev_depth numeric not null,
  new_depth numeric not null,
  delta numeric not null,
  reason text not null,
  effect text not null,
  status text not null check (status in ('success', 'warning', 'danger')),
  created_at timestamptz not null default now()
);

create table if not exists deepen_plans (
  id bigserial primary key,
  well_id text not null references wells(id) on delete cascade,
  deepen_amount numeric not null,
  current_pump_depth numeric not null,
  new_pump_depth numeric not null,
  current_efficiency numeric not null,
  estimated_efficiency numeric not null,
  efficiency_gain numeric not null,
  current_oil numeric not null,
  estimated_oil numeric not null,
  oil_gain numeric not null,
  current_submergence numeric not null,
  estimated_submergence numeric not null,
  safety_factor text not null,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 4: Add `server/data/seed-data.js`**

Copy the exact well objects, dynamic level arrays, and optimization records from `js/data.js`. Export camelCase arrays:

```js
const wells = [
  { id: 'G3-1', name: '高3-1井', zone: '采油作业三区', status: 'producing', depth: 1850, pumpDepth: 1720, pumpEfficiency: 62.5, dynamicLevel: 1380, submergence: 340, current: 38.2, load: 42.6, strokeRate: 4.5, strokeLength: 3.0, backPressure: 0.85, dailyOil: 4.2, dailyWater: 12.8, waterCut: 75.3, lastOverhaul: '2024-08-15', reservoirPressure: 14.8, bubblePointPressure: 9.2, AOF: 14.5 },
  { id: 'G3-2', name: '高3-2井', zone: '采油作业三区', status: 'producing', depth: 1920, pumpDepth: 1780, pumpEfficiency: 48.3, dynamicLevel: 1520, submergence: 260, current: 41.5, load: 46.8, strokeRate: 5.0, strokeLength: 3.0, backPressure: 0.92, dailyOil: 3.6, dailyWater: 15.2, waterCut: 80.9, lastOverhaul: '2024-06-20', reservoirPressure: 15.3, bubblePointPressure: 9.5, AOF: 11.5 }
];

const dynamicLevelTrend = {
  'G3-1': [1350, 1360, 1355, 1370, 1380, 1375, 1368, 1360, 1355, 1348, 1352, 1365, 1375, 1385, 1390, 1388, 1380, 1370, 1362, 1358, 1365, 1378, 1385, 1380]
};

const dynamicLevelReadings = Object.entries(dynamicLevelTrend).flatMap(([wellId, values]) =>
  values.map((levelValue, hourIndex) => ({ wellId, hourIndex, levelValue }))
);

const optimizationRecords = [
  { wellId: 'G3-3', recordDate: '2024-10-05', prevDepth: 1580, newDepth: 1650, delta: 70, reason: '动液面下降，供液不足', effect: '泵效从48%提升至55.8%，日增油0.6t', status: 'success' }
];

module.exports = { wells, dynamicLevelReadings, optimizationRecords };
```

Important: the snippet above shows the export shape. The implementation must include all 20 wells, all 5 existing dynamic-level arrays, and all 8 optimization records from `js/data.js`.

- [ ] **Step 5: Add Node init script**

`server/scripts/init-db.js`:

```js
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { wells, dynamicLevelReadings, optimizationRecords } = require('../data/seed-data');

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  await db.query(schema);

  for (const well of wells) {
    await db.query(
      `insert into wells (
        id, name, zone, status, depth, pump_depth, pump_efficiency, dynamic_level, submergence,
        current_value, load_value, stroke_rate, stroke_length, back_pressure, daily_oil, daily_water,
        water_cut, last_overhaul, reservoir_pressure, bubble_point_pressure, aof
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
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
      [well.id, well.name, well.zone, well.status, well.depth, well.pumpDepth, well.pumpEfficiency,
        well.dynamicLevel, well.submergence, well.current, well.load, well.strokeRate, well.strokeLength,
        well.backPressure, well.dailyOil, well.dailyWater, well.waterCut, well.lastOverhaul,
        well.reservoirPressure, well.bubblePointPressure, well.AOF]
    );
  }

  for (const reading of dynamicLevelReadings) {
    await db.query(
      `insert into dynamic_level_readings (well_id, hour_index, level_value)
       values ($1, $2, $3)
       on conflict (well_id, hour_index) do update set level_value = excluded.level_value`,
      [reading.wellId, reading.hourIndex, reading.levelValue]
    );
  }

  for (const record of optimizationRecords) {
    await db.query(
      `insert into optimization_records (well_id, record_date, prev_depth, new_depth, delta, reason, effect, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict do nothing`,
      [record.wellId, record.recordDate, record.prevDepth, record.newDepth, record.delta, record.reason, record.effect, record.status]
    );
  }
}

initDb()
  .then(async () => {
    console.log('数据库初始化完成');
    await db.closePool();
  })
  .catch(async (error) => {
    console.error('数据库初始化失败:', error.message);
    await db.closePool();
    process.exit(1);
  });
```

- [ ] **Step 6: Run tests**

Run:

```powershell
npm test -- tests/services/seed-data.test.js
```

Expected: PASS after all seed rows are included.

---

### Task 4: Business Calculation Service

**Files:**
- Create: `server/services/analysis-service.js`
- Test: `tests/services/analysis-service.test.js`

- [ ] **Step 1: Write failing tests for core calculations**

```js
const { describe, expect, test } = require('vitest');
const {
  getPotentialWells,
  diagnoseWell,
  generateDeepenPlan,
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
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/services/analysis-service.test.js
```

Expected: FAIL because `analysis-service.js` does not exist.

- [ ] **Step 3: Implement analysis service**

Move the existing calculation logic from `js/data.js` into pure functions that accept well objects and arrays. Export:

```js
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
```

Return all API-facing objects in camelCase. `solveNodal(well)` must include `iprCurve`, `vlpCurve`, `iprSensitivity`, and `vlpSensitivity` so `/api/nodal/:id` can render charts with one request.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/services/analysis-service.test.js
```

Expected: PASS.

---

### Task 5: Well Data Service And Routes

**Files:**
- Create: `server/services/formatters.js`
- Create: `server/services/well-service.js`
- Create: `server/routes/well-routes.js`
- Modify: `server/app.js`
- Test: `tests/api/wells.test.js`

- [ ] **Step 1: Write failing API test for well list and detail**

```js
const request = require('supertest');
const { describe, expect, test, vi } = require('vitest');

vi.mock('../../server/db', () => ({
  query: vi.fn(async (sql, params) => {
    if (params && params[0] === 'G3-1') {
      return { rows: [{ id: 'G3-1', name: '高3-1井', zone: '采油作业三区', status: 'producing', pump_depth: 1720 }] };
    }
    return { rows: [{ id: 'G3-1', name: '高3-1井', zone: '采油作业三区', status: 'producing', pump_depth: 1720 }] };
  }))
}));

const { createApp } = require('../../server/app');

describe('well api', () => {
  test('returns wells in camelCase', async () => {
    const res = await request(createApp()).get('/api/wells');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: 'G3-1', pumpDepth: 1720 });
  });

  test('returns one well', async () => {
    const res = await request(createApp()).get('/api/wells/G3-1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'G3-1', name: '高3-1井' });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/api/wells.test.js
```

Expected: FAIL because `/api/wells` is not registered.

- [ ] **Step 3: Implement formatter**

`server/services/formatters.js`:

```js
function mapWell(row) {
  return {
    id: row.id,
    name: row.name,
    zone: row.zone,
    status: row.status,
    depth: Number(row.depth),
    pumpDepth: Number(row.pump_depth),
    pumpEfficiency: Number(row.pump_efficiency),
    dynamicLevel: Number(row.dynamic_level),
    submergence: Number(row.submergence),
    current: Number(row.current_value),
    load: Number(row.load_value),
    strokeRate: Number(row.stroke_rate),
    strokeLength: Number(row.stroke_length),
    backPressure: Number(row.back_pressure),
    dailyOil: Number(row.daily_oil),
    dailyWater: Number(row.daily_water),
    waterCut: Number(row.water_cut),
    lastOverhaul: String(row.last_overhaul).slice(0, 10),
    reservoirPressure: Number(row.reservoir_pressure),
    bubblePointPressure: Number(row.bubble_point_pressure),
    AOF: Number(row.aof)
  };
}

module.exports = { mapWell };
```

- [ ] **Step 4: Implement service and routes**

Use parameterized SQL for all reads and writes. Validate `status` as one of `producing`, `maintenance`, `shutdown`. Return `400` with `{ error: '井号不能为空' }` when required fields are missing.

- [ ] **Step 5: Register route in `server/app.js`**

```js
const wellRoutes = require('./routes/well-routes');
app.use('/api/wells', wellRoutes);
```

- [ ] **Step 6: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/api/wells.test.js
```

Expected: PASS.

---

### Task 6: Dashboard, Screening, Tuning, Diagnosis, And Dynamic Level APIs

**Files:**
- Create: `server/routes/dashboard-routes.js`
- Create: `server/routes/screening-routes.js`
- Create: `server/routes/tuning-routes.js`
- Modify: `server/routes/well-routes.js`
- Modify: `server/app.js`
- Test: `tests/api/analysis-routes.test.js`

- [ ] **Step 1: Write failing API tests**

```js
const request = require('supertest');
const { describe, expect, test, vi } = require('vitest');

vi.mock('../../server/services/well-service', () => ({
  listWells: vi.fn(async () => [
    { id: 'G3-4', name: '高3-4井', status: 'producing', pumpEfficiency: 32.1, submergence: 110, dailyOil: 2.1, dynamicLevel: 1750, pumpDepth: 1860, current: 45.2, load: 52.3, depth: 2010, waterCut: 89.8, backPressure: 1.05, reservoirPressure: 16, bubblePointPressure: 10, AOF: 6.3 }
  ]),
  getWell: vi.fn(async () => ({ id: 'G3-4', name: '高3-4井', status: 'producing', pumpEfficiency: 32.1, submergence: 110, dailyOil: 2.1, dynamicLevel: 1750, pumpDepth: 1860, current: 45.2, load: 52.3, depth: 2010, waterCut: 89.8, backPressure: 1.05, reservoirPressure: 16, bubblePointPressure: 10, AOF: 6.3 })),
  getDynamicLevel: vi.fn(async () => [])
}));

const { createApp } = require('../../server/app');

describe('analysis routes', () => {
  test('returns potential wells', async () => {
    const res = await request(createApp()).get('/api/screening/potential-wells');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('G3-4');
  });

  test('returns diagnosis for one well', async () => {
    const res = await request(createApp()).get('/api/wells/G3-4/diagnosis');
    expect(res.status).toBe(200);
    expect(res.body.well).toBe('G3-4');
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/api/analysis-routes.test.js
```

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement routes**

Route behavior:

- `/api/dashboard/summary` calls `listWells()` and `getZoneSummary(wells)`.
- `/api/screening/potential-wells` calls `getPotentialWells(wells)`.
- `/api/tuning/reminders` calls `getTuningReminders(wells, new Date())`.
- `/api/wells/:id/diagnosis` calls `getWell(id)` and `diagnoseWell(well)`.
- `/api/wells/:id/dynamic-level` returns stored readings; if none exist, return `generateDynamicLevelTrend(well)`.

- [ ] **Step 4: Register routes in `server/app.js`**

```js
const dashboardRoutes = require('./routes/dashboard-routes');
const screeningRoutes = require('./routes/screening-routes');
const tuningRoutes = require('./routes/tuning-routes');

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/screening', screeningRoutes);
app.use('/api/tuning', tuningRoutes);
```

- [ ] **Step 5: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/api/analysis-routes.test.js
```

Expected: PASS.

---

### Task 7: Deepen Plans And Optimization Records APIs

**Files:**
- Create: `server/routes/deepen-plan-routes.js`
- Create: `server/routes/optimization-record-routes.js`
- Modify: `server/app.js`
- Test: `tests/api/records-and-plans.test.js`

- [ ] **Step 1: Write failing tests for preview and records**

```js
const request = require('supertest');
const { describe, expect, test, vi } = require('vitest');

vi.mock('../../server/services/well-service', () => ({
  getWell: vi.fn(async () => ({ id: 'G3-4', name: '高3-4井', status: 'producing', pumpDepth: 1860, pumpEfficiency: 32.1, dailyOil: 2.1, submergence: 110, current: 45.2, load: 52.3, dynamicLevel: 1750, depth: 2010, waterCut: 89.8, backPressure: 1.05, reservoirPressure: 16, bubblePointPressure: 10, AOF: 6.3 }))
}));

vi.mock('../../server/db', () => ({
  query: vi.fn(async () => ({ rows: [] }))
}));

const { createApp } = require('../../server/app');

describe('records and plans api', () => {
  test('previews deepen plan', async () => {
    const res = await request(createApp()).post('/api/deepen-plans/preview').send({ wellId: 'G3-4', deepenAmount: 60 });
    expect(res.status).toBe(200);
    expect(res.body.newPumpDepth).toBe(1920);
  });

  test('accepts optimization record payload', async () => {
    const res = await request(createApp()).post('/api/optimization-records').send({
      wellId: 'G3-4',
      recordDate: '2024-08-15',
      prevDepth: 1800,
      newDepth: 1860,
      delta: 60,
      reason: '供液不足',
      effect: '泵效略有改善',
      status: 'warning'
    });
    expect([200, 201]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/api/records-and-plans.test.js
```

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement deepen routes**

Behavior:

- `POST /api/deepen-plans/preview` validates `wellId` and numeric `deepenAmount`, returns `generateDeepenPlan(well, deepenAmount)`.
- `POST /api/deepen-plans` generates the same plan and inserts it into `deepen_plans`.
- `GET /api/deepen-plans` returns saved plans ordered by `created_at desc`.

- [ ] **Step 4: Implement optimization record routes**

Behavior:

- `GET /api/optimization-records` returns records ordered by `record_date desc`, filtered by `wellId` if provided.
- `POST /api/optimization-records` validates payload and inserts a row.

- [ ] **Step 5: Register routes**

```js
const deepenPlanRoutes = require('./routes/deepen-plan-routes');
const optimizationRecordRoutes = require('./routes/optimization-record-routes');

app.use('/api/deepen-plans', deepenPlanRoutes);
app.use('/api/optimization-records', optimizationRecordRoutes);
```

- [ ] **Step 6: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/api/records-and-plans.test.js
```

Expected: PASS.

---

### Task 8: Nodal Analysis API

**Files:**
- Create: `server/routes/nodal-routes.js`
- Modify: `server/app.js`
- Test: `tests/api/nodal.test.js`

- [ ] **Step 1: Write failing nodal test**

```js
const request = require('supertest');
const { describe, expect, test, vi } = require('vitest');

vi.mock('../../server/services/well-service', () => ({
  getWell: vi.fn(async () => ({ id: 'G3-4', name: '高3-4井', status: 'producing', pumpDepth: 1860, pumpEfficiency: 32.1, dailyOil: 2.1, submergence: 110, current: 45.2, load: 52.3, dynamicLevel: 1750, depth: 2010, waterCut: 89.8, backPressure: 1.05, reservoirPressure: 16, bubblePointPressure: 10, AOF: 6.3 }))
}));

const { createApp } = require('../../server/app');

describe('nodal api', () => {
  test('returns nodal result and curves', async () => {
    const res = await request(createApp()).get('/api/nodal/G3-4');
    expect(res.status).toBe(200);
    expect(res.body.well).toBe('G3-4');
    expect(res.body.iprCurve.length).toBeGreaterThan(10);
    expect(res.body.vlpCurve.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
npm test -- tests/api/nodal.test.js
```

Expected: FAIL because `/api/nodal/:id` is missing.

- [ ] **Step 3: Implement route**

`GET /api/nodal/:id` loads the well and returns `solveNodal(well)` from `analysis-service`.

- [ ] **Step 4: Register route**

```js
const nodalRoutes = require('./routes/nodal-routes');
app.use('/api/nodal', nodalRoutes);
```

- [ ] **Step 5: Run test to verify GREEN**

Run:

```powershell
npm test -- tests/api/nodal.test.js
```

Expected: PASS.

---

### Task 9: Frontend API Client

**Files:**
- Modify: `js/data.js`
- Test manually in browser after backend is available.

- [ ] **Step 1: Preserve the old file for reference**

Before editing, copy the current static data into `server/data/seed-data.js` in Task 3. Do not keep duplicate live data in the browser.

- [ ] **Step 2: Replace `DataStore` with async API client**

Implement this shape:

```js
const DataStore = {
  wells: [],
  optimizationHistory: [],
  dynamicLevelTrend: {},
  monthlyTrend: [],

  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || '请求失败');
    }
    return res.json();
  },

  async init() {
    await this.request('/api/health');
    this.wells = await this.request('/api/wells');
    this.optimizationHistory = await this.request('/api/optimization-records');
  },

  async refreshWells() {
    this.wells = await this.request('/api/wells');
    return this.wells;
  },

  getWellList() {
    return this.wells.map((w) => ({ id: w.id, name: w.name, status: w.status }));
  },

  getWellById(id) {
    return this.wells.find((w) => w.id === id);
  }
};
```

Then add async methods for every API route used by `App`: `getZoneSummary`, `getPotentialWells`, `getTuningReminders`, `getDynamicLevel`, `diagnoseWell`, `generateDeepenPlan`, `saveDeepenPlan`, `getNodal`, `getWellHistory`, `createOptimizationRecord`, `updateWell`.

- [ ] **Step 3: Manual RED check before app changes**

Run:

```powershell
npm start
```

Open `http://localhost:3000`.

Expected: Some pages fail because `App` still expects synchronous methods. This confirms frontend app changes are needed.

---

### Task 10: Async Frontend Rendering And Forms

**Files:**
- Modify: `js/app.js`
- Modify: `js/components.js`

- [ ] **Step 1: Add loading and error helpers**

In `App`, add:

```js
showLoading(containerId, message = '数据加载中...') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="card"><div class="card-body"><span class="spinner"></span> ${message}</div></div>`;
},

showError(containerId, error) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = UIComponents.alert('danger', error.message || '加载失败');
}
```

- [ ] **Step 2: Make initialization async**

Change startup to:

```js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await App.init();
  } catch (error) {
    document.body.innerHTML = `<div style="padding:24px">${UIComponents.alert('danger', `系统启动失败：${error.message}`)}</div>`;
  }
});
```

`App.init()` must `await DataStore.init()` before updating welcome stats.

- [ ] **Step 3: Convert page render methods to async**

Convert `renderDashboard`, `renderWells`, `refreshWellView`, `renderScreening`, `renderDeepen`, `calculateDeepenPlan`, `renderTuning`, `renderNodal`, `refreshNodal`, `renderHistory`, `filterHistory` to async methods where they call API data.

- [ ] **Step 4: Add edit well form component**

Add `UIComponents.wellEditForm(well)` that renders fields for pump depth, pump efficiency, dynamic level, submergence, production values, pressure values, and status. Submit calls `App.saveWellEdit()`.

- [ ] **Step 5: Add optimization record form component**

Add `UIComponents.optimizationRecordForm(wells)` with fields matching `POST /api/optimization-records`. Submit calls `App.saveOptimizationRecord()`.

- [ ] **Step 6: Add save deepen plan action**

After preview generation, render a button:

```html
<button class="btn btn-success btn-sm" onclick="App.saveCurrentDeepenPlan()">保存方案</button>
```

`App.saveCurrentDeepenPlan()` calls `DataStore.saveDeepenPlan({ wellId, deepenAmount })` and shows a success alert.

- [ ] **Step 7: Manual verification**

Run:

```powershell
npm start
```

Expected:

- `http://localhost:3000` opens the welcome page.
- Entering system renders dashboard from API.
- Single well page can switch wells.
- Potential wells page shows G3-4 and G3-13 based on the existing rules.
- Deepen preview works and save button persists a plan.
- History page can add a record.

---

### Task 11: README Update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update run instructions**

Document:

```powershell
npm install

# 确认本机 PostgreSQL 已启动，连接信息：
# host=localhost port=5432 user=postgres password=123456 database=bgua

npm run init-db
npm start
```

Browser URL:

```text
http://localhost:3000
```

- [ ] **Step 2: Update architecture description**

Mention:

- Frontend: HTML5, CSS3, JavaScript, Chart.js.
- Backend: Node.js, Express.
- Database: PostgreSQL.
- Data initialization: `server/scripts/init-db.js`.

- [ ] **Step 3: Document tests**

```powershell
npm test
```

Expected: All Vitest suites pass.

---

### Task 12: End-To-End Verification

**Files:**
- No new files.

- [ ] **Step 1: Run backend tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 2: Initialize database**

Run:

```powershell
npm run init-db
```

Expected: prints `数据库初始化完成`.

- [ ] **Step 3: Start app**

Run:

```powershell
npm start
```

Expected: prints `泵挂深度动态优化管理系统已启动：http://localhost:3000`.

- [ ] **Step 4: Verify health API**

Open:

```text
http://localhost:3000/api/health
```

Expected:

```json
{"status":"ok","database":"ok"}
```

- [ ] **Step 5: Verify UI workflows**

In browser:

- Dashboard renders stats and charts.
- Single well page displays G3-1 by default.
- Editing a well updates the displayed value after refresh.
- Potential wells page lists wells matching `pumpEfficiency < 40` and `submergence < 200`.
- Deepen plan preview and save work.
- History record creation updates the table and timeline.
- Nodal page renders IPR/VLP curves.

---

## Self-Review

Spec coverage:

- PostgreSQL backend covered by Tasks 1-8 and Task 12.
- Database schema and seed import covered by Task 3.
- API endpoints covered by Tasks 2, 5, 6, 7, and 8.
- Frontend API migration and management actions covered by Tasks 9 and 10.
- Documentation and verification covered by Tasks 11 and 12.

Placeholder scan:

- This plan uses concrete tasks, file paths, commands, and expected results without deferred implementation markers.
- The seed data step explicitly requires all 20 wells, all existing dynamic-level arrays, and all 8 records from `js/data.js`.

Type consistency:

- API-facing field names use camelCase.
- Database fields use snake_case, with `current_value` and `load_value` to avoid ambiguous SQL names.
- Route names match the approved design spec.
