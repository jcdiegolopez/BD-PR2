import { NavLink } from 'react-router-dom'
import {
  BrainCircuit,
  Database,
  GitBranch,
  LayoutDashboard,
  Upload,
  Radar,
  ShieldAlert,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Resumen general' },
  { to: '/grafo', label: 'Explorador', icon: Radar, desc: 'Visualización del grafo' },
  { to: '/nodos', label: 'Gestión Nodos', icon: Database, desc: 'CRUD de nodos' },
  { to: '/relaciones', label: 'Relaciones', icon: GitBranch, desc: 'CRUD de relaciones' },
  { to: '/simulador', label: 'Simulador', icon: Upload, desc: 'Generar y cargar datos' },
  { to: '/datascience', label: 'Análisis de Red', icon: BrainCircuit, desc: 'PageRank y comunidades' },
]

function AppShell({ children, title, description, actions }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} color="var(--accent)" />
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
                Control Operadora
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                SentinelGT
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 6 }}>
            <span className="status-dot" />
            <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>Sistema activo</span>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-section">Navegación</div>
          {NAV_ITEMS.map(({ to, label, icon: Icon, desc }) => (
            <NavLink key={to} to={to} end={to === '/'} title={desc}>
              <Icon className="icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{title}</h2>
            {description && <p className="page-desc">{description}</p>}
          </div>
          {actions ? <div className="action-group">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  )
}

export default AppShell
