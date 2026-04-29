import { Network, DataSet } from 'vis-network/standalone';
import { api, safeNum } from '../api.js';

const NODE_COLORS = {
  Numero:      { background: '#4f46e5', border: '#818cf8', highlight: { background: '#6366f1', border: '#a5b4fc' } },
  Persona:     { background: '#0f766e', border: '#34d399', highlight: { background: '#14b8a6', border: '#6ee7b7' } },
  Dispositivo: { background: '#1d4ed8', border: '#60a5fa', highlight: { background: '#2563eb', border: '#93c5fd' } },
  Operadora:   { background: '#92400e', border: '#fb923c', highlight: { background: '#b45309', border: '#fcd34d' } },
  Llamada:     { background: '#9d174d', border: '#f472b6', highlight: { background: '#be185d', border: '#fbcfe8' } },
  Mensaje:     { background: '#5b21b6', border: '#a78bfa', highlight: { background: '#7c3aed', border: '#c4b5fd' } },
  Reporte:     { background: '#991b1b', border: '#f87171', highlight: { background: '#dc2626', border: '#fca5a5' } },
  Sospechoso:  { background: '#7f1d1d', border: '#ef4444', highlight: { background: '#b91c1c', border: '#fca5a5' } },
};
const DEFAULT_COLOR = { background: '#1e293b', border: '#475569', highlight: { background: '#334155', border: '#64748b' } };

const LEGEND = Object.entries(NODE_COLORS).map(([label, c]) =>
  `<div class="grafo-legend-item">
     <div class="legend-dot" style="background:${c.background};border:1.5px solid ${c.border}"></div>
     <span>${label}</span>
   </div>`
).join('');

