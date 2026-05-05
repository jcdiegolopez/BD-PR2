import axios from 'axios'
import { normalizeNeo4jRecord } from './neo4j'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
})

/* ── Grafo / Stats ── */

export async function getStats() {
  const { data } = await api.get('/api/grafo/stats')
  return data
}

export async function runCypher(cypher, params = {}) {
  const { data } = await api.get('/api/grafo', {
    params: {
      cypher,
      params: Object.keys(params).length ? JSON.stringify(params) : undefined,
    },
  })
  return data.map((record) => normalizeNeo4jRecord(record))
}

/* ── Nodos ── */

export async function listNodes({ label, filters } = {}) {
  const { data } = await api.get('/api/nodos', {
    params: {
      label: label || undefined,
      filtros: filters ? JSON.stringify(filters) : undefined,
    },
  })
  return data.map((item) => normalizeNeo4jRecord(item))
}

export async function getAggregations(label) {
  const { data } = await api.get('/api/nodos/agregaciones', {
    params: { label: label || undefined },
  })
  return data
}

export async function getNodeDetail(id) {
  const { data } = await api.get(`/api/nodos/${id}`)
  return normalizeNeo4jRecord(data)
}

export async function createNode(payload) {
  const { data } = await api.post('/api/nodos', payload)
  return data
}

export async function updateNodeLabels(id, labels) {
  const { data } = await api.patch(`/api/nodos/${id}/labels`, { labels })
  return data
}

export async function updateNodeProps(id, propiedades) {
  const { data } = await api.patch(`/api/nodos/${id}/propiedades`, { propiedades })
  return data
}

export async function bulkUpdateNodeProps(ids, propiedades) {
  const { data } = await api.patch('/api/nodos/bulk/propiedades', { ids, propiedades })
  return data
}

export async function deleteNodeProps(id, keys) {
  const { data } = await api.delete(`/api/nodos/${id}/propiedades`, { data: { keys } })
  return data
}

export async function bulkDeleteNodeProps(ids, keys) {
  const { data } = await api.delete('/api/nodos/bulk/propiedades', { data: { ids, keys } })
  return data
}

export async function deleteNode(id) {
  const { data } = await api.delete(`/api/nodos/${id}`)
  return data
}

export async function bulkDeleteNodes(ids) {
  const { data } = await api.delete('/api/nodos/bulk', { data: { ids } })
  return data
}

/* ── Relaciones ── */

export async function listRelations({ tipo } = {}) {
  const cypher = tipo
    ? `MATCH (a)-[r:${tipo}]->(b) RETURN id(r) AS id, type(r) AS tipo, id(a) AS origenId, labels(a) AS origenLabels, properties(a) AS origenProps, id(b) AS destinoId, labels(b) AS destinoLabels, properties(b) AS destinoProps, properties(r) AS properties ORDER BY id(r) DESC LIMIT 200`
    : `MATCH (a)-[r]->(b) RETURN id(r) AS id, type(r) AS tipo, id(a) AS origenId, labels(a) AS origenLabels, properties(a) AS origenProps, id(b) AS destinoId, labels(b) AS destinoLabels, properties(b) AS destinoProps, properties(r) AS properties ORDER BY id(r) DESC LIMIT 200`
  return runCypher(cypher)
}

export async function createRelation(payload) {
  const { data } = await api.post('/api/relaciones', payload)
  return data
}

export async function updateRelationProps(id, propiedades) {
  const { data } = await api.patch(`/api/relaciones/${id}/propiedades`, { propiedades })
  return data
}

export async function bulkUpdateRelationProps(ids, propiedades) {
  const { data } = await api.patch('/api/relaciones/bulk/propiedades', { ids, propiedades })
  return data
}

export async function deleteRelationProps(id, keys) {
  const { data } = await api.delete(`/api/relaciones/${id}/propiedades`, { data: { keys } })
  return data
}

export async function bulkDeleteRelationProps(ids, keys) {
  const { data } = await api.delete('/api/relaciones/bulk/propiedades', { data: { ids, keys } })
  return data
}

export async function deleteRelation(id) {
  const { data } = await api.delete(`/api/relaciones/${id}`)
  return data
}

export async function bulkDeleteRelations(ids) {
  const { data } = await api.delete('/api/relaciones/bulk', { data: { ids } })
  return data
}

/* ── Deteccion / Data Science ── */

export async function runDeteccion(payload = {}) {
  const { data } = await api.post('/api/deteccion/ejecutar', payload)
  return data
}

export async function runDataScience() {
  const { data } = await api.post('/api/datascience/ejecutar')
  return data
}

/* ── Simulador / CSV ── */

export async function runSimulador(payload) {
  const { data } = await api.post('/api/simulador/generar', payload)
  return data
}

export async function cargarCsv(payload) {
  const { data } = await api.post('/api/csv/cargar', payload)
  return data
}
