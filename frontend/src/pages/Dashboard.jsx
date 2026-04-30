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
  Hash
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { getStats, runDeteccion, runDataScience, runCypher } from '../lib/api.js'
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

const BAR_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
]

const RISK_COLORS = {
  ALTO: '#ef4444',
  MEDIO: '#f59e0b',
  BAJO: '#10b981'
}

function DashboardPage() {
  const [stats, setStats] = useState([])
  const [topRisk, setTopRisk] = useState([])
  const [fraudDist, setFraudDist] = useState([])
  const [riskDist, setRiskDist] = useState([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [runningGds, setRunningGds] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, topData, distData, riskData] = await Promise.all([
        getStats(),
        runCypher(
          `MATCH (n:Numero) WHERE n.score_riesgo IS NOT NULL
           RETURN n.numero AS numero, n.score_riesgo AS score, labels(n) AS labels
           ORDER BY n.score_riesgo DESC LIMIT 5`
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
               WHEN n.score_riesgo >= 0.95 THEN 'ALTO'
               WHEN n.score_riesgo >= 0.65 THEN 'MEDIO'
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
      toast(`Deteccion completa: ${total} alertas encontradas`, 'success')
      fetchData()
    } catch (err) {
      toast('Error en deteccion: ' + err.message, 'error')
    } finally {
      setDetecting(false)
    }
  }

  async function handleGds() {
    setRunningGds(true)
    try {
      await runDataScience()
      toast('Algoritmos GDS ejecutados (Louvain + PageRank)', 'success')
      fetchData()
    } catch (err) {
      toast('Error ejecutando GDS: ' + err.message, 'error')
    } finally {
      setRunningGds(false)
    }
  }

  function getTag(score) {
    if (score >= 0.95) return 'ALTO'
    if (score >= 0.65) return 'MEDIO'
    return 'BAJO'
  }

  function getTagClass(tag) {
    if (tag === 'ALTO') return 'badge high'
    if (tag === 'MEDIO') return 'badge mid'
    return 'badge low'
  }

  const mainLabels = stats.filter((s) =>
    ['Numero', 'Persona', 'Llamada', 'Mensaje', 'Dispositivo', 'Reporte', 'Operadora'].includes(s.label)
  )

  return (
    <AppShell
      title="Panel general"
      actions={
        <>
          <button className="button" onClick={handleGds} disabled={runningGds}>
            {runningGds ? <><span className="spinner" /> Ejecutando...</> : 'Correr GDS'}
          </button>
          <button className="button primary" onClick={handleDeteccion} disabled={detecting}>
            {detecting ? <><span className="spinner" /> Detectando...</> : <><ShieldAlert size={16} /> Ejecutar deteccion</>}
          </button>
        </>
      }
    >
      {loading ? (
        <div className="empty-state">
          <div className="spinner lg" style={{ margin: '0 auto' }} />
          <p>Cargando datos...</p>
        </div>
      ) : (
        <section className="grid">
          {mainLabels.slice(0, 4).map((s) => {
            const Icon = LABEL_ICONS[s.label] || Hash
            return (
              <div key={s.label} className="card" style={{ gridColumn: 'span 3' }}>
                <h3><Icon size={14} style={{ marginBottom: -2, marginRight: 4, opacity: 0.7 }} /> {s.label}s</h3>
                <div className="metric">{(typeof s.total === 'object' ? s.total.low : s.total)?.toLocaleString()}</div>
                <span className="pill">total en BD</span>
              </div>
            )
          })}

          <div className="card" style={{ gridColumn: 'span 7' }}>
            <div className="panel-title">
              <h3>Top 5 riesgo</h3>
              {lastUpdate && (
                <span className="pill">
                  Actualizado {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
            {topRisk.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay numeros con score de riesgo</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Numero</th>
                    <th>Score</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((item, idx) => {
                    const score = typeof item.score === 'object' ? item.score.low : item.score
                    const tag = getTag(score)
                    return (
                      <tr key={idx}>
                        <td>{item.numero || '—'}</td>
                        <td>{(score || 0).toFixed(2)}</td>
                        <td><span className={getTagClass(tag)}>{tag}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ gridColumn: 'span 5' }}>
            <div className="panel-title">
              <h3>Reportes por tipo de fraude</h3>
            </div>
            {fraudDist.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos de reportes</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fraudDist} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                  <XAxis dataKey="tipo" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{
                      background: 'var(--panel-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text)',
                      fontSize: 12,
                      boxShadow: 'var(--shadow)'
                    }}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={32}>
                    {fraudDist.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ gridColumn: 'span 5' }}>
            <div className="panel-title">
              <h3>Distribución de riesgo</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', height: 220 }}>
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDist}
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="nivel"
                    stroke="none"
                  >
                    {riskDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.nivel] || '#3f3f46'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel-strong)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      color: 'var(--text)',
                      fontSize: 11
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {riskDist.map(r => (
                  <div key={r.nivel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: RISK_COLORS[r.nivel] }} />
                    <span style={{ color: 'var(--text-muted)' }}>{r.nivel}:</span>
                    <strong style={{ marginLeft: 'auto' }}>{typeof r.total === 'object' ? r.total.low : r.total}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div className="panel-title">
              <h3>Resumen de labels</h3>
              <span className="pill">{stats.length} labels en BD</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stats.map((s) => {
                const Icon = LABEL_ICONS[s.label] || Zap
                return (
                  <div key={s.label} className="pill" style={{ justifyContent: 'space-between', minWidth: 130 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={12} opacity={0.6} /> {s.label}
                    </span>
                    <strong>{(typeof s.total === 'object' ? s.total.low : s.total)?.toLocaleString()}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  )
}

export default DashboardPage
