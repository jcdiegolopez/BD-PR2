import { useEffect, useRef, useState } from 'react'
import { runCypher } from '../lib/api.js'

/**
 * Graph visualization component that fetches Cypher results from the backend
 * and renders them using vis-network (no direct Neo4j browser connection).
 */
export default function NeovisGraph({ cypher, onNodeClick }) {
  const containerRef = useRef(null)   // dedicated DOM for vis-network canvas
  const networkRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function renderGraph() {
      if (!containerRef.current || !cypher?.trim()) return
      setLoading(true)
      setError(null)

      try {
        /* 1 ── Fetch data via backend API ─────────────────────── */
        const records = await runCypher(cypher)

        if (cancelled) return

        /* 2 ── Dynamically import vis-network ─────────────────── */
        const { DataSet, Network } = await import('vis-network/standalone')

        if (cancelled) return

        /* 3 ── Parse records into vis-network nodes & edges ───── */
        const nodesMap = new Map()
        const edgesMap = new Map()

        function addNode(obj) {
          if (!obj || typeof obj !== 'object') return
          const id = obj._id ?? obj.id
          if (id == null || nodesMap.has(id)) return

          const label =
            obj.numero || obj.nombre || obj.imei ||
            obj.id_cdr || obj.id_mensaje || obj.id_reporte ||
            `#${id}`
          const group = Array.isArray(obj._labels) ? obj._labels[0] : (obj._labels || '')

          // Build tooltip from non-internal properties
          const tooltip = Object.entries(obj)
            .filter(([k]) => !k.startsWith('_'))
            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\\n')

          nodesMap.set(id, {
            id,
            label: String(label),
            group,
            title: tooltip,
            raw: obj,
          })
        }

        function addEdge(obj) {
          if (!obj || typeof obj !== 'object') return
          const id = obj._id ?? obj.id ?? String(Math.random())
          const start = obj._start
          const end = obj._end
          if (start == null || end == null) return
          if (edgesMap.has(id)) return
          edgesMap.set(id, {
            id,
            from: start,
            to: end,
            label: obj._type || '',
            title: obj._type || '',
            raw: obj,
          })
        }

        for (const record of records) {
          for (const value of Object.values(record)) {
            if (!value || typeof value !== 'object') continue

            if (Array.isArray(value)) {
              // Variable-length path returns an array of relationship objects
              for (const item of value) {
                if (item && typeof item === 'object') {
                  if (item._start != null) addEdge(item)
                  else addNode(item)
                }
              }
            } else if (value._start != null) {
              // Looks like a relationship
              addEdge(value)
            } else if (value._labels || value.numero || value.nombre || value.imei || value.id_cdr) {
              // Looks like a node
              addNode(value)
            }
          }
        }

        // Fallback: if we found no nodes, show raw records as labeled dots
        if (nodesMap.size === 0 && records.length > 0) {
          records.forEach((record, idx) => {
            const firstVal = Object.values(record)[0]
            const lbl = typeof firstVal === 'object'
              ? JSON.stringify(firstVal).slice(0, 40)
              : String(firstVal ?? idx)
            nodesMap.set(idx, { id: idx, label: lbl, raw: record })
          })
        }

        /* 4 ── Configure and render vis-network ───────────────── */
        const nodes = new DataSet([...nodesMap.values()])
        const edges = new DataSet([...edgesMap.values()])

        const options = {
          height: '100%',
          width: '100%',
          nodes: {
            shape: 'dot',
            size: 20,
            font: { 
              color: '#fafafa', 
              size: 11,
              face: 'Inter, system-ui, sans-serif'
            },
            borderWidth: 2,
            color: {
              background: '#18181b',
              border: '#3f3f46',
              highlight: { background: '#27272a', border: '#10b981' },
              hover: { background: '#27272a', border: '#10b981' },
            },
            shadow: false,
          },
          edges: {
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
            color: { color: '#3f3f46', highlight: '#10b981', hover: '#10b981' },
            width: 1,
            font: { color: '#a1a1aa', size: 10, face: 'Inter, system-ui, sans-serif', strokeWidth: 0 },
            smooth: { type: 'continuous' },
          },
          groups: {
            Numero:      { color: { background: '#1e3a8a', border: '#3b82f6' } }, // blue
            Persona:     { color: { background: '#5b21b6', border: '#8b5cf6' } }, // violet
            Dispositivo: { color: { background: '#92400e', border: '#f59e0b' } }, // amber
            Llamada:     { color: { background: '#065f46', border: '#10b981' } }, // emerald
            Mensaje:     { color: { background: '#9d174d', border: '#ec4899' } }, // pink
            Reporte:     { color: { background: '#713f12', border: '#a8a29e' } }, // stone
            Operadora:   { color: { background: '#115e59', border: '#14b8a6' } }, // teal
            Sospechoso:  { color: { background: '#991b1b', border: '#ef4444' } }, // red
          },
          physics: {
            solver: 'repulsion',
            repulsion: {
              nodeDistance: 150,
              centralGravity: 0.1,
              springLength: 150,
              springConstant: 0.05,
              damping: 0.09
            },
            stabilization: { iterations: 100 },
          },
          interaction: { hover: true, zoomView: true, dragView: true, tooltipDelay: 200 },
        }

        // Destroy previous network before creating new one
        if (networkRef.current) {
          networkRef.current.destroy()
          networkRef.current = null
        }

        const network = new Network(containerRef.current, { nodes, edges }, options)
        networkRef.current = network
        window.GRAPH_DEBUG = { nodes: nodes.get(), edges: edges.get(), rawRecords: records }

        // Forward node clicks
        network.on('click', (params) => {
          if (params.nodes.length > 0 && onNodeClick) {
            const nodeId = params.nodes[0]
            const nodeData = nodes.get(nodeId)
            onNodeClick(nodeData)
          }
        })

        // Asegurar que se centre el grafo cuando termine de cargar
        network.once('stabilizationIterationsDone', function() {
          network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } })
        })

      } catch (err) {
        console.error('NeovisGraph error:', err)
        if (!cancelled) setError(err.message || 'Error cargando el grafo')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    renderGraph()

    return () => {
      cancelled = true
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [cypher]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative', height: '600px', width: '100%' }}>
      {/* Vis-network canvas container – React will NOT touch its children */}
      <div
        ref={containerRef}
        className="graph-canvas"
        style={{ height: '100%', width: '100%' }}
      />

      {/* Overlays rendered outside the vis-network container */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9,9,11,0.6)', zIndex: 10,
        }}>
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9,9,11,0.6)', zIndex: 10,
          color: 'var(--danger)', fontSize: 13, padding: 24, textAlign: 'center',
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
