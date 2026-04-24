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
import {
  Flame,
  Users,
  Truck,
  AlertTriangle,
  Wrench,
  CheckCircle2,
} from "lucide-react"

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
      ? db
          .select()
          .from(cgbvpShiftAttendance)
          .where(eq(cgbvpShiftAttendance.statusId, statusId))
      : Promise.resolve([]),
    db.select().from(cgbvpVehicles),
  ])

  const bomberos = shiftPeople.filter((p) => p.tipo === "BOM").length
  const rentados = shiftPeople.filter((p) => p.tipo === "REN").length
  const operativas = vehicles.filter(
    (v) => v.estado === "EN BASE" || v.estado === "EMERGENCIA"
  ).length
  const conFalla = vehicles.filter((v) => v.estado === "FALLA").length
  const enEmergencia = vehicles.filter(
    (v) => v.estado === "EMERGENCIA"
  ).length

  const estadoGeneral = latestStatus?.estadoGeneral ?? "EN SERVICIO"
  const fechaStatus = latestStatus?.fechaHora ?? latestStatus?.createdAt

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold">Mi Compañía</h1>
        </div>
        <p className="text-muted-foreground">
          Cía. B. V. N.° {companyConfig.id} — {companyConfig.location.district}
        </p>
      </div>

      {/* Status banner */}
      <div className="flex items-center justify-between rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-bold text-green-600">{estadoGeneral}</span>
        </div>
        {fechaStatus && (
          <span className="text-sm text-muted-foreground">
            {new Date(fechaStatus).toLocaleDateString("es-PE", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <Users className="h-5 w-5 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">
            {latestStatus?.personalDisponible ?? shiftPeople.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {bomberos} bomb. · {rentados} rent.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4 text-center">
          <Truck className="h-5 w-5 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">
            {operativas}
            <span className="text-base text-muted-foreground">
              /{vehicles.length}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {conFalla} con falla
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 text-center bg-white ${
            enEmergencia > 0 ? "border-red-400" : ""
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 mx-auto mb-2 ${
              enEmergencia > 0 ? "text-red-500" : "text-muted-foreground"
            }`}
          />
          <p
            className={`text-2xl font-bold ${
              enEmergencia > 0 ? "text-red-600" : ""
            }`}
          >
            {enEmergencia}
          </p>
          <p className="text-xs text-muted-foreground">
            unidades en emergencia
          </p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal en Turno */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4" /> Personal en Turno
          </h2>
          {shiftPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos de turno disponibles.
            </p>
          ) : (
            <div className="space-y-2">
              {shiftPeople.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-l-4 border-blue-500 pl-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {p.nombreRaw}
                      </span>
                      {p.esAlMando === 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">
                          MANDO
                        </span>
                      )}
                      {p.esPiloto === 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                          PILOTO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.tipo === "BOM" ? "Bombero" : "Rentado"}
                    </p>
                  </div>
                  {p.horaIngreso && (
                    <span className="text-xs text-muted-foreground">
                      {p.horaIngreso}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado de Flota */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4" /> Estado de Flota
          </h2>
          {vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos de vehículos.
            </p>
          ) : (
            <div className="space-y-2">
              {vehicles.map((v) => {
                const statusColor =
                  v.estado === "FALLA"
                    ? "bg-red-100 text-red-700"
                    : v.estado === "EMERGENCIA"
                      ? "bg-yellow-100 text-yellow-700"
                      : v.estado === "EN BASE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"

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
                        <p className="text-sm font-medium">{v.codigo}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.tipo}
                        </p>
                        {v.motivo && (
                          <p className="text-xs text-red-500">{v.motivo}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}
                    >
                      {v.estado === "EMERGENCIA"
                        ? "EMERG."
                        : v.estado === "FUERA DE SERVICIO"
                          ? "FUERA"
                          : v.estado}
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
