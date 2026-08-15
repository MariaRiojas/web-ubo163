import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import type { CourseLesson } from '@/lib/db/schema/training'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { id: courseId } = await params
  const body = await req.json()
  const { title, description, contentType, content, materialKey, durationMinutes, required } = body

  if (!title || !contentType) {
    return NextResponse.json({ error: 'title y contentType son requeridos' }, { status: 400 })
  }

  const courseRes = await ddb.send(new GetCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
  }))
  if (!courseRes.Item) return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })

  const existingLessons = (courseRes.Item.lessons ?? []) as CourseLesson[]
  const lessonId = generateId()
  const newLesson: CourseLesson = {
    lessonId,
    courseId,
    displayOrder: existingLessons.length,
    title,
    description: description ?? undefined,
    contentType,
    content: content ?? undefined,
    materialKey: materialKey ?? undefined,
    durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
    required: required ?? true,
  }

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId },
    UpdateExpression: 'SET lessons = :l, updatedAt = :ts',
    ExpressionAttributeValues: {
      ':l': [...existingLessons, newLesson],
      ':ts': now(),
    },
  }))

  return NextResponse.json({ success: true, lessonId })
}
