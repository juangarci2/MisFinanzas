import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/Auth'
import { Plus, Trash2, Check } from 'lucide-react'

const emptyForm = { person: '', amount: '', direction: 'me_deben', note: '' }

export default function DeudasPersonales() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const { data } = await supabase.from('personal_debts').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.person || !form.amount) return
    setSaving(true)
    await supabase.from('personal_debts').insert([{ user_id: user.id,
      person: form.person,
      amount: parseFloat(form.amount),
      direction: form.direction,
      note: form.note,
    }])
    setForm(emptyForm)
    await fetchAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('personal_debts').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function togglePaid(id, paid) {
    await supabase.from('personal_debts').update({ paid: !paid }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, paid: !paid } : i))
  }

  const meDeben = items.filter(i => i.direction === 'me_deben')
  const debo = items.filter(i => i.direction === 'debo')

  const totalMeDeben = meDeben.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0)
  const totalDebo = debo.filter(i => !i.paid).reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Deudas personales</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Lleva el control de lo que te deben y lo que debes</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-800">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Me deben</p>
          <p className="text-3xl font-bold text-emerald-600">+{totalMeDeben.toFixed(2)} €</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-800">
          <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-1">Debo</p>
          <p className="text-3xl font-bold text-red-500">-{totalDebo.toFixed(2)} €</p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Nombre</label>
            <input type="text" placeholder="Ej: Carlos, María..." value={form.person}
              onChange={e => setForm({ ...form, person: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Cantidad (€)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Dirección</label>
            <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="me_deben">Me deben a mí</option>
              <option value="debo">Yo debo</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Notas (opcional)</label>
            <input type="text" placeholder="Ej: Cena del viernes..." value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> {saving ? 'Guardando...' : 'Añadir'}
        </button>
      </form>

      {/* Me deben */}
      <DebtSection title="Me deben" items={meDeben} color="emerald" onDelete={handleDelete} onToggle={togglePaid} loading={loading} />

      {/* Debo */}
      <DebtSection title="Debo" items={debo} color="red" onDelete={handleDelete} onToggle={togglePaid} loading={loading} />
    </div>
  )
}

function DebtSection({ title, items, color, onDelete, onToggle, loading }) {
  const text = color === 'emerald' ? 'text-emerald-600' : 'text-red-500'
  const badge = color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {loading ? <p className="text-slate-400 text-sm">Cargando...</p>
        : items.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
            <p className="text-slate-400 text-sm">Sin registros en esta sección.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 ${item.paid ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${badge}`}>
                      {item.person[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-medium ${item.paid ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{item.person}</p>
                      {item.note && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-lg font-bold ${item.paid ? 'text-slate-300' : text}`}>
                      {color === 'emerald' ? '+' : '-'}{Number(item.amount).toFixed(2)} €
                    </p>
                    <button onClick={() => onToggle(item.id, item.paid)}
                      title={item.paid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                      className={`p-1.5 rounded-lg transition-colors ${item.paid ? 'bg-emerald-100 text-emerald-600' : 'border border-slate-200 dark:border-slate-600 text-slate-300 hover:bg-emerald-50 hover:text-emerald-500'}`}>
                      <Check size={15} />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
