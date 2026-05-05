import { useState, useCallback } from 'react'
import { Search, Play, Terminal } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import NeovisGraph from '../components/NeovisGraph.jsx'
import { runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const PRESET_QUERIES = [
  {
    label: 'Top riesgo alto',
    cypher: `MATCH (n:Numero) WHERE n.score_riesgo >= 0.7
             OPTIONAL MATCH (n)-[r]-(m)
             RETURN n, r, m LIMIT 40`,
  },
  {
    label: 'Sospechosos y vecinos',
    cypher: `MATCH (n:Sospechoso)-[r]-(m)
             RETURN n, r, m LIMIT 40`,
  },
  {
    label: 'Red de reportes',
    cypher: `MATCH (p:Persona)-[r1:REALIZO_REPORTE]->(rep:Reporte)-[r2:INVOLUCRA_NUMERO]->(n:Numero)
             RETURN p, r1, rep, r2, n LIMIT 40`,
  },
]

function GrafoExplorerPage() {
  const [searchNum, setSearchNum] = useState('')
  const [cypher, setCypher] = useState('')
  const [customCypher, setCustomCypher] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [cypherResults, setCypherResults] = useState(null)
  const [runningCustom, setRunningCustom] = useState(false)
  const [stats, setStats] = useState(null)

  const handleSearch = useCallback(async () => {
    if (!searchNum.trim()) return
    // Búsqueda limpia de 1 salto para no saturar el grafo
    setCypher(
      `MATCH (n:Numero {numero: "${searchNum.trim()}"})
       OPTIONAL MATCH (n)-[r]-(m)
       RETURN n, r, m LIMIT 50`
    )
    setSelectedNode(null)
    setStats(null)
  }, [searchNum])

  function handlePreset(q) {
    // Agregamos un comentario con timestamp para forzar el re-render en NeovisGraph
    setCypher(`${q.cypher}\n// ${Date.now()}`)
    setSelectedNode(null)
    setCypherResults(null)
  }


  async function handleNodeClick(node) {
    setSelectedNode(node)
    setStats(null)
    
    // Si es un Numero, traemos estadísticas rápidas
    if (node.group === 'Numero' || node.label.includes('-')) {
      try {
        const res = await runCypher(`
          MATCH (n:Numero {numero: "${node.label}"})
          OPTIONAL MATCH (n)-[:ORIGINO]->(l:Llamada)
          OPTIONAL MATCH (n)-[:ORIGINO]->(l2:Llamada)-[:DIRIGIDA_A]->(v:Numero)
          OPTIONAL MATCH (r:Reporte)-[:INVOLUCRA_NUMERO]->(n)
          RETURN count(DISTINCT l) as calls, count(DISTINCT v) as victims, count(DISTINCT r) as reports
        `)
        if (res.length > 0) setStats(res[0])
      } catch (e) { console.error(e) }
    }
  }

  async function handleRunCustom() {
    if (!customCypher.trim()) return
    setRunningCustom(true)
    setCypherResults(null)
    try {
      const results = await runCypher(customCypher.trim())
      setCypherResults(results)
      toast(`Query ejecutada: ${results.length} resultados`, 'success')
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    } finally {
      setRunningCustom(false)
    }
  }

  function handleRunInGraph() {
    if (!customCypher.trim()) return
    setCypher(customCypher.trim())
    setSelectedNode(null)
    setCypherResults(null)
  }

  const nodeProps = selectedNode?.raw?.properties || selectedNode?.properties || selectedNode || null

  return (
    <AppShell title="Explorador de grafo" description="Visualiza el grafo de telecomunicaciones y ejecuta consultas Cypher">
      <section className="layout-split">
        <div className="card" style={{ padding: 0 }}>
          <div className="panel-title" style={{ padding: '18px 20px' }}>
            <div className="search">
              <Search size={16} />
              <input
                placeholder="Buscar numero (ej: 502-5555-1234)"
                value={searchNum}
                onChange={(e) => setSearchNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button className="button" onClick={handleSearch}>
              <Play size={14} /> Buscar
            </button>
          </div>
          <NeovisGraph cypher={cypher} onNodeClick={handleNodeClick} />
        </div>

        <div className="panel-stack">
          <div className="card">
            <h3>Queries predefinidas</h3>
            <div className="panel-stack" style={{ gap: 8 }}>
              {PRESET_QUERIES.map((q) => (
                <button key={q.label} className="button" onClick={() => handlePreset(q)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <h3>Propiedades del nodo</h3>

            {!selectedNode && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>⬡</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
                  Haz clic en un nodo del grafo
                </p>
              </div>
            )}

            {selectedNode && (
              <>
                {/* Labels del nodo */}
                {selectedNode?.raw?.labels && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {selectedNode.raw.labels.map((l) => (
                      <span key={l} className={`badge ${l === 'Sospechoso' ? 'high' : l === 'Verificado' ? 'low' : 'info'}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats de actividad (solo Numero) */}
                {stats && (
                  <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
                      Actividad detectada
                    </div>
                    {[
                      { label: 'Llamadas realizadas', value: stats.calls, danger: false },
                      { label: 'Víctimas contactadas', value: stats.victims, danger: Number(stats.victims) > 5 },
                      { label: 'Reportes en su contra', value: stats.reports, danger: Number(stats.reports) > 0 },
                    ].map(({ label, value, danger }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <strong style={{ color: danger ? 'var(--danger)' : 'var(--text)', fontFamily: 'monospace' }}>
                          {typeof value === 'object' ? (value?.low ?? 0) : value}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Score de riesgo destacado */}
                {nodeProps?.score_riesgo != null && (
                  <div style={{ marginBottom: 12 }}>
                    {(() => {
                      const score = parseFloat(nodeProps.score_riesgo)
                      const pct = Math.round(score * 100)
                      const color = score >= 0.7 ? 'var(--danger)' : score >= 0.5 ? 'var(--warning)' : 'var(--accent)'
                      return (
                        <div style={{ background: 'var(--bg-soft)', border: `1px solid ${color}40`, borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)' }}>Score de riesgo</span>
                            <strong style={{ color, fontFamily: 'monospace' }}>{pct}%</strong>
                          </div>
                          <div className="score-bar">
                            <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Resto de propiedades */}
                {nodeProps && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {Object.entries(nodeProps)
                      .filter(([k]) => k !== 'score_riesgo')
                      .map(([key, val]) => {
                        const display = typeof val === 'object' ? JSON.stringify(val) : String(val)
                        const isLong = display.length > 20
                        return (
                          <div key={key} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: isLong ? 'flex-start' : 'center',
                            padding: '5px 8px', borderRadius: 5, fontSize: 12,
                          }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-soft)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: 8 }}>{key}</span>
                            <span style={{ color: 'var(--text)', fontFamily: isLong ? 'inherit' : 'monospace', fontSize: 11, textAlign: 'right', wordBreak: 'break-all' }}>
                              {display}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h3><Terminal size={14} style={{ marginRight: 6 }} />Cypher libre</h3>
            <div className="form">
              <textarea
                placeholder="MATCH (n:Numero) RETURN n.numero, n.score_riesgo ORDER BY n.score_riesgo DESC LIMIT 10"
                value={customCypher}
                onChange={(e) => setCustomCypher(e.target.value)}
                rows={4}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button primary" onClick={handleRunCustom} disabled={runningCustom}>
                  {runningCustom ? <span className="spinner" /> : <Play size={14} />}
                  Ejecutar
                </button>
                <button className="button" onClick={handleRunInGraph}>
                  Ver en grafo
                </button>
              </div>
            </div>
            {cypherResults && (
              <div style={{ marginTop: 14 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                  {cypherResults.length} resultado(s)
                </p>
                <div className="log-output">
                  {cypherResults.map((row, i) => (
                    <div key={i} className="log-line">
                      {JSON.stringify(row)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

export default GrafoExplorerPage
