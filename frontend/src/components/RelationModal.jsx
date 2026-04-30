import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

export default function RelationModal({ relation, onClose, onSave }) {
  const [props, setProps] = useState(() => {
    const entries = Object.entries(relation?.properties || {})
    return entries.length
      ? entries.map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        }))
      : [{ key: '', value: '' }]
  })

  function addProp() {
    setProps((prev) => [...prev, { key: '', value: '' }])
  }

  function removeProp(index) {
    setProps((prev) => prev.filter((_, i) => i !== index))
  }

  function updateProp(index, field, val) {
    setProps((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    )
  }

  function parseValue(val) {
    if (val === 'true') return true
    if (val === 'false') return false
    if (val !== '' && !isNaN(Number(val))) return Number(val)
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
    } catch { /* not JSON */ }
    return val
  }

  function handleSubmit(e) {
    e.preventDefault()
    const existingKeys = Object.keys(relation?.properties || {})
    const newProps = {}
    const keepKeys = []

    for (const p of props) {
      if (p.key.trim()) {
        newProps[p.key.trim()] = parseValue(p.value)
        keepKeys.push(p.key.trim())
      }
    }

    const removedKeys = existingKeys.filter((k) => !keepKeys.includes(k))
    onSave({ id: relation.id, propiedades: newProps, removedKeys })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>Editar relacion</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span className="badge info">{relation?.tipo}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 10 }}>
            #{relation?.origenId} → #{relation?.destinoId}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>Propiedades</label>
          {props.map((p, i) => (
            <div key={i} className="prop-row">
              <input
                placeholder="clave"
                value={p.key}
                onChange={(e) => updateProp(i, 'key', e.target.value)}
              />
              <input
                placeholder="valor"
                value={p.value}
                onChange={(e) => updateProp(i, 'value', e.target.value)}
              />
              <button type="button" className="button sm danger" onClick={() => removeProp(i)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="button sm" onClick={addProp}>
            <Plus size={14} /> Agregar propiedad
          </button>

          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  )
}
