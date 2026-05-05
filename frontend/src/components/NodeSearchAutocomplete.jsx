import { useState, useEffect, useRef } from 'react'
import { searchNodes } from '../lib/api'

export default function NodeSearchAutocomplete({ label, value, onChange, placeholder }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  // Initialize or update query when value prop changes (e.g. form reset)
  useEffect(() => {
    if (!value) {
      setQuery('')
    } else if (value && typeof value === 'string' && !query) {
       // Just to show the ID if it's prefilled, though normally it's set by clicking
       setQuery(value)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Only search if the query doesn't exactly match the selected value's ID
    if (query === value) return

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchNodes(query, label)
        setResults(data)
        setIsOpen(true)
      } catch (err) {
        console.error('Error buscando nodos:', err)
      } finally {
        setLoading(false)
      }
    }, 400) // Debounce 400ms

    return () => clearTimeout(delayDebounceFn)
  }, [query, label, value])

  function handleSelect(node) {
    const rawId = node.id
    const id = (rawId != null && typeof rawId === 'object') ? rawId.low : rawId
    const props = node.properties || {}
    const name = props.numero || props.nombre || props.imei || props.id_cdr || props.id_mensaje || props.id_reporte || id
    
    setQuery(String(name))
    onChange(String(id))
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder || `Buscar ${label || 'nodo'}...`}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange('') // Clear value when typing
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true)
        }}
        style={{ width: '100%' }}
      />
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 200,
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {loading ? (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
               <div className="spinner sm" style={{ margin: '0 auto' }} />
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
              No se encontraron resultados
            </div>
          ) : (
            results.map((node) => {
              const rawId = node.id
              const id = (rawId != null && typeof rawId === 'object') ? rawId.low : rawId
              const props = node.properties || {}
              const name = props.numero || props.nombre || props.imei || props.id_cdr || props.id_mensaje || props.id_reporte || ''
              
              return (
                <div
                  key={id}
                  onClick={() => handleSelect(node)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-soft)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{name || 'Sin nombre'}</strong>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>#{id}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 4 }}>
                    {node.labels?.map(l => <span key={l} className="badge info">{l}</span>)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
