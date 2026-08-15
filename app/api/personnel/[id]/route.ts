import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand, PutCommand, DeleteCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'

const GRADE_ORDER: Record<string, number> = {
  aspirante: 10, seccionario: 8, subteniente: 6, capitan: 5,
  teniente: 4, teniente_brigadier: 2, brigadier: 1,
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const res = await ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId: id } }))
    if (!res.Item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json({ item: res.Item })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = (session.user.permissions ?? []) as Permission[]
    const canEdit = (session.user as any).profileId === 'admin-001' || permissions.includes('personnel.edit') || permissions.includes('area.admin.manage') || permissions.includes('company.manage')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    const allowed = ['firstName', 'lastName', 'dni', 'email', 'grade', 'gender', 'phone', 'birthDate', 'address', 'codigoCgbvp', 'sectionKey', 'status', 'bloodType', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation', 'joinDate', 'personalEmail', 'personalPhone']
    const updates: string[] = []
    const names: Record<string, string> = {}
    const values: Record<string, any> = { ':ts': now() }

    for (const key of allowed) {
      if (key in body && body[key] !== undefined && body[key] !== '') {
        names[`#${key}`] = key
        values[`:${key}`] = body[key]
        updates.push(`#${key} = :${key}`)
      }
    }

    // Recalculate derived fields
    if (body.firstName || body.lastName) {
      const firstName = body.firstName
      const lastName = body.lastName
      if (firstName && lastName) {
        values[':fullName'] = `${lastName}, ${firstName}`
        updates.push('fullName = :fullName')
      }
    }
    if (body.grade) {
      values[':gradeOrder'] = GRADE_ORDER[body.grade] ?? 99
      updates.push('gradeOrder = :gradeOrder')
    }

    updates.push('updatedAt = :ts')

    await ddb.send(new UpdateCommand({
      TableName: TABLE.profiles,
      Key: { profileId: id },
      UpdateExpression: 'SET ' + updates.join(', '),
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }))

    // Auto-create section-role when sectionKey is assigned
    if (body.sectionKey) {
      const SECTION_MAP: Record<string, string> = {
        jefatura: 'sec-jefatura', maquinas: 'sec-maquinas', instruccion: 'sec-instruccion',
        administracion: 'sec-admin', imagen: 'sec-imagen', prehospitalaria: 'sec-prehospitalaria',
        servicios_generales: 'sec-servicios',
      }
      const sectionId = SECTION_MAP[body.sectionKey]
      if (sectionId) {
        await ddb.send(new PutCommand({
          TableName: TABLE.sectionRoles,
          Item: { profileId: id, sectionId, role: 'efectivo', isActive: true, createdAt: now(), updatedAt: now() },
        })).catch(() => {}) // Ignore if already exists (same PK)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = (session.user.permissions ?? []) as Permission[]
    const canEdit = (session.user as any).profileId === 'admin-001' || permissions.includes('personnel.edit') || permissions.includes('area.admin.manage') || permissions.includes('company.manage')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params
    const permanent = req.nextUrl.searchParams.get('permanent') === 'true'

    if (permanent) {
      await Promise.all([
        ddb.send(new DeleteCommand({ TableName: TABLE.profiles, Key: { profileId: id } })),
        ddb.send(new DeleteCommand({ TableName: TABLE.users, Key: { userId: id } })),
      ])
    } else {
      await ddb.send(new UpdateCommand({
        TableName: TABLE.profiles,
        Key: { profileId: id },
        UpdateExpression: 'SET #s = :s, updatedAt = :ts',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'retirado', ':ts': now() },
      }))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
