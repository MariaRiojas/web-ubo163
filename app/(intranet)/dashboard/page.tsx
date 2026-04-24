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
  Trophy,
  Medal,
  Clock,
  CalendarDays,
  Siren,
  Hash,
  Moon,
  BookOpen,
  GraduationCap,
  Building2,
  FileText,
  Settings,
  Shield,
  Package,
} from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────

function getGreeting(hour: number) {
  if (hour >= 6 && hour < 12) return "Buenos días"
  if (hour >= 12 && hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

function formatDateES(d: Date) {
  const dias = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"]
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
  return `${dias[d.getDay()]}, ${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function metaHorasMensual(grade: string): number {
  const quarterly = MIN_HOURS_PER_QUARTER[grade as Grade] ?? 120
  return Math.round(quarterly / 3)
}

const estadoBadge: Record<string, string> = {
  "EN BASE": "bg-gray-100 text-gray-700",
  "CON FALLA": "bg-red-100 text-red-700",
  "EN EMERG.": "bg-blue-100 text-blue-700",
  "EN EMERGENCIA": "bg-blue-100 text-blue-700",
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

  // Previous month for ranking
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth() // 1-12
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()

  // ── Parallel queries ──────────────────────────────────────────
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

  // Current user stats (for efectivo mode)
  const myRankingIdx = rankingRows.findIndex(r => r.profileId === profileId)
  let myStats = rankingRows[myRankingIdx]

  // If user not in top 10, fetch their data separately
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

  // Full ranking position for current user
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

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"]

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground tracking-widest">{dateStr}</p>
          <h1 className="text-2xl font-bold mt-1">
            {greeting}, {isJefatura ? email : name}
          </h1>
          <p className="text-sm text-muted-foreground">{companyConfig.shortName}</p>
        </div>
        <div>
          {emergenciasActivas > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              <Flame className="w-3.5 h-3.5" />
              {emergenciasActivas} emergencia{emergenciasActivas > 1 ? "s" : ""} activa{emergenciasActivas > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              <Activity className="w-3.5 h-3.5" />
              Sin emergencias activas
            </span>
          )}
        </div>
      </div>

      {/* ── Estado de la Compañía ──────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <h2 className="font-semibold text-sm">Estado de la Compañía</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5">
          <KPI label="ESTADO" value="EN SERVICIO" valueClass="text-green-600" icon={<Activity className="w-4 h-4 text-green-600" />} />
          <KPI label="EN TURNO" value={String(enTurno)} icon={<Users className="w-4 h-4 text-blue-600" />} />
          <KPI label="FLOTA OPERATIVA" value={`${flotaOperativa}/${flotaTotal}`} icon={<Truck className="w-4 h-4 text-indigo-600" />} />
          <KPI label="EMERGENCIAS ACTIVAS" value={String(emergenciasActivas)} valueClass={emergenciasActivas > 0 ? "text-red-600" : undefined} icon={<Siren className="w-4 h-4 text-red-600" />} />
        </div>
      </div>

      {/* ── Alert banner ──────────────────────────────────────── */}
      {emergenciasActivas > 0 && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-yellow-400 bg-yellow-50 px-5 py-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm font-medium text-yellow-800 flex-1">
            {emergenciasActivas} emergencia{emergenciasActivas > 1 ? "s" : ""} activa{emergenciasActivas > 1 ? "s" : ""} en este momento
          </p>
          <Link href="/mi-compania" className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 whitespace-nowrap">
            Ver ahora →
          </Link>
        </div>
      )}

      {/* ── Efectivo: Personal KPIs ───────────────────────────── */}
      {!isJefatura && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metaCumplida && (
            <div className="col-span-2 md:col-span-1 rounded-xl border bg-green-50 border-green-200 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-2xl">🏆</span>
              <p className="text-xs font-bold text-green-700 mt-1">¡Meta cumplida!</p>
            </div>
          )}
          <PersonalKPI label="MIS HORAS" value={`${myHoras}h`} sub={`Meta: ${myMeta}h · ${myPct}%`} icon={<Clock className="w-4 h-4" />} />
          <PersonalKPI label="DÍAS ASISTIDOS" value={String(myStats?.diasAsistidos ?? 0)} icon={<CalendarDays className="w-4 h-4" />} />
          <PersonalKPI label="MIS EMERGENCIAS" value={String(myStats?.numEmergencias ?? 0)} icon={<Flame className="w-4 h-4" />} />
          <PersonalKPI label="MI POSICIÓN" value={myPosition ? `#${myPosition}` : "—"} sub="ranking de horas" icon={<Hash className="w-4 h-4" />} />
        </div>
      )}

      {/* ── Jefatura: Estado de Flota ─────────────────────────── */}
      {isJefatura && vehicles.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="px-5 pt-4 pb-2">
            <h2 className="font-semibold text-sm">Estado de Flota</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 px-5 pb-5">
            {vehicles.map(v => (
              <div key={v.id} className="rounded-lg border p-3 text-center space-y-1">
                <Truck className="w-5 h-5 mx-auto text-muted-foreground" />
                <p className="text-sm font-bold">{v.codigo}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{v.tipo ?? "—"}</p>
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${estadoBadge[v.estado ?? "EN BASE"] ?? "bg-gray-100 text-gray-700"}`}>
                  {v.estado === "EN EMERGENCIA" ? "EN EMERG." : v.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ranking de Asistencia ─────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-semibold text-sm">Ranking de Asistencia — {monthName(prevMonth)} {prevYear}</h2>
          {!isJefatura && myPosition && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted">
              Tu posición: #{myPosition}
            </span>
          )}
        </div>
        <div className="px-5 pb-5 space-y-2">
          {rankingRows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin datos de asistencia para este período.</p>
          )}
          {rankingRows.map((r, i) => {
            const isMe = r.profileId === profileId
            const meta = metaHorasMensual(r.grade)
            const pct = meta > 0 ? Math.min(Math.round(((r.horasAcumuladas ?? 0) / meta) * 100), 100) : 0
            return (
              <div
                key={r.profileId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isMe && !isJefatura ? "border-l-4 border-red-500 bg-red-50/50" : "hover:bg-muted/50"}`}
              >
                {/* Position / Medal */}
                <div className="w-7 text-center shrink-0">
                  {i < 3 ? (
                    <Medal className={`w-5 h-5 mx-auto ${medalColors[i]}`} />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {initials(r.fullName)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{r.fullName}</p>
                    {isMe && !isJefatura && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">TÚ</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {pct}% meta {r.diasAsistidos ?? 0}d · {r.numEmergencias ?? 0} emerg.
                    </span>
                  </div>
                </div>

                {/* Hours */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{r.horasAcumuladas ?? 0}h</p>
                  <p className="text-[10px] text-muted-foreground">de {meta}h</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Accesos Rápidos ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <QuickLink href="/guardia-nocturna" icon={Moon} label="Guardia Nocturna" />
        <QuickLink href="/incidencias" icon={AlertTriangle} label="Incidencias" />
        <QuickLink href="/esbas" icon={GraduationCap} label="ESBAS" />
        <QuickLink href="/horas" icon={Clock} label="Jornada Voluntaria" />
        {permissions.includes("personnel.view_section") && (
          <QuickLink href="/personal" icon={Users} label="Personal" />
        )}
        {permissions.includes("inventory.view") && (
          <QuickLink href="/inventario" icon={Package} label="Inventario" />
        )}
        {permissions.includes("section.manage") && (
          <QuickLink href="/secciones" icon={Building2} label="Secciones" />
        )}
        {permissions.includes("reports.view_section") && (
          <QuickLink href="/reportes" icon={FileText} label="Reportes" />
        )}
        {permissions.includes("system.admin") && (
          <QuickLink href="/configuracion" icon={Settings} label="Configuración" />
        )}
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-red-200 hover:bg-red-50/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-red-600" />
      </div>
      <span className="text-sm font-medium truncate">{label}</span>
    </Link>
  )
} 

// ── Sub-components ───────────────────────────────────────────────

function KPI({ label, value, valueClass, icon }: { label: string; value: string; valueClass?: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold tracking-wider uppercase">{label}</span>
      </div>
      <p className={`text-xl font-bold ${valueClass ?? ""}`}>{value}</p>
    </div>
  )
}

function PersonalKPI({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold tracking-wider uppercase">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function monthName(m: number) {
  const names = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  return names[m] ?? ""
}
