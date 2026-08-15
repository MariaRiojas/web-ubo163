import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, UpdateCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'

export async function POST(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params
    const { profileId, category, subtype, score, date, notes } = await req.json()

    if (!profileId || !category || !subtype || score === undefined) {
      return NextResponse.json({ error: 'Campos obligatorios: profileId, category, subtype, score' }, { status: 400 })
    }
    if (score < 0 || score > 20) {
      return NextResponse.json({ error: 'Score debe ser entre 0 y 20' }, { status: 400 })
    }

    const evaluationId = generateId()
    const user = session.user as any

    await ddb.send(new PutCommand({
      TableName: TABLE.trainingEvaluations,
      Item: {
        evaluationId, cohortId, profileId, category, subtype,
        score: Number(score), date: date || now().split('T')[0],
        evaluatedBy: user.profileId || '', evaluatedByName: user.name || '',
        notes: notes || '', createdAt: now(),
      },
    }))

    return NextResponse.json({ success: true, evaluationId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { evaluationId, score, notes } = await req.json()
    if (!evaluationId || score === undefined) {
      return NextResponse.json({ error: 'evaluationId y score requeridos' }, { status: 400 })
    }
    if (score < 0 || score > 20) {
      return NextResponse.json({ error: 'Score debe ser entre 0 y 20' }, { status: 400 })
    }

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingEvaluations,
      Key: { evaluationId },
      UpdateExpression: 'SET score = :s, notes = :n',
      ExpressionAttributeValues: { ':s': Number(score), ':n': notes || '' },
    }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
