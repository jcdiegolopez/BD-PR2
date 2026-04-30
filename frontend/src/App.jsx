import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from './pages/Dashboard.jsx'
import GrafoExplorerPage from './pages/GrafoExplorer.jsx'
import GestionNodosPage from './pages/GestionNodos.jsx'
import GestionRelacionesPage from './pages/GestionRelaciones.jsx'
import SimuladorPage from './pages/Simulador.jsx'
import ToastContainer from './components/Toast.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/grafo" element={<GrafoExplorerPage />} />
        <Route path="/nodos" element={<GestionNodosPage />} />
        <Route path="/relaciones" element={<GestionRelacionesPage />} />
        <Route path="/simulador" element={<SimuladorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
