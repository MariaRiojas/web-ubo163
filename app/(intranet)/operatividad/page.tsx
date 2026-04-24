import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  cgbvpCompanyStatus,
  cgbvpShiftAttendance,
  cgbvpVehicles,
  emergencies,
  profiles,
} from "@/lib/db/schema"
import { desc, eq, and, isNull } from "drizzle-orm"
import {
  Users,
  Truck,
  AlertTriangle,
  Siren,
  Wrench,
  Flame,
  CheckCircle2,
  CircleDot,
} from "lucide-react"
import type { Permission } from "@/lib/auth/permissions"
import { DonutChart, HorizontalBarChart } from "./operatividad-charts"

export default async function OperatividadPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const perms = (session.user.permissions ?? []) as Permission[]
  if (!perms.includes("company.view_all") && !perms.includes("company.manage"))
    redirect("/dashboard")

  // Latest company status
  const [latestStatus] = await db
    .select()
    .from(cgbvpCompanyStatus)
    .orderBy(desc(cgbvpCompanyStatus.createdAt))
    .limit(1)

  const statusId = latestStatus?.id

  // Parallel queries
  const [shiftRaw, vehicles, activeEmergencies] = await Promise.all([
    statusId
      ? db
          .select({
            id: cgbvpShiftAttendance.id,
            nombreRaw: cgbvpShiftAttendance.nombreRaw,
            tipo: cgbvpShiftAttendance.tipo,
            horaIngreso: cgbvpShiftAttendance.horaIngreso,
            esAlMando: cgbvpShiftAttendance.esAlMando,
            esPiloto: cgbvpShiftAttendance.esPiloto,
            esMedico: cgbvpShiftAttendance.esMedico,
            esAppa: cgbvpShiftAttendance.esAppa,
            esMap: cgbvpShiftAttendance.esMap,
            esBrec: cgbvpShiftAttendance.esBrec,
            profileId: cgbvpShiftAttendance.profileId,
            grade: profiles.grade,
            code: profiles.codigoCgbvp,
          })
          .from(cgbvpShiftAttendance)
          .leftJoin(profiles, eq(cgbvpShiftAttendance.profileId, profiles.id))
          .where(eq(cgbvpShiftAttendance.statusId, statusId))
      : Promise.resolve([]),
    db.select().from(cgbvpVehicles),
    db
      .select()
      .from(emergencies)
      .where(isNull(emergencies.fechaRetorno)),
  ])

  // KPI calculations
  const bomberos = shiftRaw.filter((p) => p.tipo === "BOM").length
  const rentados = shiftRaw.filter((p) => p.tipo === "REN").length
  const totalTurno = shiftRaw.length

  const operativas = vehicles.filter(
    (v) => v.estado === "EN BASE" || v.estado === "EMERGENCIA"
  ).length
  const conFalla = vehicles.filter((v) => v.estado === "FALLA").length
  const enEmergenciaV = vehicles.filter((v) => v.estado === "EMERGENCIA").length

  // Specialty counts
  const specialties = [
    { name: "Piloto", value: shiftRaw.filter((p) => p.esPiloto === 1).length },
    { name: "Médico", value: shiftRaw.filter((p) => p.esMedico === 1).length },
    { name: "APPA", value: shiftRaw.filter((p) => p.esAppa === 1).length },
    { name: "MAP", value: shiftRaw.filter((p) => p.esMap === 1).length },
    { name: "BREC", value: shiftRaw.filter((p) => p.esBrec === 1).length },
  ].filter((s) => s.value > 0)

  const fechaStatus = latestStatus?.fechaHora ?? latestStatus?.createdAt

  const GRADE_ABBR: Record<string, string> = {
    aspirante: "Asp.",
    seccionario: "Secc.",
    subteniente: "Subten.",
    teniente: "Ten.",
    capitan: "Cap.",
    teniente_brigadier: "Ten. Brig.",
    brigadier: "Brig.",
    brigadier_mayor: "Brig. Mayor",
    brigadier_general: "Brig. Gral.",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-2xl font-bold">Operatividad</h1>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            EN SERVICIO
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium text-red-600 cursor-pointer hover:underline">
            POR DESPACHO
          </span>
          <span>—</span>
          <span className="font-medium text-red-600 cursor-pointer hover:underline">
            POR INGRESO
          </span>
          {fechaStatus && (
            <span>
              {new Date(fechaStatus).toLocaleDateString("es-PE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="h-5 w-5 text-blue-500" />}
          label="EN TURNO"
          value={totalTurno}
          sub={`${bomberos} bomberos · ${rentados} rentados`}
        />
        <KpiCard
          icon={<Truck className="h-5 w-5 text-blue-500" />}
          label="FLOTA OPERATIVA"
          value={`${operativas}/${vehicles.length}`}
          sub={`${conFalla} con desperfectos`}
        />
        <KpiCard
          icon={
            <AlertTriangle
              className={`h-5 w-5 ${activeEmergencies.length > 0 ? "text-red-500" : "text-muted-foreground"}`}
            />
          }
          label="EMERGENCIAS ACTIVAS"
          value={activeEmergencies.length}
          sub=""
          highlight={activeEmergencies.length > 0}
        />
        <KpiCard
          icon={<CircleDot className="h-5 w-5 text-green-500" />}
          label="PILOTOS DISPONIBLES"
          value={latestStatus?.pilotosDisponibles ?? 0}
          sub=""
        />
      </div>

      {/* 3 Chart Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold mb-1">Estado de Flota</p>
          <p className="text-xs text-muted-foreground mb-3">
            {vehicles.length} unidades registradas
          </p>
          <DonutChart
            data={[
              { name: "Con desperfectos", value: conFalla, color: "#dc2626" },
              { name: "En emergencia", value: enEmergenciaV, color: "#f59e0b" },
              {
                name: "Operativas",
                value: vehicles.filter((v) => v.estado === "EN BASE").length,
                color: "#22c55e",
              },
            ]}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold mb-1">Composición del Turno</p>
          <p className="text-xs text-muted-foreground mb-3">
            {totalTurno} efectivos presentes
          </p>
          <DonutChart
            data={[
              { name: "Bomberos", value: bomberos, color: "#3b82f6" },
              { name: "Pilotos Rent.", value: rentados, color: "#8b5cf6" },
            ]}
          />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold mb-1">Especialidades en Turno</p>
          <p className="text-xs text-muted-foreground mb-3">Roles activos</p>
          {specialties.length > 0 ? (
            <HorizontalBarChart data={specialties} />
          ) : (
            <p className="text-xs text-muted-foreground">Sin especialidades registradas</p>
          )}
        </div>
      </div>

      {/* Two columns: Personal + Unidades/Emergencias */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Personal en Turno */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Personal en Turno
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {totalTurno}
            </span>
          </div>
          {shiftRaw.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos de turno.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {shiftRaw.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-l-4 border-blue-500 pl-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.nombreRaw}</span>
                      {p.esAlMando === 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold">
                          MANDO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.grade ? GRADE_ABBR[p.grade] ?? p.grade : p.tipo === "BOM" ? "Bombero" : "Rentado"}
                      {p.code && ` · ${p.code}`}
                    </p>
                  </div>
                  {p.horaIngreso && (
                    <span className="text-xs text-muted-foreground">{p.horaIngreso}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Unidades */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4" /> Unidades
              </h2>
              <span className="text-xs text-muted-foreground">
                {vehicles.length} registradas
              </span>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin vehículos.</p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {vehicles.map((v) => {
                  const badge =
                    v.estado === "FALLA"
                      ? { label: "FALLA", cls: "bg-red-100 text-red-700" }
                      : v.estado === "EMERGENCIA"
                        ? { label: "EMERG.", cls: "bg-yellow-100 text-yellow-700" }
                        : v.estado === "EN BASE"
                          ? { label: "EN BASE", cls: "bg-green-100 text-green-700" }
                          : { label: "FUERA", cls: "bg-red-100 text-red-700" }

                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        {v.estado === "FALLA" ? (
                          <Wrench className="h-4 w-4 text-red-500" />
                        ) : v.estado === "EMERGENCIA" ? (
                          <Flame className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        <div>
                          <p className="text-sm font-bold">{v.codigo}</p>
                          <p className="text-xs text-muted-foreground">{v.tipo}</p>
                          {v.motivo && (
                            <p className="text-xs text-red-500">{v.motivo}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Emergencias Activas */}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Siren className="h-4 w-4" /> Emergencias Activas
            </h2>
            {activeEmergencies.length === 0 ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Sin emergencias en atención</span>
              </div>
            ) : (
              <div className="space-y-2">
                {activeEmergencies.map((e) => (
                  <div
                    key={e.id}
                    className="border-l-4 border-red-500 pl-3 py-2"
                  >
                    <p className="text-sm font-medium">{e.numeroParte}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.tipo} — {e.direccion}
                    </p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-semibold">
                      {e.estado}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 text-center ${highlight ? "border-red-400" : ""}`}
    >
      <div className="flex justify-center mb-2">{icon}</div>
      <p className={`text-2xl font-bold ${highlight ? "text-red-600" : ""}`}>
        {value}
      </p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">
        {label}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
