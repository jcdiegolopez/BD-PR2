const express = require('express');
const { getSession } = require('../services/neo4j');
const { RELATIONSHIPS, RELATIONSHIP_LABELS } = require('../services/schema');
const logger = require('../services/logger');

const router = express.Router();

router.post('/', async (req, res) => {
  const { origenId, destinoId, tipo, propiedades } = req.body;
  if (!RELATIONSHIPS.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de relación no permitido' });
  }
  const expectedLabels = RELATIONSHIP_LABELS[tipo];
  if (!expectedLabels) {
    return res.status(400).json({ error: 'Configuración de relación no definida' });
  }
  const session = getSession();
  try {
    logger.info('Relacion crear intento', { tipo });
    const validationResult = await session.run(
      `MATCH (origen) WHERE id(origen) = $origenId
       MATCH (destino) WHERE id(destino) = $destinoId
       RETURN labels(origen) AS origenLabels, labels(destino) AS destinoLabels`,
      {
        origenId: Number(origenId),
        destinoId: Number(destinoId),
      }
    );
    if (!validationResult.records.length) {
      return res.status(404).json({ error: 'Nodos no encontrados' });
    }
    const origenLabels = validationResult.records[0].get('origenLabels');
    const destinoLabels = validationResult.records[0].get('destinoLabels');
    const origenValido = origenLabels.includes(expectedLabels.origen);
    const destinoValido = destinoLabels.includes(expectedLabels.destino);
    if (!origenValido || !destinoValido) {
      return res.status(400).json({
        error: 'Etiquetas de nodos no válidas para la relación',
        esperado: expectedLabels,
        recibido: {
          origen: origenLabels,
          destino: destinoLabels,
        },
      });
    }
    const queries = {
      ORIGINO: `MATCH (a) WHERE id(a) = $origenId
               MATCH (b) WHERE id(b) = $destinoId
               CREATE (a)-[r:ORIGINO]->(b)
               SET r = $props
               RETURN r`,
      DIRIGIDA_A: `MATCH (a) WHERE id(a) = $origenId
                   MATCH (b) WHERE id(b) = $destinoId
                   CREATE (a)-[r:DIRIGIDA_A]->(b)
                   SET r = $props
                   RETURN r`,
      ENVIO: `MATCH (a) WHERE id(a) = $origenId
              MATCH (b) WHERE id(b) = $destinoId
              CREATE (a)-[r:ENVIO]->(b)
              SET r = $props
              RETURN r`,
      RECIBIDO_POR: `MATCH (a) WHERE id(a) = $origenId
                     MATCH (b) WHERE id(b) = $destinoId
                     CREATE (a)-[r:RECIBIDO_POR]->(b)
                     SET r = $props
                     RETURN r`,
      ES_TITULAR_DE: `MATCH (a) WHERE id(a) = $origenId
                      MATCH (b) WHERE id(b) = $destinoId
                      CREATE (a)-[r:ES_TITULAR_DE]->(b)
                      SET r = $props
                      RETURN r`,
      PERTENECE_A: `MATCH (a) WHERE id(a) = $origenId
                    MATCH (b) WHERE id(b) = $destinoId
                    CREATE (a)-[r:PERTENECE_A]->(b)
                    SET r = $props
                    RETURN r`,
      USO_NUMERO: `MATCH (a) WHERE id(a) = $origenId
                   MATCH (b) WHERE id(b) = $destinoId
                   CREATE (a)-[r:USO_NUMERO]->(b)
                   SET r = $props
                   RETURN r`,
      REALIZO_REPORTE: `MATCH (a) WHERE id(a) = $origenId
                        MATCH (b) WHERE id(b) = $destinoId
                        CREATE (a)-[r:REALIZO_REPORTE]->(b)
                        SET r = $props
                        RETURN r`,
      INVOLUCRA_NUMERO: `MATCH (a) WHERE id(a) = $origenId
                         MATCH (b) WHERE id(b) = $destinoId
                         CREATE (a)-[r:INVOLUCRA_NUMERO]->(b)
                         SET r = $props
                         RETURN r`,
      GENERO: `MATCH (a) WHERE id(a) = $origenId
               MATCH (b) WHERE id(b) = $destinoId
               CREATE (a)-[r:GENERO]->(b)
               SET r = $props
               RETURN r`,
      CONTACTO_FRECUENTE: `MATCH (a) WHERE id(a) = $origenId
                           MATCH (b) WHERE id(b) = $destinoId
                           CREATE (a)-[r:CONTACTO_FRECUENTE]->(b)
                           SET r = $props
                           RETURN r`,
      VICTIMA_DE: `MATCH (a) WHERE id(a) = $origenId
                   MATCH (b) WHERE id(b) = $destinoId
                   CREATE (a)-[r:VICTIMA_DE]->(b)
                   SET r = $props
                   RETURN r`,
    };
    const result = await session.run(queries[tipo], {
      origenId: Number(origenId),
      destinoId: Number(destinoId),
      props: propiedades || {},
    });
    logger.info('Relacion creada', { tipo });
    return res.status(201).json(result.records[0].get('r').properties);
  } finally {
    await session.close();
  }
});

