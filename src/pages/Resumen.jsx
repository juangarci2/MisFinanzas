import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/Auth'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Plus, X, AlertTriangle, Settings, Building2 } from 'lucide-react'

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']
const CATEGORIAS = ['Alimentación','Transporte','Ocio','Salud','Hogar','Ropa','Educación','Otros']
const NEEDS = ['Alimentación','Transporte','Hogar','Salud']
const WANTS = ['Ocio','Ropa','Educación','Otros']

export default function Resumen() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [lineData, setLineData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showAlertConfig, setShowAlertConfig] = useState(false)
  const [showCuentaConfig, setShowCuentaConfig] = useState(false)
  const [qaForm, setQaForm] = useState({ type: 'gasto', amount: '', category: 'Alimentación', customCategory: '' })
  const [saving, setSaving] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState(null)
  const [saldoInicialInput, setSaldoInicialInput] = useState('')
  const [alertThreshold, setAlertThreshold] = useState(() => {
    try { return localStorage.getItem('alert_threshold') || '' } catch { return '' }
  })
  const [alertInput, setAlertInput] = useState(alertThreshold)

  useEffect(() => { fetchTransactions() }, [selectedDate])
  useEffect(() => { fetchLineData(); fetchSaldoInicial(); fetchAllTransactions() }, [])

  function firstDay(d) { return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }
  function lastDay(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0] }

  async function fetchSaldoInicial() {
    const { data } = await supabase.from('settings').select('value').eq('key', 'saldo_inicial').single()
    if (data) { setSaldoInicial(parseFloat(data.value)); setSaldoInicialInput(data.value) }
    else { setSaldoInicial(0) }
  }

  async function saveSaldoInicial() {
    const val = parseFloat(saldoInicialInput) || 0
    await supabase.from('settings').upsert([{ user_id: user.id, key: 'saldo_inicial', value: String(val) }])
    setSaldoInicial(val)
    setShowCuentaConfig(false)
  }

  async function fetchAllTransactions() {
    const { data } = await supabase.from('transactions').select('type, amount')
    setAllTransactions(data || [])
  }

  async function fetchTransactions() {
    setLoading(true)
    const { data } = await supabase.from('transactions').select('*').gte('date', firstDay(selectedDate)).lte('date', lastDay(selectedDate))
    setTransactions(data || [])
    setLoading(false)
  }

  async function fetchLineData() {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString('es', { month: 'short' }) })
    }
    const startDate = new Date(); startDate.setMonth(startDate.getMonth() - 5)
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1).toISOString().split('T')[0]
    const { data: allTx } = await supabase.from('transactions').select('*').gte('date', start)
    setLineData(months.map(({ year, month, label }) => {
      const txs = (allTx || []).filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() === month })
      return {
        name: label,
        Ingresos: txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0),
        Gastos: txs.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0),
      }
    }))
  }

  function prevMonth() { setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1)
    if (next <= new Date()) setSelectedDate(next)
  }

  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!qaForm.amount) return
    setSaving(true)
    const category = qaForm.category === 'Otros' && qaForm.customCategory ? qaForm.customCategory : qaForm.category
    await supabase.from('transactions').insert([{ user_id: user.id, type: qaForm.type, amount: parseFloat(qaForm.amount), category, date: new Date().toISOString().split('T')[0] }])
    setQaForm({ type: 'gasto', amount: '', category: 'Alimentación', customCategory: '' })
    setShowQuickAdd(false); setSaving(false)
    fetchTransactions(); fetchLineData(); fetchAllTransactions()
  }

  function saveAlert() {
    localStorage.setItem('alert_threshold', alertInput)
    setAlertThreshold(alertInput)
    setShowAlertConfig(false)
  }

  const ingresos = transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
  const gastos = transactions.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const saldo = ingresos - gastos

  const totalIngresosHistorico = allTransactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
  const totalGastosHistorico = allTransactions.filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
  const saldoCuenta = (saldoInicial || 0) + totalIngresosHistorico - totalGastosHistorico

  const byCategory = transactions.filter(t => t.type === 'gasto').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc
  }, {})
  const chartData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

  // Regla 50/30/20
  const needsGasto = transactions.filter(t => t.type === 'gasto' && NEEDS.includes(t.category)).reduce((s, t) => s + Number(t.amount), 0)
  const wantsGasto = transactions.filter(t => t.type === 'gasto' && WANTS.includes(t.category)).reduce((s, t) => s + Number(t.amount), 0)
  const needsPct = ingresos > 0 ? (needsGasto / ingresos * 100) : 0
  const wantsPct = ingresos > 0 ? (wantsGasto / ingresos * 100) : 0
  const savingsPct = ingresos > 0 ? Math.max(0, (saldo / ingresos * 100)) : 0

  const mesLabel = selectedDate.toLocaleString('es', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()
  const showAlert = alertThreshold && saldo < parseFloat(alertThreshold)

  return (
    <div className="space-y-6 w-full max-w-5xl">
      {/* Alerta saldo bajo */}
      {showAlert && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            ⚠️ Saldo bajo: tienes {saldo.toFixed(2)} € — por debajo del límite de {parseFloat(alertThreshold).toFixed(2)} €
          </p>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <ChevronLeft size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 capitalize">{mesLabel}</h2>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">
            <ChevronRight size={18} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCuentaConfig(v => !v)}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Building2 size={15} /> Cuenta principal
          </button>
          <button onClick={() => setShowAlertConfig(v => !v)}
            className="flex items-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
            <Settings size={15} /> Alerta saldo
          </button>
          <button onClick={() => setShowQuickAdd(v => !v)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showQuickAdd ? <X size={16} /> : <Plus size={16} />}
            {showQuickAdd ? 'Cerrar' : 'Añadir rápido'}
          </button>
        </div>
      </div>

      {/* Config alerta */}
      {showAlertConfig && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Avisarme cuando el saldo mensual baje de:</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" min="0" placeholder="Ej: 200" value={alertInput}
                onChange={e => setAlertInput(e.target.value)}
                className="w-36 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <span className="text-sm text-slate-500">€</span>
            </div>
          </div>
          <button onClick={saveAlert} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar</button>
          {alertThreshold && <button onClick={() => { setAlertInput(''); setAlertThreshold(''); localStorage.removeItem('alert_threshold'); setShowAlertConfig(false) }}
            className="text-sm text-slate-400 hover:text-red-400 transition-colors">Eliminar alerta</button>}
        </div>
      )}

      {/* Quick add */}
      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-end w-full">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Tipo</label>
            <select value={qaForm.type} onChange={e => setQaForm({ ...qaForm, type: e.target.value })}
              className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Importe (€)</label>
            <input type="number" step="0.01" min="0" placeholder="0.00" value={qaForm.amount}
              onChange={e => setQaForm({ ...qaForm, amount: e.target.value })}
              className="w-28 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Categoría</label>
            <select value={qaForm.category} onChange={e => setQaForm({ ...qaForm, category: e.target.value, customCategory: '' })}
              className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {qaForm.category === 'Otros' && (
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">¿Cuál?</label>
              <input type="text" placeholder="Ej: Mascotas" value={qaForm.customCategory}
                onChange={e => setQaForm({ ...qaForm, customCategory: e.target.value })}
                className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          )}
          <button type="submit" disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {saving ? '...' : 'Guardar'}
          </button>
        </form>
      )}

      {/* Config cuenta principal */}
      {showCuentaConfig && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-end gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Saldo inicial de tu cuenta (€)</label>
            <p className="text-xs text-slate-400 mb-2">Lo que tenías en el banco antes de empezar a registrar en la app.</p>
            <input type="number" step="0.01" min="0" placeholder="Ej: 1500.00" value={saldoInicialInput}
              onChange={e => setSaldoInicialInput(e.target.value)}
              className="w-44 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <button onClick={saveSaldoInicial} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Guardar</button>
        </div>
      )}

      {/* Tarjeta cuenta principal */}
      <div className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between ${saldoCuenta >= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400' : 'bg-gradient-to-r from-red-500 to-red-600 border-red-400'}`}>
        <div>
          <p className="text-white/80 text-xs font-medium flex items-center gap-1.5 mb-1"><Building2 size={14} /> Cuenta principal</p>
          <p className="text-3xl font-bold text-white">{saldoCuenta.toFixed(2)} €</p>
          <p className="text-white/60 text-xs mt-1">Saldo inicial {(saldoInicial || 0).toFixed(2)} € + movimientos registrados</p>
        </div>
        <Wallet size={40} className="text-white/20" />
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Ingresos" value={ingresos} icon={<TrendingUp size={20} />} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        <Card label="Gastos" value={gastos} icon={<TrendingDown size={20} />} color="text-red-500" bg="bg-red-50 dark:bg-red-900/20" />
        <Card label="Saldo" value={saldo} icon={<Wallet size={20} />}
          color={saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}
          bg={saldo >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'} />
      </div>

      {/* Regla 50/30/20 */}
      {ingresos > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Regla 50/30/20</h3>
          <div className="space-y-3">
            <RuleBar label="Necesidades (50%)" pct={needsPct} target={50} amount={needsGasto} color="bg-blue-400" />
            <RuleBar label="Deseos (30%)" pct={wantsPct} target={30} amount={wantsGasto} color="bg-purple-400" />
            <RuleBar label="Ahorro (20%)" pct={savingsPct} target={20} amount={Math.max(saldo, 0)} color="bg-emerald-400" good={savingsPct >= 20} />
          </div>
        </div>
      )}

      {/* Gráficas del mes */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Gastos por categoría</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={32}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => `${Number(v).toFixed(2)} €`} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Distribución de gastos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `${Number(v).toFixed(2)} €`} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Evolución 6 meses */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Evolución últimos 6 meses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => `${Number(v).toFixed(2)} €`} />
            <Legend />
            <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!loading && chartData.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
          <p className="text-slate-400 text-sm">Sin transacciones este mes. Usa "Añadir rápido" para empezar.</p>
        </div>
      )}
    </div>
  )
}

function Card({ label, value, icon, color, bg }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-3`}>{icon}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{Number(value).toFixed(2)} €</p>
    </div>
  )
}

function RuleBar({ label, pct, target, amount, color }) {
  const ok = pct <= target
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{amount.toFixed(2)} €</span>
          <span className={`text-xs font-semibold ${ok ? 'text-emerald-500' : 'text-red-400'}`}>{pct.toFixed(0)}% {ok ? '✓' : '↑'}</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 relative">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        <div className="absolute top-0 h-2 w-0.5 bg-slate-400 opacity-60" style={{ left: `${target}%` }} />
      </div>
    </div>
  )
}
