import { useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { BrainCircuit, Users, TrendingUp, RefreshCw } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { runDataScience, runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const COMMUNITY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#a855f7',
]

function toNum(v) {
  if (v == null) return 0
  if (typeof v === 'object' && 'low' in v) return v.low + v.high * 2 ** 32
  return Number(v)
}

async function fetchCurrentResults() {
  const [pagerankRows, communityRows] = await Promise.all([
    runCypher(
      `MATCH (n:Numero) WHERE n.pagerank IS NOT NULL
       RETURN n.numero AS numero, n.pagerank AS pagerank,
              n.score_riesgo AS score_riesgo, labels(n) AS labels
       ORDER BY n.pagerank DESC LIMIT 15`
    ),
    runCypher(
      `MATCH (n:Numero) WHERE n.comunidad IS NOT NULL
       RETURN n.comunidad AS comunidad, count(n) AS total,
              avg(n.score_riesgo) AS avg_riesgo
       ORDER BY total DESC LIMIT 15`
    ),
  ])
  return { pagerankRows, communityRows }
}

function DataSciencePage() {
  const [pagerank, setPagerank]     = useState([])
  const [communities, setCommunities] = useState([])
  const [communityMembers, setCommunityMembers] = useState(null)
  const [selectedCom, setSelectedCom] = useState(null)
  const [running, setRunning]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [hasData, setHasData]       = useState(false)
  const [lastRun, setLastRun]       = useState(null)

  const loadResults = useCallback(async () => {
    setLoading(true)
    try {
      const { pagerankRows, communityRows } = await fetchCurrentResults()
      setPagerank(pagerankRows)
      setCommunities(communityRows)
      setHasData(pagerankRows.length > 0)
    } catch (err) {
      toast('Error cargando resultados: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleRun() {
    setRunning(true)
    try {
      await runDataScience()
      setLastRun(new Date())
      toast('Algoritmos completados — PageRank y comunidades actualizados', 'success')
      await loadResults()
    } catch (err) {
      toast('Error ejecutando algoritmos: ' + err.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  async function handleSelectCommunity(comId) {
    if (selectedCom === comId) {
      setSelectedCom(null)
      setCommunityMembers(null)
      return
    }
    setSelectedCom(comId)
    try {
      const rows = await runCypher(
        `MATCH (n:Numero) WHERE n.comunidad = $cid
         RETURN n.numero AS numero, n.pagerank AS pagerank,
                n.score_riesgo AS score_riesgo, labels(n) AS labels
         ORDER BY n.score_riesgo DESC LIMIT 20`,
        { cid: comId }
      )
      setCommunityMembers(rows)
    } catch (err) {
      toast('Error cargando miembros: ' + err.message, 'error')
    }
  }

  const maxPagerank = pagerank.length > 0 ? toNum(pagerank[0].pagerank) : 1

  return (
    <AppShell
      title="Analisis de Red"
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {hasData && (
            <button className="button" onClick={loadResults} disabled={loading}>
              <RefreshCw size={14} /> Actualizar
            </button>
          )}
          <button className="button primary" onClick={handleRun} disabled={running}>
            {running
              ? <><span className="spinner" /> Calculando...</>
              : <><BrainCircuit size={16} /> Ejecutar algoritmos</>}
          </button>
        </div>
      }
    >
      {/* ── Estado inicial ── */}
      {!hasData && !running && (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>Sin resultados todavia</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
            Presiona "Ejecutar algoritmos" para calcular PageRank y deteccion de comunidades
            sobre la red de numeros sospechosos.
          </p>
          <button className="button primary" onClick={handleRun} disabled={running}>
            <BrainCircuit size={16} /> Ejecutar ahora
          </button>
        </div>
      )}

      {running && (
        <div className="empty-state" style={{ marginTop: 80 }}>
          <div className="spinner lg" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Calculando PageRank y comunidades sobre todos los nodos Numero...
          </p>
        </div>
      )}

      {/* ── Resultados ── */}
      {hasData && !running && (
        <section className="grid">

          {/* KPIs */}
          <div className="card" style={{ gridColumn: 'span 4' }}>
            <h3><TrendingUp size={14} style={{ marginRight: 4, opacity: 0.6 }} /> Nodos analizados</h3>
            <div className="metric">{pagerank.length > 0 ? '✓' : '—'}</div>
            <span className="pill">con PageRank calculado</span>
          </div>

          <div className="card" style={{ gridColumn: 'span 4' }}>
            <h3><Users size={14} style={{ marginRight: 4, opacity: 0.6 }} /> Comunidades detectadas</h3>
            <div className="metric">{communities.length}</div>
            <span className="pill">grupos en la red</span>
          </div>

          <div className="card" style={{ gridColumn: 'span 4' }}>
            <h3><BrainCircuit size={14} style={{ marginRight: 4, opacity: 0.6 }} /> Ultima ejecucion</h3>
            <div className="metric" style={{ fontSize: 18 }}>
              {lastRun ? lastRun.toLocaleTimeString() : 'sesion anterior'}
            </div>
            <span className="pill">Label Propagation + PageRank</span>
          </div>

          {/* PageRank table */}
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div className="panel-title">
              <h3>Top numeros por centralidad (PageRank)</h3>
              <span className="pill" style={{ fontSize: 11 }}>
                mayor = mas influyente en la red
              </span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Numero</th>
                  <th>PageRank</th>
                  <th>Riesgo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagerank.map((row, i) => {
                  const pr    = toNum(row.pagerank)
                  const score = toNum(row.score_riesgo)
                  const pct   = maxPagerank > 0 ? (pr / maxPagerank) * 100 : 0
                  const labels = Array.isArray(row.labels) ? row.labels : []
                  const isSusp = labels.includes('Sospechoso')
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', width: 28 }}>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {row.numero}
                        {isSusp && <span className="badge high" style={{ marginLeft: 6 }}>S</span>}
                      </td>
                      <td style={{ width: 130 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            height: 6, borderRadius: 3, width: `${pct}%`,
                            minWidth: 4, maxWidth: 80,
                            background: 'var(--accent)',
                          }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {pr.toFixed(4)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={score >= 0.95 ? 'badge high' : score >= 0.65 ? 'badge mid' : 'badge low'}>
                          {score.toFixed(2)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* PageRank bar chart */}
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div className="panel-title">
              <h3>Distribucion de centralidad</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={pagerank.map(r => ({
                  numero: (r.numero || '').slice(-7),
                  pagerank: +toNum(r.pagerank).toFixed(5),
                }))}
                margin={{ top: 8, right: 8, left: -10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis
                  dataKey="numero"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  angle={-45} textAnchor="end"
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--text)', fontSize: 11,
                  }}
                />
                <Bar dataKey="pagerank" radius={[4, 4, 0, 0]} barSize={18}>
                  {pagerank.map((_, i) => (
                    <Cell key={i} fill={COMMUNITY_COLORS[i % COMMUNITY_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Communities */}
          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div className="panel-title">
              <h3>Comunidades detectadas</h3>
              <span className="pill" style={{ fontSize: 11 }}>
                haz click en una fila para ver sus miembros
              </span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Comunidad ID</th>
                  <th>Numeros en el grupo</th>
                  <th>Riesgo promedio</th>
                  <th>Visual</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((row, i) => {
                  const comId   = toNum(row.comunidad)
                  const total   = toNum(row.total)
                  const avgRisk = toNum(row.avg_riesgo)
                  const maxTotal = toNum(communities[0]?.total) || 1
                  const pct = (total / maxTotal) * 100
                  const isSelected = selectedCom === comId
                  return (
                    <>
                      <tr
                        key={comId}
                        onClick={() => handleSelectCommunity(comId)}
                        style={{ cursor: 'pointer', background: isSelected ? 'var(--panel-strong)' : undefined }}
                      >
                        <td>
                          <span style={{
                            display: 'inline-block', width: 10, height: 10,
                            borderRadius: '50%', marginRight: 8,
                            background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length],
                          }} />
                          #{comId}
                        </td>
                        <td><strong>{total}</strong> numeros</td>
                        <td>
                          <span className={avgRisk >= 0.95 ? 'badge high' : avgRisk >= 0.65 ? 'badge mid' : 'badge low'}>
                            {avgRisk.toFixed(3)}
                          </span>
                        </td>
                        <td style={{ width: 200 }}>
                          <div style={{
                            height: 8, borderRadius: 4,
                            width: `${pct}%`, minWidth: 4,
                            background: COMMUNITY_COLORS[i % COMMUNITY_COLORS.length],
                            opacity: 0.7,
                          }} />
                        </td>
                      </tr>

                      {/* Expanded members */}
                      {isSelected && communityMembers && (
                        <tr key={`members-${comId}`}>
                          <td colSpan={4} style={{ padding: '12px 16px', background: 'var(--panel-strong)' }}>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                              Miembros de la comunidad #{comId} (top 20 por riesgo):
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {communityMembers.map((m, mi) => {
                                const s = toNum(m.score_riesgo)
                                const labels = Array.isArray(m.labels) ? m.labels : []
                                return (
                                  <span
                                    key={mi}
                                    className={s >= 0.95 ? 'badge high' : s >= 0.65 ? 'badge mid' : 'badge low'}
                                    style={{ fontFamily: 'monospace', fontSize: 11 }}
                                  >
                                    {m.numero}
                                    {labels.includes('Sospechoso') ? ' ⚠' : ''}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>

        </section>
      )}
    </AppShell>
  )
}

export default DataSciencePage
