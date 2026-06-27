const express = require('express');
const wellService = require('../services/well-service');
const { solveNodal } = require('../services/analysis-service');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const well = await wellService.getWell(req.params.id);
    if (!well) {
      res.status(404).json({ error: '井不存在' });
      return;
    }

    res.json(solveNodal(well));
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
