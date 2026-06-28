const express = require('express');
const wellService = require('../services/well-service');
const { diagnoseWell, generateDynamicLevelTrend } = require('../services/analysis-service');

const router = express.Router();

function handleError(error, res) {
  if (error.statusCode) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: '服务器错误' });
}

router.get('/', async (req, res) => {
  try {
    res.json(await wellService.listWells());
  } catch (error) {
    handleError(error, res);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const well = await wellService.getWell(req.params.id);
    if (!well) {
      res.status(404).json({ error: '井不存在' });
      return;
    }

    res.json(well);
  } catch (error) {
    handleError(error, res);
  }
});

router.get('/:id/diagnosis', async (req, res) => {
  try {
    const well = await wellService.getWell(req.params.id);
    if (!well) {
      res.status(404).json({ error: '井不存在' });
      return;
    }

    res.json(diagnoseWell(well));
  } catch (error) {
    handleError(error, res);
  }
});

router.get('/:id/dynamic-level', async (req, res) => {
  try {
    const readings = await wellService.getDynamicLevel(req.params.id);
    if (readings.length > 0) {
      res.json(readings);
      return;
    }

    const well = await wellService.getWell(req.params.id);
    if (!well) {
      res.status(404).json({ error: '井不存在' });
      return;
    }

    res.json(generateDynamicLevelTrend(well));
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await wellService.createWell(req.body));
  } catch (error) {
    handleError(error, res);
  }
});

router.post('/import', async (req, res) => {
  try {
    const wells = await wellService.importWells(req.body);
    res.json({ imported: wells.length, wells });
  } catch (error) {
    handleError(error, res);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const well = await wellService.updateWell(req.params.id, req.body);
    if (!well) {
      res.status(404).json({ error: '井不存在' });
      return;
    }

    res.json(well);
  } catch (error) {
    handleError(error, res);
  }
});

module.exports = router;
