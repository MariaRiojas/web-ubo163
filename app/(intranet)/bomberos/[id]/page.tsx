import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getBomberoProfileData } from "@/lib/bomberos/get-bomberos-data"
import { GRADE_LABEL } from "@/lib/cgbvp/grades"
import BomberoChart from "./bombero-chart"

export const dynamic = 'force-dynamic'

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

const ESTADO_COLOR: Record<string, string> = {
  DESPACHADA: "var(--flame)",
  "EN CAMINO": "var(--brass)",
  "EN ESCENA": "var(--flame)",
  CONTROLADA: "var(--emerald-glow)",
  CERRADO: "var(--steel)",
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontFamily: "var(--font-mono)",
  fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--graphite)",
}
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 12, color: "var(--steel)" }

export default async function BomberoProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const data = await getBomberoProfileData(id)
  if (!data) notFound()

  const { profile, enTurno, vecesAlMando, partesAlMando, attendance, totalHoras, totalEmergencias } = data
  const lastMonth = attendance[attendance.length - 1]

  const chartData = attendance.map(a => ({
    mes: `${MESES[a.mes]?.slice(0, 3)} ${a.anio}`,
    horas: a.horasAcumuladas ?? 0,
    emergencias: a.numEmergencias ?? 0,
  }))

  return (
    <div className="max-w-[1400px]" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Link href="/bomberos" className="btn btn--ghost btn--sm" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <ArrowLeft className="w-3 h-3" strokeWidth={1.8} /> Volver a Personal
        </Link>
      </div>

      {/* Cabecera */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, padding: 22, display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", border: "2px solid var(--brass)", color: "var(--brass)", background: "var(--ink-black)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 24, flexShrink: 0 }}>
          {initials(profile.fullName)}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--brass)" }}>
            {GRADE_LABEL[profile.grade] ?? profile.grade}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--bone)", margin: "4px 0" }}>{profile.fullName}</h1>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)" }}>
            {profile.codigoCgbvp ?? "Sin código"} · DNI {profile.dni ?? "—"}
          </div>
          {enTurno && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--emerald-glow)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald-glow)" }} /> EN TURNO
            </span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "HORAS TOTALES", value: totalHoras },
          { label: "DÍAS ÚLT. MES", value: lastMonth?.diasAsistidos ?? 0 },
          { label: "EMERGENCIAS", value: totalEmergencias },
          { label: "VECES AL MANDO", value: vecesAlMando },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--graphite)", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--bone)" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Historial mensual */}
      {chartData.length > 0 && (
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, padding: "16px 18px" }}>
          <h2 className="faena-section-title" style={{ marginBottom: 12 }}>Historial mensual</h2>
          <BomberoChart data={chartData} />
        </div>
      )}

      {/* Asistencia por mes */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, overflowX: "auto" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--ink-line)" }}>
          <h2 className="faena-section-title">Asistencia por mes</h2>
        </div>
        <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--ink-line)" }}>
              {["Mes", "Días asistidos", "Guardias", "Horas", "Emergencias"].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={a.date} style={{ borderBottom: "1px solid var(--ink-line-soft, #1D2432)" }}>
                <td style={{ ...tdStyle, color: "var(--bone)" }}>{MESES[a.mes]} {a.anio}</td>
                <td style={tdStyle}>{a.diasAsistidos ?? 0}</td>
                <td style={tdStyle}>{a.diasGuardia ?? 0}</td>
                <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", color: "var(--bone)", fontWeight: 700 }}>{a.horasAcumuladas ?? 0}h</td>
                <td style={tdStyle}>{a.numEmergencias ?? 0}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", padding: "28px", color: "var(--graphite)" }}>Sin registros de asistencia.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Partes como Jefe de Emergencia */}
      {partesAlMando.length > 0 && (
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", borderRadius: 3, overflowX: "auto" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--ink-line)" }}>
            <h2 className="faena-section-title">Partes como Jefe de Emergencia</h2>
          </div>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ink-line)" }}>
                {["N.° Parte", "Tipo", "Estado", "Fecha", "Dirección"].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {partesAlMando.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--ink-line-soft, #1D2432)" }}>
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", color: "var(--brass)" }}>{p.numeroParte}</td>
                  <td style={{ ...tdStyle, color: "var(--bone)" }}>{p.tipo ?? "—"}</td>
                  <td style={tdStyle}>
                    {p.estado ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: ESTADO_COLOR[p.estado] ?? "var(--steel)" }}>{p.estado}</span> : "—"}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {p.fechaDespacho ? new Date(p.fechaDespacho).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.direccion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
