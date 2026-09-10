import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/Auth'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const emptyForm = { name: '', type: 'ahorro', goal: '', current: '', annual_rate: '' }

export default function DeudasAhorros() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [monthlyRates, setMonthlyRates] = useState({})
  const [history, setHistory] = useState({})
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('debts_savings').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchHistory(id) {
    const { data } = await supabase.from('savings_history').select('*').eq('saving_id', id).order('date', { ascending: true })
    setHistory(prev => ({ ...prev, [id]: data || [] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.goal) return
    setSaving(true)
    const { data } = await supabase.from('debts_savings').insert([{
      name: form.name,
      type: form.type,
      goal: parseFloat(form.goal),
      current: parseFloat(form.current || 0),
      annual_rate: parseFloat(form.annual_rate || 0),
      user_id: user.id
    }]).select().single()

    // Guardar primer punto en historial
    if (data && parseFloat(form.current || 0) > 0) {
      await supabase.from('savings_history').insert([{
        saving_id: data.id,
        balance: parseFloat(form.current),
        date: new Date().toISOString().split('T')[0],
        user_id: user.id
      }])
    }

    setForm(emptyForm)
    await fetchAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('debts_savings').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function updateCurrent(id, value) {
    const balance = parseFloat(value)
    await supabase.from('debts_savings').update({ current: balance }).eq('id', id)
    // Guardar en historial
    await supabase.from('savings_history').insert([{
      saving_id: id,
      balance,
      date: new Date().toISOString().split('T')[0],
      user_id: user.id
    }])
    setItems(prev => prev.map(i => i.id === id ? { ...i, current: value } : i))
    if (history[id]) fetchHistory(id)
  }

  function toggleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (!history[id]) fetchHistory(id)
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

  function getInterest(item) {
    const rate = Number(item.annual_rate || 0)
    const balance = Number(item.current || 0)
    if (!rate || !balance) return null
    const monthly = (balance * rate / 100) / 12
    const annual = balance * rate / 100
    return { monthly, annual }
  }

  const ahorros = items.filter(i => i.type === 'ahorro')
  const deudas = items.filter(i => i.type === 'deuda')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Deudas y ahorros</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Seguimiento de metas, inversiones y deudas</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Nombre</label>
            <input type="text" placeholder="Ej: Trade Republic, Fondo indexado..." value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Tipo</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="ahorro">Ahorro / Inversión</option>
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
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Saldo actual (€)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.current}
              onChange={e => setForm({ ...form, current: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          {form.type === 'ahorro' && (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Interés / rentabilidad anual (%)</label>
              <input type="number" step="0.01" min="0" placeholder="Ej: 2.25" value={form.annual_rate}
                onChange={e => setForm({ ...form, annual_rate: e.target.value })}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          )}
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> {saving ? 'Guardando...' : 'Añadir'}
        </button>
      </form>

      {/* Ahorros e inversiones */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Ahorros e inversiones</h3>
        {loading ? <p className="text-slate-400 text-sm">Cargando...</p>
          : ahorros.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-400 text-sm">Sin ahorros registrados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ahorros.map(item => {
                const current = Number(item.current)
                const goal = Number(item.goal)
                const pct = Math.min((current / goal) * 100, 100)
                const done = current >= goal
                const projection = getProjection(item)
                const interest = getInterest(item)
                const isExpanded = expandedId === item.id

                return (
                  <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                        <p className="text-sm font-semibold text-emerald-600">{current.toFixed(2)} € / {goal.toFixed(2)} €</p>
                        {Number(item.annual_rate) > 0 && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">📈 {item.annual_rate}% anual</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {done && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-2 py-0.5 rounded-full font-medium">✓ Meta</span>}
                        <button onClick={() => toggleExpand(item.id)} className="text-slate-400 hover:text-blue-400 transition-colors p-1">
                          <TrendingUp size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3">
                      <div className="h-2 rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>

                    {/* Intereses calculados */}
                    {interest && (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-500 dark:text-blue-400">Interés mensual</p>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-300">+{interest.monthly.toFixed(2)} €</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-500 dark:text-blue-400">Interés anual</p>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-300">+{interest.annual.toFixed(2)} €</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 dark:text-slate-500">Actualizar saldo:</label>
                        <input type="number" step="0.01" min="0" defaultValue={current}
                          onBlur={e => updateCurrent(item.id, e.target.value)}
                          className="w-28 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        <span className="text-xs text-slate-400">€</span>
                      </div>
                      {!done && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 dark:text-slate-500">Aportación mensual:</label>
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
                          📅 A este ritmo, llegarás a la meta en <strong>{projection.months} {projection.months === 1 ? 'mes' : 'meses'}</strong> ({projection.date})
                        </p>
                      </div>
                    )}

                    {/* Gráfica de evolución */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Evolución del saldo</p>
                        {history[item.id]?.length > 1 ? (
                          <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={history[item.id].map(h => ({ fecha: h.date.slice(0, 7), saldo: Number(h.balance) }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                              <Tooltip formatter={v => `${Number(v).toFixed(2)} €`} />
                              <Line type="monotone" dataKey="saldo" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-4">Actualiza el saldo cada mes para ver la evolución aquí.</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>

      {/* Deudas */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Deudas</h3>
        {loading ? <p className="text-slate-400 text-sm">Cargando...</p>
          : deudas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
              <p className="text-slate-400 text-sm">Sin deudas registradas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deudas.map(item => {
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
                        <p className="text-sm font-semibold text-red-500">{current.toFixed(2)} € / {goal.toFixed(2)} €</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {done && <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 px-2 py-0.5 rounded-full font-medium">✓ Pagada</span>}
                        <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-3">
                      <div className="h-2 rounded-full bg-red-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">Actualizar:</label>
                        <input type="number" step="0.01" min="0" defaultValue={current}
                          onBlur={e => updateCurrent(item.id, e.target.value)}
                          className="w-24 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                        <span className="text-xs text-slate-400">€</span>
                      </div>
                      {!done && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400">Pago mensual:</label>
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
                          📅 Deuda saldada en <strong>{projection.months} {projection.months === 1 ? 'mes' : 'meses'}</strong> ({projection.date})
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
      </div>
    </div>
  )
}
