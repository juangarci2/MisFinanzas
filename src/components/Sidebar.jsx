import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, Moon, Sun, BarChart3, Users } from 'lucide-react'
import { useDarkMode } from '../context/DarkMode'

const links = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'transacciones', label: 'Transacciones', icon: ArrowLeftRight },
  { id: 'presupuestos', label: 'Presupuestos', icon: Target },
  { id: 'deudas', label: 'Deudas y ahorros', icon: PiggyBank },
  { id: 'personales', label: 'Deudas personales', icon: Users },
  { id: 'patrimonio', label: 'Patrimonio neto', icon: BarChart3 },
]

export default function Sidebar({ current, onNavigate }) {
  const { dark, toggle } = useDarkMode()

  return (
    <aside className="w-56 bg-slate-900 flex flex-col shrink-0">
      <div className="px-6 py-6 border-b border-slate-700">
        <h1 className="text-white font-bold text-lg tracking-tight">💰 MisFinanzas</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              current === id
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {dark ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
    </aside>
  )
}
