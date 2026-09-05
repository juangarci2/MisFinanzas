import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, Moon, Sun, BarChart3, Users, LogOut } from 'lucide-react'
import { useDarkMode } from '../context/DarkMode'
import { useAuth } from '../context/Auth'

const links = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { id: 'presupuestos', label: 'Presupuestos', icon: Target },
  { id: 'deudas', label: 'Ahorros', icon: PiggyBank },
  { id: 'personales', label: 'Deudas', icon: Users },
  { id: 'patrimonio', label: 'Patrimonio', icon: BarChart3 },
]

export default function Sidebar({ current, onNavigate }) {
  const { dark, toggle } = useDarkMode()
  const { user, signOut } = useAuth()

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-slate-900 flex-col shrink-0">
        <div className="px-6 py-6 border-b border-slate-700">
          <h1 className="text-white font-bold text-lg tracking-tight">💰 MisFinanzas</h1>
          <p className="text-slate-500 text-xs mt-1 truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                current === id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon size={18} />{label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-slate-700 space-y-1">
          <button onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-colors">
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ── */}
      <header className="md:hidden bg-slate-900 px-4 py-3 flex items-center justify-between shrink-0 border-b border-slate-700">
        <h1 className="text-white font-bold text-base">💰 MisFinanzas</h1>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={signOut} className="text-slate-400 hover:text-red-400 p-2 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex z-50">
        {links.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              current === id ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
