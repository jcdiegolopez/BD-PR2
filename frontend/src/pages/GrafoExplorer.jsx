import { useState, useCallback } from 'react'
import { Search, Play, Terminal } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import NeovisGraph from '../components/NeovisGraph.jsx'
import { runCypher } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const PRESET_QUERIES = [
  {
    label: 'Red sospechosa',
    cypher: `MATCH (n:Numero:Sospechoso)-[r*1..2]-(m) RETURN n, r, m LIMIT 100`,
  },
  {
    label: 'IMEI compartido',
    cypher: `MATCH (d:Dispositivo)-[r:USO_NUMERO]->(n:Numero)
             WITH d, collect(n) AS nums, collect(r) AS rels
             WHERE size(nums) >= 2
             UNWIND nums AS n UNWIND rels AS r
             RETURN d, r, n LIMIT 100`,
  },
  {
    label: 'Cluster coordinado',
    cypher: `MATCH (a:Numero)-[r:CONTACTO_FRECUENTE]->(b:Numero)
             RETURN a, r, b LIMIT 100`,
  },
  {
    label: 'Llamadas nocturnas',
    cypher: `MATCH (n:Numero)-[ro:ORIGINO]->(l:Llamada)
             WHERE l.hora < '05:00'
             RETURN n, ro, l LIMIT 80`,
  },
]

function GrafoExplorerPage() {
  const [searchNum, setSearchNum] = useState('')
  const [cypher, setCypher] = useState('MATCH (n:Numero) RETURN n LIMIT 30')
  const [customCypher, setCustomCypher] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [cypherResults, setCypherResults] = useState(null)
  const [runningCustom, setRunningCustom] = useState(false)

  const handleSearch = useCallback(() => {
    if (!searchNum.trim()) return
    setCypher(
      `MATCH (n:Numero {numero: "${searchNum.trim()}"})-[r*1..2]-(m) RETURN n, r, m LIMIT 100`
    )
    setSelectedNode(null)
  }, [searchNum])

  function handlePreset(q) {
    setCypher(q.cypher)
    setSelectedNode(null)
    setCypherResults(null)
  }

  function handleNodeClick(node) {
    setSelectedNode(node)
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
            {nodeProps ? (
              <div className="panel-stack" style={{ gap: 6 }}>
                {Object.entries(nodeProps).map(([key, val]) => (
                  <div key={key} className="pill" style={{ justifyContent: 'space-between' }}>
                    <span>{key}</span>
                    <strong>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</strong>
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
