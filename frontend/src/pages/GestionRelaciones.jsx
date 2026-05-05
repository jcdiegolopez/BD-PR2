import { useEffect, useState, useCallback } from 'react'
import { Search, Trash2, ChevronDown } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import RelationModal from '../components/RelationModal.jsx'
import {
  listRelations, createRelation, updateRelationProps, deleteRelationProps,
  deleteRelation, bulkDeleteRelations, bulkUpdateRelationProps, bulkDeleteRelationProps,
} from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const RELATION_TYPES = [
  'ORIGINO', 'DIRIGIDA_A', 'ENVIO', 'RECIBIDO_POR', 'ES_TITULAR_DE',
  'PERTENECE_A', 'USO_NUMERO', 'REALIZO_REPORTE', 'INVOLUCRA_NUMERO',
  'GENERO', 'CONTACTO_FRECUENTE', 'VICTIMA_DE',
]

function GestionRelacionesPage() {
  const [relations, setRelations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipoFilter, setTipoFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [editRel, setEditRel] = useState(null)
  const [bulkMenu, setBulkMenu] = useState(false)
  const [bulkAction, setBulkAction] = useState(null)
  const [bulkKey, setBulkKey] = useState('')
  const [bulkValue, setBulkValue] = useState('')

  // Create form state
  const [createForm, setCreateForm] = useState({
    origenId: '',
    destinoId: '',
    tipo: 'CONTACTO_FRECUENTE',
    props: [{ key: '', value: '' }],
  })

  const fetchRelations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listRelations({ tipo: tipoFilter || undefined })
      setRelations(data)
      setSelected(new Set())
    } catch (err) {
      toast('Error cargando relaciones: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [tipoFilter])

  useEffect(() => { fetchRelations() }, [fetchRelations])

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === relations.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(relations.map((r) => (r.id != null && typeof r.id === 'object') ? r.id.low : r.id)))
    }
  }

  function parseValue(val) {
    if (val === 'true') return true
    if (val === 'false') return false
    if (val !== '' && !isNaN(Number(val))) return Number(val)
    return val
  }

  async function handleCreate(e) {
    e.preventDefault()
    const propiedades = {}
    for (const p of createForm.props) {
      if (p.key.trim()) {
        propiedades[p.key.trim()] = parseValue(p.value)
      }
    }
    try {
      await createRelation({
        origenId: Number(createForm.origenId),
        destinoId: Number(createForm.destinoId),
        tipo: createForm.tipo,
        propiedades,
      })
      toast('Relacion creada', 'success')
      setCreateForm({ origenId: '', destinoId: '', tipo: 'CONTACTO_FRECUENTE', props: [{ key: '', value: '' }] })
      fetchRelations()
    } catch (err) {
      toast('Error: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  async function handleSaveEdit({ id, propiedades, removedKeys }) {
    try {
      if (removedKeys?.length) {
        await deleteRelationProps(id, removedKeys)
      }
      if (Object.keys(propiedades).length) {
        await updateRelationProps(id, propiedades)
      }
      toast('Relacion actualizada', 'success')
      setEditRel(null)
      fetchRelations()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Eliminar esta relacion?')) return
    try {
      await deleteRelation(id)
      toast('Relacion eliminada', 'success')
      fetchRelations()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Eliminar ${selected.size} relaciones?`)) return
    try {
      await bulkDeleteRelations([...selected])
      toast(`${selected.size} relaciones eliminadas`, 'success')
      fetchRelations()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
    setBulkMenu(false)
  }

  async function handleBulkAddProp() {
    if (!bulkKey.trim() || selected.size === 0) return
    try {
      await bulkUpdateRelationProps([...selected], { [bulkKey.trim()]: parseValue(bulkValue) })
      toast(`Propiedad "${bulkKey}" aplicada a ${selected.size} relaciones`, 'success')
      setBulkAction(null)
      setBulkKey('')
      setBulkValue('')
      fetchRelations()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  async function handleBulkDeleteProp() {
    if (!bulkKey.trim() || selected.size === 0) return
    try {
      await bulkDeleteRelationProps([...selected], [bulkKey.trim()])
      toast(`Propiedad "${bulkKey}" eliminada de ${selected.size} relaciones`, 'success')
      setBulkAction(null)
      setBulkKey('')
      fetchRelations()
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
  }

  function addCreateProp() {
    setCreateForm((prev) => ({ ...prev, props: [...prev.props, { key: '', value: '' }] }))
  }

  function updateCreateProp(index, field, val) {
    setCreateForm((prev) => ({
      ...prev,
      props: prev.props.map((p, i) => (i === index ? { ...p, [field]: val } : p)),
    }))
  }

  function getNodeLabel(rel, side) {
    const labels = rel[`${side}Labels`] || []
    const props = rel[`${side}Props`] || {}
    const name = props.numero || props.nombre || props.imei || props.id_cdr || props.id_mensaje || props.id_reporte || ''
    const rawId = rel[`${side}Id`]
    const id = (rawId != null && typeof rawId === 'object') ? rawId.low : rawId
    return name ? `${name}` : `#${id}`
  }

  function formatProps(props) {
    if (!props || !Object.keys(props).length) return '—'
    return Object.entries(props).slice(0, 3).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
  }

  return (
    <AppShell
      title="Gestión de relaciones"
      description="Crea relaciones entre nodos existentes y gestiona sus propiedades"
      actions={
        <div className="dropdown">
          <button className="button" onClick={() => setBulkMenu(!bulkMenu)} disabled={selected.size === 0}>
            Accion masiva ({selected.size}) <ChevronDown size={14} />
          </button>
          {bulkMenu && (
            <div className="dropdown-menu">
              <button onClick={handleBulkDelete}>
                <Trash2 size={14} /> Eliminar seleccionadas
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
      }
    >
      {bulkAction && (
        <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form" style={{ flex: 1, minWidth: 200 }}>
            <label>{bulkAction === 'addProp' ? 'Agregar/actualizar propiedad en' : 'Eliminar propiedad de'} {selected.size} relacion(es)</label>
            <input placeholder="Clave" value={bulkKey} onChange={(e) => setBulkKey(e.target.value)} />
            {bulkAction === 'addProp' && (
              <input placeholder="Valor" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 2 }}>
            <button className="button primary" onClick={bulkAction === 'addProp' ? handleBulkAddProp : handleBulkDeleteProp}>Aplicar</button>
            <button className="button" onClick={() => { setBulkAction(null); setBulkKey(''); setBulkValue('') }}>Cancelar</button>
          </div>
        </div>
      )}

      <section className="grid">
        <div className="card" style={{ gridColumn: 'span 4' }}>
          <h3>Nueva relación</h3>
          <p className="hint" style={{ marginBottom: 12 }}>
            Obtén el ID de un nodo desde la tabla de la derecha o desde Gestión de Nodos.
          </p>
          <form className="form" onSubmit={handleCreate}>
            <label>ID nodo origen</label>
            <input
              placeholder="Ej: 12345"
              value={createForm.origenId}
              onChange={(e) => setCreateForm((p) => ({ ...p, origenId: e.target.value }))}
              required
            />
            <label>Tipo</label>
            <select
              value={createForm.tipo}
              onChange={(e) => setCreateForm((p) => ({ ...p, tipo: e.target.value }))}
            >
              {RELATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label>ID nodo destino</label>
            <input
              placeholder="Ej: 67890"
              value={createForm.destinoId}
              onChange={(e) => setCreateForm((p) => ({ ...p, destinoId: e.target.value }))}
              required
            />
            <label>Propiedades</label>
            {createForm.props.map((p, i) => (
              <div key={i} className="prop-row">
                <input placeholder="clave" value={p.key} onChange={(e) => updateCreateProp(i, 'key', e.target.value)} />
                <input placeholder="valor" value={p.value} onChange={(e) => updateCreateProp(i, 'value', e.target.value)} />
              </div>
            ))}
            <button type="button" className="button sm" onClick={addCreateProp}>+ Propiedad</button>
            <button type="submit" className="button primary">Crear</button>
          </form>
        </div>

        <div className="card" style={{ gridColumn: 'span 8' }}>
          <div className="panel-title">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                style={{
                  background: 'var(--bg-soft)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: 14,
                }}
              >
                <option value="">Todas</option>
                {RELATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <span className="pill">{relations.length} relaciones</span>
            </div>
          </div>

          {loading ? (
            <div className="empty-state"><div className="spinner lg" style={{ margin: '0 auto' }} /></div>
          ) : relations.length === 0 ? (
            <div className="empty-state">
              <h3>Sin relaciones</h3>
              <p>No se encontraron relaciones con los filtros actuales</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th><input type="checkbox" className="checkbox" checked={selected.size === relations.length && relations.length > 0} onChange={toggleAll} /></th>
                  <th>ID rel.</th>
                  <th>Tipo</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Props</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {relations.map((rel) => {
                  const rid = (rel.id != null && typeof rel.id === 'object') ? rel.id.low : rel.id
                  return (
                    <tr key={rid}>
                      <td><input type="checkbox" className="checkbox" checked={selected.has(rid)} onChange={() => toggleSelect(rid)} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}>{rid}</td>
                      <td><span className="badge info">{rel.tipo}</span></td>
                      <td>{getNodeLabel(rel, 'origen')}</td>
                      <td>{getNodeLabel(rel, 'destino')}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {formatProps(rel.properties)}
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="button sm" onClick={() => setEditRel({ ...rel, id: rid })}>Editar</button>
                        <button className="button sm danger" onClick={() => handleDelete(rid)}>
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
      </section>

      {editRel && (
        <RelationModal
          relation={editRel}
          onClose={() => setEditRel(null)}
          onSave={handleSaveEdit}
        />
      )}
    </AppShell>
  )
}

export default GestionRelacionesPage
