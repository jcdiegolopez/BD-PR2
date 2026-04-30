const express = require('express');
const { getSession } = require('../services/neo4j');
const logger = require('../services/logger');

const router = express.Router();

router.get('/', async (req, res) => {
  const { cypher, params } = req.query;
  if (!cypher) {
    return res.status(400).json({ error: 'Cypher requerido' });
  }
  let parsedParams = {};
  if (params) {
    try {
      parsedParams = JSON.parse(params);
    } catch (error) {
      return res.status(400).json({ error: 'Params inválidos' });
    }
  }
  const session = getSession();
  try {
    logger.info('Grafo query ejecutada', { hasParams: Boolean(params) });
    const result = await session.run(cypher, parsedParams);
    return res.json(result.records.map((r) => r.toObject()));
  } catch (error) {
    logger.error('Grafo query error', { error: error.message });
    return res.status(500).json({ error: error.message || 'Error ejecutando query' });
  } finally {
    await session.close();
  }
});

router.get('/stats', async (_req, res) => {
  const session = getSession();
  try {
    logger.info('Grafo stats solicitadas');
    const result = await session.run(
      `MATCH (n)
       UNWIND labels(n) AS label
       RETURN label, count(*) AS total
       ORDER BY total DESC`
    );
    return res.json(result.records.map((r) => ({
      label: r.get('label'),
      total: r.get('total'),
    })));
  } catch (error) {
    logger.error('Stats error', { error: error.message });
    return res.status(500).json({ error: error.message || 'Error obteniendo stats' });
  } finally {
    await session.close();
  }
});

module.exports = router;
