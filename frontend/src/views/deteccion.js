import { api, MOCK, safeNum, scoreColor } from '../api.js';

const PANELS = [
  { key: 'numeroMasivo',          title: 'Llamadas masivas',       color: '#ef4444' },
  { key: 'dispositivoCompartido', title: 'Dispositivo compartido', color: '#f59e0b' },
  { key: 'llamadasNocturnas',     title: 'Llamadas nocturnas',     color: '#818cf8' },
  { key: 'redCoordinada',         title: 'Red coordinada',         color: '#60a5fa' },
  { key: 'multiplesReportes',     title: 'Múltiples reportes',     color: '#fb923c' },
  { key: 'mensajesAmenazantes',   title: 'Mensajes amenazantes',   color: '#f472b6' },
];

function renderRows(key, data) {
  if (!data || !data.length) return `<div class="detection-empty">Sin alertas detectadas</div>`;

  if (key === 'numeroMasivo') return tableWrap(['Número','Víctimas','Score'],
    data.map(d => `<tr>
      <td><span class="mono">${d.numero?.numero || '—'}</span></td>
      <td><span class="badge badge-danger">${safeNum(d.victimas)}</span></td>
      <td>${scoreBar(d.numero?.score_riesgo)}</td>
    </tr>`));

  if (key === 'dispositivoCompartido') return tableWrap(['IMEI','Dispositivo','Números'],
    data.map(d => `<tr>
      <td><span class="mono" style="font-size:0.7rem">${d.dispositivo?.imei || '—'}</span></td>
      <td>${d.dispositivo?.marca || ''} ${d.dispositivo?.modelo || ''}</td>
      <td><span class="badge badge-warning">${safeNum(d.numeros)}</span></td>
    </tr>`));

  if (key === 'llamadasNocturnas') return tableWrap(['Número','Llamadas nocturnas','Score'],
    data.map(d => `<tr>
      <td><span class="mono">${d.numero?.numero || '—'}</span></td>
      <td><span class="badge badge-primary">${safeNum(d.nocturnas)}</span></td>
      <td>${scoreBar(d.numero?.score_riesgo)}</td>
    </tr>`));

  if (key === 'redCoordinada') return tableWrap(['Nodo A','Nodo B','Nodo C'],
    data.map(d => `<tr>
      <td><span class="mono">${d.a?.numero || '—'}</span></td>
      <td><span class="mono">${d.b?.numero || '—'}</span></td>
      <td><span class="mono">${d.c?.numero || '—'}</span></td>
    </tr>`));

  if (key === 'multiplesReportes') return tableWrap(['Número','Reportes','Score'],
    data.map(d => `<tr>
      <td><span class="mono">${d.numero?.numero || '—'}</span></td>
      <td><span class="badge badge-danger">${safeNum(d.reportes)}</span></td>
      <td>${scoreBar(d.numero?.score_riesgo)}</td>
    </tr>`));

  if (key === 'mensajesAmenazantes') return tableWrap(['Número','Amenazas','Score'],
    data.map(d => `<tr>
      <td><span class="mono">${d.numero?.numero || '—'}</span></td>
      <td><span class="badge badge-danger">${safeNum(d.amenazas)}</span></td>
      <td>${scoreBar(d.numero?.score_riesgo)}</td>
    </tr>`));

  return `<pre style="font-size:0.7rem;color:var(--text-3)">${JSON.stringify(data.slice(0,3), null, 2)}</pre>`;
}

function tableWrap(headers, rows) {
  return `<div class="table-wrap"><table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

function scoreBar(s) {
  const v = Number(s) || 0;
  return `<div class="score-wrap">
    <div class="score-bar"><div class="score-fill" style="width:${v*100}%;background:${scoreColor(v)}"></div></div>
    <span class="score-val">${v.toFixed(2)}</span>
  </div>`;
}

export async function renderDeteccion(container) {
  container.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h1 class="page-title">Detección de Fraude</h1>
        <p class="page-sub">Algoritmos heurísticos aplicados sobre el grafo Neo4j</p>
      </div>
      <button class="btn btn-danger" id="runBtn">Ejecutar detección</button>
    </div>
    <div id="detResult"></div>`;

  document.getElementById('runBtn').addEventListener('click', runDetection);
}

async function runDetection() {
  const btn = document.getElementById('runBtn');
  const out = document.getElementById('detResult');
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Analizando grafo…`;
  out.innerHTML = `<div class="loading-state"><span class="spinner"></span> Ejecutando detección…</div>`;

  let data;
  try { data = await api.deteccion(); }
  catch { data = MOCK.deteccion; }

  const now = new Date().toLocaleTimeString('es-GT');
  const updated = safeNum(data.scoresActualizados?.[0]?.actualizados);

  out.innerHTML = `
    <div class="alert alert-info fade-in">
      Detección completada a las <strong>${now}</strong> — ${updated.toLocaleString()} scores actualizados
    </div>
    <div class="detection-grid">
      ${PANELS.map((p, i) => {
        const rows = data[p.key] || [];
        return `
          <div class="detection-card fade-in" style="animation-delay:${i*70}ms">
            <div class="detection-header">
              <div class="detection-title">
                <span class="panel-accent" style="background:${p.color}"></span>
                <span>${p.title}</span>
              </div>
              <span class="detection-count">${rows.length}</span>
            </div>
            <div class="detection-body">${renderRows(p.key, rows)}</div>
          </div>`;
      }).join('')}
    </div>`;

  btn.disabled = false;
  btn.innerHTML = 'Ejecutar detección';
}
