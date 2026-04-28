const { getSession } = require('./neo4j');

async function runGraphAlgorithms() {
  const session = getSession();
  try {
    await session.run(
      `CALL gds.graph.project('redFraude', 'Numero', 'CONTACTO_FRECUENTE')`
    );
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  const louvain = await session.run(
    `CALL gds.louvain.write('redFraude', {writeProperty: 'comunidad'})
     YIELD communityCount, nodePropertiesWritten`
  );

  const pagerank = await session.run(
    `CALL gds.pageRank.write('redFraude', {writeProperty: 'pagerank'})
     YIELD nodePropertiesWritten, ranIterations`
  );

  return {
    louvain: louvain.records.map((r) => r.toObject()),
    pagerank: pagerank.records.map((r) => r.toObject()),
  };
}

module.exports = {
  runGraphAlgorithms,
};