router.patch('/bulk/propiedades', async (req, res) => {
  const { ids, propiedades } = req.body;
  const session = getSession();
  try {
    logger.info('Relaciones actualizadas bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $rows AS row
       MATCH ()-[r]->() WHERE id(r) = row.id
       SET r += row.props`,
      { rows: (ids || []).map((id) => ({ id, props: propiedades || {} })) }
    );
    return res.json({ actualizadas: (ids || []).length });
  } finally {
    await session.close();
  }
});

router.patch('/:id/propiedades', async (req, res) => {
  const { propiedades } = req.body;
  const session = getSession();
  try {
    logger.info('Relacion actualizada', { id: Number(req.params.id) });
    const result = await session.run(
      `MATCH ()-[r]->() WHERE id(r) = $id
       SET r += $props
       RETURN r`,
      { id: Number(req.params.id), props: propiedades || {} }
    );
    if (!result.records.length) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }
    return res.json(result.records[0].get('r').properties);
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
    logger.info('Relaciones props eliminadas bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $rows AS row
       MATCH ()-[r]->() WHERE id(r) = row.id
       FOREACH (key IN $keys | SET r[key] = null)`,
      { rows: (ids || []).map((id) => ({ id })), keys }
    );
    return res.json({ actualizadas: (ids || []).length });
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
    logger.info('Relacion props eliminadas', { id: Number(req.params.id) });
    const result = await session.run(
      `MATCH ()-[r]->() WHERE id(r) = $id
       FOREACH (key IN $keys | SET r[key] = null)
       RETURN r`,
      { id: Number(req.params.id), keys }
    );
    if (!result.records.length) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }
    return res.json(result.records[0].get('r').properties);
  } finally {
    await session.close();
  }
});

router.delete('/bulk', async (req, res) => {
  const { ids } = req.body;
  const session = getSession();
  try {
    logger.info('Relaciones eliminadas bulk', { total: (ids || []).length });
    await session.run(
      `UNWIND $ids AS id
       MATCH ()-[r]->() WHERE id(r) = id
       DELETE r`,
      { ids: ids || [] }
    );
    return res.json({ eliminadas: (ids || []).length });
  } finally {
    await session.close();
  }
});

router.delete('/:id', async (req, res) => {
  const session = getSession();
  try {
    logger.info('Relacion eliminada', { id: Number(req.params.id) });
    await session.run(`MATCH ()-[r]->() WHERE id(r) = $id DELETE r`, {
      id: Number(req.params.id),
    });
    return res.json({ eliminado: true });
  } finally {
    await session.close();
  }
});

module.exports = router;
