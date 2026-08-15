import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, ScanCommand, QueryCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'

function avg(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params
    const { searchParams } = new URL(req.url)
    const filterProfileId = searchParams.get('profileId')

    const [enrollRes, evalRes] = await Promise.all([
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

    let enrollments = (enrollRes.Items ?? []).filter((e: any) => e.status !== 'retirado')
    const evaluations = evalRes.Items ?? []

    if (filterProfileId) {
      enrollments = enrollments.filter((e: any) => e.profileId === filterProfileId)
    }

    const profileIds = enrollments.map((e: any) => e.profileId)
    let profiles: any[] = []
    if (profileIds.length > 0) {
      const batchRes = await ddb.send(new BatchGetCommand({
        RequestItems: { [TABLE.profiles]: { Keys: profileIds.map(id => ({ profileId: id })) } },
      }))
      profiles = batchRes.Responses?.[TABLE.profiles] ?? []
    }

    const profileMap = Object.fromEntries(profiles.map((p: any) => [p.profileId, p.fullName]))

    const report = enrollments.map((enr: any) => {
      const pid = enr.profileId
      const evals = evaluations.filter((ev: any) => ev.profileId === pid)
      const academica = evals.filter((ev: any) => ev.category === 'academica').map((e: any) => e.score)
      const fisica = evals.filter((ev: any) => ev.category === 'fisica').map((e: any) => e.score)
      const aptitud = evals.filter((ev: any) => ev.category === 'aptitud').map((e: any) => e.score)

      const avgAcademica = avg(academica)
      const avgFisica = avg(fisica)
      const avgAptitud = avg(aptitud)
      const avgGeneral = avg([avgAcademica, avgFisica, avgAptitud].filter(v => v > 0))
      const aprobado = avgAcademica >= 14 && avgFisica >= 14 && avgAptitud >= 14

      return {
        profileId: pid,
        fullName: profileMap[pid] || 'Sin nombre',
        avgAcademica, avgFisica, avgAptitud, avgGeneral,
        aprobado,
        evaluations: evals,
      }
    })

    return NextResponse.json({ report })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
