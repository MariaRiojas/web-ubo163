import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, DeleteCommand, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import { computeCourseSummary } from '@/lib/db/schema/training'

function canManage(permissions: Permission[]) {
  return permissions.includes('area.instruction.manage')
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const res = await ddb.send(new GetCommand({ TableName: TABLE.trainingCourses, Key: { courseId: id } }))
  if (!res.Item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ item: res.Item })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!canManage(permissions)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['title', 'subtitle', 'description', 'category', 'durationHours', 'minGrade',
    'availableForPostulantes', 'availableForAspirantes', 'mandatoryForPostulantes',
    'mandatoryForAspirantes', 'active', 'modules']

  const updates: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, any> = { ':ts': now() }

  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      names[`#${key}`] = key
      values[`:${key}`] = body[key] === '' ? null : body[key]
      updates.push(`#${key} = :${key}`)
    }
  }

  // Si el payload trae `modules`, recomputar el resumen denormalizado
  // (lessonCount/lessonIds/requiredLessonIds) usado por los listados.
  if ('modules' in body && body.modules !== undefined) {
    const summary = computeCourseSummary({ modules: body.modules })
    for (const [key, value] of Object.entries(summary)) {
      names[`#${key}`] = key
      values[`:${key}`] = value
      updates.push(`#${key} = :${key}`)
    }
  }

  updates.push('updatedAt = :ts')

  await ddb.send(new UpdateCommand({
    TableName: TABLE.trainingCourses,
    Key: { courseId: id },
    UpdateExpression: 'SET ' + updates.join(', '),
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: values,
  }))

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!canManage(permissions)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { id } = await params
  await ddb.send(new DeleteCommand({ TableName: TABLE.trainingCourses, Key: { courseId: id } }))
  return NextResponse.json({ success: true })
}
