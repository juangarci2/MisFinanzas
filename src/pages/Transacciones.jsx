import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/Auth'
import { Plus, Trash2, Download, RefreshCw, Search, Upload, Camera } from 'lucide-react'

const CATEGORIAS = ['Alimentación','Transporte','Ocio','Salud','Hogar','Ropa','Educación','Otros']
const emptyForm = { type: 'gasto', amount: '', category: 'Alimentación', customCategory: '', date: new Date().toISOString().split('T')[0], note: '', is_recurring: false, tags: '' }
const { user } = useAuth()
  const SUPABASE_URL = 'https://dotojyomutqkqhknmvsc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdG9qeW9tdXRxa3Foa25tdnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNzY0NDEsImV4cCI6MjEwMzY1MjQ0MX0.UQb46FEVsD15GMOHPtONNj567PVUkgEvwSwaM7Q7Yvw'

export default function Transacciones() {
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [filters, setFilters] = useState({ month: '', category: '', type: '', search: '' })
  const [csvPreview, setCsvPreview] = useState(null)
  const fileRef = useRef()
  const ticketRef = useRef()

  useEffect(() => { fetchAll(); processRecurring() }, [])

  async function processRecurring() {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (localStorage.getItem(`recurring_${yearMonth}`)) return
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data: recurring } = await supabase.from('transactions').select('*').eq('is_recurring', true)
    if (!recurring?.length) { localStorage.setItem(`recurring_${yearMonth}`, 'true'); return }
    const { data: existing } = await supabase.from('transactions').select('*').gte('date', firstDay).lte('date', lastDay)
    const toCreate = recurring.filter(r => !(existing||[]).some(e => e.category === r.category && Number(e.amount) === Number(r.amount) && e.type === r.type))
      .map(r => ({ type: r.type, amount: r.amount, category: r.category, date: firstDay, note: r.note, is_recurring: false }))
    if (toCreate.length) await supabase.from('transactions').insert(toCreate)
    localStorage.setItem(`recurring_${yearMonth}`, 'true')
  }

  async function fetchAll() {
    const { data } = await supabase.from('transactions').select('*').order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount) return
    setSaving(true)
    const category = form.category === 'Otros' && form.customCategory ? form.customCategory : form.category
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    await supabase.from('transactions').insert([{ ...form, category, amount: parseFloat(form.amount), tags, user_id: user.id }])
    setForm(emptyForm)
    await fetchAll()
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  // Foto del ticket
  async function handleTicket(e) {
    const file = e.target.files[0]
    if (!file) return
    setAnalyzing(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1]
        const mediaType = file.type
        const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ image: base64, mediaType })
        })
        const data = await res.json()
        if (data.amount) {
          setForm(f => ({ ...f, amount: String(data.amount), category: data.category || f.category, note: data.note || f.note }))
        }
        setAnalyzing(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setAnalyzing(false)
      alert('Error analizando el ticket. Comprueba que tienes la API key configurada en Supabase.')
    }
    e.target.value = ''
  }

  // Importar CSV
  function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',')
        return { date: cols[0]?.trim(), type: cols[1]?.trim(), category: cols[2]?.trim(), note: cols[3]?.trim(), amount: cols[4]?.trim() }
      }).filter(r => r.date && r.amount)
      setCsvPreview(rows)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function confirmCSVImport() {
    if (!csvPreview?.length) return
    const toInsert = csvPreview.map(r => ({
      date: r.date, type: r.type || 'gasto', category: r.category || 'Otros',
      note: r.note || '', amount: parseFloat(r.amount) || 0
    }))
    await supabase.from('transactions').insert(toInsert)
    setCsvPreview(null)
    fetchAll()
  }

  function exportCSV() {
    const headers = ['Fecha','Tipo','Categoría','Nota','Importe','Etiquetas','Recurrente']
    const rows = filtered.map(t => [t.date, t.type, t.category, t.note || '', t.amount, (t.tags||[]).join(';'), t.is_recurring ? 'Sí' : 'No'])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `transacciones-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = transactions.filter(t => {
    if (filters.type && t.type !== filters.type) return false
    if (filters.category && t.category !== filters.category) return false
    if (filters.month && !t.date.startsWith(filters.month)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.category?.toLowerCase().includes(q) && !t.note?.toLowerCase().includes(q) && !(t.tags||[]).some(tag => tag.toLowerCase().includes(q))) return false
    }
    return true
  })

  const months = [...new Set(transactions.map(t => t.date.slice(0, 7)))].sort().reverse()
  const categories = [...new Set(transactions.map(t => t.category))].sort()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Transacciones</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Registra tus gastos e ingresos</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Tipo</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Importe (€)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Categoría</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value, customCategory: '' })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Fecha</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        {form.category === 'Otros' && (
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">¿Cuál? Escribe la categoría</label>
            <input type="text" placeholder="Ej: Mascotas, Viajes..." value={form.customCategory}
              onChange={e => setForm({ ...form, customCategory: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Nota (opcional)</label>
            <input type="text" placeholder="Descripción..." value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Etiquetas (separadas por comas)</label>
            <input type="text" placeholder="Ej: vacaciones, regalo, extra" value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
              className="rounded text-emerald-500" />
            <RefreshCw size={14} className="text-slate-400" />
            Recurrente (se repite cada mes)
          </label>
          <div className="flex gap-2">
            <input type="file" ref={ticketRef} accept="image/*" onChange={handleTicket} className="hidden" />
            <button type="button" onClick={() => ticketRef.current.click()} disabled={analyzing}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <Camera size={15} /> {analyzing ? 'Analizando...' : 'Foto ticket'}
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> {saving ? 'Guardando...' : 'Añadir'}
            </button>
          </div>
        </div>
      </form>

      {/* Preview CSV */}
      {csvPreview && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-amber-200 dark:border-amber-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Vista previa — {csvPreview.length} transacciones encontradas</h3>
          <div className="overflow-x-auto max-h-48 overflow-y-auto mb-4">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 dark:text-slate-400">
                {['Fecha','Tipo','Categoría','Nota','Importe'].map(h => <th key={h} className="text-left px-2 py-1">{h}</th>)}
              </tr></thead>
              <tbody>
                {csvPreview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-slate-50 dark:border-slate-700">
                    <td className="px-2 py-1 text-slate-500">{r.date}</td>
                    <td className="px-2 py-1">{r.type}</td>
                    <td className="px-2 py-1">{r.category}</td>
                    <td className="px-2 py-1 text-slate-400">{r.note}</td>
                    <td className="px-2 py-1 font-medium">{r.amount} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvPreview.length > 10 && <p className="text-xs text-slate-400 mt-2 px-2">... y {csvPreview.length - 10} más</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={confirmCSVImport} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Importar {csvPreview.length} transacciones
            </button>
            <button onClick={() => setCsvPreview(null)} className="border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros + acciones */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-48 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input type="text" placeholder="Buscar por categoría, nota o etiqueta..." value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-100 placeholder-slate-400" />
        </div>
        <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Todos los meses</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Todos los tipos</option>
          <option value="gasto">Gastos</option>
          <option value="ingreso">Ingresos</option>
        </select>
        <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="file" ref={fileRef} accept=".csv" onChange={handleCSV} className="hidden" />
        <button onClick={() => fileRef.current.click()}
          className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
          <Upload size={15} /> Importar CSV
        </button>
        <button onClick={exportCSV}
          className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-400 text-sm">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-slate-400 text-sm">Sin transacciones. Añade la primera.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
              <tr>
                {['Fecha','Tipo','Categoría','Nota','Etiquetas','Importe',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'ingreso' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{t.type}</span>
                    {t.is_recurring && <RefreshCw size={12} className="inline ml-1 text-slate-400" />}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{t.category}</td>
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{t.note || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(t.tags||[]).map(tag => (
                        <span key={tag} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'ingreso' ? '+' : '-'}{Number(t.amount).toFixed(2)} €
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
