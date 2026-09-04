import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

const emptyForm = { name: '', type: 'ahorro', goal: '', current: '' }

export default function DeudasAhorros() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthlyRates, setMonthlyRates] = useState({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('debts_savings').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.goal) return
    setSaving(true)
    await supabase.from('debts_savings').insert([{ name: form.name, type: form.type, goal: parseFloat(form.goal), current: parseFloat(form.current || 0) }])
    setForm(emptyForm)
    await fetchAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('debts_savings').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function updateCurrent(id, value) {
    await supabase.from('debts_savings').update({ current: parseFloat(value) }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, current: value } : i))
  }

  function getProjection(item) {
    const monthly = parseFloat(monthlyRates[item.id] || 0)
    if (!monthly || monthly <= 0) return null
    const remaining = Number(item.goal) - Number(item.current)
    if (remaining <= 0) return null
    const months = Math.ceil(remaining / monthly)
    const date = new Date()
    date.setMonth(date.getMonth() + months)
    return { months, date: date.toLocaleString('es', { month: 'long', year: 'numeric' }) }
  }

  const ahorros = items.filter(i => i.type === 'ahorro')
  const deudas = items.filter(i => i.type === 'deuda')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Deudas y ahorros</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Seguimiento de metas y deudas</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Nombre</label>
            <input type="text" placeholder="Ej: Fondo de emergencia" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Tipo</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="ahorro">Ahorro</option>
              <option value="deuda">Deuda</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{form.type === 'ahorro' ? 'Meta (€)' : 'Total deuda (€)'}</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.goal}
              onChange={e => setForm({ ...form, goal: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{form.type === 'ahorro' ? 'Ahorrado hasta ahora (€)' : 'Ya pagado (€)'}</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.current}
              onChange={e => setForm({ ...form, current: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> {saving ? 'Guardando...' : 'Añadir'}
        </button>
      </form>

      <Section title="Ahorros" items={ahorros} color="emerald" onDelete={handleDelete} onUpdate={updateCurrent} loading={loading} monthlyRates={monthlyRates} setMonthlyRates={setMonthlyRates} getProjection={getProjection} />
      <Section title="Deudas" items={deudas} color="red" onDelete={handleDelete} onUpdate={updateCurrent} loading={loading} monthlyRates={monthlyRates} setMonthlyRates={setMonthlyRates} getProjection={getProjection} />
    </div>
  )
}

function Section({ title, items, color, onDelete, onUpdate, loading, monthlyRates, setMonthlyRates, getProjection }) {
  const accent = color === 'emerald' ? 'bg-emerald-400' : 'bg-red-400'
  const text = color === 'emerald' ? 'text-emerald-600' : 'text-red-500'
  const label = color === 'emerald' ? 'ahorro mensual' : 'pago mensual'

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {loading ? <p className="text-slate-400 text-sm">Cargando...</p>
        : items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm">Sin {title.toLowerCase()} registradas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const current = Number(item.current)
              const goal = Number(item.goal)
              const pct = Math.min((current / goal) * 100, 100)
              const done = current >= goal
              const projection = getProjection(item)

              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                      <p className={`text-sm font-semibold ${text}`}>{current.toFixed(2)} € / {goal.toFixed(2)} €</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {done && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">✓ Completado</span>}
                      <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3">
                    <div className={`h-2 rounded-full transition-all ${accent}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 dark:text-slate-500">Actualizar:</label>
                      <input type="number" step="0.01" min="0" defaultValue={current}
                        onBlur={e => onUpdate(item.id, e.target.value)}
                        className="w-24 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      <span className="text-xs text-slate-400">€</span>
                    </div>
                    {!done && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 dark:text-slate-500">{label}:</label>
                        <input type="number" step="0.01" min="0" placeholder="0"
                          value={monthlyRates[item.id] || ''}
                          onChange={e => setMonthlyRates(r => ({ ...r, [item.id]: e.target.value }))}
                          className="w-20 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        <span className="text-xs text-slate-400">€</span>
                      </div>
                    )}
                  </div>
                  {projection && (
                    <div className="mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        📅 A este ritmo, lo conseguirás en <strong>{projection.months} {projection.months === 1 ? 'mes' : 'meses'}</strong> ({projection.date})
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
