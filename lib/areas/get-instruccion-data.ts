import 'server-only'
import { ddb, TABLE, ScanCommand, QueryCommand, GetCommand } from '@/lib/db/dynamodb'
import type { Course, TrainingProgress } from '@/lib/db/schema/training'
import type { Profile } from '@/lib/db/schema/profiles'

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
  // All active courses
  const { Items: courseItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.trainingCourses,
    FilterExpression: 'active = :t',
    ExpressionAttributeValues: { ':t': true },
  }))
  const allCourses = (courseItems ?? []) as Course[]

  // All training progress (enrollments) — to count per course
  // We scan the trainingProgress table (PK=profileId, SK=courseId)
  const { Items: progItems } = await ddb.send(new ScanCommand({
    TableName: TABLE.trainingProgress,
    ProjectionExpression: 'courseId, #st',
    ExpressionAttributeNames: { '#st': 'status' },
  }))
  const allProgress = (progItems ?? []) as TrainingProgress[]

  // Aggregate by courseId
  const byCourse = new Map<string, CourseStats>()
  for (const c of allCourses) {
    byCourse.set(c.courseId, {
      courseId: c.courseId,
      slug: c.slug,
      title: c.title,
      category: c.category,
      durationHours: c.durationHours ?? null,
      totalEnrolled: 0,
      activeEnrolled: 0,
      completedEnrolled: 0,
    })
  }

  for (const p of allProgress) {
    const stats = byCourse.get(p.courseId)
    if (!stats) continue
    stats.totalEnrolled++
    if (p.status === 'activa') stats.activeEnrolled++
    else if (p.status === 'completada') stats.completedEnrolled++
  }

  const allStats = Array.from(byCourse.values())
  const esbasStats = allStats.find(c => c.category === 'esbas') ?? null
  const topCourses = allStats
    .filter(c => c.category !== 'esbas')
    .sort((a, b) => b.activeEnrolled - a.activeEnrolled)
    .slice(0, 8)

  const totalsByCategory: Record<string, { total: number; active: number; completed: number }> = {}
  for (const c of allStats) {
    const cat = c.category
    if (!totalsByCategory[cat]) totalsByCategory[cat] = { total: 0, active: 0, completed: 0 }
    totalsByCategory[cat].total += c.totalEnrolled
    totalsByCategory[cat].active += c.activeEnrolled
    totalsByCategory[cat].completed += c.completedEnrolled
  }

  // Aspirantes en ESBAS
  let aspirantesInEsbas: AspiranteInEsbas[] = []
  if (esbasStats) {
    const { Items: aspItems } = await ddb.send(new ScanCommand({
      TableName: TABLE.profiles,
      FilterExpression: '#st IN (:p, :a)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':p': 'postulante', ':a': 'aspirante_en_curso' },
      Limit: 50,
    }))
    const aspirantes = (aspItems ?? []) as Profile[]
    aspirantes.sort((a, b) => a.fullName.localeCompare(b.fullName))

    // Get their ESBAS enrollments
    const enrollmentMap = new Map<string, { status: string; finalGrade: string | null }>()
    for (const asp of aspirantes) {
      const { Item } = await ddb.send(new GetCommand({
        TableName: TABLE.trainingProgress,
        Key: { profileId: asp.profileId, courseId: esbasStats.courseId },
        ProjectionExpression: '#st, finalGrade',
        ExpressionAttributeNames: { '#st': 'status' },
      }))
      if (Item) {
        enrollmentMap.set(asp.profileId, {
          status: (Item as TrainingProgress).status,
          finalGrade: (Item as TrainingProgress).finalGrade ?? null,
        })
      }
    }

    aspirantesInEsbas = aspirantes.map(p => ({
      profileId: p.profileId,
      fullName: p.fullName,
      codigoCgbvp: p.codigoCgbvp ?? null,
      status: p.status,
      joinDate: p.joinDate ?? null,
      enrollmentStatus: enrollmentMap.get(p.profileId)?.status ?? null,
      finalGrade: enrollmentMap.get(p.profileId)?.finalGrade ?? null,
    }))
  }

  return { esbasStats, topCourses, aspirantesInEsbas, totalsByCategory }
}
