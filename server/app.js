const path = require('path');
const express = require('express');
const healthRoutes = require('./routes/health-routes');
const wellRoutes = require('./routes/well-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const screeningRoutes = require('./routes/screening-routes');
const tuningRoutes = require('./routes/tuning-routes');
const deepenPlanRoutes = require('./routes/deepen-plan-routes');
const optimizationRecordRoutes = require('./routes/optimization-record-routes');
const nodalRoutes = require('./routes/nodal-routes');

const blockedStaticPrefixes = ['/server', '/tests', '/docs', '/node_modules', '/.superpowers'];
const blockedStaticFiles = new Set([
  '/package.json',
  '/package-lock.json',
  '/.env',
  '/.env.example'
]);

function blockProjectInternals(req, res, next) {
  if (
    blockedStaticFiles.has(req.path) ||
    blockedStaticPrefixes.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))
  ) {
    res.status(404).end();
    return;
  }

  next();
}

function allowLocalApiAccess(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

function createApp() {
  const app = express();
  app.use('/api', allowLocalApiAccess);
  app.use(express.json({ limit: '10mb' }));
  app.use('/api', healthRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/screening', screeningRoutes);
  app.use('/api/tuning', tuningRoutes);
  app.use('/api/deepen-plans', deepenPlanRoutes);
  app.use('/api/optimization-records', optimizationRecordRoutes);
  app.use('/api/nodal', nodalRoutes);
  app.use('/api/wells', wellRoutes);
  app.use(blockProjectInternals);
  app.use(express.static(path.join(__dirname, '..')));
  return app;
}

module.exports = { createApp };
