import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ddb, TABLE, ScanCommand, PutCommand, generateId, now } from '@/lib/db/dynamodb'
import { autoEnrollMandatoryCourses } from '@/lib/capacitacion/auto-enroll'
import bcrypt from 'bcryptjs'
import type { Permission } from '@/lib/auth/permissions'

const GRADE_ORDER: Record<string, number> = {
  brigadier_general: 1, brigadier_mayor: 2, brigadier: 3,
  teniente_brigadier: 4, capitan: 5, teniente: 6,
  subteniente: 7, seccionario: 8, aspirante: 9, postulante: 10,
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canView =
      permissions.includes('personnel.view_all') ||
      permissions.includes('area.admin.manage') ||
      permissions.includes('area.instruction.view') ||
      permissions.includes('area.instruction.manage') ||
      permissions.includes('training.manage')
    if (!canView) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.toLowerCase()
    const status = searchParams.get('status')
    const section = searchParams.get('section')
    const grade = searchParams.get('grade')

    const res = await ddb.send(new ScanCommand({ TableName: TABLE.profiles }))
    let items = (res.Items ?? []) as any[]

    if (search) items = items.filter(p => p.fullName?.toLowerCase().includes(search) || p.dni?.includes(search))
    if (status) items = items.filter(p => p.status === status)
    if (section) items = items.filter(p => p.sectionKey === section)
    if (grade) items = items.filter(p => p.grade === grade)

    items.sort((a, b) => (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99))

    return NextResponse.json({ items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const permissions = session.user.permissions as Permission[]
    const canEdit = permissions.includes('personnel.edit') || permissions.includes('area.admin.manage')
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    const body = await req.json()
    const { firstName, lastName, dni, email, grade, gender, phone, birthDate, address, codigoCgbvp, sectionKey, status } = body

    if (!firstName || !lastName || !dni || !email) {
      return NextResponse.json({ error: 'Campos obligatorios: firstName, lastName, dni, email' }, { status: 400 })
    }

    const id = generateId()
    const timestamp = now()
    const fullName = `${lastName}, ${firstName}`
    const passwordHash = await bcrypt.hash('Bomberos2024!', 10)

    // Create user record
    await ddb.send(new PutCommand({
      TableName: TABLE.users,
      Item: { userId: id, email, passwordHash, createdAt: timestamp, updatedAt: timestamp },
    }))

    // Create profile record
    const finalGrade = grade || 'aspirante'
    await ddb.send(new PutCommand({
      TableName: TABLE.profiles,
      Item: {
        profileId: id, userId: id, email, firstName, lastName, fullName, dni,
        grade: finalGrade, gradeOrder: GRADE_ORDER[finalGrade] ?? 10,
        status: status || 'activo', gender: gender || 'masculino',
        phone: phone || '', birthDate: birthDate || '', address: address || '',
        ...(codigoCgbvp ? { codigoCgbvp } : {}),
        sectionKey: sectionKey || '',
        joinDate: timestamp.split('T')[0], createdAt: timestamp, updatedAt: timestamp,
      },
    }))

    // Auto-enroll en cursos obligatorios si es postulante o aspirante (fire-and-forget)
    if (finalGrade === 'postulante' || finalGrade === 'aspirante') {
      autoEnrollMandatoryCourses(id, finalGrade as 'postulante' | 'aspirante').catch(err => {
        console.error('[POST /api/personnel] Auto-enrollment failed:', err)
      })
    }

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
