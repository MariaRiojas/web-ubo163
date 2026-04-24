import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  profiles,
  cgbvpAttendance,
  emergencies,
  emergencyCrewMembers,
  cgbvpCompanyStatus,
  cgbvpShiftAttendance,
} from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import Link from "next/link"
import BomberoChart from "./bombero-chart"

const GRADE_LABELS: Record<string, string> = {
  aspirante: "Aspirante",
  seccionario: "Seccionario",
  subteniente: "Subteniente",
  teniente: "Teniente",
  capitan: "Capitán",
  teniente_brigadier: "Tte. Brigadier",
  brigadier: "Brigadier",
  brigadier_mayor: "Brigadier Mayor",
  brigadier_general: "Brigadier General",
}

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function estadoBadge(estado: string | null) {
  if (!estado) return null
  const colors: Record<string, string> = {
    DESPACHADA: "bg-yellow-100 text-yellow-700",
    "EN CAMINO": "bg-blue-100 text-blue-700",
    "EN ESCENA": "bg-orange-100 text-orange-700",
    CONTROLADA: "bg-green-100 text-green-700",
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {estado}
    </span>
  )
}

export default async function BomberoProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, id),
    with: { cgbvpAttendance: true },
  })
  if (!profile) notFound()

  // Check en turno
  const latestStatus = await db.query.cgbvpCompanyStatus.findFirst({
    orderBy: [desc(cgbvpCompanyStatus.createdAt)],
  })
  let enTurno = false
  if (latestStatus) {
    const shift = await db
      .select({ id: cgbvpShiftAttendance.id })
      .from(cgbvpShiftAttendance)
      .where(
        and(
          eq(cgbvpShiftAttendance.statusId, latestStatus.id),
          eq(cgbvpShiftAttendance.profileId, id),
          eq(cgbvpShiftAttendance.esBombero, 1)
        )
      )
      .limit(1)
    enTurno = shift.length > 0
  }

  // Count al mando
  const [alMandoResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emergencies)
    .where(eq(emergencies.alMandoId, id))
  const vecesAlMando = alMandoResult?.count ?? 0

  // Emergencies as jefe for table
  const partesAlMando = await db.query.emergencies.findMany({
    where: eq(emergencies.alMandoId, id),
    orderBy: [desc(emergencies.fechaDespacho)],
    with: { tipoEmergencia: true },
  })

  // Attendance sorted by date
  const attendance = [...profile.cgbvpAttendance].sort(
    (a, b) => a.anio * 100 + a.mes - (b.anio * 100 + b.mes)
  )

  const totalHoras = attendance.reduce((s, a) => s + (a.horasAcumuladas ?? 0), 0)
  const totalEmergencias = attendance.reduce((s, a) => s + (a.numEmergencias ?? 0), 0)
  const lastMonth = attendance[attendance.length - 1]

  // Chart data
  const chartData = attendance.map(a => ({
    mes: `${MESES[a.mes]?.slice(0, 3)} ${a.anio}`,
    horas: a.horasAcumuladas ?? 0,
    emergencias: a.numEmergencias ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/bomberos" className="text-sm text-red-600 hover:text-red-700 font-medium">
        ← Volver a Personal
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border p-6 flex flex-col sm:flex-row items-start gap-5">
        <div className="h-20 w-20 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-2xl font-bold shrink-0">
          {initials(profile.fullName)}
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            {GRADE_LABELS[profile.grade] ?? profile.grade}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{profile.fullName}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {profile.codigoCgbvp ?? "Sin código"} · DNI {profile.dni ?? "—"}
          </p>
          {enTurno && (
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> En turno
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "HORAS TOTALES", value: totalHoras },
          { label: "DÍAS ÚLT. MES", value: lastMonth?.diasAsistidos ?? 0 },
          { label: "EMERGENCIAS", value: totalEmergencias },
          { label: "VECES AL MANDO", value: vecesAlMando },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border p-5">
            <p className="text-xs font-semibold text-gray-400 tracking-wide">{k.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Historial mensual</h2>
          <BomberoChart data={chartData} />
        </div>
      )}

      {/* Attendance table */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Asistencia por mes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <th className="px-6 py-3">Mes</th>
              <th className="px-6 py-3">Días asistidos</th>
              <th className="px-6 py-3">Guardias</th>
              <th className="px-6 py-3">Horas</th>
              <th className="px-6 py-3">Emergencias</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={`${a.anio}-${a.mes}`} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-3">{MESES[a.mes]} {a.anio}</td>
                <td className="px-6 py-3">{a.diasAsistidos ?? 0}</td>
                <td className="px-6 py-3">{a.diasGuardia ?? 0}</td>
                <td className="px-6 py-3 font-bold">{a.horasAcumuladas ?? 0}</td>
                <td className="px-6 py-3">{a.numEmergencias ?? 0}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Sin registros de asistencia.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Partes al mando table */}
      {partesAlMando.length > 0 && (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-700">Partes como Jefe de Emergencia</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <th className="px-6 py-3">N.° Parte</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Dirección</th>
              </tr>
            </thead>
            <tbody>
              {partesAlMando.map(p => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-red-600">{p.numeroParte}</td>
                  <td className="px-6 py-3">{p.tipoEmergencia?.descripcion ?? p.tipo ?? "—"}</td>
                  <td className="px-6 py-3">{estadoBadge(p.estado)}</td>
                  <td className="px-6 py-3">
                    {p.fechaDespacho
                      ? new Date(p.fechaDespacho).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-6 py-3 max-w-[250px] truncate">{p.direccion ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
