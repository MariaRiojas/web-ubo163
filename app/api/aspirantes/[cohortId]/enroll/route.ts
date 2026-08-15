import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, PutCommand, UpdateCommand, now, GetCommand } from '@/lib/db/dynamodb'
import { autoEnrollMandatoryCourses } from '@/lib/capacitacion/auto-enroll'
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
    const { profileIds } = await req.json()
    if (!Array.isArray(profileIds) || profileIds.length === 0) {
      return NextResponse.json({ error: 'profileIds requerido' }, { status: 400 })
    }

    const timestamp = now()
    await Promise.all(profileIds.map(profileId =>
      ddb.send(new PutCommand({
        TableName: TABLE.trainingEnrollments,
        Item: { cohortId, profileId, enrolledAt: timestamp, status: 'activo', finalGrade: null, observations: '', updatedAt: timestamp },
      }))
    ))

    // Auto-enroll en cursos obligatorios para cada perfil (fire-and-forget)
    // Obtener el grado de cada perfil y auto-inscribir si es postulante o aspirante
    profileIds.forEach(profileId => {
      ddb.send(new GetCommand({
        TableName: TABLE.profiles,
        Key: { profileId },
      })).then(res => {
        const profile = res.Item as any
        if (profile && (profile.grade === 'postulante' || profile.grade === 'aspirante')) {
          autoEnrollMandatoryCourses(profileId, profile.grade).catch(err => {
            console.error('[POST /api/aspirantes/[cohortId]/enroll] Auto-enrollment failed:', err)
          })
        }
      }).catch(err => {
        console.error('[POST /api/aspirantes/[cohortId]/enroll] Profile lookup failed:', err)
      })
    })

    return NextResponse.json({ success: true, count: profileIds.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ cohortId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view')) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { cohortId } = await params
    const { profileId } = await req.json()
    if (!profileId) return NextResponse.json({ error: 'profileId requerido' }, { status: 400 })

    await ddb.send(new UpdateCommand({
      TableName: TABLE.trainingEnrollments,
      Key: { cohortId, profileId },
      UpdateExpression: 'SET #st = :st, updatedAt = :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':st': 'retirado', ':now': now() },
    }))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
