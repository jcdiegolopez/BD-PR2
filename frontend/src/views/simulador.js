import { api } from '../api.js';

const DEFAULTS = {
  operadoras: 4, personas: 400, numeros: 500, dispositivos: 300,
  llamadas: 2500, mensajes: 1500, reportes: 300,
  inyectarFraude: true, fraudeRatio: 0.2,
};

export async function renderSimulador(container) {
  container.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h1 class="page-title">Simulador de Datos</h1>
        <p class="page-sub">Genera un dataset sintético de fraude telefónico en Guatemala</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start">
      <div class="card fade-in">
        <div class="section-title" style="margin-bottom:18px">Parámetros del dataset</div>
        <div class="form-grid" id="simForm">
          ${numField('operadoras',  'Operadoras',            DEFAULTS.operadoras,  1,  4,     'Número de operadoras (máx. 4)')}
          ${numField('personas',    'Personas',              DEFAULTS.personas,    0,  5000,  'Usuarios a registrar')}
          ${numField('numeros',     'Números telefónicos',   DEFAULTS.numeros,     0,  10000, 'Números 502-XXXX-XXXX')}
          ${numField('dispositivos','Dispositivos (IMEI)',   DEFAULTS.dispositivos,0,  5000,  'Celulares simulados')}
          ${numField('llamadas',    'Llamadas (CDR)',        DEFAULTS.llamadas,    0,  20000, 'Registros de llamadas')}
          ${numField('mensajes',    'Mensajes',              DEFAULTS.mensajes,    0,  10000, 'SMS y WhatsApp')}
          ${numField('reportes',    'Reportes',              DEFAULTS.reportes,    0,  2000,  'Denuncias ciudadanas')}
        </div>
        <div class="card" style="background:var(--bg-surface);margin-bottom:16px">
          <div class="toggle-row">
            <div>
              <div class="toggle-label">Inyectar patrones de fraude</div>
              <div style="font-size:0.72rem;color:var(--text-3);margin-top:3px">Agrega nodos sospechosos, llamadas nocturnas y redes coordinadas</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="inyectarFraude" ${DEFAULTS.inyectarFraude ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="ratioWrap">
            <div class="form-label" style="margin-bottom:8px">Ratio de fraude: <span id="ratioVal">${Math.round(DEFAULTS.fraudeRatio*100)}%</span></div>
            <input type="range" class="range-input" id="fraudeRatio" min="0" max="1" step="0.05" value="${DEFAULTS.fraudeRatio}">
            <div style="display:flex;justify-content:space-between;margin-top:4px">
              <span class="form-hint">0 % — Sin fraude</span>
              <span class="form-hint">100 % — Todo fraude</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="simBtn" style="width:100%;justify-content:center;padding:12px">
          Generar dataset
        </button>
      </div>
      <div class="fade-in fade-in-2">
        <div class="card" id="resultCard" style="display:none"></div>
        <div class="card" style="margin-top:16px;background:var(--bg-surface)">
          <div class="section-title">Descripción del proceso</div>
          <div style="font-size:0.8rem;color:var(--text-2);line-height:1.8">
            <p>Operadoras: Tigo, Claro, Movistar, Telefónica Fija</p>
            <p>Personas con DPI, edad y departamento aleatorio</p>
            <p>Números <span class="mono">502-XXXX-XXXX</span> prepago / pospago</p>
            <p>Dispositivos identificados por IMEI</p>
            <p>CDR de llamadas con hora, duración y score</p>
            <p>Mensajes SMS y WhatsApp</p>
            <p>Reportes de tipo extorsión, estafa o amenaza</p>
            <p style="margin-top:10px;color:var(--danger);font-size:0.75rem">Con fraude activo: un número llama a más de 60 víctimas, un IMEI se asocia a 5 números, y se envían mensajes de amenaza.</p>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('fraudeRatio').addEventListener('input', e => {
    document.getElementById('ratioVal').textContent = `${Math.round(e.target.value * 100)}%`;
  });

  document.getElementById('simBtn').addEventListener('click', async () => {
    const btn = document.getElementById('simBtn');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Generando…`;

    const params = {
      operadoras:     getVal('operadoras'),
      personas:       getVal('personas'),
      numeros:        getVal('numeros'),
      dispositivos:   getVal('dispositivos'),
      llamadas:       getVal('llamadas'),
      mensajes:       getVal('mensajes'),
      reportes:       getVal('reportes'),
      inyectarFraude: document.getElementById('inyectarFraude').checked,
      fraudeRatio:    Number(document.getElementById('fraudeRatio').value),
    };

    try {
      const r = await api.simular(params);
      showResult(r, false);
    } catch (e) {
      showResult(null, e.message);
    }

    btn.disabled = false;
    btn.innerHTML = 'Generar dataset';
  });
}

function getVal(id) {
  return parseInt(document.getElementById(id)?.value || '0', 10);
}

function numField(id, label, def, min, max, hint) {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" type="number" id="${id}" value="${def}" min="${min}" max="${max}">
      <span class="form-hint">${hint}</span>
    </div>`;
}

function showResult(data, errMsg) {
  const card = document.getElementById('resultCard');
  card.style.display = 'block';
  if (errMsg) {
    card.innerHTML = `<div class="alert alert-error">Error: ${errMsg}</div>`;
    return;
  }
  const rows = [
    ['Operadoras',   data.operadoras],
    ['Personas',     data.personas],
    ['Números',      data.numeros],
    ['Dispositivos', data.dispositivos],
    ['Llamadas',     data.llamadas],
    ['Mensajes',     data.mensajes],
    ['Reportes',     data.reportes],
  ];
  card.innerHTML = `
    <div class="alert alert-success">Dataset generado exitosamente</div>
    <div class="section-title">Resumen de creación</div>
    ${rows.map(([l, v]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text-2);font-size:0.85rem">${l}</span>
        <span style="font-weight:700;font-size:1rem;color:var(--primary-light)">${(v||0).toLocaleString()}</span>
      </div>`).join('')}
    <div style="margin-top:12px">
      ${data.inyectarFraude
        ? `<span class="badge badge-danger">Fraude inyectado en este dataset</span>`
        : `<span class="badge badge-success">Dataset limpio — sin patrones de fraude</span>`}
    </div>`;
}
