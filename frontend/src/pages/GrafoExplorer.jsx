import { useState, useCallback } from 'react'
import { Search, Play, Terminal } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import NeovisGraph from '../components/NeovisGraph.jsx'
import { runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const PRESET_QUERIES = [
  {
    label: 'Top 10 Riesgo (Red)',
    cypher: `MATCH (n:Numero)
             WITH n ORDER BY n.score_riesgo DESC LIMIT 10
             OPTIONAL MATCH (n)-[r]-(m)
             RETURN n, r, m`,
  },
  {
    label: 'IMEI compartido',
    cypher: `MATCH (d:Dispositivo)-[r:USO_NUMERO]->(n:Numero)
             WITH d, collect(n) AS nums, collect(r) AS rels
             WHERE size(nums) >= 2
             UNWIND nums AS n UNWIND rels AS r
             RETURN d, r, n LIMIT 50`,
  },
  {
    label: 'Llamadas Nocturnas',
    cypher: `MATCH (n:Numero)-[ro:ORIGINO]->(l:Llamada)
             WHERE l.hora < '05:00'
             RETURN n, ro, l LIMIT 50`,
  },
  {
    label: 'Red de Reportes',
    cypher: `MATCH (p:Persona)-[r1:REALIZO_REPORTE]->(rep:Reporte)-[r2:INVOLUCRA_NUMERO]->(n:Numero)
             RETURN p, r1, rep, r2, n LIMIT 50`,
  },
]

function GrafoExplorerPage() {
  const [searchNum, setSearchNum] = useState('')
  const [cypher, setCypher] = useState('MATCH (n:Numero) RETURN n LIMIT 30')
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
    <AppShell title="Explorador de grafo">
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

          <div className="card">
            <h3>Propiedades del nodo</h3>
            {stats && (
              <div className="panel-stack" style={{ gap: 8, marginBottom: 15, padding: 12, background: 'var(--bg-card-alt)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resumen de Actividad</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Llamadas:</span> <strong>{stats.calls}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Víctimas:</span> <strong>{stats.victims}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reportes:</span> <strong style={{ color: stats.reports > 0 ? 'var(--danger)' : 'inherit' }}>{stats.reports}</strong>
                </div>
              </div>
            )}
            {nodeProps ? (
              <div className="panel-stack" style={{ gap: 6 }}>
                {Object.entries(nodeProps).map(([key, val]) => (
                  <div key={key} className="pill" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11 }}>{key}</span>
                    <strong style={{ fontSize: 11 }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Click en un nodo del grafo para ver sus propiedades
              </p>
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
