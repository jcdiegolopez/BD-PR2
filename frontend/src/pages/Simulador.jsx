import { useState } from 'react'
import { Upload, Database, AlertTriangle, Copy } from 'lucide-react'

const BASE_URL = 'http://localhost:4000'

const CSV_SAMPLES = [
  { entidad: 'Numero',      url: `${BASE_URL}/csv-samples/numeros.csv`,      nota: 'Crea nodos Numero (sin dependencias)' },
  { entidad: 'Persona',     url: `${BASE_URL}/csv-samples/personas.csv`,     nota: 'Crea nodos Persona (sin dependencias)' },
  { entidad: 'Operadora',   url: `${BASE_URL}/csv-samples/operadoras.csv`,   nota: 'Crea nodos Operadora (sin dependencias)' },
  { entidad: 'Dispositivo', url: `${BASE_URL}/csv-samples/dispositivos.csv`, nota: 'Crea nodos Dispositivo (sin dependencias)' },
  { entidad: 'Llamada',     url: `${BASE_URL}/csv-samples/llamadas.csv`,     nota: 'Requiere numeros.csv cargado primero' },
  { entidad: 'Mensaje',     url: `${BASE_URL}/csv-samples/mensajes.csv`,     nota: 'Requiere numeros.csv cargado primero' },
  { entidad: 'Reporte',     url: `${BASE_URL}/csv-samples/reportes.csv`,     nota: 'Requiere numeros.csv y personas.csv cargados' },
]
import AppShell from '../components/AppShell.jsx'
import { runSimulador, cargarCsv } from '../lib/api.js'
import { toast } from '../components/Toast.jsx'

const ENTIDADES = ['Numero', 'Persona', 'Operadora', 'Dispositivo', 'Llamada', 'Mensaje', 'Reporte']

