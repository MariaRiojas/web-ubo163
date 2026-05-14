import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  cgbvpCompanyStatus,
  cgbvpVehicles,
  cgbvpAttendance,
  emergencies,
  profiles,
} from "@/lib/db/schema"
import { eq, ne, desc, and, sql } from "drizzle-orm"
import { companyConfig } from "@/company.config"
import { MIN_HOURS_PER_QUARTER } from "@/lib/cgbvp/requirements"
import { GRADE_LABEL, type Grade } from "@/lib/cgbvp/grades"
import type { Permission } from "@/lib/auth/permissions"
import Link from "next/link"
import {
  AlertTriangle,
  Truck,
  Users,
  Flame,
  Activity,
  Medal,
  Clock,
  CalendarDays,
  Siren,
  Hash,
  Moon,
  GraduationCap,
  Building2,
  FileText,
  Settings,
  Package,
  Wrench,
  CheckCircle2,
} from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────

function getGreeting(hour: number) {
  if (hour >= 6 && hour < 12) return "Buenos días"
  if (hour >= 12 && hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

function formatDateES(d: Date) {
  const dias = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"]
  const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]
  return `${dias[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}·${meses[d.getMonth()]}·${d.getFullYear()}`
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function metaHorasMensual(grade: string): number {
  const quarterly = MIN_HOURS_PER_QUARTER[grade as Grade] ?? 120
  return Math.round(quarterly / 3)
}

function monthName(m: number) {
  const names = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  return names[m] ?? ""
}

const VEHICLE_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  "EN BASE":       { bg: "rgba(16,185,129,0.10)",  color: "var(--emerald-glow)", label: "EN BASE" },
  "CON FALLA":     { bg: "rgba(220,38,38,0.12)",   color: "var(--red-glow)",    label: "CON FALLA" },
  "EN EMERG.":     { bg: "rgba(245,158,11,0.12)",  color: "var(--flame)",       label: "EN EMERG." },
  "EN EMERGENCIA": { bg: "rgba(245,158,11,0.12)",  color: "var(--flame)",       label: "EN EMERG." },
}

// ── Page ─────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, email, permissions: rawPerms, profileId, grade } = session.user
  const permissions = rawPerms as Permission[]
  const isJefatura = permissions.includes("company.manage") || permissions.includes("company.view_all")

  const now = new Date()
  const hour = now.getHours()
  const greeting = getGreeting(hour)
  const dateStr = formatDateES(now)

  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  const [latestStatus, vehicles, activeEmergencies, rankingRows] = await Promise.all([
    db.select().from(cgbvpCompanyStatus).orderBy(desc(cgbvpCompanyStatus.createdAt)).limit(1),
    db.select().from(cgbvpVehicles).orderBy(cgbvpVehicles.codigo),
    db.select().from(emergencies).where(ne(emergencies.estado, "CERRADO")),
    db
      .select({
        profileId: cgbvpAttendance.profileId,
        horasAcumuladas: cgbvpAttendance.horasAcumuladas,
        diasAsistidos: cgbvpAttendance.diasAsistidos,
        numEmergencias: cgbvpAttendance.numEmergencias,
        fullName: profiles.fullName,
        grade: profiles.grade,
        avatarUrl: profiles.avatarUrl,
      })
      .from(cgbvpAttendance)
      .innerJoin(profiles, eq(cgbvpAttendance.profileId, profiles.id))
      .where(and(eq(cgbvpAttendance.mes, prevMonth), eq(cgbvpAttendance.anio, prevYear)))
      .orderBy(desc(cgbvpAttendance.horasAcumuladas))
      .limit(10),
  ])

  const status = latestStatus[0]
  const enTurno = status?.personalDisponible ?? 0
  const flotaOperativa = vehicles.filter(v => v.estado === "EN BASE").length
  const flotaTotal = vehicles.length
  const emergenciasActivas = activeEmergencies.length

  const myRankingIdx = rankingRows.findIndex(r => r.profileId === profileId)
  let myStats = rankingRows[myRankingIdx]

  if (!myStats) {
    const [row] = await db
      .select({
        profileId: cgbvpAttendance.profileId,
        horasAcumuladas: cgbvpAttendance.horasAcumuladas,
        diasAsistidos: cgbvpAttendance.diasAsistidos,
        numEmergencias: cgbvpAttendance.numEmergencias,
        fullName: profiles.fullName,
        grade: profiles.grade,
        avatarUrl: profiles.avatarUrl,
      })
      .from(cgbvpAttendance)
      .innerJoin(profiles, eq(cgbvpAttendance.profileId, profiles.id))
      .where(and(
        eq(cgbvpAttendance.profileId, profileId),
        eq(cgbvpAttendance.mes, prevMonth),
        eq(cgbvpAttendance.anio, prevYear),
      ))
      .limit(1)
    myStats = row ?? null
  }

  let myPosition: number | null = null
  if (!isJefatura) {
    if (myRankingIdx >= 0) {
      myPosition = myRankingIdx + 1
    } else {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(cgbvpAttendance)
        .where(and(
          eq(cgbvpAttendance.mes, prevMonth),
          eq(cgbvpAttendance.anio, prevYear),
          sql`${cgbvpAttendance.horasAcumuladas} > ${myStats?.horasAcumuladas ?? 0}`,
        ))
      myPosition = (countResult?.count ?? 0) + 1
    }
  }

  const myHoras = myStats?.horasAcumuladas ?? 0
  const myMeta = metaHorasMensual(grade)
  const myPct = myMeta > 0 ? Math.min(Math.round((myHoras / myMeta) * 100), 100) : 0
  const metaCumplida = myHoras >= myMeta

  // Medal accent colors — brass for gold, steel for silver, brass-deep for bronze
  const medalAccents = ["var(--brass)", "var(--steel)", "var(--brass-deep)"]

  return (
    <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 6 }}>
            {dateStr}
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--bone)", letterSpacing: "-0.015em", marginBottom: 4 }}>
            {greeting}, {isJefatura ? email : name}
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", letterSpacing: "0.04em" }}>
            {companyConfig.shortName}
          </p>
        </div>

        {emergenciasActivas > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid var(--red-163)", background: "rgba(220,38,38,0.12)", color: "var(--red-glow)", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600 }}>
            <Flame className="w-3.5 h-3.5" />
            {emergenciasActivas} EMERGENCIA{emergenciasActivas > 1 ? "S" : ""} ACTIVA{emergenciasActivas > 1 ? "S" : ""}
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "var(--emerald-glow)", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600 }}>
            <Activity className="w-3.5 h-3.5" />
            SIN EMERGENCIAS ACTIVAS
          </span>
        )}
      </div>

      {/* ── Alert banner ──────────────────────────────────────── */}
      {emergenciasActivas > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: "1px solid var(--red-163)", background: "rgba(220,38,38,0.06)" }}>
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--red-glow)" }} />
          <p style={{ flex: 1, fontSize: 13, color: "var(--bone)" }}>
            {emergenciasActivas} emergencia{emergenciasActivas > 1 ? "s" : ""} activa{emergenciasActivas > 1 ? "s" : ""} en este momento
          </p>
          <Link href="/mi-compania" style={{ fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--red-glow)", fontWeight: 600, textDecoration: "none" }}>
            VER AHORA →
          </Link>
        </div>
      )}

      {/* ── Estado de la Compañía ──────────────────────────────── */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald-glow)", boxShadow: "0 0 8px var(--emerald-glow)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase" }}>Estado de la Compañía</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          <KpiStat label="ESTADO" value="EN SERVICIO" color="var(--emerald-glow)" icon={<Activity className="w-3.5 h-3.5" />} />
          <KpiStat label="EN TURNO" value={String(enTurno)} icon={<Users className="w-3.5 h-3.5" />} />
          <KpiStat label="FLOTA OPERATIVA" value={`${flotaOperativa}/${flotaTotal}`} icon={<Truck className="w-3.5 h-3.5" />} />
          <KpiStat label="EMERGENCIAS ACTIVAS" value={String(emergenciasActivas)} color={emergenciasActivas > 0 ? "var(--red-glow)" : undefined} icon={<Siren className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* ── Efectivo: Personal KPIs ───────────────────────────── */}
      {!isJefatura && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {metaCumplida && (
            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <p style={{ fontSize: 20 }}>🏆</p>
              <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--emerald-glow)", fontWeight: 600 }}>¡META CUMPLIDA!</p>
            </div>
          )}
          <PersonalKPI label="MIS HORAS" value={`${myHoras}h`} sub={`Meta: ${myMeta}h · ${myPct}%`} icon={<Clock className="w-3.5 h-3.5" />} />
          <PersonalKPI label="DÍAS ASISTIDOS" value={String(myStats?.diasAsistidos ?? 0)} icon={<CalendarDays className="w-3.5 h-3.5" />} />
          <PersonalKPI label="EMERGENCIAS" value={String(myStats?.numEmergencias ?? 0)} icon={<Flame className="w-3.5 h-3.5" />} />
          <PersonalKPI label="MI POSICIÓN" value={myPosition ? `#${myPosition}` : "—"} sub="ranking de horas" icon={<Hash className="w-3.5 h-3.5" />} />
        </div>
      )}

      {/* ── Jefatura: Estado de Flota ─────────────────────────── */}
      {isJefatura && vehicles.length > 0 && (
        <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 24px" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 16 }}>
            Estado de Flota
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {vehicles.map(v => {
              const estilo = VEHICLE_STATUS_STYLE[v.estado ?? "EN BASE"] ?? VEHICLE_STATUS_STYLE["EN BASE"]
              return (
                <div key={v.id} style={{ border: "1px solid var(--ink-line)", padding: "12px 10px", textAlign: "center", background: "var(--ink-surface)" }}>
                  <Truck className="w-4 h-4 mx-auto" style={{ color: "var(--graphite)", marginBottom: 6 }} />
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--bone)", marginBottom: 2 }}>{v.codigo}</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", letterSpacing: "0.1em", marginBottom: 6 }}>{v.tipo ?? "—"}</p>
                  <span style={{ display: "inline-block", padding: "2px 8px", background: estilo.bg, color: estilo.color, fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", fontWeight: 600, borderRadius: 1 }}>
                    {estilo.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Ranking de Asistencia ─────────────────────────────── */}
      <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--graphite)", textTransform: "uppercase" }}>
            Ranking de Asistencia — {monthName(prevMonth)} {prevYear}
          </p>
          {!isJefatura && myPosition && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--steel)", padding: "2px 8px", border: "1px solid var(--ink-line)" }}>
              Tu posición: #{myPosition}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {rankingRows.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--graphite)", padding: "16px 0", textAlign: "center" }}>
              Sin datos de asistencia para este período.
            </p>
          )}
          {rankingRows.map((r, i) => {
            const isMe = r.profileId === profileId
            const meta = metaHorasMensual(r.grade)
            const pct = meta > 0 ? Math.min(Math.round(((r.horasAcumuladas ?? 0) / meta) * 100), 100) : 0
            return (
              <div
                key={r.profileId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: isMe && !isJefatura ? "rgba(220,38,38,0.06)" : "transparent",
                  borderLeft: isMe && !isJefatura ? "3px solid var(--red-163)" : "3px solid transparent",
                }}
              >
                {/* Position */}
                <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {i < 3 ? (
                    <Medal className="w-4 h-4 mx-auto" style={{ color: medalAccents[i] }} />
                  ) : (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--graphite)", fontWeight: 700 }}>{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--ink-elevated)", border: "1px solid var(--ink-line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--steel)" }}>{initials(r.fullName)}</span>
                </div>

                {/* Name + progress */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 13, color: "var(--bone)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.fullName}</p>
                    {isMe && !isJefatura && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, padding: "1px 6px", background: "rgba(220,38,38,0.15)", color: "var(--red-glow)", border: "1px solid var(--red-163)", borderRadius: 1, letterSpacing: "0.08em", flexShrink: 0 }}>TÚ</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 3, background: "var(--ink-line)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--red-163)", borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)", whiteSpace: "nowrap" }}>
                      {pct}% · {r.diasAsistidos ?? 0}d · {r.numEmergencias ?? 0} emerg.
                    </span>
                  </div>
                </div>

                {/* Hours */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--bone)" }}>{r.horasAcumuladas ?? 0}h</p>
                  <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>de {meta}h</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Accesos Rápidos ─────────────────────────────────── */}
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", color: "var(--graphite)", textTransform: "uppercase", marginBottom: 12 }}>
          Accesos rápidos
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          <QuickLink href="/guardia-nocturna" icon={Moon} label="Guardia Nocturna" />
          <QuickLink href="/faena" icon={CheckCircle2} label="Faena y Servicio" />
          <QuickLink href="/capacitacion" icon={GraduationCap} label="Capacitación" />
          {permissions.includes("personnel.view_section") && (
            <QuickLink href="/personal" icon={Users} label="Personal" />
          )}
          {permissions.includes("inventory.view") && (
            <QuickLink href="/inventario" icon={Package} label="Inventario" />
          )}
          {permissions.includes("section.manage") && (
            <QuickLink href="/areas" icon={Building2} label="Áreas" />
          )}
          {permissions.includes("reports.view_section") && (
            <QuickLink href="/reportes" icon={FileText} label="Reportes" />
          )}
          {permissions.includes("system.admin") && (
            <QuickLink href="/configuracion" icon={Settings} label="Configuración" />
          )}
        </div>
      </div>

    </div>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "var(--ink-deep)",
        border: "1px solid var(--ink-line)",
        textDecoration: "none",
        transition: "border-color 150ms",
      }}
    >
      <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(220,38,38,0.08)", flexShrink: 0 }}>
        <Icon className="w-4 h-4" style={{ color: "var(--red-163)" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--bone)", fontWeight: 500 }}>{label}</span>
    </Link>
  )
}

function KpiStat({ label, value, color, icon }: { label: string; value: string; color?: string; icon: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, color: "var(--graphite)" }}>
        {icon}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: color ?? "var(--bone)", letterSpacing: "-0.01em" }}>{value}</p>
    </div>
  )
}

function PersonalKPI({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: "var(--ink-deep)", border: "1px solid var(--ink-line)", padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--graphite)" }}>
        {icon}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--bone)", marginBottom: sub ? 4 : 0 }}>{value}</p>
      {sub && <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--graphite)" }}>{sub}</p>}
    </div>
  )
}
