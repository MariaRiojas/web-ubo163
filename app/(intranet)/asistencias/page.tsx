import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { cgbvpAttendance, profiles } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import type { Permission } from "@/lib/auth/permissions"
import type { Grade } from "@/lib/cgbvp/grades"
import { GRADE_LABEL } from "@/lib/cgbvp/grades"
import { MIN_HOURS_PER_QUARTER } from "@/lib/cgbvp/requirements"
import { AsistenciasClient } from "./asistencias-client"

export default async function AsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const perms = session.user.permissions as Permission[]
  if (!perms.includes("company.manage") && !perms.includes("company.view_all")) redirect("/dashboard")

  const params = await searchParams
  const now = new Date()
  const year = params.anio ? parseInt(params.anio) : now.getFullYear()
  const month = params.mes ? parseInt(params.mes) : now.getMonth() + 1

  // Current month attendance joined with profiles
  const rows = await db
    .select({
      id: cgbvpAttendance.id,
      profileId: cgbvpAttendance.profileId,
      dias: cgbvpAttendance.diasAsistidos,
      guardias: cgbvpAttendance.diasGuardia,
      horas: cgbvpAttendance.horasAcumuladas,
      emergencias: cgbvpAttendance.numEmergencias,
      fullName: profiles.fullName,
      code: profiles.codigoCgbvp,
      grade: profiles.grade,
    })
    .from(cgbvpAttendance)
    .innerJoin(profiles, eq(cgbvpAttendance.profileId, profiles.id))
    .where(and(eq(cgbvpAttendance.mes, month), eq(cgbvpAttendance.anio, year)))

  // Compute KPIs
  const activeBomberos = rows.length
  const totalHours = rows.reduce((s, r) => s + (r.horas ?? 0), 0)
  const totalDays = rows.reduce((s, r) => s + (r.dias ?? 0), 0)
  const totalEmergencies = rows.reduce((s, r) => s + (r.emergencias ?? 0), 0)
  const avgHours = activeBomberos > 0 ? Math.round(totalHours / activeBomberos) : 0

  // Compliance
  let cumple = 0
  const gradeCompliance: Record<string, { cumple: number; noCumple: number }> = {}
  const gradeHours: Record<string, { total: number; count: number }> = {}

  for (const r of rows) {
    const g = r.grade as Grade
    const minMonthly = (MIN_HOURS_PER_QUARTER[g] ?? 0) / 3
    const meets = (r.horas ?? 0) >= minMonthly
    if (meets) cumple++

    const label = GRADE_LABEL[g] ?? g
    if (!gradeCompliance[label]) gradeCompliance[label] = { cumple: 0, noCumple: 0 }
    gradeCompliance[label][meets ? "cumple" : "noCumple"]++

    if (!gradeHours[label]) gradeHours[label] = { total: 0, count: 0 }
    gradeHours[label].total += r.horas ?? 0
    gradeHours[label].count++
  }

  const compliancePct = activeBomberos > 0 ? Math.round((cumple / activeBomberos) * 100) : 0

  // Top 10 bomberos by hours
  const top10 = [...rows]
    .sort((a, b) => (b.horas ?? 0) - (a.horas ?? 0))
    .slice(0, 10)
    .map((r) => ({ name: r.fullName, horas: r.horas ?? 0, grade: r.grade }))

  // Avg hours per grade
  const avgByGrade = Object.entries(gradeHours).map(([name, v]) => ({
    name,
    promedio: Math.round(v.total / v.count),
  }))

  // Compliance by grade
  const complianceByGrade = Object.entries(gradeCompliance).map(([name, v]) => ({
    name,
    cumple: v.cumple,
    noCumple: v.noCumple,
  }))

  // Detail table
  const detail = rows.map((r) => {
    const g = r.grade as Grade
    const minMonthly = (MIN_HOURS_PER_QUARTER[g] ?? 0) / 3
    const pct = minMonthly > 0 ? Math.min(100, Math.round(((r.horas ?? 0) / minMonthly) * 100)) : 100
    return {
      fullName: r.fullName,
      code: r.code ?? "",
      grade: GRADE_LABEL[g] ?? g,
      dias: r.dias ?? 0,
      guardias: r.guardias ?? 0,
      horas: r.horas ?? 0,
      emergencias: r.emergencias ?? 0,
      cumplimiento: pct,
    }
  }).sort((a, b) => b.horas - a.horas)

  // Evolution: last 6 months aggregated
  const evolution: { mes: number; anio: number; totalHoras: number; promedio: number; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const agg = await db
      .select({
        totalHoras: sql<number>`coalesce(sum(${cgbvpAttendance.horasAcumuladas}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(cgbvpAttendance)
      .where(and(eq(cgbvpAttendance.mes, m), eq(cgbvpAttendance.anio, y)))
    const th = Number(agg[0]?.totalHoras ?? 0)
    const cnt = Number(agg[0]?.count ?? 0)
    const MONTHS_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
    evolution.push({
      mes: m,
      anio: y,
      totalHoras: th,
      promedio: cnt > 0 ? Math.round(th / cnt) : 0,
      label: `${MONTHS_SHORT[m - 1]} ${y}`,
    })
  }

  return (
    <AsistenciasClient
      year={year}
      month={month}
      activeBomberos={activeBomberos}
      totalHours={totalHours}
      avgHours={avgHours}
      totalDays={totalDays}
      totalEmergencies={totalEmergencies}
      cumple={cumple}
      compliancePct={compliancePct}
      top10={top10}
      avgByGrade={avgByGrade}
      complianceByGrade={complianceByGrade}
      detail={detail}
      evolution={evolution}
    />
  )
}
