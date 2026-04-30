import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

const ALL_LABELS = [
  'Numero', 'Persona', 'Operadora', 'Dispositivo',
  'Llamada', 'Mensaje', 'Reporte',
  'Sospechoso', 'Bloqueado', 'Verificado',
]

export default function NodeModal({ node, onClose, onSave }) {
  const isEdit = Boolean(node)

  const [labels, setLabels] = useState(
    isEdit ? (node.labels || []) : ['Numero']
  )
  const [props, setProps] = useState(() => {
    if (!isEdit) return [{ key: '', value: '' }]
    const entries = Object.entries(node.properties || {})
    return entries.length ? entries.map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    })) : [{ key: '', value: '' }]
  })

  function toggleLabel(label) {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

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
    const propiedades = {}
    for (const p of props) {
      if (p.key.trim()) {
        propiedades[p.key.trim()] = parseValue(p.value)
      }
    }
    onSave({ labels, propiedades, id: node?.id })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2>{isEdit ? 'Editar nodo' : 'Nuevo nodo'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>Labels</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                className={`button sm ${labels.includes(l) ? 'primary' : ''}`}
                onClick={() => toggleLabel(l)}
              >
                {l}
              </button>
            ))}
          </div>

          <label style={{ marginTop: 8 }}>Propiedades</label>
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
            <button type="submit" className="button primary" disabled={labels.length === 0}>
              {isEdit ? 'Guardar cambios' : 'Crear nodo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
