const express = require('express');
const { runDetections } = require('../services/detector');

const router = express.Router();

router.post('/ejecutar', async (req, res) => {
  try {
    const resultado = await runDetections(req.body || {});
    return res.json(resultado);
  } catch (error) {
    return res.status(500).json({ error: 'Error al ejecutar detección', detalle: error.message });
  }
});

module.exports = router;
