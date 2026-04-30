import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

let _addToast = () => {}

export function toast(message, type = 'info') {
  _addToast({ message, type, id: Date.now() })
}

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
}

export default function ToastContainer() {
  const [items, setItems] = useState([])

  useEffect(() => {
    _addToast = (item) => {
      setItems((prev) => [...prev, item])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id))
      }, 4000)
    }
    return () => { _addToast = () => {} }
  }, [])

  if (!items.length) return null

  return (
    <div className="toast-container">
      {items.map((item) => {
        const Icon = ICONS[item.type] || Info
        return (
          <div key={item.id} className={`toast ${item.type}`}>
            <Icon size={16} />
            <span style={{ flex: 1 }}>{item.message}</span>
            <button
              onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
