import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ShieldAlert, Zap } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { getStats, runDeteccion, runDataScience, runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const LABEL_ICONS = {
  Numero: '☎',
  Persona: '👤',
  Llamada: '📞',
  Mensaje: '✉',
  Dispositivo: '📱',
  Reporte: '📋',
  Operadora: '🏢',
  Sospechoso: '⚠',
}

const BAR_COLORS = ['#f06a6a', '#f2c14e', '#6ec6ff', '#5cd3a3', '#b06eff', '#ff6eb0', '#6effff']

function DashboardPage() {
  const [stats, setStats] = useState([])
  const [topRisk, setTopRisk] = useState([])
  const [fraudDist, setFraudDist] = useState([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [runningGds, setRunningGds] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statsData, topData, distData] = await Promise.all([
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
      ])
      setStats(statsData)
      setTopRisk(topData)
      setFraudDist(distData)
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
    if (score >= 0.7) return 'ALTO'
    if (score >= 0.4) return 'MEDIO'
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
          {mainLabels.slice(0, 4).map((s) => (
            <div key={s.label} className="card" style={{ gridColumn: 'span 3' }}>
              <h3>{LABEL_ICONS[s.label] || ''} {s.label}s</h3>
              <div className="metric">{(typeof s.total === 'object' ? s.total.low : s.total)?.toLocaleString()}</div>
              <span className="pill">total en BD</span>
            </div>
          ))}

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
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No hay numeros con score de riesgo</p>
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
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sin datos de reportes</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fraudDist} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#233046" />
                  <XAxis dataKey="tipo" tick={{ fill: '#91a0b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#91a0b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#151c28',
                      border: '1px solid #233046',
                      borderRadius: 10,
                      color: '#d8e1ee',
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {fraudDist.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div className="panel-title">
              <h3>Resumen de labels</h3>
              <span className="pill">{stats.length} labels en BD</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {stats.map((s) => (
                <div key={s.label} className="pill" style={{ justifyContent: 'space-between', minWidth: 140 }}>
                  <span>{LABEL_ICONS[s.label] || <Zap size={12} />} {s.label}</span>
                  <strong>{(typeof s.total === 'object' ? s.total.low : s.total)?.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </AppShell>
  )
}

export default DashboardPage
