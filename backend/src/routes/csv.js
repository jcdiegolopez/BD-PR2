const http = require('http');
const https = require('https');
const express = require('express');
const { getSession } = require('../services/neo4j');
const logger = require('../services/logger');

const router = express.Router();

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https://') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} al obtener ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
    return obj;
  });
}

const CONVERTERS = {
  Numero: (row) => ({
    numero: row.numero,
    activo: row.activo === 'true',
    tipo: row.tipo,
    fecha_registro: row.fecha_registro,
    total_reportes: parseInt(row.total_reportes) || 0,
    score_riesgo: parseFloat(row.score_riesgo) || 0.0,
    etiquetas: row.etiquetas ? row.etiquetas.split(';').filter(Boolean) : [],
  }),
  Persona: (row) => ({
    nombre: row.nombre,
    dpi: row.dpi,
    edad: parseInt(row.edad) || 0,
    departamento: row.departamento,
    es_sospechoso: row.es_sospechoso === 'true',
    fecha_registro: row.fecha_registro,
    roles: row.roles ? row.roles.split(';').filter(Boolean) : [],
  }),
  Operadora: (row) => ({
    nombre: row.nombre,
    pais: row.pais,
    tipo: row.tipo,
    activa: row.activa === 'true',
    clientes_millones: parseFloat(row.clientes_millones) || 0.0,
    fecha_fundacion: row.fecha_fundacion,
    departamentos_cobertura: row.departamentos_cobertura ? row.departamentos_cobertura.split(';').filter(Boolean) : [],
  }),
  Dispositivo: (row) => ({
    imei: row.imei,
    marca: row.marca,
    modelo: row.modelo,
    sistema_operativo: row.sistema_operativo,
    reportado: row.reportado === 'true',
    fecha_primer_uso: row.fecha_primer_uso,
    numeros_distintos_usados: parseInt(row.numeros_distintos_usados) || 1,
  }),
  Llamada: (row) => ({
    numero_origen: row.numero_origen,
    numero_destino: row.numero_destino,
    id_cdr: row.id_cdr,
    duracion_segundos: parseInt(row.duracion_segundos) || 0,
    fecha: row.fecha,
    hora: row.hora,
    sospechosa: row.sospechosa === 'true',
    score_riesgo: parseFloat(row.score_riesgo) || 0.0,
    palabras_detectadas: row.palabras_detectadas ? row.palabras_detectadas.split(';').filter(Boolean) : [],
    desde_dispositivo: row.desde_dispositivo || 'desconocido',
    recibida: row.recibida === 'true',
    contestada: row.contestada === 'true',
    duracion_contestada: parseInt(row.duracion_contestada) || 0,
  }),
  Mensaje: (row) => ({
    numero_origen: row.numero_origen,
    numero_destino: row.numero_destino,
    id_mensaje: row.id_mensaje,
    tipo: row.tipo,
    fecha: row.fecha,
    hora: row.hora,
    contiene_amenaza: row.contiene_amenaza === 'true',
    longitud_caracteres: parseInt(row.longitud_caracteres) || 0,
    score_riesgo: parseFloat(row.score_riesgo) || 0.0,
    palabras_clave: row.palabras_clave ? row.palabras_clave.split(';').filter(Boolean) : [],
    fecha_lectura: row.fecha_lectura,
    leido: row.leido === 'true',
    bloqueado: row.bloqueado === 'true',
  }),
  Reporte: (row) => ({
    dpi: row.dpi,
    numero: row.numero,
    id_reporte: row.id_reporte,
    tipo_fraude: row.tipo_fraude,
    fecha: row.fecha,
    estado: row.estado,
    monto_afectado: parseFloat(row.monto_afectado) || 0.0,
    verificado: row.verificado === 'true',
    evidencias: row.evidencias ? row.evidencias.split(';').filter(Boolean) : [],
    canal: row.canal,
    anonimo: row.anonimo === 'true',
    nivel_certeza: parseFloat(row.nivel_certeza) || 0.5,
    tipo_evidencia: row.tipo_evidencia,
    prioridad: parseInt(row.prioridad) || 2,
  }),
};

