import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, now } from '@/lib/db/dynamodb'
import { deleteFile } from '@/lib/storage/s3'
import type { Permission } from '@/lib/auth/permissions'
import type { CourseLesson } from '@/lib/db/schema/training'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id: courseId, lessonId } = await params
  const body = await req.json()

  const courseRes = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
  }))
  if (!courseRes.Item) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

  const lessons = (courseRes.Item.lessons ?? []) as CourseLesson[]
  const idx = lessons.findIndex(l => l.lessonId === lessonId)
  if (idx === -1) return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })

  const updatable = ['title', 'description', 'contentType', 'content', 'materialKey', 'durationMinutes', 'required', 'displayOrder']
  const updated = { ...lessons[idx] }
  for (const key of updatable) {
    if (key in body) (updated as any)[key] = body[key] === '' ? undefined : body[key]
  }
  lessons[idx] = updated

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
    UpdateExpression: 'SET lessons = :l, updatedAt = :ts',
    ExpressionAttributeValues: { ':l': lessons, ':ts': now() },
  }))

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id: courseId, lessonId } = await params
  const courseRes = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
  }))
  if (!courseRes.Item) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

  const lessons = (courseRes.Item.lessons ?? []) as CourseLesson[]
  const lesson = lessons.find(l => l.lessonId === lessonId)
  if (!lesson) return NextResponse.json({ error: 'Lección no encontrada' }, { status: 404 })

  // Eliminar material S3 si existe
  if (lesson.materialKey) {
    deleteFile(lesson.materialKey).catch(() => {})
  }

  const remaining = lessons
    .filter(l => l.lessonId !== lessonId)
    .map((l, i) => ({ ...l, displayOrder: i }))

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
    UpdateExpression: 'SET lessons = :l, updatedAt = :ts',
    ExpressionAttributeValues: { ':l': remaining, ':ts': now() },
  }))

  return NextResponse.json({ success: true })
}
