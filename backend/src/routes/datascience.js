const express = require('express');
const { runGraphAlgorithms } = require('../services/datascience');
const logger = require('../services/logger');

const router = express.Router();

router.post('/ejecutar', async (_req, res) => {
  try {
    logger.info('GDS ejecutar solicitado');
    const resultado = await runGraphAlgorithms();
    logger.info('GDS ejecutar completado');
    return res.json(resultado);
  } catch (error) {
    logger.error('GDS ejecutar error', { error: error.message });
    return res.status(500).json({
      error: 'Error al ejecutar algoritmos GDS',
      detalle: error.message,
    });
  }
});

module.exports = router;
