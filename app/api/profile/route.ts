import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, UpdateCommand } from '@/lib/db/dynamodb'
import { now } from '@/lib/db/dynamodb'

// Campos que el propio usuario puede editar
const SELF_EDITABLE = ['phone', 'personalEmail', 'address', 'bloodType', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation', 'gender']

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.profileId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const profileId = session.user.profileId

    const updates: string[] = []
    const names: Record<string, string> = {}
    const values: Record<string, any> = { ':ts': now() }

    for (const key of SELF_EDITABLE) {
      if (key in body) {
        names[`#${key}`] = key
        values[`:${key}`] = body[key] || undefined
        updates.push(`#${key} = :${key}`)
      }
    }

    if (updates.length === 0) return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    updates.push('updatedAt = :ts')

    await ddb.send(new UpdateCommand({
      TableName: TABLE.profiles,
      Key: { profileId },
      UpdateExpression: 'SET ' + updates.join(', '),
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
    }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
