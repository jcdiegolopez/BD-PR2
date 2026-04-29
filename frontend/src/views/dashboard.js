import { api, MOCK, safeNum, scoreColor } from '../api.js';

const NODE_META = {
  Numero:      { color: 'primary',  accent: '#6366f1' },
  Llamada:     { color: 'info',     accent: '#60a5fa' },
  Mensaje:     { color: 'success',  accent: '#10b981' },
  Persona:     { color: 'warning',  accent: '#f59e0b' },
  Dispositivo: { color: 'danger',   accent: '#ef4444' },
  Reporte:     { color: 'danger',   accent: '#fb923c' },
  Operadora:   { color: 'neutral',  accent: '#475569' },
  Sospechoso:  { color: 'danger',   accent: '#ef4444' },
};

function kpiCard(label, total, meta, delay = 0) {
  const accent = meta?.accent || 'var(--primary)';
  return `
    <div class="kpi-card fade-in" style="animation-delay:${delay}ms;border-left:3px solid ${accent}">
      <div class="kpi-value count-anim">${safeNum(total).toLocaleString()}</div>
      <div class="kpi-label">${label}</div>
    </div>`;
}

async function quickSimulate(btn) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> Procesando…`;
  try {
    const r = await api.simular({
      operadoras: 0, personas: 0, numeros: 0, dispositivos: 0,
      llamadas: 200, mensajes: 120, reportes: 0,
      inyectarFraude: Math.random() < 0.35, fraudeRatio: 0.25,
    });
    btn.innerHTML = `Completado — +${r.llamadas} llamadas, +${r.mensajes} mensajes`;
    setTimeout(() => { btn.innerHTML = 'Simular actividad'; btn.disabled = false; }, 3500);
  } catch (e) {
    btn.innerHTML = `Error: ${e.message}`;
    setTimeout(() => { btn.innerHTML = 'Simular actividad'; btn.disabled = false; }, 3500);
  }
}

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">Resumen del grafo de fraude telefónico — ${new Date().toLocaleDateString('es-GT', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>
      <button class="btn btn-primary" id="quickSimBtn">Simular actividad</button>
    </div>
    <div class="kpi-grid" id="kpiGrid">
      <div class="loading-state"><span class="spinner"></span> Cargando métricas…</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px">
      <div class="card fade-in fade-in-2" id="topRiesgoCard">
        <div class="section-title">Números de alto riesgo</div>
        <div class="loading-state" style="padding:20px 0"><span class="spinner"></span></div>
      </div>
      <div class="card fade-in fade-in-3" id="statsCard">
        <div class="section-title">Distribución del grafo</div>
        <div id="statsChart"></div>
      </div>
    </div>`;

  document.getElementById('quickSimBtn')?.addEventListener('click', e => quickSimulate(e.target));

  let stats;
  try { stats = await api.grafoStats(); }
  catch { stats = MOCK.stats; }

  const grid = document.getElementById('kpiGrid');
  if (!stats.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">—</span>Sin datos disponibles</div>`;
  } else {
    grid.innerHTML = stats.map((s, i) =>
      kpiCard(s.label, s.total, NODE_META[s.label], i * 60)
    ).join('');
  }

  const max = Math.max(...stats.map(s => safeNum(s.total)), 1);
  document.getElementById('statsChart').innerHTML = stats.map(s => {
    const pct = Math.round((safeNum(s.total) / max) * 100);
    const accent = NODE_META[s.label]?.accent || 'var(--primary)';
    return `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="width:86px;font-size:0.75rem;color:var(--text-2);text-align:right;flex-shrink:0">${s.label}</span>
        <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:4px;height:7px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${accent};border-radius:4px;transition:width 0.8s ease"></div>
        </div>
        <span style="font-size:0.75rem;color:var(--text-3);min-width:40px;text-align:right">${safeNum(s.total).toLocaleString()}</span>
      </div>`;
  }).join('');

  let risky = [];
  try {
    risky = await api.grafoQuery(
      `MATCH (n:Numero) WHERE n.score_riesgo > 0.5 RETURN n ORDER BY n.score_riesgo DESC LIMIT 8`
    );
  } catch { /* offline */ }

  const topCard = document.getElementById('topRiesgoCard');
  if (!risky.length) {
    topCard.innerHTML = `<div class="section-title">Números de alto riesgo</div>
      <div class="empty-state" style="padding:20px 0">Sin números con riesgo elevado</div>`;
  } else {
    topCard.innerHTML = `<div class="section-title">Números de alto riesgo</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Número</th><th>Score</th><th>Reportes</th></tr></thead>
        <tbody>${risky.map(r => {
          const n = r.n?.properties || r.n || {};
          const sc = Number(n.score_riesgo) || 0;
          return `<tr>
            <td><span class="mono">${n.numero || '—'}</span></td>
            <td>
              <div class="score-wrap">
                <div class="score-bar"><div class="score-fill" style="width:${sc*100}%;background:${scoreColor(sc)}"></div></div>
                <span class="score-val">${sc.toFixed(2)}</span>
              </div>
            </td>
            <td>${n.total_reportes ?? '—'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  }
}
