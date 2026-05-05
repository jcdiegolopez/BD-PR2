import { useEffect, useState, useCallback } from 'react'
import { Search, Trash2, ChevronDown } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import NodeModal from '../components/NodeModal.jsx'
import {
  listNodes, createNode, updateNodeLabels, updateNodeProps, deleteNode,
  deleteNodeProps, bulkDeleteNodes, bulkUpdateNodeProps, bulkDeleteNodeProps,
} from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const LABEL_OPTIONS = [
  'Numero', 'Persona', 'Operadora', 'Dispositivo',
  'Llamada', 'Mensaje', 'Reporte', 'Sospechoso',
]

function GestionNodosPage() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [labelFilter, setLabelFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [modalNode, setModalNode] = useState(undefined) // undefined = closed, null = create, object = edit
  const [bulkMenu, setBulkMenu] = useState(false)
  const [bulkAction, setBulkAction] = useState(null) // { type: 'addProp' | 'delProp' }
  const [bulkKey, setBulkKey] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkType, setBulkType] = useState('str')

  const fetchNodes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listNodes({ label: labelFilter || undefined })
      setNodes(data)
      setSelected(new Set())
    } catch (err) {
      toast('Error cargando nodos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [labelFilter])

  useEffect(() => { fetchNodes() }, [fetchNodes])

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredNodes.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredNodes.map((n) => n.id)))
    }
  }

  async function handleSaveNode({ labels, propiedades, id }) {
    try {
      if (id != null) {
        await updateNodeLabels(id, labels)
        await updateNodeProps(id, propiedades)
        toast('Nodo actualizado', 'success')
      } else {
        await createNode({ labels, propiedades })
        toast('Nodo creado', 'success')
      }
      setModalNode(undefined)
      fetchNodes()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar este nodo y todas sus relaciones?')) return
    try {
      await deleteNode(id)
      toast('Nodo eliminado', 'success')
      fetchNodes()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Eliminar ${selected.size} nodos y sus relaciones?`)) return
    try {
      await bulkDeleteNodes([...selected])
      toast(`${selected.size} nodos eliminados`, 'success')
      fetchNodes()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
    setBulkMenu(false)
  }

  function parseBulkValue(val, type) {
    if (type === 'bool') return val === 'true'
    if (type === 'num') return val === '' ? 0 : Number(val)
    return val
  }

  async function handleBulkAddProp() {
    if (!bulkKey.trim() || selected.size === 0) return
    try {
      const val = parseBulkValue(bulkValue, bulkType)
      await bulkUpdateNodeProps([...selected], { [bulkKey.trim()]: val })
      toast(`Propiedad "${bulkKey}" agregada/actualizada en ${selected.size} nodos`, 'success')
      setBulkAction(null)
      setBulkKey('')
      setBulkValue('')
      setBulkType('str')
      fetchNodes()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleBulkDeleteProp() {
    if (!bulkKey.trim() || selected.size === 0) return
    try {
      await bulkDeleteNodeProps([...selected], [bulkKey.trim()])
      toast(`Propiedad "${bulkKey}" eliminada de ${selected.size} nodos`, 'success')
      setBulkAction(null)
      setBulkKey('')
      fetchNodes()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  function getIdentifier(node) {
    const p = node.properties || {}
    return p.numero || p.nombre || p.imei || p.id_cdr || p.id_mensaje || p.id_reporte || `#${typeof node.id === 'object' ? node.id.low : node.id}`
  }

  function getScore(node) {
    const s = node.properties?.score_riesgo
    if (s == null) return null
    return typeof s === 'object' ? s.low : s
  }

  const filteredNodes = nodes.filter((n) => {
    if (!searchText) return true
    const id = getIdentifier(n).toLowerCase()
    const labels = (n.labels || []).join(' ').toLowerCase()
    return id.includes(searchText.toLowerCase()) || labels.includes(searchText.toLowerCase())
  })

  return (
    <AppShell
      title="Gestión de nodos"
      description="Crea, consulta, edita y elimina nodos del grafo — individual o en masa"
      actions={
        <>
          <div className="dropdown">
            <button className="button" onClick={() => setBulkMenu(!bulkMenu)} disabled={selected.size === 0}>
              Accion masiva ({selected.size}) <ChevronDown size={14} />
            </button>
            {bulkMenu && (
              <div className="dropdown-menu">
                <button onClick={handleBulkDelete}>
                  <Trash2 size={14} /> Eliminar seleccionados
                </button>
                <button onClick={() => { setBulkAction('addProp'); setBulkMenu(false) }}>
                  Agregar/Actualizar propiedad
                </button>
                <button onClick={() => { setBulkAction('delProp'); setBulkMenu(false) }}>
                  Eliminar propiedad
                </button>
              </div>
            )}
          </div>
          <button className="button primary" onClick={() => setModalNode(null)}>
            Nuevo nodo
          </button>
        </>
      }
    >
      {bulkAction && (
        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form" style={{ flex: 1, minWidth: 200 }}>
            <label>{bulkAction === 'addProp' ? 'Agregar/actualizar propiedad en' : 'Eliminar propiedad de'} {selected.size} nodo(s)</label>
            <input placeholder="Clave" value={bulkKey} onChange={(e) => setBulkKey(e.target.value)} />
            {bulkAction === 'addProp' && (
              <div style={{ display: 'flex', gap: 6 }}>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value)}
                  style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 6px', color: 'var(--text)', fontSize: 12, flexShrink: 0 }}
                >
                  <option value="str">str</option>
                  <option value="num">num</option>
                  <option value="bool">bool</option>
                </select>
                <input style={{ flex: 1 }} placeholder={bulkType === 'bool' ? 'true / false' : 'Valor'} value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
            <button className="button primary" onClick={bulkAction === 'addProp' ? handleBulkAddProp : handleBulkDeleteProp}>
              Aplicar
            </button>
            <button className="button" onClick={() => { setBulkAction(null); setBulkKey(''); setBulkValue(''); setBulkType('str') }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="panel-title">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              style={{
                background: 'var(--bg-soft)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
              }}
            >
              <option value="">Todos los labels</option>
              {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <div className="search">
              <Search size={16} />
              <input
                placeholder="Filtrar por nombre, numero, IMEI..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </div>
          <span className="pill">{filteredNodes.length} registros</span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner lg" style={{ margin: '0 auto' }} /></div>
        ) : filteredNodes.length === 0 ? (
          <div className="empty-state">
            <h3>Sin nodos</h3>
            <p>No se encontraron nodos con los filtros actuales</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" className="checkbox" checked={selected.size === filteredNodes.length && filteredNodes.length > 0} onChange={toggleAll} /></th>
                <th>ID Neo4j</th>
                <th>Label(s)</th>
                <th>Identificador</th>
                <th>Score</th>
                <th>Props</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node) => {
                const nid = typeof node.id === 'object' ? node.id.low : node.id
                const score = getScore(node)
                const propCount = Object.keys(node.properties || {}).length
                return (
                  <tr key={nid}>
                    <td>
                      <input type="checkbox" className="checkbox" checked={selected.has(nid)} onChange={() => toggleSelect(nid)} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }} title="Usa este ID en Gestión de Relaciones">
                      {nid}
                    </td>
                    <td>
                      {(node.labels || []).map((l) => (
                        <span key={l} className={`badge ${l === 'Sospechoso' ? 'high' : 'info'}`} style={{ marginRight: 4 }}>
                          {l}
                        </span>
                      ))}
                    </td>
                    <td>{getIdentifier(node)}</td>
                    <td>
                      {score != null ? (
                        <span className={score >= 0.7 ? 'badge high' : score >= 0.4 ? 'badge mid' : 'badge low'}>
                          {score.toFixed(2)}
                        </span>
                      ) : '—'}
                    </td>
                    <td><span className="pill">{propCount} props</span></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="button sm" onClick={() => setModalNode({ ...node, id: nid })}>
                        Editar
                      </button>
                      <button className="button sm danger" onClick={() => handleDelete(nid)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalNode !== undefined && (
        <NodeModal
          node={modalNode}
          onClose={() => setModalNode(undefined)}
          onSave={handleSaveNode}
        />
      )}
    </AppShell>
  )
}

export default GestionNodosPage
