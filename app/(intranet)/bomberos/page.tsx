import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  profiles,
  cgbvpAttendance,
  cgbvpCompanyStatus,
  cgbvpShiftAttendance,
  emergencies,
} from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { BomberosClient } from "./bomberos-client"

const GRADE_LABELS: Record<string, string> = {
  aspirante: "Asp.",
  seccionario: "Secc.",
  subteniente: "Subtte.",
  teniente: "Tte.",
  capitan: "Cap.",
  teniente_brigadier: "Tte. Brig.",
  brigadier: "Brig.",
  brigadier_mayor: "Brig. May.",
  brigadier_general: "Brig. Gral.",
}

export default async function BomberosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const perms = session.user.permissions as string[]
  if (!perms?.includes("company.view_all") && !perms?.includes("personnel.view_all"))
    redirect("/dashboard")

  const params = await searchParams
  // Default: previous month
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  let mes: number, anio: number
  if (params.mes) {
    const [y, m] = params.mes.split("-").map(Number)
    mes = m
    anio = y
  } else {
    mes = prevMonth.getMonth() + 1
    anio = prevMonth.getFullYear()
  }

  // Get all active profiles with attendance for the month
  const allProfiles = await db.query.profiles.findMany({
    where: eq(profiles.status, "activo"),
    with: {
      cgbvpAttendance: {
        where: and(
          eq(cgbvpAttendance.mes, mes),
          eq(cgbvpAttendance.anio, anio)
        ),
      },
    },
  })

  // Count who is currently en turno from latest company status
  const latestStatus = await db.query.cgbvpCompanyStatus.findFirst({
    orderBy: [desc(cgbvpCompanyStatus.createdAt)],
  })

  let enTurnoIds: string[] = []
  if (latestStatus) {
    const shiftRows = await db
      .select({ profileId: cgbvpShiftAttendance.profileId })
      .from(cgbvpShiftAttendance)
      .where(
        and(
          eq(cgbvpShiftAttendance.statusId, latestStatus.id),
          eq(cgbvpShiftAttendance.esBombero, 1)
        )
      )
    enTurnoIds = shiftRows
      .map((r) => r.profileId)
      .filter(Boolean) as string[]
  }

  // Count emergencies where each profile was al mando
  const alMandoCounts = await db
    .select({
      profileId: emergencies.alMandoId,
      count: sql<number>`count(*)::int`,
    })
    .from(emergencies)
    .where(sql`${emergencies.alMandoId} is not null`)
    .groupBy(emergencies.alMandoId)

  const alMandoMap = new Map(
    alMandoCounts.map((r) => [r.profileId, r.count])
  )

  // Build data for client
  const bomberosData = allProfiles.map((p) => {
    const att = p.cgbvpAttendance[0]
    return {
      id: p.id,
      fullName: p.fullName,
      grade: p.grade,
      gradeLabel: GRADE_LABELS[p.grade] ?? p.grade,
      codigoCgbvp: p.codigoCgbvp,
      dni: p.dni,
      status: p.status,
      avatarUrl: p.avatarUrl,
      enTurno: enTurnoIds.includes(p.id),
      horas: att?.horasAcumuladas ?? 0,
      diasAsistidos: att?.diasAsistidos ?? 0,
      guardias: att?.diasGuardia ?? 0,
      emergencias: att?.numEmergencias ?? 0,
      alMando: alMandoMap.get(p.id) ?? 0,
    }
  })

  const totalActivos = allProfiles.length
  const totalEnTurno = enTurnoIds.length
  const totalHoras = bomberosData.reduce((s, b) => s + b.horas, 0)
  const totalEmergencias = bomberosData.reduce((s, b) => s + b.emergencias, 0)

  const grades = [...new Set(allProfiles.map((p) => p.grade))]

  return (
    <BomberosClient
      bomberos={bomberosData}
      mes={mes}
      anio={anio}
      totalActivos={totalActivos}
      totalEnTurno={totalEnTurno}
      totalHoras={totalHoras}
      totalEmergencias={totalEmergencias}
      gradesOptions={grades}
      gradeLabels={GRADE_LABELS}
    />
  )
}
