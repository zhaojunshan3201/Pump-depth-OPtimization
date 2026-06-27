const express = require('express');
const wellService = require('../services/well-service');
const { getTuningReminders } = require('../services/analysis-service');

const router = express.Router();

router.get('/reminders', async (req, res) => {
  try {
    const wells = await wellService.listWells();
    res.json(getTuningReminders(wells, new Date()));
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
