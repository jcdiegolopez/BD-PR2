require('dotenv').config();
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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
  console.log(`Backend escuchando en puerto ${PORT}`);
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
      personas: 0,
      numeros: 0,
      operadoras: 0,
      dispositivos: 0,
      llamadas: 200,
      mensajes: 120,
      reportes: 0,
      inyectarFraude,
      fraudeRatio: 0.25,
    });
    console.log(
      `Simulacion periodica completada${inyectarFraude ? ' (fraude inyectado)' : ''}`
    );
  } catch (error) {
    console.error('Error en simulacion periodica:', error.message);
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
    console.log('Deteccion periodica completada');
  } catch (error) {
    console.error('Error en deteccion periodica:', error.message);
  } finally {
    deteccionEnCurso = false;
  }
}, DETECCION_CADA_MS);
