import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/Auth'
import { useCategories } from '../hooks/useCategories'
import { Plus, Trash2, AlertTriangle, AlertCircle, Tag, X } from 'lucide-react'

export default function Presupuestos() {
  const [budgets, setBudgets] = useState([])
  const [spent, setSpent] = useState({})
  const [annualSpent, setAnnualSpent] = useState({})
  const [form, setForm] = useState({ category: 'Alimentación', customCategory: '', monthly_limit: '' })
  const { user } = useAuth()
  const { allCategories, customCategories, addCategory, deleteCategory } = useCategories()
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState('mensual')
  const [newCatInput, setNewCatInput] = useState('')
  const [showCatManager, setShowCatManager] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data: b } = await supabase.from('budgets').select('*').order('category')
    setBudgets(b || [])

    const now = new Date()
    // Mensual
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data: t } = await supabase.from('transactions').select('category, amount').eq('type', 'gasto').gte('date', firstDay).lte('date', lastDay)
    setSpent((t || []).reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount); return acc }, {}))

    // Anual
    const firstYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const lastYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
    const { data: ta } = await supabase.from('transactions').select('category, amount').eq('type', 'gasto').gte('date', firstYear).lte('date', lastYear)
    setAnnualSpent((ta || []).reduce((acc, tx) => { acc[tx.category] = (acc[tx.category] || 0) + Number(tx.amount); return acc }, {}))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.monthly_limit) return
    setSaving(true)
    const category = form.category
    await supabase.from('budgets').upsert([{ category, monthly_limit: parseFloat(form.monthly_limit), user_id: user.id }], { onConflict: 'category' })
    setForm({ category: 'Alimentación', customCategory: '', monthly_limit: '' })
    await fetchAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('budgets').delete().eq('id', id)
    setBudgets(prev => prev.filter(b => b.id !== id))
  }

  const currentMonth = new Date().toLocaleString('es', { month: 'long' })
  const currentYear = new Date().getFullYear()
  const monthsElapsed = new Date().getMonth() + 1

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Presupuestos</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Límites de gasto por categoría</p>
        </div>
        <button onClick={() => setShowCatManager(v => !v)}
          className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
          <Tag size={15} /> Gestionar categorías
        </button>
      </div>

      {/* Gestor de categorías */}
      {showCatManager && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mis categorías personalizadas</h3>
          <div className="flex gap-2">
            <input type="text" placeholder="Nueva categoría..." value={newCatInput}
              onChange={e => setNewCatInput(e.target.value)}
              onKeyDown={async e => { if (e.key === 'Enter') { e.preventDefault(); const ok = await addCategory(newCatInput); if (ok) setNewCatInput('') }}}
              className="flex-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button onClick={async () => { const ok = await addCategory(newCatInput); if (ok) setNewCatInput('') }}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={15} /> Añadir
            </button>
          </div>
          {customCategories.length === 0 ? (
            <p className="text-xs text-slate-400">Sin categorías personalizadas. Las predeterminadas son: {['Alimentación','Transporte','Ocio','Salud','Hogar','Ropa','Educación'].join(', ')}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customCategories.map(cat => (
                <span key={cat} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-sm">
                  {cat}
                  <button onClick={() => deleteCategory(cat)} className="text-slate-400 hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, customCategory: '' })}
            className="flex-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {allCategories.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" step="0.01" min="0" placeholder="Límite mensual (€)" value={form.monthly_limit}
            onChange={e => setForm({ ...form, monthly_limit: e.target.value })}
            className="w-44 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> {saving ? '...' : 'Añadir'}
          </button>
        </div>
      </form>

      {/* Vista toggle */}
      <div className="flex gap-2">
        {['mensual','anual'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${view === v ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
            {v === 'mensual' ? `Mensual (${currentMonth})` : `Anual (${currentYear})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm">Sin presupuestos. Añade uno para empezar a controlar tus gastos.</p>
          </div>
        ) : budgets.map(b => {
          const limite = Number(b.monthly_limit)
          const gastado = view === 'mensual' ? (spent[b.category] || 0) : (annualSpent[b.category] || 0)
          const limiteView = view === 'mensual' ? limite : limite * 12
          const pct = Math.min((gastado / limiteView) * 100, 100)
          const over = gastado > limiteView
          const warning = !over && pct >= 80

          return (
            <div key={b.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border transition-colors ${over ? 'border-red-200 dark:border-red-800' : warning ? 'border-amber-200 dark:border-amber-800' : 'border-slate-100 dark:border-slate-700'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{b.category}</span>
                  {over && <span className="flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium"><AlertCircle size={11} /> Excedido</span>}
                  {warning && <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium"><AlertTriangle size={11} /> Casi al límite</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${over ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                    {gastado.toFixed(2)} € / {limiteView.toFixed(2)} €
                  </span>
                  <button onClick={() => handleDelete(b.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${over ? 'bg-red-400' : warning ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                {over ? `Excedido en ${(gastado - limiteView).toFixed(2)} €` : `Quedan ${(limiteView - gastado).toFixed(2)} € (${(100 - pct).toFixed(0)}%)`}
                {view === 'anual' && ` · Promedio: ${(gastado / monthsElapsed).toFixed(2)} €/mes`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
