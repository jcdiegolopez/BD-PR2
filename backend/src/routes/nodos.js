const express = require('express');
const { getSession } = require('../services/neo4j');
const { LABELS } = require('../services/schema');
const logger = require('../services/logger');

const router = express.Router();

function validateLabels(labels) {
  return Array.isArray(labels) && labels.every((label) => LABELS.includes(label));
}

router.get('/', async (req, res) => {
  const { label, filtros } = req.query;
  if (label && !LABELS.includes(label)) {
    return res.status(400).json({ error: 'Label no permitido' });
  }
  let filters = {};
  if (filtros) {
    try {
      filters = JSON.parse(filtros);
    } catch (error) {
      return res.status(400).json({ error: 'Formato de filtros inválido' });
    }
  }

  const session = getSession();
  try {
    logger.info('Nodos listados', { label: label || null });
    const result = await session.run(
      `MATCH (n)
       WHERE ($label IS NULL OR $label IN labels(n))
       AND all(k IN keys($filters) WHERE n[k] = $filters[k])
       RETURN id(n) AS id, labels(n) AS labels, properties(n) AS properties
       LIMIT 200`,
      { label: label || null, filters }
    );
    return res.json(result.records.map((r) => ({
      id: r.get('id'),
      labels: r.get('labels'),
      properties: r.get('properties'),
    })));
  } finally {
    await session.close();
  }
});

router.get('/agregaciones', async (req, res) => {
  const { label } = req.query;
  if (label && !LABELS.includes(label)) {
    return res.status(400).json({ error: 'Label no permitido' });
  }
  const session = getSession();
  try {
    logger.info('Nodos agregaciones', { label: label || null });
    const result = await session.run(
      `MATCH (n)
       WHERE ($label IS NULL OR $label IN labels(n))
       RETURN count(n) AS total`,
      { label: label || null }
    );
    return res.json(result.records[0]?.get('total') ?? 0);
  } finally {
    await session.close();
  }
});

router.get('/:id', async (req, res) => {
  const session = getSession();
  try {
    logger.info('Nodo obtenido', { id: Number(req.params.id) });
    const result = await session.run(
      `MATCH (n) WHERE id(n) = $id
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN n, collect(r) AS relaciones, collect(m) AS vecinos`,
      { id: Number(req.params.id) }
    );
    if (!result.records.length) {
      return res.status(404).json({ error: 'Nodo no encontrado' });
    }
    const record = result.records[0];
    return res.json({
      nodo: record.get('n').properties,
      relaciones: record.get('relaciones'),
      vecinos: record.get('vecinos').map((v) => v.properties),
    });
  } finally {
    await session.close();
  }
});

router.post('/', async (req, res) => {
  const { labels, propiedades } = req.body;
  if (!validateLabels(labels)) {
    return res.status(400).json({ error: 'Labels inválidos' });
  }
  const session = getSession();
  try {
    logger.info('Nodo creado', { labels });
    const result = await session.run(
      `CREATE (n)
       SET n = $props
       FOREACH (_ IN CASE WHEN 'Numero' IN $labels THEN [1] ELSE [] END | SET n:Numero)
       FOREACH (_ IN CASE WHEN 'Persona' IN $labels THEN [1] ELSE [] END | SET n:Persona)
       FOREACH (_ IN CASE WHEN 'Operadora' IN $labels THEN [1] ELSE [] END | SET n:Operadora)
       FOREACH (_ IN CASE WHEN 'Dispositivo' IN $labels THEN [1] ELSE [] END | SET n:Dispositivo)
       FOREACH (_ IN CASE WHEN 'Llamada' IN $labels THEN [1] ELSE [] END | SET n:Llamada)
       FOREACH (_ IN CASE WHEN 'Mensaje' IN $labels THEN [1] ELSE [] END | SET n:Mensaje)
       FOREACH (_ IN CASE WHEN 'Reporte' IN $labels THEN [1] ELSE [] END | SET n:Reporte)
       FOREACH (_ IN CASE WHEN 'Sospechoso' IN $labels THEN [1] ELSE [] END | SET n:Sospechoso)
       FOREACH (_ IN CASE WHEN 'Bloqueado' IN $labels THEN [1] ELSE [] END | SET n:Bloqueado)
       FOREACH (_ IN CASE WHEN 'Verificado' IN $labels THEN [1] ELSE [] END | SET n:Verificado)
       RETURN n`,
      { props: propiedades || {}, labels }
    );
    return res.status(201).json(result.records[0].get('n').properties);
  } finally {
    await session.close();
  }
});

router.patch('/:id/propiedades', async (req, res) => {
  const { propiedades } = req.body;
  const session = getSession();
  try {
    logger.info('Nodo actualizado', { id: Number(req.params.id) });
    const result = await session.run(
      `MATCH (n) WHERE id(n) = $id
       SET n += $props
       RETURN n`,
      { id: Number(req.params.id), props: propiedades || {} }
    );
    if (!result.records.length) {
      return res.status(404).json({ error: 'Nodo no encontrado' });
    }
    return res.json(result.records[0].get('n').properties);
  } finally {
    await session.close();
  }
});

router.patch('/bulk/propiedades', async (req, res) => {
  const { ids, propiedades } = req.body;
  const session = getSession();
  try {
    logger.info('Nodos actualizados bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $rows AS row
       MATCH (n) WHERE id(n) = row.id
       SET n += row.props`,
      { rows: (ids || []).map((id) => ({ id, props: propiedades || {} })) }
    );
    return res.json({ actualizados: (ids || []).length });
  } finally {
    await session.close();
  }
});

router.delete('/:id/propiedades', async (req, res) => {
  const { keys } = req.body;
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: 'Keys requeridas' });
  }
  const session = getSession();
  try {
    logger.info('Nodo props eliminadas', { id: Number(req.params.id) });
    const result = await session.run(
      `MATCH (n) WHERE id(n) = $id
       FOREACH (key IN $keys | SET n[key] = null)
       RETURN n`,
      { id: Number(req.params.id), keys }
    );
    if (!result.records.length) {
      return res.status(404).json({ error: 'Nodo no encontrado' });
    }
    return res.json(result.records[0].get('n').properties);
  } finally {
    await session.close();
  }
});

router.delete('/bulk/propiedades', async (req, res) => {
  const { ids, keys } = req.body;
  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(400).json({ error: 'Keys requeridas' });
  }
  const session = getSession();
  try {
    logger.info('Nodos props eliminadas bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $rows AS row
       MATCH (n) WHERE id(n) = row.id
       FOREACH (key IN $keys | SET n[key] = null)`,
      { rows: (ids || []).map((id) => ({ id })), keys }
    );
    return res.json({ actualizados: (ids || []).length });
  } finally {
    await session.close();
  }
});

router.delete('/:id', async (req, res) => {
  const session = getSession();
  try {
    logger.info('Nodo eliminado', { id: Number(req.params.id) });
    await session.run(`MATCH (n) WHERE id(n) = $id DETACH DELETE n`, {
      id: Number(req.params.id),
    });
    return res.json({ eliminado: true });
  } finally {
    await session.close();
  }
});

router.delete('/bulk', async (req, res) => {
  const { ids } = req.body;
  const session = getSession();
  try {
    logger.info('Nodos eliminados bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $ids AS id
       MATCH (n) WHERE id(n) = id
       DETACH DELETE n`,
      { ids: ids || [] }
    );
    return res.json({ eliminados: (ids || []).length });
  } finally {
    await session.close();
  }
});

module.exports = router;
