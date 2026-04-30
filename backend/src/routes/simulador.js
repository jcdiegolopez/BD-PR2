const express = require('express');
const { generarDataset } = require('../services/simulador');
const logger = require('../services/logger');

const router = express.Router();

router.post('/generar', async (req, res) => {
  const payload = req.body || {};
  try {
    logger.info('Simulador generar solicitado', {
      personas: payload.personas || 0,
      numeros: payload.numeros || 0,
      operadoras: payload.operadoras || 0,
      dispositivos: payload.dispositivos || 0,
      llamadas: payload.llamadas || 0,
      mensajes: payload.mensajes || 0,
      reportes: payload.reportes || 0,
      inyectarFraude: Boolean(payload.inyectarFraude),
    });
    const resultado = await generarDataset(payload);
    logger.info('Simulador generar completado', resultado);
    return res.json(resultado);
  } catch (error) {
    logger.error('Simulador generar error', { error: error.message });
    return res.status(500).json({ error: 'Error al generar dataset', detalle: error.message });
  }
});

module.exports = router;
