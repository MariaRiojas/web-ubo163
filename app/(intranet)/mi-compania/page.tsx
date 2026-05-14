import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { companyConfig } from "@/company.config"
import { db } from "@/lib/db"
import {
  cgbvpCompanyStatus,
  cgbvpShiftAttendance,
  cgbvpVehicles,
} from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"
import { Flame, Users, Truck, AlertTriangle, Wrench, CheckCircle2 } from "lucide-react"

const VEHICLE_STATUS: Record<string, { bg: string; color: string; label: string; dotColor: string }> = {
  "FALLA":           { bg: "rgba(220,38,38,0.10)",  color: "var(--red-glow)",    label: "CON FALLA",  dotColor: "var(--red-163)" },
  "CON FALLA":       { bg: "rgba(220,38,38,0.10)",  color: "var(--red-glow)",    label: "CON FALLA",  dotColor: "var(--red-163)" },
  "EMERGENCIA":      { bg: "rgba(245,158,11,0.10)", color: "var(--flame)",       label: "EMERG.",     dotColor: "var(--flame)" },
  "EN EMERGENCIA":   { bg: "rgba(245,158,11,0.10)", color: "var(--flame)",       label: "EMERG.",     dotColor: "var(--flame)" },
  "EN BASE":         { bg: "rgba(16,185,129,0.08)", color: "var(--emerald-glow)","label": "EN BASE",  dotColor: "var(--emerald-glow)" },
  "FUERA DE SERVICIO":{ bg: "rgba(91,101,117,0.15)", color: "var(--graphite)",   label: "FUERA",      dotColor: "var(--graphite)" },
}

