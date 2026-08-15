import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, GetCommand, ScanCommand, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, BatchGetCommand, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params

    const [cohortRes, enrollRes, evalRes] = await Promise.all([
      ddb.send(new GetCommand({ TableName: TABLE.trainingCohorts, Key: { cohortId } })),
      ddb.send(new QueryCommand({
        TableName: TABLE.trainingEnrollments,
        KeyConditionExpression: 'cohortId = :c',
        ExpressionAttributeValues: { ':c': cohortId },
      })),
      ddb.send(new ScanCommand({
        TableName: TABLE.trainingEvaluations,
        FilterExpression: 'cohortId = :c',
        ExpressionAttributeValues: { ':c': cohortId },
      })),
    ])

    if (!cohortRes.Item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const enrollments = enrollRes.Items ?? []
    const evaluations = evalRes.Items ?? []

    // BatchGet profiles for names
    const profileIds = [...new Set(enrollments.map((e: any) => e.profileId))]
    let profiles: any[] = []
    if (profileIds.length > 0) {
      const chunks = []
      for (let i = 0; i < profileIds.length; i += 100) chunks.push(profileIds.slice(i, i + 100))
      for (const chunk of chunks) {
        const batchRes = await ddb.send(new BatchGetCommand({
          RequestItems: { [TABLE.profiles]: { Keys: chunk.map(id => ({ profileId: id })) } },
        }))
        profiles.push(...(batchRes.Responses?.[TABLE.profiles] ?? []))
      }
    }

    return NextResponse.json({
      cohort: cohortRes.Item,
      enrollments,
      evaluations,
      profiles: profiles.map((p: any) => ({ profileId: p.profileId, fullName: p.fullName, dni: p.dni, status: p.status })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params
    const body = await req.json()
    const { status, resolution, name, startDate, endDate } = body

    const expr: string[] = ['#updatedAt = :now']
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' }
    const values: Record<string, any> = { ':now': now() }

    if (status) { expr.push('#st = :st'); names['#st'] = 'status'; values[':st'] = status }
    if (resolution !== undefined) { expr.push('resolution = :res'); values[':res'] = resolution }
    if (name) { expr.push('#n = :n'); names['#n'] = 'name'; values[':n'] = name }
    if (startDate) { expr.push('startDate = :sd'); values[':sd'] = startDate }
    if (endDate) { expr.push('endDate = :ed'); values[':ed'] = endDate }

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingCohorts,
      Key: { cohortId },
      UpdateExpression: `SET ${expr.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params
    await ddb.send(new DeleteCommand({ TableName: TABLE.trainingCohorts, Key: { cohortId } }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
