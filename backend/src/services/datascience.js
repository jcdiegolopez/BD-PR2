const { getSession } = require('./neo4j');
const logger = require('./logger');

// Neo4j integers come as { low, high } objects — extract the JS number
function toInt(val) {
  if (val && typeof val === 'object' && 'low' in val) return val.low;
  return Number(val);
}

async function runGraphAlgorithms() {
  const session = getSession();
  try {
    logger.info('Data Science inicio (implementacion manual, sin GDS)');

    // ── 1. Fetch graph ──────────────────────────────────────────────
    const nodesRes = await session.run(
      'MATCH (n:Numero) RETURN id(n) AS id, n.numero AS numero'
    );
    const nodes = nodesRes.records.map((r) => ({
      id: toInt(r.get('id')),
      numero: r.get('numero'),
    }));

    const edgesRes = await session.run(
      `MATCH (a:Numero)-[:CONTACTO_FRECUENTE]->(b:Numero)
       RETURN id(a) AS from, id(b) AS to`
    );
    const edges = edgesRes.records.map((r) => ({
      from: toInt(r.get('from')),
      to: toInt(r.get('to')),
    }));

    if (nodes.length === 0) {
      logger.warn('No hay nodos Numero para analizar');
      return { louvain: [], pagerank: [] };
    }

    // ── 2. Build adjacency structures ───────────────────────────────
    const outLinks = {};
    const inLinks  = {};
    const undirected = {};

    nodes.forEach(({ id }) => {
      outLinks[id]   = [];
      inLinks[id]    = [];
      undirected[id] = [];
    });

    edges.forEach(({ from, to }) => {
      if (outLinks[from]) outLinks[from].push(to);
      if (inLinks[to])    inLinks[to].push(from);
      if (undirected[from]) undirected[from].push(to);
      if (undirected[to])   undirected[to].push(from);
    });

    // ── 3. PageRank (damping=0.85, 20 iterations) ───────────────────
    const N = nodes.length;
    const damping = 0.85;
    const pagerank = {};
    nodes.forEach(({ id }) => { pagerank[id] = 1.0 / N; });

    for (let iter = 0; iter < 20; iter++) {
      const next = {};
      nodes.forEach(({ id }) => {
        let rank = (1 - damping) / N;
        inLinks[id].forEach((src) => {
          const out = outLinks[src].length || 1;
          rank += damping * pagerank[src] / out;
        });
        next[id] = rank;
      });
      nodes.forEach(({ id }) => { pagerank[id] = next[id]; });
    }

    // ── 4. Label Propagation (community detection) ──────────────────
    const community = {};
    nodes.forEach(({ id }) => { community[id] = id; });

    for (let iter = 0; iter < 15; iter++) {
      const shuffled = [...nodes].sort(() => Math.random() - 0.5);
      shuffled.forEach(({ id }) => {
        const nbrs = undirected[id];
        if (nbrs.length === 0) return;
        const counts = {};
        nbrs.forEach((n) => {
          const lbl = community[n];
          counts[lbl] = (counts[lbl] || 0) + 1;
        });
        const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        community[id] = Number(best);
      });
    }

    // ── 5. Write results back to Neo4j in batches of 500 ────────────
    const updates = nodes.map(({ id }) => ({
      id,
      pagerank: pagerank[id],
      comunidad: community[id],
    }));

    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      await session.run(
        `UNWIND $batch AS u
         MATCH (n) WHERE id(n) = u.id
         SET n.pagerank = u.pagerank, n.comunidad = u.comunidad`,
        { batch }
      );
    }

    // ── 6. Build summary stats ───────────────────────────────────────
    const topPagerank = [...nodes]
      .sort((a, b) => pagerank[b.id] - pagerank[a.id])
      .slice(0, 10)
      .map(({ id, numero }) => ({ numero, pagerank: pagerank[id] }));

    const communityCounts = {};
    nodes.forEach(({ id }) => {
      const c = community[id];
      communityCounts[c] = (communityCounts[c] || 0) + 1;
    });
    const topCommunities = Object.entries(communityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, size]) => ({ comunidad: Number(id), size }));

    logger.info('Data Science completado', {
      nodos: nodes.length,
      comunidades: Object.keys(communityCounts).length,
    });

    return {
      louvain: topCommunities,
      pagerank: topPagerank,
    };
  } finally {
    await session.close();
  }
}

module.exports = { runGraphAlgorithms };
