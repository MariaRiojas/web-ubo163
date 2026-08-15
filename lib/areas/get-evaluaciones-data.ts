import 'server-only'
import { ddb, TABLE, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Course, EvalResponse } from '@/lib/db/schema/training'
import { getCourseLessons } from '@/lib/db/schema/training'

export interface EvalQueueItem {
  evalId: string
  profileId: string
  studentName: string
  grade: string
  courseId: string
  courseTitle: string
  lessonId: string
  lessonTitle: string
  questionId: string
  prompt: string
  answer: string
  maxScore: number
  score?: number
  status: 'pending_review' | 'graded'
  createdAt: string
  gradedAt?: string
  gradedByName?: string
}

export interface EvaluacionesData {
  pending: EvalQueueItem[]
  graded: EvalQueueItem[]
}

export async function getEvaluacionesData(): Promise<EvaluacionesData> {
  const [evalRes, coursesRes] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: TABLE.trainingEvaluations })),
    ddb.send(new ScanCommand({
      TableName: TABLE.trainingCourses,
      ProjectionExpression: 'courseId, title, modules, lessons',
    })),
  ])

  const evals = (evalRes.Items ?? []) as EvalResponse[]
  const courses = (coursesRes.Items ?? []) as Course[]

  // Mapa curso → { title, lessonId → lessonTitle }
  const courseTitleMap = new Map<string, string>()
  const lessonTitleMap = new Map<string, string>() // key: `${courseId}::${lessonId}`
  for (const c of courses) {
    courseTitleMap.set(c.courseId, c.title)
    for (const l of getCourseLessons(c)) {
      lessonTitleMap.set(`${c.courseId}::${l.lessonId}`, l.title)
    }
  }

  // Batch-fetch nombres de perfiles (alumnos + calificadores)
  const profileIds = new Set<string>()
  for (const e of evals) {
    if (e.profileId) profileIds.add(e.profileId)
    if (e.gradedBy) profileIds.add(e.gradedBy)
  }

  const profileMap = new Map<string, { fullName: string; grade: string }>()
  if (profileIds.size > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: [...profileIds].map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName, grade',
        },
      },
    }))
    for (const p of (Responses?.[TABLE.profiles] ?? []) as { profileId: string; fullName: string; grade: string }[]) {
      profileMap.set(p.profileId, { fullName: p.fullName, grade: p.grade })
    }
  }

  const toItem = (e: EvalResponse): EvalQueueItem => ({
    evalId: e.evalId,
    profileId: e.profileId,
    studentName: profileMap.get(e.profileId)?.fullName ?? e.profileId,
    grade: profileMap.get(e.profileId)?.grade ?? '',
    courseId: e.courseId,
    courseTitle: courseTitleMap.get(e.courseId) ?? e.courseId,
    lessonId: e.lessonId,
    lessonTitle: lessonTitleMap.get(`${e.courseId}::${e.lessonId}`) ?? e.lessonId,
    questionId: e.questionId,
    prompt: e.prompt,
    answer: e.answer,
    maxScore: e.maxScore,
    score: e.score,
    status: e.status,
    createdAt: e.createdAt,
    gradedAt: e.gradedAt,
    gradedByName: e.gradedBy ? (profileMap.get(e.gradedBy)?.fullName ?? e.gradedBy) : undefined,
  })

  const pending = evals
    .filter(e => e.status === 'pending_review')
    .map(toItem)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) // más antiguos primero

  const graded = evals
    .filter(e => e.status === 'graded')
    .map(toItem)
    .sort((a, b) => (b.gradedAt ?? '').localeCompare(a.gradedAt ?? '')) // recientes primero

  return { pending, graded }
}
