"use client"

import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const BAR_COLORS = ["#ef4444","#f97316","#22c55e","#06b6d4","#3b82f6","#a855f7","#eab308","#ec4899"]
const CATEGORY_COLORS: Record<string, string> = {
  ACCIDENTE: "#f97316", EMERGENCIA: "#3b82f6", INCENDIO: "#ef4444",
  MATERIALES: "#6b7280", RESCATE: "#22c55e", SERVICIO: "#a855f7",
}
const HOUR_COLORS: Record<string, string> = {
  Madrugada: "#a855f7", Mañana: "#06b6d4", Tarde: "#ef4444", Noche: "#f97316",
}

function getHourPeriod(h: number) {
  if (h < 6) return "Madrugada"
  if (h < 12) return "Mañana"
  if (h < 18) return "Tarde"
  return "Noche"
}

interface Props {
  year: number
  month: number
  distritoFilter: string | null
  distritosOptions: string[]
  total: number
  avgResp: number
  minResp: number
  maxResp: number
  countResp: number
  byDistrito: { name: string; count: number }[]
  byCategory: { name: string; value: number }[]
  top10Types: { name: string; count: number }[]
  byVehicle: { name: string; count: number }[]
  hourCounts: { hour: number; count: number }[]
  dayCounts: { name: string; index: number; count: number }[]
  responseByType: { name: string; minutos: number; partes: number }[]
}

export function AnalisisClient({
  year, month, distritoFilter, distritosOptions,
  total, avgResp, minResp, maxResp, countResp,
  byDistrito, byCategory, top10Types, byVehicle,
  hourCounts, dayCounts, responseByType,
}: Props) {
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const monthLabel = MONTHS[month - 1]
  const distritoLabel = distritoFilter || "Todos los distritos"

  function nav(y?: number, m?: number, d?: string | null) {
    const p = new URLSearchParams()
    p.set("anio", String(y ?? year))
    p.set("mes", String(m ?? month))
    const dist = d === undefined ? distritoFilter : d
    if (dist) p.set("distrito", dist)
    router.push(`/analisis?${p.toString()}`)
  }

  const hourData = hourCounts.map((h) => ({
    label: `${String(h.hour).padStart(2, "0")}h`,
    count: h.count,
    period: getHourPeriod(h.hour),
    fill: HOUR_COLORS[getHourPeriod(h.hour)],
  }))

  const dayData = dayCounts.map((d) => ({
    ...d,
    fill: d.index === 0 || d.index === 6 ? "#ef4444" : "#3b82f6",
    type: d.index === 0 || d.index === 6 ? "Fin de semana" : "Semana",
  }))

  const maxResp2 = Math.max(...responseByType.map((r) => r.minutos), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <MapPin className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Análisis de Emergencias</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            {distritoLabel} · {monthLabel} {year}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <select value={year} onChange={(e) => nav(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => nav(undefined, Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={distritoFilter || ""} onChange={(e) => nav(undefined, undefined, e.target.value || null)} className="h-9 rounded-md border border-input bg-background px-3 text-sm max-w-[180px]">
            <option value="">Todos los distritos</option>
            {distritosOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => router.push("/analisis")} className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="TOTAL EMERGENCIAS" value={String(total)} color="text-red-600" sub={`${distritoLabel} · ${monthLabel}`} />
        <KPI label="T. RESPUESTA PROMEDIO" value={String(avgResp)} unit="min" color="text-orange-500" sub={`${countResp} partes con datos`} />
        <KPI label="MÁS RÁPIDO" value={String(minResp)} unit="min" color="text-green-500" sub="tiempo mínimo registrado" />
        <KPI label="MÁS LENTO" value={String(maxResp)} unit="min" color="text-red-600" sub="tiempo máximo registrado" />
      </div>

      {/* Por Distrito + Por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Por Distrito">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDistrito} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v: number) => [v, "Emergencias"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byDistrito.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Por Categoría">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byCategory.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name.toUpperCase()] ?? BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 10 Tipos */}
      <Card title="Top 10 Tipos de Emergencia">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top10Types} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={200} tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 30) + "…" : v} />
              <Tooltip />
              <Bar dataKey="count" name="Emergencias" radius={[0, 4, 4, 0]}>
                {top10Types.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Salidas por Vehículo + Por Hora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Salidas por Vehículo">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVehicle} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => [v, "Salidas"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byVehicle.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Por Hora del Día">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, "Emergencias"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hourData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {Object.entries(HOUR_COLORS).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Por Día de la Semana */}
      <Card title="Por Día de la Semana">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [v, "Emergencias"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {dayData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-blue-500" /> Semana
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm bg-red-500" /> Fin de semana
            </div>
          </div>
        </div>
      </Card>

      {/* Tiempo de Respuesta por Tipo */}
      {responseByType.length > 0 && (
        <Card title="Tiempo de Respuesta por Tipo">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {responseByType.map((r, i) => {
              const pct = Math.min((r.minutos / maxResp2) * 100, 100)
              const color = r.minutos <= 5 ? "bg-green-500 text-green-600" : r.minutos <= 10 ? "bg-orange-500 text-orange-600" : "bg-red-500 text-red-600"
              const [bgColor, textColor] = color.split(" ")
              return (
                <div key={i} className="bg-gray-50 dark:bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground truncate" title={r.name}>
                    {r.name.length > 28 ? r.name.slice(0, 28) + "…" : r.name}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${textColor}`}>
                    {r.minutos}<span className="text-sm ml-0.5">min</span>
                  </p>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-muted rounded-full mt-2">
                    <div className={`h-full rounded-full ${bgColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.partes} partes con datos</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function KPI({ label, value, color, unit, sub }: {
  label: string; value: string; color?: string; unit?: string; sub: string
}) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4">
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? ""}`}>
        {value}{unit && <span className="text-lg ml-0.5">{unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
