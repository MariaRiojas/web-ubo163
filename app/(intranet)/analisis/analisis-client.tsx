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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ padding: 8, background: "rgba(220,38,38,0.10)" }}>
              <MapPin className="h-5 w-5" style={{ color: "var(--red-163)" }} />
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em" }}>Análisis de Emergencias</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--steel)", marginLeft: 42 }}>
            {distritoLabel} · {monthLabel} {year}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <select value={year} onChange={(e) => nav(Number(e.target.value))} style={{ height: 34, border: "1px solid var(--ink-line)", background: "var(--ink-surface)", color: "var(--bone)", padding: "0 10px", fontSize: 12 }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => nav(undefined, Number(e.target.value))} style={{ height: 34, border: "1px solid var(--ink-line)", background: "var(--ink-surface)", color: "var(--bone)", padding: "0 10px", fontSize: 12 }}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={distritoFilter || ""} onChange={(e) => nav(undefined, undefined, e.target.value || null)} style={{ height: 34, border: "1px solid var(--ink-line)", background: "var(--ink-surface)", color: "var(--bone)", padding: "0 10px", fontSize: 12, maxWidth: 180 }}>
            <option value="">Todos los distritos</option>
            {distritosOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => router.push("/analisis")} style={{ height: 34, padding: "0 12px", border: "1px solid var(--ink-line)", background: "var(--ink-surface)", color: "var(--steel)", fontSize: 12, cursor: "pointer" }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        <KPI label="TOTAL EMERGENCIAS" value={String(total)} color="var(--red-glow)" sub={`${distritoLabel} · ${monthLabel}`} />
        <KPI label="T. RESPUESTA PROMEDIO" value={String(avgResp)} unit="min" color="var(--flame)" sub={`${countResp} partes con datos`} />
        <KPI label="MÁS RÁPIDO" value={String(minResp)} unit="min" color="var(--emerald-glow)" sub="tiempo mínimo registrado" />
        <KPI label="MÁS LENTO" value={String(maxResp)} unit="min" color="var(--red-glow)" sub="tiempo máximo registrado" />
      </div>

      {/* Por Distrito + Por Categoría */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
        <Card title="Por Distrito">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDistrito} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={120} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={200} tickFormatter={(v: string) => v.length > 30 ? v.slice(0, 30) + "…" : v} />
              <Tooltip />
              <Bar dataKey="count" name="Emergencias" radius={[0, 4, 4, 0]}>
                {top10Types.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Salidas por Vehículo + Por Hora */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
        <Card title="Salidas por Vehículo">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVehicle} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={100} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8B96A5" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8B96A5" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {responseByType.map((r, i) => {
              const pct = Math.min((r.minutos / maxResp2) * 100, 100)
              const barColor = r.minutos <= 5 ? "#10B981" : r.minutos <= 10 ? "#F59E0B" : "#EF4444"
              const textColor = r.minutos <= 5 ? "var(--emerald-glow)" : r.minutos <= 10 ? "var(--flame)" : "var(--red-glow)"
              return (
                <div key={i} style={{ background: "var(--ink-surface)", border: "1px solid var(--ink-line)", padding: "12px 12px" }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>
                    {r.name.length > 28 ? r.name.slice(0, 28) + "…" : r.name}
                  </p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: textColor, marginBottom: 8 }}>
                    {r.minutos}<span style={{ fontSize: 11 }}>min</span>
                  </p>
                  <div style={{ height: 3, background: "var(--ink-line)", borderRadius: 2, marginBottom: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
                  </div>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{r.partes} partes con datos</p>
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
    <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 20px" }}>
      <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  )
}

function KPI({ label, value, color, unit, sub }: {
  label: string; value: string; color?: string; unit?: string; sub: string
}) {
  return (
    <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "16px 16px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: color ?? "var(--bone)" }}>
        {value}{unit && <span style={{ fontSize: 14 }}>{unit}</span>}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", marginTop: 6 }}>{sub}</p>
    </div>
  )
}
