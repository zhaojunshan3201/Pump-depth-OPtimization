const express = require('express');
const wellService = require('../services/well-service');
const { getPotentialWells } = require('../services/analysis-service');

const router = express.Router();

router.get('/potential-wells', async (req, res) => {
  try {
    const wells = await wellService.listWells();
    res.json(getPotentialWells(wells));
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
