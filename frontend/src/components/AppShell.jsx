import { NavLink } from 'react-router-dom'
import {
  BrainCircuit,
  Database,
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Radar,
  ShieldAlert,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/grafo', label: 'Explorador', icon: Radar },
  { to: '/nodos', label: 'Gestion Nodos', icon: Database },
  { to: '/relaciones', label: 'Relaciones', icon: GitBranch },
  { to: '/simulador', label: 'Simulador', icon: MessageSquare },
  { to: '/datascience', label: 'Analisis de Red', icon: BrainCircuit },
]

function AppShell({ children, title, actions }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span>Control Operadora</span>
          <h1>
            <ShieldAlert size={18} />
            SentinelGT
          </h1>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon className="icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <h2>{title}</h2>
          {actions ? <div className="action-group">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  )
}

export default AppShell