export default async function MiCompaniaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [latestStatus] = await db
    .select()
    .from(cgbvpCompanyStatus)
    .orderBy(desc(cgbvpCompanyStatus.createdAt))
    .limit(1)

  const statusId = latestStatus?.id

  const [shiftPeople, vehicles] = await Promise.all([
    statusId
      ? db.select().from(cgbvpShiftAttendance).where(eq(cgbvpShiftAttendance.statusId, statusId))
      : Promise.resolve([]),
    db.select().from(cgbvpVehicles),
  ])

  const bomberos = shiftPeople.filter(p => p.tipo === "BOM").length
  const rentados = shiftPeople.filter(p => p.tipo === "REN").length
  const operativas = vehicles.filter(v => v.estado === "EN BASE" || v.estado === "EMERGENCIA").length
  const conFalla = vehicles.filter(v => v.estado === "FALLA" || v.estado === "CON FALLA").length
  const enEmergencia = vehicles.filter(v => v.estado === "EMERGENCIA" || v.estado === "EN EMERGENCIA").length

  const estadoGeneral = latestStatus?.estadoGeneral ?? "EN SERVICIO"
  const fechaStatus = latestStatus?.fechaHora ?? latestStatus?.createdAt

  return (
    <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header style={{ paddingBottom: 16, borderBottom: "1px solid var(--ink-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Flame className="h-6 w-6" style={{ color: "var(--red-163)" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em" }}>
            Mi Compañía
          </h1>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--steel)" }}>
          Cía. B. V. N.° {companyConfig.id} — {companyConfig.location.district}
        </p>
      </header>

      {/* ── Status banner ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--ink-deep)", border: "1px solid var(--ink-line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald-glow)", boxShadow: "0 0 8px var(--emerald-glow)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--emerald-glow)", letterSpacing: "0.06em" }}>
            {estadoGeneral}
          </span>
        </div>
        {fechaStatus && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--graphite)", letterSpacing: "0.06em" }}>
            {new Date(fechaStatus).toLocaleDateString("es-PE", {
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "18px 16px", textAlign: "center" }}>
          <Users className="h-5 w-5 mx-auto" style={{ color: "var(--graphite)", marginBottom: 10 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: "var(--bone)", marginBottom: 4 }}>
            {latestStatus?.personalDisponible ?? shiftPeople.length}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)" }}>
            {bomberos} BOMB. · {rentados} RENT.
          </p>
        </div>

        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "18px 16px", textAlign: "center" }}>
          <Truck className="h-5 w-5 mx-auto" style={{ color: "var(--graphite)", marginBottom: 10 }} />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: "var(--bone)", marginBottom: 4 }}>
            {operativas}
            <span style={{ fontSize: 14, color: "var(--steel)" }}>/{vehicles.length}</span>
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: conFalla > 0 ? "var(--red-glow)" : "var(--graphite)" }}>
            {conFalla > 0 ? `${conFalla} CON FALLA` : "OPERATIVAS"}
          </p>
        </div>

        <div style={{ background: "var(--ink-deep)", border: `1px solid ${enEmergencia > 0 ? "var(--red-163)" : "var(--ink-line)"}`, padding: "18px 16px", textAlign: "center" }}>
          <AlertTriangle
            className="h-5 w-5 mx-auto"
            style={{ color: enEmergencia > 0 ? "var(--red-glow)" : "var(--graphite)", marginBottom: 10 }}
          />
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: enEmergencia > 0 ? "var(--red-glow)" : "var(--bone)", marginBottom: 4 }}>
            {enEmergencia}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--graphite)" }}>
            EN EMERGENCIA
          </p>
        </div>
      </div>

      {/* ── Two columns ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Personal en Turno */}
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--ink-line)" }}>
            <Users className="h-4 w-4" style={{ color: "var(--graphite)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase" }}>
              Personal en Turno
            </span>
          </div>
          {shiftPeople.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--graphite)", padding: "8px 0" }}>Sin datos de turno disponibles.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {shiftPeople.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderLeft: "2px solid var(--red-163)",
                    background: "var(--ink-surface)",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, color: "var(--bone)", fontWeight: 500 }}>{p.nombreRaw}</span>
                      {p.esAlMando === 1 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", padding: "1px 5px", background: "rgba(196,160,98,0.15)", color: "var(--brass)", border: "1px solid rgba(196,160,98,0.3)", fontWeight: 700 }}>
                          MANDO
                        </span>
                      )}
                      {p.esPiloto === 1 && (
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", padding: "1px 5px", background: "rgba(37,99,235,0.15)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.3)", fontWeight: 700 }}>
                          PILOTO
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", marginTop: 2 }}>
                      {p.tipo === "BOM" ? "Bombero" : "Rentado"}
                    </p>
                  </div>
                  {p.horaIngreso && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--graphite)" }}>{p.horaIngreso}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado de Flota */}
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--ink-line)" }}>
            <Truck className="h-4 w-4" style={{ color: "var(--graphite)" }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase" }}>
              Estado de Flota
            </span>
          </div>
          {vehicles.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--graphite)", padding: "8px 0" }}>Sin datos de vehículos.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {vehicles.map(v => {
                const vs = VEHICLE_STATUS[v.estado ?? "EN BASE"] ?? VEHICLE_STATUS["EN BASE"]
                return (
                  <div
                    key={v.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid var(--ink-line-soft)", gap: 8 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {v.estado === "FALLA" || v.estado === "CON FALLA" ? (
                        <Wrench className="h-3.5 w-3.5" style={{ color: "var(--red-glow)" }} />
                      ) : v.estado === "EMERGENCIA" || v.estado === "EN EMERGENCIA" ? (
                        <Flame className="h-3.5 w-3.5" style={{ color: "var(--flame)" }} />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--emerald-glow)" }} />
                      )}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--bone)" }}>{v.codigo}</p>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{v.tipo}</p>
                        {v.motivo && <p style={{ fontSize: 11, color: "var(--red-glow)", marginTop: 1 }}>{v.motivo}</p>}
                      </div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", fontWeight: 700, padding: "2px 7px", background: vs.bg, color: vs.color, borderRadius: 1 }}>
                      {vs.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
