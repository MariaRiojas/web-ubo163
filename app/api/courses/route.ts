import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, ScanCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import { COURSE_CATEGORIES, computeCourseSummary } from '@/lib/db/schema/training'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const res = await ddb.send(new ScanCommand({ TableName: TABLE.trainingCourses }))
  const items = (res.Items ?? []).sort((a: any, b: any) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  )
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const permissions = (session.user.permissions ?? []) as Permission[]
  if (!permissions.includes('area.instruction.manage')) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, subtitle, description, category, durationHours, minGrade,
    availableForPostulantes, availableForAspirantes,
    mandatoryForPostulantes, mandatoryForAspirantes,
  } = body

  if (!title || !category) {
    return NextResponse.json({ error: 'title y category son requeridos' }, { status: 400 })
  }
  if (!COURSE_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
  }

  const courseId = generateId()
  const timestamp = now()
  const baseSlug = slugify(title)
  const slug = `${baseSlug}-${courseId.slice(0, 8)}`
  const summary = computeCourseSummary({ lessons: [] })

  await ddb.send(new PutCommand({
    TableName: TABLE.trainingCourses,
    Item: {
      courseId, slug, title,
      subtitle: subtitle ?? null,
      description: description ?? null,
      category,
      durationHours: durationHours ? Number(durationHours) : null,
      ...(minGrade ? { minGrade } : {}),
      availableForPostulantes: availableForPostulantes ?? false,
      availableForAspirantes: availableForAspirantes ?? true,
      mandatoryForPostulantes: mandatoryForPostulantes ?? false,
      mandatoryForAspirantes: mandatoryForAspirantes ?? false,
      active: true,
      lessons: [],
      ...summary,
      createdBy: (session.user as any).profileId ?? '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  }))

  return NextResponse.json({ success: true, courseId, slug })
}
