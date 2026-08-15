import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, DeleteCommand, QueryCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const { Items = [] } = await ddb.send(new QueryCommand({
      TableName: TABLE.sectionRoles,
      KeyConditionExpression: 'profileId = :p',
      ExpressionAttributeValues: { ':p': id },
    }))
    return NextResponse.json({ roles: Items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canManage = permissions.includes('personnel.edit') || permissions.includes('company.manage')
    if (!canManage) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params
    const { sectionId, role } = await req.json()
    if (!sectionId || !role) return NextResponse.json({ error: 'sectionId y role requeridos' }, { status: 400 })

    const ts = now()
    await ddb.send(new PutCommand({
      TableName: TABLE.sectionRoles,
      Item: { profileId: id, sectionId, role, isActive: true, createdAt: ts, updatedAt: ts },
    }))

    await writeAuditLog({
      entityType: 'personnel',
      entityId: id,
      action: 'assign',
      ...auditActor(session),
      summary: `Asignó el cargo «${role}» en ${sectionId} al efectivo ${id}`,
      after: { sectionId, role },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canManage = permissions.includes('personnel.edit') || permissions.includes('company.manage')
    if (!canManage) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params
    const { sectionId } = await req.json()
    if (!sectionId) return NextResponse.json({ error: 'sectionId requerido' }, { status: 400 })

    await ddb.send(new DeleteCommand({
      TableName: TABLE.sectionRoles,
      Key: { profileId: id, sectionId },
    }))

    await writeAuditLog({
      entityType: 'personnel',
      entityId: id,
      action: 'unassign',
      ...auditActor(session),
      summary: `Retiró el cargo en ${sectionId} del efectivo ${id}`,
      before: { sectionId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
