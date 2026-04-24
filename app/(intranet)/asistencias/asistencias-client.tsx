"use client"

import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import Link from "next/link"
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts"

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

const RANK_COLORS = ["#ef4444","#f97316","#3b82f6","#6b7280"]
const GRADE_COLORS: Record<string, string> = {
  "Seccionario": "#f97316",
  "Subteniente": "#f59e0b",
  "Teniente": "#3b82f6",
  "Capitán": "#a855f7",
  "Teniente Brigadier": "#06b6d4",
  "Brigadier": "#22c55e",
  "Brigadier Mayor": "#ec4899",
  "Brigadier General": "#6366f1",
  "Aspirante": "#6b7280",
}

interface Props {
  year: number
  month: number
  activeBomberos: number
  totalHours: number
  avgHours: number
  totalDays: number
  totalEmergencies: number
  cumple: number
  compliancePct: number
  top10: { name: string; horas: number; grade: string }[]
  avgByGrade: { name: string; promedio: number }[]
  complianceByGrade: { name: string; cumple: number; noCumple: number }[]
  detail: { fullName: string; code: string; grade: string; dias: number; guardias: number; horas: number; emergencias: number; cumplimiento: number }[]
  evolution: { mes: number; anio: number; totalHoras: number; promedio: number; label: string }[]
}

export function AsistenciasClient({
  year, month, activeBomberos, totalHours, avgHours, totalDays,
  totalEmergencies, cumple, compliancePct, top10, avgByGrade,
  complianceByGrade, detail, evolution,
}: Props) {
  const router = useRouter()
  const monthLabel = MONTHS[month - 1]

  // Generate last 4 month pills
  const pills: { label: string; mes: number; anio: number }[] = []
  for (let i = 0; i < 4; i++) {
    const d = new Date(year, month - 1 - i, 1)
    pills.push({ label: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`, mes: d.getMonth() + 1, anio: d.getFullYear() })
  }

  function nav(m: number, y: number) {
    router.push(`/asistencias?mes=${m}&anio=${y}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ClipboardList className="h-6 w-6 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Informe de Asistencias</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[52px]">
            {monthLabel} {year} — cumplimiento reglamentario y actividad mensual
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {pills.map((p) => (
            <button
              key={`${p.mes}-${p.anio}`}
              onClick={() => nav(p.mes, p.anio)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                p.mes === month && p.anio === year
                  ? "bg-red-500 text-white"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI label="BOMBEROS ACTIVOS" value={String(activeBomberos)} sub={`con registro ${monthLabel?.toLowerCase()}`} />
        <KPI label="HORAS TOTALES" value={String(totalHours)} valueClass="text-red-600" sub={`promedio: ${avgHours}h`} />
        <KPI label="DÍAS DE ASISTENCIA" value={String(totalDays)} sub="suma de todos los bomberos" />
        <KPI label="EMERGENCIAS" value={String(totalEmergencies)} sub="participaciones totales" />
        <KPI label="CUMPLE REGLAMENTO" value={`${compliancePct}%`} valueClass="text-red-600" sub={`${cumple} de ${activeBomberos}`} />
      </div>

      {/* Evolution Chart */}
      <Card title="Evolución de Horas Mensuales">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}h`,
                  name === "totalHoras" ? "Total horas" : "Prom. x bombero",
                ]}
              />
              <Area yAxisId="left" type="monotone" dataKey="totalHoras" fill="#ef444433" stroke="#ef4444" strokeWidth={2} name="totalHoras" />
              <Line yAxisId="right" type="monotone" dataKey="promedio" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="promedio" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top 10 + Avg by Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top 10 Bomberos">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => [`${v}h`, "Horas"]} />
                <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={RANK_COLORS[i % RANK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Promedio de Horas por Grado">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgByGrade} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => [`${v}h`, "Promedio"]} />
                <Bar dataKey="promedio" radius={[0, 4, 4, 0]}>
                  {avgByGrade.map((entry, i) => (
                    <Cell key={i} fill={GRADE_COLORS[entry.name] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Compliance by Grade */}
      <Card title="Cumplimiento Reglamentario">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complianceByGrade} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
              <Tooltip />
              <Bar dataKey="cumple" stackId="a" fill="#22c55e" name="Cumple" radius={[0, 0, 0, 0]} />
              <Bar dataKey="noCumple" stackId="a" fill="#fda4af" name="No cumple" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          * Mínimos mensuales: Seccionario 40h · Subteniente 33h · Teniente 27h · Capitán 20h · Tnte Brigadier 17h · Brigadier 13h
        </p>
      </Card>

      {/* Detail Table */}
      <Card title="Detalle individual">
        <div className="flex justify-end mb-3">
          <Link href="/personal" className="text-sm text-red-500 hover:underline font-medium">
            Ver en Bomberos &gt;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">BOMBERO</th>
                <th className="pb-2 pr-2">GRADO</th>
                <th className="pb-2 pr-2 text-right">DÍAS</th>
                <th className="pb-2 pr-2 text-right">GUARDIAS</th>
                <th className="pb-2 pr-2 text-right">HORAS</th>
                <th className="pb-2 pr-2 text-right">EMERGENCIAS</th>
                <th className="pb-2 pl-4">CUMPLIMIENTO</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 pr-2">
                    <div className="font-medium">{r.fullName}</div>
                    <div className="text-xs text-muted-foreground">{r.code}</div>
                  </td>
                  <td className="py-2 pr-2 text-xs">{r.grade}</td>
                  <td className="py-2 pr-2 text-right">{r.dias}</td>
                  <td className="py-2 pr-2 text-right">{r.guardias}</td>
                  <td className="py-2 pr-2 text-right font-bold">{r.horas}</td>
                  <td className="py-2 pr-2 text-right">{r.emergencias}</td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${r.cumplimiento}%`,
                            backgroundColor: r.cumplimiento >= 75 ? "#22c55e" : r.cumplimiento >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{r.cumplimiento}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
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

function KPI({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub: string }) {
  return (
    <div className="bg-white dark:bg-card rounded-xl border shadow-sm p-4">
      <p className="text-[11px] font-medium text-muted-foreground tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueClass ?? ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  )
}
