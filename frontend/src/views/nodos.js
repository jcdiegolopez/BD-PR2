import { api, MOCK, safeNum, scoreColor } from '../api.js';

const LABELS = ['Numero','Persona','Dispositivo','Operadora','Llamada','Mensaje','Reporte'];

const COLUMNS = {
  Numero:      ['numero', 'tipo', 'activo', 'score_riesgo', 'total_reportes'],
  Persona:     ['nombre', 'dpi', 'edad', 'departamento', 'es_sospechoso'],
  Dispositivo: ['imei', 'marca', 'modelo', 'sistema_operativo', 'reportado'],
  Operadora:   ['nombre', 'tipo', 'activa', 'clientes_millones'],
  Llamada:     ['id_cdr', 'fecha', 'hora', 'duracion_segundos', 'sospechosa', 'score_riesgo'],
  Mensaje:     ['id_mensaje', 'tipo', 'fecha', 'contiene_amenaza', 'score_riesgo'],
  Reporte:     ['id_reporte', 'tipo_fraude', 'fecha', 'estado', 'monto_afectado'],
};

function fmtCell(key, val) {
  if (val === null || val === undefined) return '<span style="color:var(--text-3)">—</span>';
  if (typeof val === 'boolean') return val
    ? '<span class="badge badge-danger">Sí</span>'
    : '<span class="badge badge-neutral">No</span>';
  if (key === 'score_riesgo' || key === 'score') {
    const v = Number(val);
    return `<div class="score-wrap">
      <div class="score-bar"><div class="score-fill" style="width:${v*100}%;background:${scoreColor(v)}"></div></div>
      <span class="score-val">${v.toFixed(2)}</span>
    </div>`;
  }
  if (key === 'estado') {
    const cls = val === 'cerrado' ? 'badge-success' : val === 'investigando' ? 'badge-warning' : 'badge-neutral';
    return `<span class="badge ${cls}">${val}</span>`;
  }
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  const s = String(val);
  return s.length > 38 ? `<span title="${s}">${s.slice(0,36)}…</span>` : s;
}

export async function renderNodos(container) {
  let currentLabel = 'Numero';

  container.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h1 class="page-title">Explorador de Nodos</h1>
        <p class="page-sub">Filtra y consulta los nodos almacenados en el grafo Neo4j</p>
      </div>
    </div>
    <div class="tab-group fade-in" id="labelTabs">
      ${LABELS.map(l => `<button class="tab-btn ${l === currentLabel ? 'active' : ''}" data-label="${l}">${l}</button>`).join('')}
    </div>
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex:1;min-width:0" id="tableWrap">
        <div class="loading-state"><span class="spinner"></span> Cargando…</div>
      </div>
      <div class="card" id="nodePanel" style="width:260px;flex-shrink:0;display:none;padding:16px;position:sticky;top:0">
        <div class="section-title">Propiedades del nodo</div>
        <div id="nodePanelContent"></div>
      </div>
    </div>`;

  document.getElementById('labelTabs').addEventListener('click', e => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    currentLabel = btn.dataset.label;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.label === currentLabel));
    document.getElementById('nodePanel').style.display = 'none';
    loadNodes(currentLabel);
  });

  await loadNodes(currentLabel);
}

async function loadNodes(label) {
  const wrap = document.getElementById('tableWrap');
  wrap.innerHTML = `<div class="loading-state"><span class="spinner"></span> Cargando ${label}s…</div>`;

  let rows;
  try {
    rows = await api.nodos(label);
  } catch {
    rows = label === 'Numero' ? MOCK.nodos : [];
  }

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state">Sin nodos de tipo ${label}</div>`;
    return;
  }

  const cols = COLUMNS[label] || Object.keys(rows[0]).slice(0, 6);
  const propKey = { Numero:'numero', Persona:'nombre', Dispositivo:'imei', Operadora:'nombre', Llamada:'id_cdr', Mensaje:'id_mensaje', Reporte:'id_reporte' };
  const mainKey = propKey[label] || cols[0];

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:0.8rem;color:var(--text-3)">${rows.length.toLocaleString()} registros encontrados</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          ${cols.map(c => `<th>${c.replace(/_/g,' ')}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${rows.map((row, idx) => `
            <tr data-idx="${idx}" style="cursor:pointer">
              ${cols.map((c, ci) => `<td ${ci===0 ? 'style="font-weight:500"' : ''}>
                ${ci === 0 ? `<span class="mono">${fmtCell(c, row[c])}</span>` : fmtCell(c, row[c])}
              </td>`).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  wrap.querySelector('tbody').addEventListener('click', e => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const row = rows[Number(tr.dataset.idx)];
    showNodePanel(row, mainKey);
    wrap.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
  });
}

function showNodePanel(row, mainKey) {
  const panel = document.getElementById('nodePanel');
  panel.style.display = 'block';
  const title = row[mainKey] || 'Nodo';
  document.getElementById('nodePanelContent').innerHTML = `
    <div style="margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
      <div style="font-size:0.95rem;font-weight:600;color:var(--primary-light);word-break:break-all">${title}</div>
    </div>
    ${Object.entries(row)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `
        <div class="detail-prop">
          <span class="detail-key">${k}</span>
          <span class="detail-val">${Array.isArray(v) ? v.join(', ') || '—' : String(v)}</span>
        </div>`).join('')}`;
}
