import 'server-only'
import { ddb, TABLE, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { InventoryItem } from '@/lib/db/schema/inventory'
import type { Profile } from '@/lib/db/schema/profiles'

export interface EppAssignment {
  profileId: string
  profileName: string
  profileGrade: string
  profileCodigoCgbvp: string | null
  eppCount: number
  itemsSample: {
    name: string
    subcategory: string | null
    endOfLifeDate: string | null
  }[]
}

export interface ServiciosGeneralesExtraData {
  eppAssignments: EppAssignment[]
  totalEppAssigned: number
  eppNearReplacement: number
}

export async function getServiciosGeneralesExtraData(): Promise<ServiciosGeneralesExtraData> {
  const { Items } = await ddb.send(new ScanCommand({
    TableName: TABLE.inventory,
    FilterExpression: 'category = :cat AND attribute_exists(assignedProfileId)',
    ExpressionAttributeValues: { ':cat': 'epp' },
    Limit: 500,
  }))
  const eppRows = (Items ?? []) as InventoryItem[]

  const profileIds = [...new Set(
    eppRows.filter(r => r.assignedProfileId).map(r => r.assignedProfileId!),
  )]
  const profileMap = new Map<string, Profile>()
  if (profileIds.length > 0) {
    const { Responses } = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLE.profiles]: {
          Keys: profileIds.map(pid => ({ profileId: pid })),
          ProjectionExpression: 'profileId, fullName, grade, codigoCgbvp',
        },
      },
    }))
    for (const p of Responses?.[TABLE.profiles] ?? []) {
      profileMap.set(p.profileId as string, p as Profile)
    }
  }

  const byProfile = new Map<string, EppAssignment>()
  for (const r of eppRows) {
    if (!r.assignedProfileId) continue
    const p = profileMap.get(r.assignedProfileId)
    if (!p) continue
    let entry = byProfile.get(r.assignedProfileId)
    if (!entry) {
      entry = {
        profileId: r.assignedProfileId,
        profileName: p.fullName,
        profileGrade: p.grade,
        profileCodigoCgbvp: p.codigoCgbvp ?? null,
        eppCount: 0,
        itemsSample: [],
      }
      byProfile.set(r.assignedProfileId, entry)
    }
    entry.eppCount++
    if (entry.itemsSample.length < 4) {
      entry.itemsSample.push({
        name: r.name,
        subcategory: r.subcategory ?? null,
        endOfLifeDate: r.endOfLifeDate ?? null,
      })
    }
  }

  const eppAssignments = Array.from(byProfile.values())
    .sort((a, b) => b.eppCount - a.eppCount)

  const now = new Date()
  const sixMonths = new Date()
  sixMonths.setMonth(now.getMonth() + 6)

  const nearReplacement = eppRows.filter(r => {
    if (!r.endOfLifeDate) return false
    const d = new Date(r.endOfLifeDate)
    return d >= now && d <= sixMonths
  }).length

  return {
    eppAssignments,
    totalEppAssigned: eppRows.length,
    eppNearReplacement: nearReplacement,
  }
}
