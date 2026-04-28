const express = require('express');
const { generarDataset } = require('../services/simulador');

const router = express.Router();

router.post('/generar', async (req, res) => {
  const payload = req.body || {};
  try {
    const resultado = await generarDataset(payload);
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: 'Error al generar dataset', detalle: error.message });
  }
});

module.exports = router;
