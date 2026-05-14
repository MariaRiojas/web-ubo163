import 'server-only'
import { db } from '@/lib/db'
import { inventory, profiles } from '@/lib/db/schema'
import { eq, isNotNull, sql, and, desc } from 'drizzle-orm'

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
  // Ítems EPP asignados a perfiles (categoría = EPP)
  const eppRows = await db
    .select({
      profileId: inventory.assignedProfileId,
      profileName: profiles.fullName,
      profileGrade: profiles.grade,
      profileCodigoCgbvp: profiles.codigoCgbvp,
      itemName: inventory.name,
      subcategory: inventory.subcategory,
      endOfLifeDate: inventory.endOfLifeDate,
    })
    .from(inventory)
    .innerJoin(profiles, eq(inventory.assignedProfileId, profiles.id))
    .where(
      and(
        isNotNull(inventory.assignedProfileId),
        eq(inventory.category, 'epp'),
      ),
    )
    .orderBy(profiles.fullName)
    .limit(500)

  // Agrupar por profileId
  const byProfile = new Map<string, EppAssignment>()
  for (const r of eppRows) {
    if (!r.profileId) continue
    let entry = byProfile.get(r.profileId)
    if (!entry) {
      entry = {
        profileId: r.profileId,
        profileName: r.profileName,
        profileGrade: r.profileGrade,
        profileCodigoCgbvp: r.profileCodigoCgbvp,
        eppCount: 0,
        itemsSample: [],
      }
      byProfile.set(r.profileId, entry)
    }
    entry.eppCount++
    if (entry.itemsSample.length < 4) {
      entry.itemsSample.push({
        name: r.itemName,
        subcategory: r.subcategory,
        endOfLifeDate: r.endOfLifeDate,
      })
    }
  }

  const eppAssignments = Array.from(byProfile.values()).sort(
    (a, b) => b.eppCount - a.eppCount,
  )

  const now = new Date()
  const sixMonths = new Date()
  sixMonths.setMonth(now.getMonth() + 6)

  const nearReplacement = eppRows.filter((r) => {
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
