import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import {
  ShieldAlert,
  Zap,
  Phone,
  User,
  MessageSquare,
  Smartphone,
  ClipboardList,
  Building2,
  AlertTriangle,
  Hash,
  RefreshCw,
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { getStats, runDeteccion, runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const LABEL_ICONS = {
  Numero: Hash,
  Persona: User,
  Llamada: Phone,
  Mensaje: MessageSquare,
  Dispositivo: Smartphone,
  Reporte: ClipboardList,
  Operadora: Building2,
  Sospechoso: AlertTriangle,
}

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const RISK_COLORS = { ALTO: '#ef4444', MEDIO: '#f59e0b', BAJO: '#10b981' }

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round((score || 0) * 100))
  const color = score >= 0.7 ? 'var(--danger)' : score >= 0.5 ? 'var(--warning)' : 'var(--accent)'
  return (
    <div className="score-bar-wrap">
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-val" style={{ color }}>{pct}%</span>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon, variant }) {
  return (
    <div className={`card ${variant || ''}`} style={{ gridColumn: 'span 3' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0 }}>
          <Icon size={13} style={{ marginBottom: -2, marginRight: 4, opacity: 0.7 }} />
          {label}s
        </h3>
        {variant === 'danger-accent' && (
          <span className="badge high" style={{ fontSize: 10 }}>ALERTA</span>
        )}
      </div>
      <div className="metric" style={{ marginTop: 12 }}>
        {(typeof value === 'object' ? value?.low : value)?.toLocaleString() ?? '—'}
      </div>
      <div className="metric-sub">nodos en base de datos</div>
    </div>
  )
}

function DashboardPage() {
  const [stats, setStats] = useState([])
  const [topRisk, setTopRisk] = useState([])
  const [fraudDist, setFraudDist] = useState([])
  const [riskDist, setRiskDist] = useState([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, topData, distData, riskData] = await Promise.all([
        getStats(),
        runCypher(
          `MATCH (n:Numero) WHERE n.score_riesgo IS NOT NULL
           RETURN n.numero AS numero, n.score_riesgo AS score, labels(n) AS labels
           ORDER BY n.score_riesgo DESC LIMIT 8`
        ),
        runCypher(
          `MATCH (r:Reporte)
           RETURN r.tipo_fraude AS tipo, count(r) AS total
           ORDER BY total DESC`
        ),
        runCypher(
          `MATCH (n:Numero)
           RETURN
             CASE
               WHEN n.score_riesgo >= 0.70 THEN 'ALTO'
               WHEN n.score_riesgo >= 0.50 THEN 'MEDIO'
               ELSE 'BAJO'
             END AS nivel,
             count(n) AS total`
        ),
      ])
      setStats(statsData)
      setTopRisk(topData)
      setFraudDist(distData)
      setRiskDist(riskData)
      setLastUpdate(new Date())
    } catch (err) {
      toast('Error cargando datos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeteccion() {
    setDetecting(true)
    try {
      const result = await runDeteccion()
      const total =
        (result.numeroMasivo?.length || 0) +
        (result.dispositivoCompartido?.length || 0) +
        (result.llamadasNocturnas?.length || 0) +
        (result.redCoordinada?.length || 0) +
        (result.multiplesReportes?.length || 0) +
        (result.mensajesAmenazantes?.length || 0)
      toast(`Detección completa: ${total} alertas encontradas`, 'success')
      fetchData()
    } catch (err) {
      toast('Error en detección: ' + err.message, 'error')
    } finally {
      setDetecting(false)
    }
  }

  function getTag(score) {
    if (score >= 0.70) return 'ALTO'
    if (score >= 0.50) return 'MEDIO'
    return 'BAJO'
  }

  function getTagClass(tag) {
    if (tag === 'ALTO') return 'badge high'
    if (tag === 'MEDIO') return 'badge mid'
    return 'badge low'
  }

  function statVal(s) {
    return typeof s === 'object' ? s?.low : s
  }

  const getStat = (label) => stats.find((s) => s.label === label)

  const sospechosos = getStat('Sospechoso')
  const mainKpis = [
    { label: 'Numero', icon: Hash, variant: '' },
    { label: 'Persona', icon: User, variant: '' },
    { label: 'Llamada', icon: Phone, variant: '' },
    { label: 'Sospechoso', icon: AlertTriangle, variant: 'danger-accent' },
  ]

  const secondaryLabels = ['Mensaje', 'Dispositivo', 'Reporte', 'Operadora']

  return (
    <AppShell
      title="Panel general"
      description="Monitoreo en tiempo real del sistema de detección de fraude"
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {lastUpdate && (
            <span className="pill" style={{ fontSize: 11 }}>
              Actualizado {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button className="button" onClick={fetchData} disabled={loading} title="Refrescar datos">
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.6s linear infinite' : 'none' }} />
          </button>
          <button className="button primary" onClick={handleDeteccion} disabled={detecting}>
            {detecting
              ? <><span className="spinner" /> Detectando...</>
              : <><ShieldAlert size={15} /> Ejecutar detección</>}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="empty-state">
          <div className="spinner lg" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Cargando datos...</p>
        </div>
      ) : (
        <section className="grid">

          {/* KPI cards row */}
          {mainKpis.map(({ label, icon, variant }) => {
            const s = getStat(label)
            return (
              <KpiCard
                key={label}
                label={label}
                value={s?.total}
                icon={icon}
                variant={variant}
              />
            )
          })}

          {/* Secondary stats strip */}
          <div className="card" style={{ gridColumn: 'span 12', padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Otros labels
              </span>
              {secondaryLabels.map((label) => {
                const s = getStat(label)
                const Icon = LABEL_ICONS[label] || Zap
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={12} style={{ opacity: 0.5 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <strong style={{ fontSize: 13 }}>{statVal(s?.total)?.toLocaleString() ?? '—'}</strong>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top risk table */}
          <div className="card" style={{ gridColumn: 'span 7' }}>
            <div className="panel-title">
              <h3>Números con mayor riesgo</h3>
              <span className="pill">Top 8</span>
            </div>
            {topRisk.length === 0 ? (
              <div className="hint">
                No hay números con score de riesgo calculado. Ejecuta la detección primero.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Número</th>
                    <th>Score de riesgo</th>
                    <th>Nivel</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((item, idx) => {
                    const score = typeof item.score === 'object' ? item.score.low : (item.score || 0)
                    const tag = getTag(score)
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{item.numero || '—'}</td>
                        <td><ScoreBar score={score} /></td>
                        <td><span className={getTagClass(tag)}>{tag}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Risk distribution pie */}
          <div className="card" style={{ gridColumn: 'span 5' }}>
            <div className="panel-title">
              <h3>Distribución de riesgo</h3>
            </div>
            {riskDist.length === 0 ? (
              <div className="hint">Sin datos suficientes para mostrar distribución.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: 220 }}>
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDist}
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="total"
                      nameKey="nivel"
                      stroke="none"
                    >
                      {riskDist.map((entry, i) => (
                        <Cell key={i} fill={RISK_COLORS[entry.nivel] || '#3f3f46'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--panel-strong)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text)',
                        fontSize: 11,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {riskDist.map((r) => {
                    const total = typeof r.total === 'object' ? r.total.low : r.total
                    return (
                      <div key={r.nivel} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[r.nivel], flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-muted)' }}>{r.nivel}</span>
                          <strong style={{ marginLeft: 'auto' }}>{total?.toLocaleString()}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Fraud types bar chart */}
          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div className="panel-title">
              <h3>Reportes por tipo de fraude</h3>
              <span className="pill">{fraudDist.reduce((a, b) => a + (typeof b.total === 'object' ? b.total.low : b.total), 0)} reportes totales</span>
            </div>
            {fraudDist.length === 0 ? (
              <div className="hint">No hay reportes registrados en la base de datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fraudDist} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                  <XAxis dataKey="tipo" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{
                      background: 'var(--panel-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text)',
                      fontSize: 12,
                      boxShadow: 'var(--shadow)',
                    }}
                  />
                  <Bar dataKey="total" radius={[5, 5, 0, 0]} barSize={40}>
                    {fraudDist.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </section>
      )}
    </AppShell>
  )
}

export default DashboardPage
