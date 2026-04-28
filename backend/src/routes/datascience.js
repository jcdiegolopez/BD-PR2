const express = require('express');
const { runGraphAlgorithms } = require('../services/datascience');

const router = express.Router();

router.post('/ejecutar', async (_req, res) => {
  try {
    const resultado = await runGraphAlgorithms();
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({
      error: 'Error al ejecutar algoritmos GDS',
      detalle: error.message,
    });
  }
});

module.exports = router;
