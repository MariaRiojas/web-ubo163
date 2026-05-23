import { ddb, TABLE, QueryCommand, ScanCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import type { Section } from '../schema/sections'
import type { SectionRole } from '../schema/section-roles'
import type { Profile } from '../schema/profiles'

/** Todas las secciones ordenadas por displayOrder */
export async function getAllSections(): Promise<Section[]> {
  const res = await ddb.send(new ScanCommand({ TableName: TABLE.sections }))
  const items = (res.Items ?? []) as Section[]
  return items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
}

/** Sección por key (ej: 'maquinas') con personal activo asignado */
export async function getSectionWithPersonnel(key: string): Promise<
  (Section & { sectionRoles: (SectionRole & { profile?: Profile | null })[] }) | null
> {
  // `key` es palabra reservada DynamoDB — usar ExpressionAttributeNames
  const sectionRes = await ddb.send(new QueryCommand({
    TableName: TABLE.sections,
    IndexName: 'key-index',
    KeyConditionExpression: '#k = :key',
    ExpressionAttributeNames: { '#k': 'key' },
    ExpressionAttributeValues: { ':key': key },
    Limit: 1,
  }))
  const section = sectionRes.Items?.[0] as Section | undefined
  if (!section) return null

  const rolesRes = await ddb.send(new QueryCommand({
    TableName: TABLE.sectionRoles,
    IndexName: 'sectionId-index',
    KeyConditionExpression: 'sectionId = :sid',
    FilterExpression: 'isActive = :t',
    ExpressionAttributeValues: { ':sid': section.sectionId, ':t': true },
  }))
  const roles = (rolesRes.Items ?? []) as SectionRole[]
  if (roles.length === 0) return { ...section, sectionRoles: [] }

  const batchRes = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE.profiles]: {
        Keys: roles.map((r) => ({ profileId: r.profileId })),
      },
    },
  }))
  const profileMap = new Map<string, Profile>()
  for (const item of batchRes.Responses?.[TABLE.profiles] ?? []) {
    const p = item as Profile
    profileMap.set(p.profileId, p)
  }

  return {
    ...section,
    sectionRoles: roles.map((r) => ({ ...r, profile: profileMap.get(r.profileId) ?? null })),
  }
}
