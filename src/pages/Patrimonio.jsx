import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, PiggyBank, CreditCard } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#ef4444']

export default function Patrimonio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: tx }, { data: ds }] = await Promise.all([
      supabase.from('transactions').select('type, amount'),
      supabase.from('debts_savings').select('type, goal, current')
    ])

    const ingresos = (tx || []).filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0)
    const gastos = (tx || []).filter(t => t.type === 'gasto').reduce((s, t) => s + Number(t.amount), 0)
    const saldoCuenta = ingresos - gastos
    const ahorros = (ds || []).filter(d => d.type === 'ahorro').reduce((s, d) => s + Number(d.current), 0)
    const deudas = (ds || []).filter(d => d.type === 'deuda').reduce((s, d) => s + Math.max(Number(d.goal) - Number(d.current), 0), 0)
    const patrimonio = saldoCuenta + ahorros - deudas

    setData({ saldoCuenta, ahorros, deudas, patrimonio })
    setLoading(false)
  }

  if (loading) return <p className="text-slate-400 text-sm">Cargando...</p>

  const { saldoCuenta, ahorros, deudas, patrimonio } = data

  const chartData = [
    { name: 'Cuenta corriente', value: Math.max(saldoCuenta, 0) },
    { name: 'Ahorros', value: ahorros },
    { name: 'Deudas', value: deudas },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Patrimonio neto</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Tu situación financiera global</p>
      </div>

      <div className={`rounded-2xl p-8 text-center shadow-sm ${patrimonio >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
        <p className="text-white/80 text-sm font-medium mb-2">Patrimonio neto total</p>
        <p className="text-5xl font-bold text-white">{patrimonio.toFixed(2)} €</p>
        <p className="text-white/60 text-xs mt-2">{patrimonio >= 0 ? '✓ Situación positiva' : '⚠ Patrimonio negativo'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PatCard label="Cuenta corriente" value={saldoCuenta} icon={<Building2 size={20} />} color={saldoCuenta >= 0 ? 'text-blue-600' : 'text-red-500'} bg="bg-blue-50 dark:bg-blue-900/20" />
        <PatCard label="Total ahorros" value={ahorros} icon={<PiggyBank size={20} />} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20" />
        <PatCard label="Deuda restante" value={deudas} icon={<CreditCard size={20} />} color={deudas > 0 ? 'text-red-500' : 'text-slate-400'} bg="bg-red-50 dark:bg-red-900/20" negative />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Distribución del patrimonio</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => `${Number(v).toFixed(2)} €`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function PatCard({ label, value, icon, color, bg, negative }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
      <div className={`inline-flex p-2 rounded-lg ${bg} ${color} mb-3`}>{icon}</div>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{negative ? '-' : ''}{Math.abs(value).toFixed(2)} €</p>
    </div>
  )
}
