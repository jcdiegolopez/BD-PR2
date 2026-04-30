import { useEffect, useRef, useState } from 'react'
import { runCypher } from '../lib/api.js'

export default function NeovisGraph({ cypher, onNodeClick }) {
  const containerRef = useRef(null)
  const networkRef = useRef(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      if (!containerRef.current) return
      setLoading(true)

      try {
        const records = await runCypher(cypher || 'MATCH (n:Numero) RETURN n LIMIT 25')

        // Dynamically import vis-network
        const vis = await import('vis-network/standalone')
        const { DataSet, Network } = vis

        // Parse Cypher results into nodes and edges for vis.js
        const nodesMap = new Map()
        const edgesArr = []

        for (const record of records) {
          // Process all keys in the record
          for (const [, value] of Object.entries(record)) {
            if (value && typeof value === 'object') {
              // Check if it looks like a node (has labels or identity-like keys)
              if (Array.isArray(value.labels) || value.numero || value.nombre || value.imei) {
                const id = value.id || value.identity
                if (id != null && !nodesMap.has(id)) {
                  const label = value.numero || value.nombre || value.imei || value.id_cdr || value.id_mensaje || value.id_reporte || `#${id}`
                  const nodeLabel = Array.isArray(value.labels) ? value.labels[0] : ''
                  nodesMap.set(id, {
                    id,
                    label: String(label),
                    group: nodeLabel,
                    title: Object.entries(value).filter(([k]) => k !== 'labels' && k !== 'id' && k !== 'identity').map(([k, v]) => `${k}: ${v}`).join('\n'),
                    raw: value,
                  })
                }
              }
            }
          }
        }

        // If no node-like objects found, render records as simple nodes
        if (nodesMap.size === 0) {
          records.forEach((record, idx) => {
            const firstVal = Object.values(record)[0]
            const label = typeof firstVal === 'object' ? JSON.stringify(firstVal).slice(0, 30) : String(firstVal || idx)
            nodesMap.set(idx, { id: idx, label, raw: record })
          })
        }

        const nodes = new DataSet([...nodesMap.values()])
        const edges = new DataSet(edgesArr)

        const options = {
          nodes: {
            shape: 'dot',
            size: 16,
            font: { color: '#d8e1ee', size: 12, face: 'Space Grotesk' },
            borderWidth: 2,
            color: {
              background: '#1e3a5f',
              border: '#6ec6ff',
              highlight: { background: '#2b5a8f', border: '#5cd3a3' },
              hover: { background: '#2b5a8f', border: '#5cd3a3' },
            },
          },
          edges: {
            arrows: { to: { enabled: true, scaleFactor: 0.6 } },
            color: { color: '#233046', highlight: '#5cd3a3' },
            font: { color: '#91a0b8', size: 10, face: 'Space Grotesk' },
          },
          groups: {
            Numero: { color: { background: '#1e3a5f', border: '#6ec6ff' } },
            Persona: { color: { background: '#3a1e5f', border: '#b06eff' } },
            Dispositivo: { color: { background: '#5f3a1e', border: '#ffb06e' } },
            Llamada: { color: { background: '#1e5f3a', border: '#5cd3a3' } },
            Mensaje: { color: { background: '#5f1e3a', border: '#ff6eb0' } },
            Reporte: { color: { background: '#5f5f1e', border: '#f2c14e' } },
            Operadora: { color: { background: '#1e5f5f', border: '#6effff' } },
            Sospechoso: { color: { background: '#5f1e1e', border: '#f06a6a' } },
          },
          physics: {
            barnesHut: { gravitationalConstant: -4000, springLength: 120 },
            stabilization: { iterations: 80 },
          },
          interaction: { hover: true, zoomView: true, dragView: true },
        }

        // Destroy old network if exists
        if (networkRef.current) {
          networkRef.current.destroy()
        }

        const network = new Network(containerRef.current, { nodes, edges }, options)
        networkRef.current = network

        network.on('click', (params) => {
          if (params.nodes.length > 0 && onNodeClick) {
            const nodeId = params.nodes[0]
            const nodeData = nodes.get(nodeId)
            onNodeClick(nodeData)
          }
        })
      } catch (err) {
        console.error('Graph render error:', err)
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy()
        networkRef.current = null
      }
    }
  }, [cypher])

  return (
    <div
      ref={containerRef}
      className="graph-canvas"
      style={{ minHeight: 520, position: 'relative' }}
    >
      {loading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div className="spinner lg" />
        </div>
      )}
    </div>
  )
}
