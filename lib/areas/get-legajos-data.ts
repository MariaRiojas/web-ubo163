import 'server-only'
import { ddb, TABLE, ScanCommand } from '@/lib/db/dynamodb'
import type { Profile } from '@/lib/db/schema/profiles'
import { GRADE_HIERARCHY } from '@/lib/cgbvp/grades'

export interface LegajoEntry {
  profileId: string
  fullName: string
  grade: string
  status: string
  codigoCgbvp: string | null
  joinDate: string | null
  gender: string | null
  phone: string | null
  email: string | null
  bloodType: string | null
}

export interface LegajosData {
  entries: LegajoEntry[]
  stats: {
    total: number
    byStatus: Record<string, number>
    byGrade: Record<string, number>
  }
}

const STATUS_ORDER: Record<string, number> = {
  activo: 0,
  reserva: 1,
  licencia: 2,
  aspirante_en_curso: 3,
  postulante: 4,
  retirado: 5,
}

export async function getLegajosData(): Promise<LegajosData> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.profiles,
    ProjectionExpression:
      'profileId, fullName, grade, #st, codigoCgbvp, joinDate, gender, phone, email, bloodType',
    ExpressionAttributeNames: { '#st': 'status' },
  }))

  const profiles = (Items ?? []) as Profile[]

  const entries: LegajoEntry[] = profiles
    .map(p => ({
      profileId: p.profileId,
      fullName: p.fullName ?? '',
      grade: p.grade ?? '',
      status: p.status ?? '',
      codigoCgbvp: p.codigoCgbvp ?? null,
      joinDate: p.joinDate ?? null,
      gender: p.gender ?? null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      bloodType: p.bloodType ?? null,
    }))
    .sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      if (statusDiff !== 0) return statusDiff
      const aIdx = GRADE_HIERARCHY.indexOf(a.grade as any)
      const bIdx = GRADE_HIERARCHY.indexOf(b.grade as any)
      if (aIdx !== bIdx) return bIdx - aIdx // higher grade first
      return a.fullName.localeCompare(b.fullName)
    })

  const byStatus: Record<string, number> = {}
  const byGrade: Record<string, number> = {}
  for (const p of profiles) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    byGrade[p.grade] = (byGrade[p.grade] ?? 0) + 1
  }

  return {
    entries,
    stats: { total: profiles.length, byStatus, byGrade },
  }
}
