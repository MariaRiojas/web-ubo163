"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { BarChart3 } from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts"

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const CATEGORY_COLORS: Record<string, string> = {
  "ACCIDENTE VEHICULAR": "#f97316",
  "EMERGENCIA MEDICA": "#3b82f6",
  "INCENDIO": "#ef4444",
  "INCENDIO ESTRUCTURAL": "#ef4444",
  "INCENDIO FORESTAL": "#dc2626",
  "MATERIALES PELIGROSOS": "#6b7280",
  "RESCATE": "#22c55e",
}
const DEFAULT_PIE_COLOR = "#a855f7"

const VEHICLE_COLORS = ["#22c55e","#06b6d4","#ef4444","#f97316","#3b82f6","#a855f7","#eab308","#ec4899"]

interface Props {
  year: number
  month: number
  total: number
  cerradas: number
  tipoFrecuente: { name: string; count: number } | null
  avgResponseMin: number
  peakHour: number
  peakCount: number
  dailyCounts: { dia: number; cantidad: number }[]
  categoryDist: { name: string; value: number }[]
  responseByType: { name: string; minutos: number }[]
  vehicleUsage: { name: string; cantidad: number }[]
  topMando: { name: string; cantidad: number }[]
}

export function EstadisticasClient({
  year, month, total, cerradas, tipoFrecuente, avgResponseMin,
  peakHour, peakCount, dailyCounts, categoryDist, responseByType,
  vehicleUsage, topMando,
}: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  function navigate(m?: number, y?: number) {
    const p = new URLSearchParams()
    const newM = m ?? month
    const newY = y ?? year
    p.set("mes", String(newM))
    p.set("anio", String(newY))
    router.push(`/estadisticas?${p.toString()}`)
  }

  function clear() {
    router.push("/estadisticas")
  }

  const monthLabel = MONTHS[month - 1]?.toUpperCase() ?? ""

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Estadísticas Operacionales</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            Resumen de actividad y rendimiento — {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={year}
            onChange={(e) => navigate(undefined, Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={month}
            onChange={(e) => navigate(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <button
            onClick={clear}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label={`TOTAL ${monthLabel} ${year}`} value={String(total)} valueClass="text-red-600" sub={`${cerradas} cerradas`} />
        <KPI label="TIPO MÁS FRECUENTE" value={tipoFrecuente ? String(tipoFrecuente.count) : "—"} valueClass="text-orange-500" sub={tipoFrecuente?.name ?? "sin datos"} />
        <KPI label="T. RESPUESTA PROM." value={`${avgResponseMin}`} valueClass="text-red-600" unit="min" sub="despacho → llegada" />
        <KPI label="HORA PICO" value={`${String(peakHour).padStart(2, "0")}:00`} sub={`${peakCount} ef. prom. por salida`} />
      </div>

      {/* Daily Activity */}
      <Card title="Actividad Diaria">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => [v, "Emergencias"]} labelFormatter={(l) => `Día ${l}`} />
              <Line type="monotone" dataKey="cantidad" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category + Response Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Distribución por Categoría">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {categoryDist.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name.toUpperCase()] ?? DEFAULT_PIE_COLOR} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Tiempo de Respuesta">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseByType} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} unit=" min" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => [`${v} min`, "Tiempo"]} />
                <Bar dataKey="minutos" radius={[0, 4, 4, 0]}>
                  {responseByType.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name.toUpperCase()] ?? "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Vehicle Usage + Al Mando */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Uso de Unidades">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [v, "Salidas"]} />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {vehicleUsage.map((_, i) => (
                    <Cell key={i} fill={VEHICLE_COLORS[i % VEHICLE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Efectivos al Mando">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMando} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => [v, "Emergencias"]} />
                <Bar dataKey="cantidad" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Reusable components ──────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function KPI({ label, value, valueClass, unit, sub }: {
  label: string; value: string; valueClass?: string; unit?: string; sub: string
}) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4">
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass ?? ""}`}>
        {value}{unit && <span className="text-lg ml-0.5">{unit}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
