/* API wrapper — proxied through Vite to http://localhost:4000 */

async function request(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Backend no disponible');
    throw e;
  }
}

export const api = {
  health:      () => request('/health'),
  grafoStats:  () => request('/api/grafo/stats'),

  grafoQuery: (cypher, params = {}) =>
    request(`/api/grafo?cypher=${encodeURIComponent(cypher)}&params=${encodeURIComponent(JSON.stringify(params))}`),

  nodos: (label, filtros) => {
    const p = new URLSearchParams();
    if (label)  p.set('label', label);
    if (filtros) p.set('filtros', JSON.stringify(filtros));
    return request(`/api/nodos?${p}`);
  },

  nodoDetalle: (id) => request(`/api/nodos/${id}`),

  deteccion: (params = {}) =>
    request('/api/deteccion/ejecutar', { method: 'POST', body: JSON.stringify(params) }),

  simular: (params) =>
    request('/api/simulador/generar', { method: 'POST', body: JSON.stringify(params) }),
};

/* ---- MOCK DATA (fallback cuando el backend está offline) ---- */
export const MOCK = {
  stats: [
    { label: 'Numero',      total: 487 },
    { label: 'Llamada',     total: 2341 },
    { label: 'Mensaje',     total: 1289 },
    { label: 'Persona',     total: 398 },
    { label: 'Dispositivo', total: 295 },
    { label: 'Reporte',     total: 287 },
    { label: 'Operadora',   total: 4 },
    { label: 'Sospechoso',  total: 10 },
  ],
  deteccion: {
    numeroMasivo: [
      { numero: { numero: '502-4521-7823', score_riesgo: 0.87 }, victimas: 45 },
      { numero: { numero: '502-3312-9901', score_riesgo: 0.74 }, victimas: 38 },
      { numero: { numero: '502-7890-1234', score_riesgo: 0.61 }, victimas: 31 },
    ],
    dispositivoCompartido: [
      { dispositivo: { imei: '352849104981234', marca: 'Samsung', modelo: 'A14' }, numeros: 5 },
      { dispositivo: { imei: '490123456789012', marca: 'Xiaomi',  modelo: 'Redmi 12' }, numeros: 4 },
    ],
    llamadasNocturnas: [
      { numero: { numero: '502-4521-7823', score_riesgo: 0.87 }, nocturnas: 23 },
      { numero: { numero: '502-0011-2233', score_riesgo: 0.55 }, nocturnas: 15 },
    ],
    redCoordinada: [
      { a: { numero: '502-1111-2222' }, b: { numero: '502-3333-4444' }, c: { numero: '502-5555-6666' } },
    ],
    multiplesReportes: [
      { numero: { numero: '502-9999-0000', score_riesgo: 0.65 }, reportes: 8 },
    ],
    mensajesAmenazantes: [
      { numero: { numero: '502-4521-7823', score_riesgo: 0.87 }, amenazas: 12 },
      { numero: { numero: '502-3312-9901', score_riesgo: 0.74 }, amenazas: 7 },
    ],
    scoresActualizados: [{ actualizados: 487 }],
  },
  nodos: [
    { numero: '502-4521-7823', tipo: 'prepago', activo: true, score_riesgo: 0.87, total_reportes: 8 },
    { numero: '502-3312-9901', tipo: 'pospago', activo: true, score_riesgo: 0.74, total_reportes: 5 },
    { numero: '502-7890-1234', tipo: 'prepago', activo: true, score_riesgo: 0.61, total_reportes: 3 },
  ],
};

/* ---- Helpers ---- */
export function safeNum(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'low' in val) return val.low + val.high * 0x100000000;
  return Number(val);
}

export function scoreColor(s) {
  if (s >= 0.7) return 'var(--danger)';
  if (s >= 0.4) return 'var(--warning)';
  return 'var(--success)';
}

export function scoreBadge(s) {
  if (s >= 0.7) return 'badge-danger';
  if (s >= 0.4) return 'badge-warning';
  return 'badge-success';
}
