import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, ScanCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import type { Permission } from '@/lib/auth/permissions'

const GENERAL_VIEW_GRADES = new Set(['postulante', 'aspirante'])
const GRADE_RANK: Record<string, number> = { postulante: 0, aspirante: 1 }

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = (session.user.permissions ?? []) as Permission[]
    if (!permissions.includes('area.instruction.view') && (session.user as any).profileId !== 'admin-001') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view')

    if (view === 'general') {
      // Vista general: todos los perfiles en formación (postulante/aspirante),
      // sin importar si pertenecen a alguna convocatoria.
      const [profilesRes, enrollRes, cohortsRes] = await Promise.all([
        ddb.send(new ScanCommand({ TableName: TABLE.profiles })),
        ddb.send(new ScanCommand({ TableName: TABLE.trainingEnrollments })),
        ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts })),
      ])

      const profiles = (profilesRes.Items ?? []).filter(
        (p: any) => GENERAL_VIEW_GRADES.has(p.grade) && p.status !== 'retirado'
      )

      const cohortMap = Object.fromEntries(
        (cohortsRes.Items ?? []).map((c: any) => [c.cohortId, c])
      )

      // Para cada perfil, tomar la inscripción activa más reciente (si existe)
      const enrollmentByProfile: Record<string, any> = {}
      for (const e of enrollRes.Items ?? []) {
        if (e.status === 'retirado') continue
        const existing = enrollmentByProfile[e.profileId]
        if (!existing || (e.enrolledAt || '') > (existing.enrolledAt || '')) {
          enrollmentByProfile[e.profileId] = e
        }
      }

      const items = profiles
        .map((p: any) => {
          const enr = enrollmentByProfile[p.profileId]
          const cohort = enr ? cohortMap[enr.cohortId] : undefined
          return {
            profileId: p.profileId,
            fullName: p.fullName,
            grade: p.grade,
            status: p.status,
            codigoCgbvp: p.codigoCgbvp || '',
            cohortId: cohort?.cohortId || '',
            cohortName: cohort?.name || '',
            enrolledAt: enr?.enrolledAt || '',
          }
        })
        .sort((a, b) => {
          const gradeDiff = (GRADE_RANK[a.grade] ?? 9) - (GRADE_RANK[b.grade] ?? 9)
          if (gradeDiff !== 0) return gradeDiff
          return (a.fullName || '').localeCompare(b.fullName || '')
        })

      return NextResponse.json({ items })
    }

    const res = await ddb.send(new ScanCommand({ TableName: TABLE.trainingCohorts }))
    const items = (res.Items ?? []).sort((a: any, b: any) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    )

    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = (session.user.permissions ?? []) as Permission[]
    if (!permissions.includes('area.instruction.manage') && !permissions.includes('area.instruction.view') && (session.user as any).profileId !== 'admin-001' && !permissions.includes('area.instruction.view') && (session.user as any).profileId !== 'admin-001') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }

    const body = await req.json()
    const { name, type, resolution, startDate, endDate, year, period } = body
    if (!name || !type || !year || !period) {
      return NextResponse.json({ error: 'Campos obligatorios: name, type, year, period' }, { status: 400 })
    }

    const cohortId = generateId()
    const timestamp = now()

    await ddb.send(new PutCommand({
      TableName: TABLE.trainingCohorts,
      Item: {
        cohortId, name, type, resolution: resolution || '',
        startDate: startDate || '', endDate: endDate || '',
        status: 'activa', year, period,
        createdBy: (session.user as any).profileId || '',
        createdAt: timestamp, updatedAt: timestamp,
      },
    }))

    return NextResponse.json({ success: true, cohortId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
