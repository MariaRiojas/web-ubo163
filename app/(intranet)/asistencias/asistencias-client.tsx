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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ padding: 8, background: "rgba(220,38,38,0.10)" }}>
              <ClipboardList className="h-5 w-5" style={{ color: "var(--red-163)" }} />
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em" }}>Informe de Asistencias</h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--steel)", marginLeft: 42 }}>
            {monthLabel} {year} — cumplimiento reglamentario y actividad mensual
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {pills.map((p) => (
            <button
              key={`${p.mes}-${p.anio}`}
              onClick={() => nav(p.mes, p.anio)}
              style={{
                padding: "4px 12px",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.06em",
                fontWeight: 600,
                cursor: "pointer",
                border: p.mes === month && p.anio === year ? "1px solid var(--red-163)" : "1px solid var(--ink-line)",
                background: p.mes === month && p.anio === year ? "rgba(220,38,38,0.12)" : "var(--ink-surface)",
                color: p.mes === month && p.anio === year ? "var(--red-glow)" : "var(--steel)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
        <KPI label="BOMBEROS ACTIVOS" value={String(activeBomberos)} sub={`con registro ${monthLabel?.toLowerCase()}`} />
        <KPI label="HORAS TOTALES" value={String(totalHours)} valueClass="var(--red-glow)" sub={`promedio: ${avgHours}h`} />
        <KPI label="DÍAS DE ASISTENCIA" value={String(totalDays)} sub="suma de todos los bomberos" />
        <KPI label="EMERGENCIAS" value={String(totalEmergencies)} sub="participaciones totales" />
        <KPI label="CUMPLE REGLAMENTO" value={`${compliancePct}%`} valueClass="var(--red-glow)" sub={`${cumple} de ${activeBomberos}`} />
      </div>

      {/* Evolution Chart */}
      <Card title="Evolución de Horas Mensuales">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8B96A5" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#8B96A5" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#8B96A5" }} />
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
        <Card title="Top 10 Bomberos">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8B96A5" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={140} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8B96A5" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={140} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#232B3B" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#8B96A5" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#8B96A5" }} width={140} />
              <Tooltip />
              <Bar dataKey="cumple" stackId="a" fill="#22c55e" name="Cumple" radius={[0, 0, 0, 0]} />
              <Bar dataKey="noCumple" stackId="a" fill="#fda4af" name="No cumple" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", marginTop: 12 }}>
          * Mínimos mensuales: Seccionario 40h · Subteniente 33h · Teniente 27h · Capitán 20h · Tnte Brigadier 17h · Brigadier 13h
        </p>
      </Card>

      {/* Detail Table */}
      <Card title="Detalle individual">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <Link href="/bomberos" style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--brass)", textDecoration: "none" }}>
            VER EN BOMBEROS →
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ink-line)" }}>
                {['#', 'BOMBERO', 'GRADO', 'DÍAS', 'GUARDIAS', 'HORAS', 'EMERGENCIAS', 'CUMPLIMIENTO'].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 10px", textAlign: hi >= 3 && hi <= 6 ? "right" : "left", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)", paddingLeft: hi === 7 ? 16 : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--ink-line-soft)" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--graphite)" }}>{i + 1}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--bone)" }}>{r.fullName}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{r.code}</div>
                  </td>
                  <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--steel)" }}>{r.grade}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{r.dias}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{r.guardias}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--bone)" }}>{r.horas}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--bone)" }}>{r.emergencias}</td>
                  <td style={{ padding: "8px 10px", paddingLeft: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: "var(--ink-line)", borderRadius: 2 }}>
                        <div style={{ width: `${r.cumplimiento}%`, height: "100%", borderRadius: 2, backgroundColor: r.cumplimiento >= 75 ? "#10B981" : r.cumplimiento >= 50 ? "#F59E0B" : "#EF4444" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--bone)", minWidth: 32, textAlign: "right" }}>{r.cumplimiento}%</span>
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
    <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 20px" }}>
      <h3 style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  )
}

function KPI({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub: string }) {
  return (
    <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "16px 16px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: valueClass ?? "var(--bone)" }}>{value}</p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", marginTop: 6 }}>{sub}</p>
    </div>
  )
}