export async function renderGrafo(container) {
  container.innerHTML = `
    <div class="page-header fade-in" style="margin-bottom:16px">
      <div>
        <h1 class="page-title">Visualización del Grafo</h1>
        <p class="page-sub">Nodos y relaciones almacenados en Neo4j — selecciona un nodo para ver sus propiedades</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" id="loadAllBtn">Cargar grafo</button>
        <button class="btn btn-outline btn-sm" id="loadSuspBtn">Solo sospechosos</button>
        <button class="btn btn-outline btn-sm" id="fitBtn">Ajustar vista</button>
      </div>
    </div>
    <div class="grafo-layout">
      <div class="grafo-sidebar">
        <div class="card" style="padding:14px">
          <div class="section-title">Leyenda</div>
          ${LEGEND}
        </div>
        <div class="card" style="padding:14px" id="grafoStats">
          <div class="section-title">Estadísticas</div>
          <div class="grafo-legend-item"><span id="nodeCount">0</span>&nbsp;nodos</div>
          <div class="grafo-legend-item"><span id="edgeCount">0</span>&nbsp;aristas</div>
        </div>
      </div>
      <div class="grafo-canvas-wrap">
        <div id="grafo-canvas"></div>
        <div id="grafo-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg-card);border-radius:var(--radius-lg);flex-direction:column;gap:12px;color:var(--text-2)">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span style="font-size:0.88rem">Haga clic en <strong>Cargar grafo</strong> para iniciar la visualización</span>
        </div>
      </div>
      <div class="grafo-detail card" id="grafoDetail" style="display:none;padding:16px;overflow-y:auto">
        <div class="section-title">Nodo seleccionado</div>
        <div id="detailContent"><div class="empty-state" style="padding:12px 0">Seleccione un nodo</div></div>
      </div>
    </div>`;

  let network = null;
  let nodes = new DataSet();
  let edges = new DataSet();

  function buildNetwork() {
    const el = document.getElementById('grafo-canvas');
    network = new Network(el, { nodes, edges }, {
      physics: {
        enabled: true,
        stabilization: { iterations: 80 },
        barnesHut: { gravitationalConstant: -3500, springLength: 120, damping: 0.2 },
      },
      interaction: { hover: true, tooltipDelay: 200 },
      nodes: {
        shape: 'dot',
        size: 12,
        font: { size: 11, color: '#94a3b8' },
        borderWidth: 1.5,
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        color: { color: 'rgba(99,102,241,0.25)', hover: 'rgba(99,102,241,0.6)' },
        width: 1,
        smooth: { type: 'continuous' },
      },
    });

    network.on('click', ({ nodes: sel }) => {
      if (!sel.length) return;
      const node = nodes.get(sel[0]);
      if (!node) return;
      const detail = document.getElementById('grafoDetail');
      detail.style.display = 'block';
      document.getElementById('detailContent').innerHTML = Object.entries(node.rawProps || {})
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `
          <div class="detail-prop">
            <span class="detail-key">${k}</span>
            <span class="detail-val">${Array.isArray(v) ? v.join(', ') : String(v)}</span>
          </div>`).join('') || '<div class="empty-state" style="padding:8px 0">Sin propiedades</div>';
    });
  }

  function toVisNode(rawId, labels, props) {
    const id = safeNum(rawId);
    const label = (labels || [])[0] || 'Unknown';
    const color = NODE_COLORS[label] || DEFAULT_COLOR;
    const score = Number(props?.score_riesgo) || 0;
    const size = 10 + score * 16;
    const title = props?.numero || props?.nombre || props?.imei || props?.id_cdr || props?.id_reporte || label;
    return { id, label: String(title).slice(0, 20), color, size, rawProps: props || {} };
  }

  async function loadGraph(cypher, edgeCypher) {
    document.getElementById('grafo-overlay').style.display = 'flex';
    document.getElementById('grafo-overlay').innerHTML = `<span class="spinner"></span><span style="font-size:0.85rem;color:var(--text-2)">Cargando grafo…</span>`;

    try {
      const [nRes, eRes] = await Promise.all([
        api.grafoQuery(cypher),
        api.grafoQuery(edgeCypher),
      ]);

      nodes.clear(); edges.clear();
      nRes.forEach(r => nodes.update(toVisNode(r.nid, r.lbls, r.props)));

      let eid = 1;
      eRes.forEach(r => {
        const from = safeNum(r.from_id);
        const to   = safeNum(r.to_id);
        if (nodes.get(from) && nodes.get(to)) {
          edges.update({ id: eid++, from, to, label: r.rel_type, font: { size: 9, color: '#475569' } });
        }
      });

      document.getElementById('nodeCount').textContent = nodes.length;
      document.getElementById('edgeCount').textContent = edges.length;

      if (!network) buildNetwork();
      else network.setData({ nodes, edges });

      document.getElementById('grafo-overlay').style.display = 'none';
    } catch (e) {
      document.getElementById('grafo-overlay').innerHTML = `
        <span style="font-size:0.85rem;color:var(--danger)">${e.message}</span>
        <span style="font-size:0.75rem;color:var(--text-3)">Backend desconectado — inicie el servidor para visualizar el grafo</span>`;
    }
  }

  const NODE_CYPHER = `MATCH (n) RETURN id(n) AS nid, labels(n) AS lbls, properties(n) AS props LIMIT 200`;
  const EDGE_CYPHER = `MATCH (n)-[r]->(m) RETURN id(n) AS from_id, id(m) AS to_id, type(r) AS rel_type LIMIT 400`;
  const SUSP_CYPHER = `MATCH (n:Sospechoso) RETURN id(n) AS nid, labels(n) AS lbls, properties(n) AS props`;
  const SUSP_EDGE   = `MATCH (n:Sospechoso)-[r]-(m) RETURN id(n) AS from_id, id(m) AS to_id, type(r) AS rel_type LIMIT 200`;

  document.getElementById('loadAllBtn').addEventListener('click', () => loadGraph(NODE_CYPHER, EDGE_CYPHER));
  document.getElementById('loadSuspBtn').addEventListener('click', () => loadGraph(SUSP_CYPHER, SUSP_EDGE));
  document.getElementById('fitBtn').addEventListener('click', () => network?.fit());
}
