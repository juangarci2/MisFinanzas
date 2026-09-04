import { useState } from 'react'
import { DarkModeProvider } from './context/DarkMode'
import Sidebar from './components/Sidebar'
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

export default function App() {
  const [page, setPage] = useState('resumen')
  const PageComponent = pages[page]

  return (
    <DarkModeProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <Sidebar current={page} onNavigate={setPage} />
        <main className="flex-1 overflow-y-auto p-8">
          <PageComponent />
        </main>
      </div>
    </DarkModeProvider>
  )
}
