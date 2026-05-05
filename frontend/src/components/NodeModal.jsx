import { useState } from 'react'
import { X, Plus, Trash2, Tag, Settings2 } from 'lucide-react'

const ALL_LABELS = [
  'Numero', 'Persona', 'Operadora', 'Dispositivo',
  'Llamada', 'Mensaje', 'Reporte',
  'Sospechoso', 'Bloqueado', 'Verificado',
]

const TYPE_COLORS = { bool: '#8b5cf6', num: '#3b82f6', str: 'var(--text-muted)' }

function inferType(value) {
  if (typeof value === 'boolean') return 'bool'
  if (typeof value === 'number') return 'num'
  return 'str'
}

export default function NodeModal({ node, onClose, onSave }) {
  const isEdit = Boolean(node)

  const [labels, setLabels] = useState(isEdit ? (node.labels || []) : ['Numero'])
  const [props, setProps] = useState(() => {
    if (!isEdit) return [{ key: '', value: '', type: 'str' }]
    const entries = Object.entries(node.properties || {})
    return entries.length
      ? entries.map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          type: inferType(value),
        }))
      : [{ key: '', value: '', type: 'str' }]
  })

  function toggleLabel(label) {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function addProp() { setProps((prev) => [...prev, { key: '', value: '', type: 'str' }]) }
  function removeProp(index) { setProps((prev) => prev.filter((_, i) => i !== index)) }
  function updateProp(index, field, val) {
    setProps((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)))
  }

  function parseValue(val, type) {
    if (type === 'bool') return val === 'true'
    if (type === 'num') return val === '' ? 0 : Number(val)
    return val
  }

  function handleSubmit(e) {
    e.preventDefault()
    const propiedades = {}
    for (const p of props) {
      if (p.key.trim()) propiedades[p.key.trim()] = parseValue(p.value, p.type)
    }
    onSave({ labels, propiedades, id: node?.id })
  }

  const filledProps = props.filter((p) => p.key.trim()).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0 }}>{isEdit ? 'Editar nodo' : 'Nuevo nodo'}</h2>
            {isEdit && node?.id != null && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'monospace' }}>
                ID Neo4j: {node.id}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">

          {/* Labels section */}
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Tag size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Labels ({labels.length} seleccionado{labels.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_LABELS.map((l) => {
                const active = labels.includes(l)
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggleLabel(l)}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 6,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                      color: active ? 'var(--accent-strong)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {active ? '✓ ' : ''}{l}
                  </button>
                )
              })}
            </div>
            {labels.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
                Selecciona al menos un label
              </div>
            )}
          </div>

          {/* Properties section */}
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings2 size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Propiedades ({filledProps})
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                true/false → bool · números → int/float · ["a","b"] → lista
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {props.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    placeholder="clave"
                    value={p.key}
                    onChange={(e) => updateProp(i, 'key', e.target.value)}
                    style={{ flex: '0 0 130px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12 }}
                  />
                  <select
                    value={p.type}
                    onChange={(e) => updateProp(i, 'type', e.target.value)}
                    style={{
                      flex: '0 0 56px', background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '7px 4px', color: TYPE_COLORS[p.type] || 'var(--text-muted)',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <option value="str">str</option>
                    <option value="num">num</option>
                    <option value="bool">bool</option>
                  </select>
                  <input
                    placeholder={p.type === 'bool' ? 'true / false' : 'valor'}
                    value={p.value}
                    onChange={(e) => updateProp(i, 'value', e.target.value)}
                    style={{ flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() => removeProp(i)}
                    style={{ background: 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'transparent' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addProp}
              style={{ marginTop: 10, background: 'transparent', border: '1px dashed var(--border)', borderRadius: 6, padding: '7px 14px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
            >
              <Plus size={13} /> Agregar propiedad
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary" disabled={labels.length === 0}>
              {isEdit ? 'Guardar cambios' : `Crear nodo`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
