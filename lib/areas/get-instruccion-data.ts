import 'server-only'
import { db } from '@/lib/db'
import {
  courses, courseEnrollments, profiles,
} from '@/lib/db/schema'
import { and, eq, sql, desc, asc } from 'drizzle-orm'

export interface CourseStats {
  courseId: string
  slug: string
  title: string
  category: string
  durationHours: number | null
  totalEnrolled: number
  activeEnrolled: number
  completedEnrolled: number
}

export interface AspiranteInEsbas {
  profileId: string
  fullName: string
  codigoCgbvp: string | null
  status: string
  joinDate: string | null
  enrollmentStatus: string | null
  finalGrade: string | null
}

export interface InstruccionExtraData {
  esbasStats: CourseStats | null
  topCourses: CourseStats[]
  aspirantesInEsbas: AspiranteInEsbas[]
  totalsByCategory: Record<string, { total: number; active: number; completed: number }>
}

export async function getInstruccionExtraData(): Promise<InstruccionExtraData> {
  // Cursos activos con conteos
  const coursesRows = await db
    .select({
      course: courses,
      enrollmentStatus: courseEnrollments.status,
    })
    .from(courses)
    .leftJoin(courseEnrollments, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courses.active, true))

  const byCourse = new Map<string, CourseStats>()
  for (const r of coursesRows) {
    let stats = byCourse.get(r.course.id)
    if (!stats) {
      stats = {
        courseId: r.course.id,
        slug: r.course.slug,
        title: r.course.title,
        category: r.course.category,
        durationHours: r.course.durationHours,
        totalEnrolled: 0,
        activeEnrolled: 0,
        completedEnrolled: 0,
      }
      byCourse.set(r.course.id, stats)
    }
    if (r.enrollmentStatus) {
      stats.totalEnrolled++
      if (r.enrollmentStatus === 'activa') stats.activeEnrolled++
      else if (r.enrollmentStatus === 'completada') stats.completedEnrolled++
    }
  }

  const allStats = Array.from(byCourse.values())
  const esbasStats = allStats.find((c) => c.category === 'esbas') ?? null
  const topCourses = allStats
    .filter((c) => c.category !== 'esbas')
    .sort((a, b) => b.activeEnrolled - a.activeEnrolled)
    .slice(0, 8)

  // Totales por categoría
  const totalsByCategory: Record<string, { total: number; active: number; completed: number }> = {}
  for (const c of allStats) {
    const cat = c.category
    if (!totalsByCategory[cat]) totalsByCategory[cat] = { total: 0, active: 0, completed: 0 }
    totalsByCategory[cat].total += c.totalEnrolled
    totalsByCategory[cat].active += c.activeEnrolled
    totalsByCategory[cat].completed += c.completedEnrolled
  }

  // Aspirantes en ESBAS (status = aspirante_en_curso o que tienen enrollment en ESBAS)
  let aspirantesInEsbas: AspiranteInEsbas[] = []
  if (esbasStats) {
    const aspirantesRows = await db
      .select({
        profileId: profiles.id,
        fullName: profiles.fullName,
        codigoCgbvp: profiles.codigoCgbvp,
        status: profiles.status,
        joinDate: profiles.joinDate,
        enrollmentStatus: courseEnrollments.status,
        finalGrade: courseEnrollments.finalGrade,
      })
      .from(profiles)
      .leftJoin(
        courseEnrollments,
        and(
          eq(courseEnrollments.profileId, profiles.id),
          eq(courseEnrollments.courseId, esbasStats.courseId),
        ),
      )
      .where(
        sql`${profiles.status} IN ('postulante', 'aspirante_en_curso')`,
      )
      .orderBy(asc(profiles.fullName))
      .limit(50)

    aspirantesInEsbas = aspirantesRows.map((r) => ({
      profileId: r.profileId,
      fullName: r.fullName,
      codigoCgbvp: r.codigoCgbvp,
      status: r.status,
      joinDate: r.joinDate,
      enrollmentStatus: r.enrollmentStatus,
      finalGrade: r.finalGrade,
    }))
  }

  return {
    esbasStats,
    topCourses,
    aspirantesInEsbas,
    totalsByCategory,
  }
}
