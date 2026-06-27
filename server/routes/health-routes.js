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
