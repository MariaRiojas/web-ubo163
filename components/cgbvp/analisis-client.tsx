'use client'

import { useState, useMemo } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart3 } from 'lucide-react'

interface Emergency {
  emergencyId: string
  fecha: string
  horaDespacho: string
  horaLlegada: string
  tipo: string
  distrito: string
  vehiculoCodigo: string
  estado: string
}

const TOOLTIP_STYLE = { backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, fontSize: 11, color: '#e8e5e0' }
const COLORS = ['#dc2626', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16']
const HOUR_COLORS: Record<string, string> = { madrugada: '#8b5cf6', mañana: '#06b6d4', tarde: '#dc2626', noche: '#f59e0b' }

function getHourFranja(h: number): string {
  if (h < 6) return 'madrugada'
  if (h < 12) return 'mañana'
  if (h < 18) return 'tarde'
  return 'noche'
}

function timeDiffMin(from: string, to: string): number | null {
  if (!from || !to) return null
  const [h1, m1] = from.split(':').map(Number)
  const [h2, m2] = to.split(':').map(Number)
  if (isNaN(h1) || isNaN(h2)) return null
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
  return diff >= 0 ? diff : null
}

export function AnalisisClient({ emergencies }: { emergencies: Emergency[] }) {
  const years = useMemo(() => [...new Set(emergencies.map(e => e.fecha?.slice(0, 4)).filter(Boolean))].sort().reverse(), [emergencies])
  const allDistritos = useMemo(() => [...new Set(emergencies.map(e => e.distrito).filter(Boolean))].sort(), [emergencies])

  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterDistrito, setFilterDistrito] = useState('')

  const filtered = useMemo(() => {
    return emergencies.filter(e => {
      if (filterYear && !e.fecha?.startsWith(filterYear)) return false
      if (filterMonth && e.fecha?.slice(5, 7) !== filterMonth) return false
      if (filterDistrito && e.distrito !== filterDistrito) return false
      return true
    })
  }, [emergencies, filterYear, filterMonth, filterDistrito])

  // KPIs
  const responseTimes = filtered.map(e => timeDiffMin(e.horaDespacho, e.horaLlegada)).filter((t): t is number => t !== null && t > 0)
  const avgResp = responseTimes.length ? Math.round(responseTimes.reduce((s, v) => s + v, 0) / responseTimes.length) : 0
  const minResp = responseTimes.length ? Math.min(...responseTimes) : 0
  const maxResp = responseTimes.length ? Math.max(...responseTimes) : 0

  // Por distrito
  const distritoCounts: Record<string, number> = {}
  for (const e of filtered) if (e.distrito) distritoCounts[e.distrito] = (distritoCounts[e.distrito] ?? 0) + 1
  const distritoData = Object.entries(distritoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))

  // Por categoría (pie)
  const tipoCounts: Record<string, number> = {}
  for (const e of filtered) if (e.tipo) tipoCounts[e.tipo] = (tipoCounts[e.tipo] ?? 0) + 1
  const tipoData = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))

  // Top 10 tipos
  const top10Tipos = Object.entries(tipoCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))

  // Por vehículo
  const vehCounts: Record<string, number> = {}
  for (const e of filtered) if (e.vehiculoCodigo) vehCounts[e.vehiculoCodigo] = (vehCounts[e.vehiculoCodigo] ?? 0) + 1
  const vehData = Object.entries(vehCounts).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }))

  // Por hora del día
  const hourCounts: number[] = Array(24).fill(0)
  for (const e of filtered) {
    if (e.horaDespacho) {
      const h = parseInt(e.horaDespacho.split(':')[0])
      if (!isNaN(h)) hourCounts[h]++
    }
  }
  const hourData = hourCounts.map((value, h) => ({ name: `${h}h`, value, color: HOUR_COLORS[getHourFranja(h)] }))

  // Por día de semana
  const dayCounts: number[] = Array(7).fill(0)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  for (const e of filtered) {
    if (e.fecha) {
      const d = new Date(e.fecha)
      if (!isNaN(d.getTime())) dayCounts[d.getDay()]++
    }
  }
  const dayData = dayCounts.map((value, i) => ({ name: dayNames[i], value, color: (i === 0 || i === 6) ? '#dc2626' : '#3b82f6' }))

  // T. Respuesta por tipo
  const respByTipo: Record<string, number[]> = {}
  for (const e of filtered) {
    const t = timeDiffMin(e.horaDespacho, e.horaLlegada)
    if (t !== null && t > 0 && e.tipo) {
      if (!respByTipo[e.tipo]) respByTipo[e.tipo] = []
      respByTipo[e.tipo].push(t)
    }
  }
  const respTipoData = Object.entries(respByTipo).map(([name, arr]) => ({
    name, value: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
  })).sort((a, b) => b.value - a.value).slice(0, 8)

  return (
    <div style={{ maxWidth: 1200, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 className="h-6 w-6" style={{ color: 'var(--red-163)' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--bone)' }}>Análisis de Emergencias</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={selectStyle}>
            <option value="">Año</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
            <option value="">Mes</option>
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filterDistrito} onChange={e => setFilterDistrito(e.target.value)} style={selectStyle}>
            <option value="">Distrito</option>
            {allDistritos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDistrito('') }} style={{ fontSize: 10, padding: '6px 10px', background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', color: 'var(--steel)', cursor: 'pointer' }}>Limpiar</button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <Kpi label="Total Emergencias" value={filtered.length} />
        <Kpi label="T. Respuesta Prom." value={`${avgResp} min`} />
        <Kpi label="Más Rápido" value={`${minResp} min`} />
        <Kpi label="Más Lento" value={`${maxResp} min`} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--graphite)' }}>Sin emergencias para este filtro</p>
        </div>
      ) : (
        <>
          {/* Row: Distrito + Categoría */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="Por Distrito">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distritoData} layout="vertical" margin={{ left: 80, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={76} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {distritoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Por Categoría">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={tipoData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2} stroke="none">
                    {tipoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top 10 tipos */}
          <ChartCard title="Top 10 Tipos de Emergencia">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10Tipos} layout="vertical" margin={{ left: 130, right: 20 }}>
                <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={126} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {top10Tipos.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row: Vehículo + Hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="Salidas por Vehículo">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={vehData} layout="vertical" margin={{ left: 70, right: 16 }}>
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={66} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {vehData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Por Hora del Día">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#8a8a8a', fontSize: 9 }} axisLine={false} interval={1} />
                  <YAxis tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {hourData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row: Día semana + T. Respuesta por tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ChartCard title="Por Día de la Semana">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dayData} margin={{ left: 10, right: 10 }}>
                  <XAxis dataKey="name" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {dayData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tiempo de Respuesta por Tipo (min)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={respTipoData} layout="vertical" margin={{ left: 110, right: 20 }}>
                  <XAxis type="number" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#e8e5e0', fontSize: 10 }} axisLine={false} width={106} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'var(--ink-deep)', border: '1px solid var(--ink-line)', padding: 14, borderRadius: 8, textAlign: 'center' }}>
      <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--bone)' }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</p>
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

const selectStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--ink-deep)', color: 'var(--bone)', border: '1px solid var(--ink-line)', padding: '6px 10px' }
