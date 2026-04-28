const { getSession } = require('./neo4j');

async function runDetections({ ventanaDias = 7 } = {}) {
  const session = getSession();
  try {
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

    const scoreUpdate = await session.run(
      `MATCH (n:Numero)
       OPTIONAL MATCH (r:Reporte)-[:INVOLUCRA_NUMERO]->(n)
       WITH n, count(r) AS reportes
       OPTIONAL MATCH (n)-[:ORIGINO]->(l:Llamada)-[:DIRIGIDA_A]->(v:Numero)
       WITH n, reportes, count(DISTINCT v) AS victimas
       OPTIONAL MATCH (n)-[:ORIGINO]->(ln:Llamada)
       WHERE ln.hora < $limite
       WITH n, reportes, victimas, count(ln) AS nocturnas
       OPTIONAL MATCH (d:Dispositivo)-[:USO_NUMERO]->(n)
       WITH n, reportes, victimas, nocturnas, count(DISTINCT d) AS dispositivos
       WITH n,
            (reportes * 0.3) + (victimas * 0.4) + (nocturnas * 0.2) + (dispositivos * 0.1) AS score
       SET n.score_riesgo = CASE
         WHEN score > 1.0 THEN 1.0
         WHEN score < 0.0 THEN 0.0
         ELSE score
       END
       RETURN count(n) AS actualizados`,
      { limite: '05:00' }
    );
    results.scoresActualizados = scoreUpdate.records.map((r) => r.toObject());

    return results;
  } finally {
    await session.close();
  }
}

module.exports = {
  runDetections,
};
