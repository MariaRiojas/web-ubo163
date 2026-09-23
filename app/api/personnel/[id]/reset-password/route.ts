import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, UpdateCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'
import bcrypt from 'bcryptjs'
import { writeAuditLog, auditActor } from '@/lib/audit/write-audit'
import type { Permission } from '@/lib/auth/permissions'

/**
 * Genera una clave temporal para un efectivo. El jefe se la entrega en mano y
 * el sistema obliga a cambiarla en el primer ingreso (mustChangePassword).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canEdit = permissions.includes('personnel.edit') || permissions.includes('area.admin.manage')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params

    // La tabla users se indexa por userId, que no siempre coincide con profileId.
    const { Item: profile } = await ddb.send(new GetCommand({
      TableName: TABLE.profiles,
      Key: { profileId: id },
      ProjectionExpression: 'profileId, userId, fullName, codigoCgbvp',
    }))
    if (!profile) return NextResponse.json({ error: 'Efectivo no encontrado' }, { status: 404 })
    const userId = (profile as any).userId
    if (!userId) return NextResponse.json({ error: 'El efectivo no tiene cuenta de acceso' }, { status: 409 })

    // Clave temporal legible: se dicta o se entrega impresa, sin caracteres ambiguos.
    const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const parte = (n: number) => Array.from({ length: n }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
    const tempPassword = `${parte(4)}-${parte(4)}`

    await ddb.send(new UpdateCommand({
      TableName: TABLE.users,
      Key: { userId },
      UpdateExpression: 'SET passwordHash = :ph, mustChangePassword = :m, updatedAt = :ts REMOVE resetTokenHash, resetTokenExp',
      ConditionExpression: 'attribute_exists(userId)',
      ExpressionAttributeValues: {
        ':ph': await bcrypt.hash(tempPassword, 12),
        ':m': true,
        ':ts': now(),
      },
    }))

    await writeAuditLog({
      entityType: 'personnel',
      entityId: id,
      entityLabel: (profile as any).fullName,
      action: 'update',
      ...auditActor(session),
      summary: `Generó clave temporal para ${(profile as any).fullName}`,
    })

    return NextResponse.json({
      success: true,
      tempPassword,
      codigoCgbvp: (profile as any).codigoCgbvp ?? null,
    })
  } catch (error: any) {
    if (error?.name === 'ConditionalCheckFailedException')
      return NextResponse.json({ error: 'El efectivo no tiene cuenta de acceso' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
