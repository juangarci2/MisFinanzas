import { useState } from 'react'
import { DarkModeProvider } from './context/DarkMode'
import { AuthProvider, useAuth } from './context/Auth'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Resumen from './pages/Resumen'
import Transacciones from './pages/Transacciones'
import Presupuestos from './pages/Presupuestos'
import DeudasAhorros from './pages/DeudasAhorros'
import Patrimonio from './pages/Patrimonio'
import DeudasPersonales from './pages/DeudasPersonales'

const pages = {
  resumen: Resumen,
  transacciones: Transacciones,
  presupuestos: Presupuestos,
  deudas: DeudasAhorros,
  patrimonio: Patrimonio,
  personales: DeudasPersonales,
}

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('resumen')
  const PageComponent = pages[page]

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400 text-sm">Cargando...</p>
    </div>
  )

  if (!user) return <Login />

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-3 md:p-8 pb-24 md:pb-8">
        <PageComponent />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DarkModeProvider>
        <AppContent />
      </DarkModeProvider>
    </AuthProvider>
  )
}
