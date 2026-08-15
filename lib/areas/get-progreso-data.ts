import 'server-only'
import { ddb, TABLE, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Course, TrainingProgress } from '@/lib/db/schema/training'
import { getCourseModules } from '@/lib/db/schema/training'

export interface ProgresoLessonDetail {
  lessonId: string
  moduleTitle: string
  lessonTitle: string
  contentType: string
  required: boolean
  status: string
  score?: string | null
  pendingReview: boolean
}

export interface ProgresoCourseDetail {
  courseId: string
  title: string
  status: string
  enrolledAt: string
  completedAt?: string
  finalGrade?: string | null
  lessons: ProgresoLessonDetail[]
  certificateKey?: string | null
  eligibleForCertificate: boolean
}

export interface ProgresoEntry {
  profileId: string
  fullName: string
  grade: string
  codigoCgbvp: string | null
  courses: ProgresoCourseDetail[]
  completedCount: number
  inProgressCount: number
  totalEnrolled: number
}

export interface ProgresoData {
  entries: ProgresoEntry[]
  courses: { courseId: string; title: string; category: string }[]
  stats: {
    totalEnrolled: number
    totalCompleted: number
    totalInProgress: number
  }
}

/** ¿La lección quedó esperando revisión de redacciones del instructor? */
function isPendingReview(status: string | undefined, notes: string | undefined): boolean {
  return status === 'en_curso' && typeof notes === 'string' && notes.startsWith('AUTO:')
}

export async function getProgresoData(): Promise<ProgresoData> {
  const [coursesRes, progressRes] = await Promise.all([
    ddb.send(new ScanCommand({
      TableName: TABLE.trainingCourses,
      ProjectionExpression: 'courseId, title, category, active, modules, lessons',
      FilterExpression: 'active = :t',
      ExpressionAttributeValues: { ':t': true },
    })),
    ddb.send(new ScanCommand({
      TableName: TABLE.trainingProgress,
    })),
  ])

  const courses = (coursesRes.Items ?? []) as Course[]
  const progressItems = (progressRes.Items ?? []) as TrainingProgress[]

  const courseMap = new Map(courses.map(c => [c.courseId, c]))

  // Group progress by profileId
  const byProfile = new Map<string, TrainingProgress[]>()
  for (const p of progressItems) {
    const arr = byProfile.get(p.profileId) ?? []
    arr.push(p)
    byProfile.set(p.profileId, arr)
  }

  if (byProfile.size === 0) {
    return {
      entries: [],
      courses: courses.map(c => ({ courseId: c.courseId, title: c.title, category: c.category })),
      stats: { totalEnrolled: 0, totalCompleted: 0, totalInProgress: 0 },
    }
  }

  // Batch-fetch profile names
  const profileIds = [...byProfile.keys()]
  const { Responses } = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE.profiles]: {
        Keys: profileIds.map(pid => ({ profileId: pid })),
        ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
      },
    },
  }))
  const profiles = (Responses?.[TABLE.profiles] ?? []) as { profileId: string; fullName: string; grade: string; codigoCgbvp?: string }[]
  const profileMap = new Map(profiles.map(p => [p.profileId, p]))

  const entries: ProgresoEntry[] = []
  for (const [profileId, progress] of byProfile) {
    const profile = profileMap.get(profileId)
    const coursesForProfile: ProgresoCourseDetail[] = progress
      .filter(p => courseMap.has(p.courseId))
      .map(p => {
        const course = courseMap.get(p.courseId)!
        const lp = p.lessonProgress ?? {}

        const lessons: ProgresoLessonDetail[] = getCourseModules(course).flatMap(mod =>
          [...mod.lessons]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(l => {
              const entry = lp[l.lessonId]
              return {
                lessonId: l.lessonId,
                moduleTitle: mod.title,
                lessonTitle: l.title,
                contentType: l.contentType,
                required: l.required,
                status: entry?.status ?? 'no_iniciada',
                score: entry?.score ?? null,
                pendingReview: isPendingReview(entry?.status, entry?.notes),
              }
            }),
        )

        const finalGrade = p.finalGrade ?? null
        const eligibleForCertificate =
          p.status === 'completada' && finalGrade != null && Number(finalGrade) >= 14

        return {
          courseId: p.courseId,
          title: course.title,
          status: p.status,
          enrolledAt: p.enrolledAt,
          completedAt: p.completedAt,
          finalGrade,
          lessons,
          certificateKey: p.certificateKey ?? null,
          eligibleForCertificate,
        }
      })
      .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))

    entries.push({
      profileId,
      fullName: profile?.fullName ?? profileId,
      grade: profile?.grade ?? '',
      codigoCgbvp: profile?.codigoCgbvp ?? null,
      courses: coursesForProfile,
      completedCount: coursesForProfile.filter(c => c.status === 'completada').length,
      inProgressCount: coursesForProfile.filter(c => c.status === 'activa').length,
      totalEnrolled: coursesForProfile.length,
    })
  }

  entries.sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount
    return a.fullName.localeCompare(b.fullName)
  })

  const stats = {
    totalEnrolled: progressItems.length,
    totalCompleted: progressItems.filter(p => p.status === 'completada').length,
    totalInProgress: progressItems.filter(p => p.status === 'activa').length,
  }

  return {
    entries,
    courses: courses.map(c => ({ courseId: c.courseId, title: c.title, category: c.category })),
    stats,
  }
}
