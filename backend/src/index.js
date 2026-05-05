require('dotenv').config();

// Prevent crashes from unhandled promise rejections (e.g. Neo4j connection failures)
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err?.message || err);
});

const path = require('path');
const express = require('express');
const cors = require('cors');
const nodosRoutes = require('./routes/nodos');
const relacionesRoutes = require('./routes/relaciones');
const grafoRoutes = require('./routes/grafo');
const simuladorRoutes = require('./routes/simulador');
const deteccionRoutes = require('./routes/deteccion');
const csvRoutes = require('./routes/csv');
const datascienceRoutes = require('./routes/datascience');
const { generarDataset } = require('./services/simulador');
const { runDetections } = require('./services/detector');
const logger = require('./services/logger');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/csv-samples', express.static(path.join(__dirname, '../../csv-samples')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/nodos', nodosRoutes);
app.use('/api/relaciones', relacionesRoutes);
app.use('/api/grafo', grafoRoutes);
app.use('/api/simulador', simuladorRoutes);
app.use('/api/deteccion', deteccionRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/datascience', datascienceRoutes);

app.listen(PORT, () => {
  logger.info('Backend escuchando', { port: PORT });
});

const SIMULACION_CADA_MS = 3 * 60 * 1000;
const DETECCION_CADA_MS = 5 * 60 * 1000;

let simulacionEnCurso = false;
let deteccionEnCurso = false;

setInterval(async () => {
  if (simulacionEnCurso) {
    return;
  }
  simulacionEnCurso = true;
  try {
    const inyectarFraude = Math.random() < 0.35;
    await generarDataset({
      personas: 1,
      numeros: 10,
      operadoras: 0,
      dispositivos: 3,
      llamadas: 100,
      mensajes: 70,
      reportes: 10,
      inyectarFraude,
      fraudeRatio: 0.25,
    });
    logger.info('Simulacion periodica completada', { inyectarFraude });
  } catch (error) {
    logger.error('Error en simulacion periodica', { error: error.message });
  } finally {
    simulacionEnCurso = false;
  }
}, SIMULACION_CADA_MS);

setInterval(async () => {
  if (deteccionEnCurso) {
    return;
  }
  deteccionEnCurso = true;
  try {
    await runDetections();
    logger.info('Deteccion periodica completada');
  } catch (error) {
    logger.error('Error en deteccion periodica', { error: error.message });
  } finally {
    deteccionEnCurso = false;
  }
}, DETECCION_CADA_MS);
