import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, UpdateCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'
import bcrypt from 'bcryptjs'
import type { Permission } from '@/lib/auth/permissions'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canEdit = permissions.includes('personnel.edit') || permissions.includes('area.admin.manage')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { id } = await params
    // Generate temporary password
    const tempPassword = `Ubo163_${Math.random().toString(36).slice(2, 8)}`
    const passwordHash = await bcrypt.hash(tempPassword, 10)

    await ddb.send(new UpdateCommand({
      TableName: TABLE.users,
      Key: { userId: id },
      UpdateExpression: 'SET passwordHash = :ph, updatedAt = :ts',
      ExpressionAttributeValues: { ':ph': passwordHash, ':ts': now() },
    }))

    return NextResponse.json({ success: true, tempPassword })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
