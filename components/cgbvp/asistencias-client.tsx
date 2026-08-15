'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { ClipboardList } from 'lucide-react'

interface Row {
  profileId: string
  fullName: string
  codigoCgbvp: string
  grade: string
  diasAsistidos: number
  guardiasNocturnas: number
  horasAcumuladas: number
  emergenciasAtendidas: number
}

interface EvolutionPoint {
  month: string
  totalHoras: number
  promedio: number
}

interface Props {
  rows: Row[]
  currentMonth: string
  months: string[]
  evolution: EvolutionPoint[]
}

const TOOLTIP_STYLE = { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 11, color: '#e8e5e0' }

const MIN_HOURS: Record<string, number> = {
  seccionario: 30, subteniente: 20, teniente: 20, capitan: 10, 'teniente brigadier': 5, brigadier: 1,
}

const GRADE_COLORS: Record<string, string> = {
  seccionario: '#3b82f6', subteniente: '#10b981', teniente: '#06b6d4', capitan: '#f59e0b', 'teniente brigadier': '#8b5cf6', brigadier: '#dc2626',
}

export function AsistenciasClient({ rows, currentMonth, months, evolution }: Props) {
  const router = useRouter()
  const [activeMonth, setActiveMonth] = useState(currentMonth)

  const sorted = useMemo(() => [...rows].sort((a, b) => b.horasAcumuladas - a.horasAcumuladas), [rows])
  const totalHoras = rows.reduce((s, r) => s + r.horasAcumuladas, 0)
  const totalDias = rows.reduce((s, r) => s + r.diasAsistidos, 0)
  const totalEmerg = rows.reduce((s, r) => s + r.emergenciasAtendidas, 0)
  const promedio = rows.length > 0 ? Math.round(totalHoras / rows.length) : 0

  // Cumplimiento
  const cumplen = rows.filter(r => {
    const min = MIN_HOURS[r.grade?.toLowerCase()] ?? 0
    return min === 0 || r.horasAcumuladas >= min
  }).length

  // Top 10
  const top10 = sorted.slice(0, 10).map((r, i) => ({
    name: r.fullName.length > 18 ? r.fullName.slice(0, 18) + '…' : r.fullName,
    horas: r.horasAcumuladas,
    color: i === 0 ? '#dc2626' : i === 1 ? '#f59e0b' : i === 2 ? '#3b82f6' : '#555',
  }))

  // Promedio por grado
  const gradeMap: Record<string, { sum: number; count: number }> = {}
  for (const r of rows) {
    const g = r.grade?.toLowerCase() || 'otro'
    if (!gradeMap[g]) gradeMap[g] = { sum: 0, count: 0 }
    gradeMap[g].sum += r.horasAcumuladas
    gradeMap[g].count++
  }
  const gradeBars = Object.entries(gradeMap).map(([g, v]) => ({ name: g, promedio: Math.round(v.sum / v.count), color: GRADE_COLORS[g] ?? '#555' }))

  // Cumplimiento por grado (stacked)
  const complianceData = Object.entries(gradeMap).map(([g, v]) => {
    const min = MIN_HOURS[g] ?? 0
    const cumple = rows.filter(r => r.grade?.toLowerCase() === g && r.horasAcumuladas >= min).length
    return { name: g, cumple, noCumple: v.count - cumple }
  }).filter(d => (MIN_HOURS[d.name] ?? 0) > 0)

  const handleMonthChange = (m: string) => {
    setActiveMonth(m)
    router.push(`/asistencias?mes=${m}`)
  }

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList className="h-6 w-6" style={{ color: 'var(--red-163)' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--bone)' }}>Informe de Asistencias</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {months.slice(0, 6).map(m => (
            <button key={m} onClick={() => handleMonthChange(m)} style={{ fontSize: 10, padding: '5px 10px', fontFamily: 'var(--font-mono)', border: '1px solid var(--ink-line)', background: m === activeMonth ? 'var(--red-163)' : 'var(--ink-deep)', color: m === activeMonth ? '#fff' : 'var(--steel)', cursor: 'pointer', borderRadius: 4 }}>
              {formatMonth(m)}
            </button>
          ))}
        </div>
      </header>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <Kpi label="Bomberos Activos" value={rows.length} />
        <Kpi label="Horas Totales" value={totalHoras} sub={`prom. ${promedio}h`} />
        <Kpi label="Días Asistencia" value={totalDias} />
        <Kpi label="Emergencias" value={totalEmerg} />
        <Kpi label="Cumple Reglamento" value={`${rows.length > 0 ? Math.round((cumplen / rows.length) * 100) : 0}%`} sub={`${cumplen} de ${rows.length}`} />
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--graphite)' }}>Sin datos para este periodo</p>
        </div>
      ) : (
        <>
          {/* Evolution chart */}
          {evolution.length > 1 && (
            <ChartCard title="Evolución de Horas Mensuales">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolution} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke="#1f1f1f" />
                  <XAxis dataKey="month" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 10, color: '#8a8a8a' }} />
                  <Line yAxisId="left" type="monotone" dataKey="totalHoras" stroke="#dc2626" strokeWidth={2} name="Total horas" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="promedio" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" name="Prom. x bombero" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Top 10 */}
          <ChartCard title="Top 10 Bomberos">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={96} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="horas" radius={[0, 3, 3, 0]}>
                  {top10.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Two cols: Promedio por Grado + Cumplimiento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="Promedio de Horas por Grado">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gradeBars} layout="vertical" margin={{ left: 90, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={86} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="promedio" radius={[0, 3, 3, 0]}>
                    {gradeBars.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Cumplimiento Reglamentario">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={complianceData} layout="vertical" margin={{ left: 90, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={86} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="cumple" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Cumple" />
                  <Bar dataKey="noCumple" stackId="a" fill="#f43f5e" radius={[0, 3, 3, 0]} name="No cumple" />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 9, color: 'var(--graphite)', marginTop: 8 }}>
                Mínimos: Seccionario 30h, SubTeniente/Teniente 20h, Capitán 10h, Tnte Brigadier 5h, Brigadier 1h
              </p>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 14, borderRadius: 8, textAlign: 'center' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--bone)' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--steel)', marginTop: 2 }}>{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 16, borderRadius: 8 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--bone)', marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  )
}

function formatMonth(m: string): string {
  const [y, mo] = m.split('-')
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${names[parseInt(mo) - 1]} ${y}`
}
