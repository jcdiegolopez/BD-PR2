const express = require('express');
const { runDetections } = require('../services/detector');
const logger = require('../services/logger');

const router = express.Router();

router.post('/ejecutar', async (req, res) => {
  try {
    logger.info('Deteccion ejecutar solicitado', req.body || {});
    const resultado = await runDetections(req.body || {});
    logger.info('Deteccion ejecutar completada');
    return res.json(resultado);
  } catch (error) {
    logger.error('Deteccion ejecutar error', { error: error.message });
    return res.status(500).json({ error: 'Error al ejecutar detección', detalle: error.message });
  }
});

module.exports = router;