const QUERIES = {
  Numero: `UNWIND $rows AS row
    MERGE (n:Numero {numero: row.numero})
    ON CREATE SET
      n.activo = row.activo,
      n.tipo = row.tipo,
      n.fecha_registro = date(row.fecha_registro),
      n.total_reportes = row.total_reportes,
      n.score_riesgo = row.score_riesgo,
      n.etiquetas = row.etiquetas`,

  Persona: `UNWIND $rows AS row
    MERGE (p:Persona {dpi: row.dpi})
    ON CREATE SET
      p.nombre = row.nombre,
      p.edad = row.edad,
      p.departamento = row.departamento,
      p.es_sospechoso = row.es_sospechoso,
      p.fecha_registro = date(row.fecha_registro),
      p.roles = row.roles`,

  Operadora: `UNWIND $rows AS row
    MERGE (o:Operadora {nombre: row.nombre})
    ON CREATE SET
      o.pais = row.pais,
      o.tipo = row.tipo,
      o.activa = row.activa,
      o.clientes_millones = row.clientes_millones,
      o.fecha_fundacion = date(row.fecha_fundacion),
      o.departamentos_cobertura = row.departamentos_cobertura`,

  Dispositivo: `UNWIND $rows AS row
    MERGE (d:Dispositivo {imei: row.imei})
    ON CREATE SET
      d.marca = row.marca,
      d.modelo = row.modelo,
      d.sistema_operativo = row.sistema_operativo,
      d.reportado = row.reportado,
      d.fecha_primer_uso = date(row.fecha_primer_uso),
      d.numeros_distintos_usados = row.numeros_distintos_usados`,

  Llamada: `UNWIND $rows AS row
    MATCH (o:Numero {numero: row.numero_origen})
    MATCH (d:Numero {numero: row.numero_destino})
    CREATE (l:Llamada {
      id_cdr: row.id_cdr,
      duracion_segundos: row.duracion_segundos,
      fecha: date(row.fecha),
      hora: row.hora,
      sospechosa: row.sospechosa,
      score_riesgo: row.score_riesgo,
      palabras_detectadas: row.palabras_detectadas
    })
    CREATE (o)-[:ORIGINO {fecha: date(row.fecha), hora: row.hora, desde_dispositivo: row.desde_dispositivo}]->(l)
    CREATE (l)-[:DIRIGIDA_A {recibida: row.recibida, contestada: row.contestada, duracion_contestada: row.duracion_contestada}]->(d)`,

  Mensaje: `UNWIND $rows AS row
    MATCH (o:Numero {numero: row.numero_origen})
    MATCH (d:Numero {numero: row.numero_destino})
    CREATE (m:Mensaje {
      id_mensaje: row.id_mensaje,
      tipo: row.tipo,
      fecha: date(row.fecha),
      hora: row.hora,
      contiene_amenaza: row.contiene_amenaza,
      longitud_caracteres: row.longitud_caracteres,
      score_riesgo: row.score_riesgo,
      palabras_clave: row.palabras_clave
    })
    CREATE (o)-[:ENVIO {fecha: date(row.fecha), hora: row.hora, plataforma: row.tipo}]->(m)
    CREATE (m)-[:RECIBIDO_POR {fecha_lectura: date(row.fecha_lectura), leido: row.leido, bloqueado: row.bloqueado}]->(d)`,

  Reporte: `UNWIND $rows AS row
    MATCH (p:Persona {dpi: row.dpi})
    MATCH (n:Numero {numero: row.numero})
    CREATE (r:Reporte {
      id_reporte: row.id_reporte,
      tipo_fraude: row.tipo_fraude,
      fecha: date(row.fecha),
      estado: row.estado,
      monto_afectado: row.monto_afectado,
      verificado: row.verificado,
      evidencias: row.evidencias
    })
    CREATE (p)-[:REALIZO_REPORTE {fecha: date(row.fecha), canal: row.canal, anonimo: row.anonimo}]->(r)
    CREATE (r)-[:INVOLUCRA_NUMERO {nivel_certeza: row.nivel_certeza, tipo_evidencia: row.tipo_evidencia, prioridad: row.prioridad}]->(n)`,
};

router.post('/cargar', async (req, res) => {
  const { csvUrl, entidad } = req.body || {};
  if (!csvUrl || !entidad) {
    return res.status(400).json({ error: 'csvUrl y entidad son requeridos' });
  }
  if (!CONVERTERS[entidad]) {
    return res.status(400).json({ error: 'Entidad no soportada' });
  }

  const session = getSession();
  try {
    logger.info('CSV carga iniciada', { entidad, csvUrl });

    const text = await fetchText(csvUrl);
    const rawRows = parseCSV(text);

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'El CSV está vacío o no tiene filas de datos' });
    }

    const rows = rawRows.map(CONVERTERS[entidad]);
    await session.run(QUERIES[entidad], { rows });

    logger.info('CSV carga completada', { entidad, total: rows.length });
    return res.json({ cargado: true, entidad, total: rows.length });
  } catch (err) {
    logger.error('CSV carga error', { entidad, error: err.message });
    return res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

module.exports = router;
