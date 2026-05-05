const { getSession } = require('./neo4j');
const logger = require('./logger');

async function runDetections({ ventanaDias = 7 } = {}) {
  const session = getSession();
  try {
    logger.info('Deteccion inicio', { ventanaDias });
    const results = {};

    const masivo = await session.run(
      `MATCH (n:Numero)-[:ORIGINO]->(l:Llamada)-[:DIRIGIDA_A]->(v:Numero)
       WHERE l.fecha > date() - duration({days: $dias})
       WITH n, count(DISTINCT v) AS victimas
       WHERE victimas >= 30
       RETURN n {.*, id: id(n)} AS numero, victimas
       ORDER BY victimas DESC` ,
      { dias: ventanaDias }
    );
    results.numeroMasivo = masivo.records.map((r) => r.toObject());

    const dispositivoCompartido = await session.run(
      `MATCH (d:Dispositivo)-[:USO_NUMERO]->(n:Numero)
       WITH d, count(DISTINCT n) AS numeros
       WHERE numeros >= 3
       RETURN d {.*, id: id(d)} AS dispositivo, numeros
       ORDER BY numeros DESC`
    );
    results.dispositivoCompartido = dispositivoCompartido.records.map((r) => r.toObject());

    const nocturnas = await session.run(
      `MATCH (n:Numero)-[:ORIGINO]->(l:Llamada)
       WHERE l.hora < $limite
       WITH n, count(l) AS nocturnas
       WHERE nocturnas > 10
       RETURN n {.*, id: id(n)} AS numero, nocturnas
       ORDER BY nocturnas DESC`,
      { limite: '05:00' }
    );
    results.llamadasNocturnas = nocturnas.records.map((r) => r.toObject());

    const redCoordinada = await session.run(
      `MATCH (a:Numero)-[:CONTACTO_FRECUENTE]->(b:Numero)-[:CONTACTO_FRECUENTE]->(c:Numero)-[:CONTACTO_FRECUENTE]->(a:Numero)
       RETURN a {.*, id: id(a)} AS a,
              b {.*, id: id(b)} AS b,
              c {.*, id: id(c)} AS c
       LIMIT 50`
    );
    results.redCoordinada = redCoordinada.records.map((r) => r.toObject());

    const multiplesReportes = await session.run(
      `MATCH (r:Reporte)-[:INVOLUCRA_NUMERO]->(n:Numero)
       WHERE r.estado <> $estadoCerrado
       WITH n, count(r) AS reportes
       WHERE reportes >= 5
       RETURN n {.*, id: id(n)} AS numero, reportes
       ORDER BY reportes DESC`,
      { estadoCerrado: 'cerrado' }
    );
    results.multiplesReportes = multiplesReportes.records.map((r) => r.toObject());

    const mensajesAmenaza = await session.run(
      `MATCH (n:Numero)-[:ENVIO]->(m:Mensaje)
       WHERE m.contiene_amenaza = true
       WITH n, count(m) AS amenazas
       WHERE amenazas >= 3
       RETURN n {.*, id: id(n)} AS numero, amenazas
       ORDER BY amenazas DESC`
    );
    results.mensajesAmenazantes = mensajesAmenaza.records.map((r) => r.toObject());

    // 1. Resetear todas las etiquetas de sospechoso antes de recalcular
    await session.run(`MATCH (n:Sospechoso) REMOVE n:Sospechoso`);

    // 2. Ejecutar scoring y asignar etiquetas frescas
    const scoreUpdate = await session.run(
      `MATCH (n:Numero)

       // 1. Reportes formales
       CALL {
         WITH n
         OPTIONAL MATCH (r:Reporte)-[:INVOLUCRA_NUMERO]->(n)
         RETURN count(DISTINCT r) AS reportes
       }

       // 2. Actividad Saliente
       CALL {
         WITH n
         OPTIONAL MATCH (n)-[:ORIGINO]->(l:Llamada)-[:DIRIGIDA_A]->(v:Numero)
         RETURN count(DISTINCT v) AS victimas, count(l) AS totalLlamadas
       }

       // 3. Actividad Entrante
       CALL {
         WITH n
         OPTIONAL MATCH (v_in:Numero)-[:ORIGINO]->(l_in:Llamada)-[:DIRIGIDA_A]->(n)
         RETURN count(l_in) AS llamadasEntrantes
       }

       // 4. Llamadas marcadas como sospechosas (señal directa del simulador)
       CALL {
         WITH n
         OPTIONAL MATCH (n)-[:ORIGINO]->(ls:Llamada)
         WHERE ls.sospechosa = true
         RETURN count(ls) AS llamadasSospechosas
       }

       // 5. Mensajes con amenaza (señal directa del simulador)
       CALL {
         WITH n
         OPTIONAL MATCH (n)-[:ENVIO]->(m:Mensaje)
         WHERE m.contiene_amenaza = true
         RETURN count(m) AS mensajesAmenaza
       }

       // 6. Ráfagas
       CALL {
         WITH n
         OPTIONAL MATCH (n)-[:ORIGINO]->(l:Llamada)
         WITH n, l.fecha AS f, substring(l.hora, 0, 2) AS h, count(*) AS c
         RETURN max(c) AS maxRafaga
       }

       // 7. Nocturnas
       CALL {
         WITH n
         OPTIONAL MATCH (n)-[:ORIGINO]->(l:Llamada)
         WHERE l.hora < $limite
         RETURN count(l) AS nocturnas
       }

       // 8. Dispositivos
       CALL {
         WITH n
         OPTIONAL MATCH (d:Dispositivo)-[:USO_NUMERO]->(n)
         RETURN count(DISTINCT d) AS dispositivos
       }

       WITH n, reportes, victimas, totalLlamadas, llamadasEntrantes,
            llamadasSospechosas, mensajesAmenaza,
            coalesce(maxRafaga, 0) AS maxRafaga, nocturnas, dispositivos

       // CÁLCULO DE SCORE
       // Señales directas (alta precisión): llamadas/mensajes marcados como fraude
       // Señales de comportamiento (baja precisión): muchas víctimas, horarios, etc.
       WITH n,
            (CASE WHEN llamadasSospechosas >= 10 THEN 0.50
                  WHEN llamadasSospechosas >= 5  THEN 0.35
                  WHEN llamadasSospechosas >= 2  THEN 0.20
                  WHEN llamadasSospechosas >= 1  THEN 0.10
                  ELSE 0 END) +
            (CASE WHEN mensajesAmenaza >= 5 THEN 0.35
                  WHEN mensajesAmenaza >= 2 THEN 0.20
                  WHEN mensajesAmenaza >= 1 THEN 0.10
                  ELSE 0 END) +
            (CASE WHEN reportes >= 2 THEN 0.20 WHEN reportes = 1 THEN 0.10 ELSE 0 END) +
            (log10(victimas + 1) * 0.12) +
            (CASE WHEN llamadasEntrantes = 0 AND totalLlamadas > 20 THEN 0.10 ELSE 0 END) +
            (CASE WHEN maxRafaga > 15 THEN 0.10 WHEN maxRafaga > 8 THEN 0.05 ELSE 0 END) +
            (CASE WHEN nocturnas > 10 THEN 0.05 ELSE 0 END) +
            (CASE WHEN dispositivos > 3 THEN 0.05 ELSE 0 END) AS rawScore

       SET n.score_riesgo = CASE
         WHEN rawScore > 1.0 THEN 1.0
         WHEN rawScore < 0.0 THEN 0.0
         ELSE rawScore
       END

       WITH n
       RETURN count(n) AS actualizados`,
      { limite: '05:00' }
    );
    results.scoresActualizados = scoreUpdate.records.map((r) => r.toObject());

    // 3. Sincronizar etiquetas (umbral 0.5 = al menos 2 señales directas de fraude)
    await session.run(`
      MATCH (n:Numero)
      WHERE n.score_riesgo >= 0.5
      SET n:Sospechoso
    `);

    await session.run(`
      MATCH (n:Sospechoso)
      WHERE n.score_riesgo < 0.5
      REMOVE n:Sospechoso
    `);

    return results;
  } finally {
    logger.info('Deteccion fin');
    await session.close();
  }
}

module.exports = {
  runDetections,
};