function SimuladorPage() {
  // CSV state
  const [csvUrl, setCsvUrl] = useState('')
  const [csvEntidad, setCsvEntidad] = useState('Numero')
  const [csvLoading, setCsvLoading] = useState(false)

  // Generator state
  const [genForm, setGenForm] = useState({
    operadoras: '4',
    personas: '400',
    numeros: '500',
    dispositivos: '300',
    llamadas: '2500',
    mensajes: '1500',
    reportes: '300',
    inyectarFraude: true,
    fraudeRatio: '0.25',
  })
  const [genLoading, setGenLoading] = useState(false)

  // Log
  const [log, setLog] = useState([])

  function addLog(msg, type = 'info') {
    setLog((prev) => [...prev, { msg, type, time: new Date().toLocaleTimeString() }])
  }

  async function handleCsv(e) {
    e.preventDefault()
    if (!csvUrl.trim()) return
    setCsvLoading(true)
    addLog(`Cargando CSV para ${csvEntidad}...`)
    try {
      const result = await cargarCsv({ csvUrl: csvUrl.trim(), entidad: csvEntidad })
      const total = result?.total ?? '?'
      addLog(`CSV cargado exitosamente: ${total} nodos de tipo ${csvEntidad}`, 'success')
      toast(`CSV de ${csvEntidad} cargado (${total} registros)`, 'success')
      setCsvUrl('')
    } catch (err) {
      addLog(`Error: ${err.response?.data?.error || err.message}`, 'error')
      toast('Error al cargar CSV: ' + err.message, 'error')
    } finally {
      setCsvLoading(false)
    }
  }

  async function handleGenerar(e) {
    e.preventDefault()
    setGenLoading(true)
    addLog('Iniciando generacion de dataset...')
    addLog(`Configuracion: ${genForm.personas} personas, ${genForm.numeros} numeros, ${genForm.llamadas} llamadas, ${genForm.mensajes} mensajes`)

    if (genForm.inyectarFraude) {
      addLog('Inyeccion de fraude activada — se crearan patrones sospechosos', 'info')
    }

    try {
      const result = await runSimulador({
        operadoras: Number(genForm.operadoras),
        personas: Number(genForm.personas),
        numeros: Number(genForm.numeros),
        dispositivos: Number(genForm.dispositivos),
        llamadas: Number(genForm.llamadas),
        mensajes: Number(genForm.mensajes),
        reportes: Number(genForm.reportes),
        inyectarFraude: genForm.inyectarFraude,
        fraudeRatio: Number(genForm.fraudeRatio),
      })

      if (result.operadoras) addLog(`Operadoras creadas: ${result.operadoras}`, 'success')
      if (result.personas) addLog(`Personas creadas: ${result.personas}`, 'success')
      if (result.numeros) addLog(`Numeros creados: ${result.numeros}`, 'success')
      if (result.dispositivos) addLog(`Dispositivos creados: ${result.dispositivos}`, 'success')
      if (result.llamadas) addLog(`Llamadas creadas: ${result.llamadas}`, 'success')
      if (result.mensajes) addLog(`Mensajes creados: ${result.mensajes}`, 'success')
      if (result.reportes) addLog(`Reportes creados: ${result.reportes}`, 'success')
      if (result.relaciones) addLog(`Relaciones creadas: ${result.relaciones}`, 'success')
      if (result.fraude) addLog(`Patrones de fraude inyectados: ${result.fraude}`, 'success')

      const total = Object.values(result).reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0)
      addLog(`Generacion completa — ${total} entidades creadas`, 'success')
      toast(`Dataset generado: ${total} entidades`, 'success')
    } catch (err) {
      addLog(`Error: ${err.response?.data?.detalle || err.message}`, 'error')
      toast('Error generando dataset: ' + err.message, 'error')
    } finally {
      setGenLoading(false)
    }
  }

  function updateGen(field, value) {
    setGenForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <AppShell title="Simulador y carga de datos" description="Genera datasets sintéticos o carga nodos desde archivos CSV">
      <section className="grid">
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h3><Upload size={16} style={{ marginRight: 8 }} />Cargar CSV</h3>
          <form className="form" onSubmit={handleCsv}>
            <label>URL del CSV (accesible por Neo4j)</label>
            <input
              placeholder="http://localhost:4000/csv-samples/numeros.csv"
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              required
            />
            <label>Entidad</label>
            <select value={csvEntidad} onChange={(e) => setCsvEntidad(e.target.value)}>
              {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <button type="submit" className="button primary" disabled={csvLoading}>
              {csvLoading ? <><span className="spinner" /> Cargando...</> : <><Upload size={14} /> Cargar</>}
            </button>
          </form>

          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
              CSVs de muestra incluidos — clic para cargar:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CSV_SAMPLES.map(({ entidad, url, nota }) => (
                <div key={entidad} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button sm"
                    title={nota}
                    onClick={() => { setCsvUrl(url); setCsvEntidad(entidad) }}
                    style={{ minWidth: 90, fontSize: 11 }}
                  >
                    <Copy size={10} style={{ marginRight: 4 }} />{entidad}
                  </button>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nota}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h3><Database size={16} style={{ marginRight: 8 }} />Generar dataset sintetico</h3>
          <form className="form" onSubmit={handleGenerar}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Operadoras</label>
                <input value={genForm.operadoras} onChange={(e) => updateGen('operadoras', e.target.value)} />
              </div>
              <div>
                <label>Personas</label>
                <input value={genForm.personas} onChange={(e) => updateGen('personas', e.target.value)} />
              </div>
              <div>
                <label>Numeros</label>
                <input value={genForm.numeros} onChange={(e) => updateGen('numeros', e.target.value)} />
              </div>
              <div>
                <label>Dispositivos</label>
                <input value={genForm.dispositivos} onChange={(e) => updateGen('dispositivos', e.target.value)} />
              </div>
              <div>
                <label>Llamadas</label>
                <input value={genForm.llamadas} onChange={(e) => updateGen('llamadas', e.target.value)} />
              </div>
              <div>
                <label>Mensajes</label>
                <input value={genForm.mensajes} onChange={(e) => updateGen('mensajes', e.target.value)} />
              </div>
              <div>
                <label>Reportes</label>
                <input value={genForm.reportes} onChange={(e) => updateGen('reportes', e.target.value)} />
              </div>
              <div>
                <label>Ratio fraude</label>
                <input value={genForm.fraudeRatio} onChange={(e) => updateGen('fraudeRatio', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={genForm.inyectarFraude}
                onChange={(e) => updateGen('inyectarFraude', e.target.checked)}
              />
              <label style={{ margin: 0 }}>
                <AlertTriangle size={14} style={{ marginRight: 4 }} />
                Inyectar patrones de fraude
              </label>
            </div>
            <button type="submit" className="button primary" disabled={genLoading}>
              {genLoading ? <><span className="spinner" /> Generando...</> : <><Database size={14} /> Generar</>}
            </button>
          </form>
        </div>

        <div className="card" style={{ gridColumn: 'span 12' }}>
          <div className="panel-title">
            <h3>Log de operaciones</h3>
            {log.length > 0 && (
              <button className="button sm" onClick={() => setLog([])}>Limpiar</button>
            )}
          </div>
          <div className="log-output">
            {log.length === 0 ? (
              <span>Esperando operaciones...</span>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={`log-line ${entry.type}`}>
                  [{entry.time}] {entry.msg}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </AppShell>
  )
}

export default SimuladorPage
