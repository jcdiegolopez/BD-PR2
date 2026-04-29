import './style.css';
import { renderDashboard }  from './views/dashboard.js';
import { renderDeteccion }  from './views/deteccion.js';
import { renderGrafo }      from './views/grafo.js';
import { renderSimulador }  from './views/simulador.js';
import { renderNodos }      from './views/nodos.js';
import { api } from './api.js';

const VIEWS = {
  dashboard: renderDashboard,
  deteccion: renderDeteccion,
  grafo:     renderGrafo,
  simulador: renderSimulador,
  nodos:     renderNodos,
};

const ICON = {
  dashboard: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  deteccion: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  grafo:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
  simulador: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
  nodos:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  shield:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard'  },
  { id: 'deteccion', label: 'Detección'  },
  { id: 'grafo',     label: 'Grafo'      },
  { id: 'simulador', label: 'Simulador'  },
  { id: 'nodos',     label: 'Nodos'      },
];

export { ICON };

function buildLayout() {
  const navItems = NAV.map(({ id, label }) =>
    `<a class="nav-item" id="nav-${id}" data-view="${id}" href="#${id}">
       <span class="nav-icon">${ICON[id]}</span>
       <span>${label}</span>
     </a>`
  ).join('');

  document.getElementById('app').innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">${ICON.shield}</div>
        <div class="brand-text">
          <span class="brand-name">FraudeWatch</span>
          <span class="brand-sub">Guatemala · Neo4j</span>
        </div>
      </div>
      <nav class="sidebar-nav">${navItems}</nav>
      <div class="sidebar-footer">
        <div class="backend-status" id="backendStatus">
          <span class="status-dot"></span>
          <span class="status-text">Verificando…</span>
        </div>
      </div>
    </aside>
    <main class="main-content" id="mainContent"></main>
  `;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      navigate(el.dataset.view);
    });
  });
}

function setActive(view) {
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.view === view)
  );
}

async function navigate(view) {
  if (!VIEWS[view]) view = 'dashboard';
  const main = document.getElementById('mainContent');
  main.style.opacity = '0';
  main.style.transform = 'translateY(8px)';

  await new Promise(r => setTimeout(r, 140));
  main.innerHTML = '';
  setActive(view);
  window.location.hash = view;

  await VIEWS[view](main);
  main.style.opacity = '1';
  main.style.transform = 'translateY(0)';
}

async function checkStatus() {
  const el = document.getElementById('backendStatus');
  if (!el) return;
  try {
    await api.health();
    el.innerHTML = `<span class="status-dot online"></span><span class="status-text">Backend conectado</span>`;
  } catch {
    el.innerHTML = `<span class="status-dot offline"></span><span class="status-text">Backend desconectado</span>`;
  }
}

buildLayout();
const initialView = window.location.hash.slice(1) || 'dashboard';
navigate(initialView);

checkStatus();
setInterval(checkStatus, 30_000);

window.addEventListener('hashchange', () => {
  const v = window.location.hash.slice(1) || 'dashboard';
  navigate(v);
});
