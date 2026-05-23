import { ddb, TABLE, GetCommand, QueryCommand, BatchGetCommand, ScanCommand } from '@/lib/db/dynamodb'
import type { Profile } from '../schema/profiles'
import type { SectionRole } from '../schema/section-roles'
import type { Section } from '../schema/sections'

export type ProfileWithRoles = Profile & {
  sectionRoles: (SectionRole & { section?: Section | null })[]
}

async function enrichRolesWithSections(
  roles: SectionRole[]
): Promise<(SectionRole & { section?: Section | null })[]> {
  if (roles.length === 0) return []
  const uniqueSectionIds = [...new Set(roles.map((r) => r.sectionId))]
  const batchRes = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE.sections]: {
        Keys: uniqueSectionIds.map((id) => ({ sectionId: id })),
      },
    },
  }))
  const sectionMap = new Map<string, Section>()
  for (const item of batchRes.Responses?.[TABLE.sections] ?? []) {
    const s = item as Section
    sectionMap.set(s.sectionId, s)
  }
  return roles.map((r) => ({ ...r, section: sectionMap.get(r.sectionId) ?? null }))
}

async function loadActiveRolesForProfile(
  profileId: string
): Promise<(SectionRole & { section?: Section | null })[]> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.sectionRoles,
    KeyConditionExpression: 'profileId = :pid',
    FilterExpression: 'isActive = :t',
    ExpressionAttributeValues: { ':pid': profileId, ':t': true },
  }))
  return enrichRolesWithSections((res.Items ?? []) as SectionRole[])
}

/** Perfil completo con roles y secciones asignadas */
export async function getProfileWithRoles(profileId: string): Promise<ProfileWithRoles | null> {
  const [profileRes, sectionRoles] = await Promise.all([
    ddb.send(new GetCommand({ TableName: TABLE.profiles, Key: { profileId } })),
    loadActiveRolesForProfile(profileId),
  ])
  const profile = profileRes.Item as Profile | undefined
  if (!profile) return null
  return { ...profile, sectionRoles }
}

/** Perfil por userId de NextAuth */
export async function getProfileByUserId(userId: string): Promise<ProfileWithRoles | null> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE.profiles,
    IndexName: 'userId-index',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    Limit: 1,
  }))
  const profile = res.Items?.[0] as Profile | undefined
  if (!profile) return null
  const sectionRoles = await loadActiveRolesForProfile(profile.profileId)
  return { ...profile, sectionRoles }
}

/** Directorio de personal con búsqueda opcional (filtrado en cliente) */
export async function getActiveProfiles(search?: string): Promise<ProfileWithRoles[]> {
  const res = await ddb.send(new ScanCommand({ TableName: TABLE.profiles }))
  let items = (res.Items ?? []) as Profile[]

  if (search) {
    const q = search.toLowerCase()
    items = items.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.dni?.toLowerCase().includes(q) ?? false)
    )
  }

  items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))

  return Promise.all(
    items.map(async (profile) => {
      const sectionRoles = await loadActiveRolesForProfile(profile.profileId)
      return { ...profile, sectionRoles }
    })
  )
}

/** Personal por sección (roles activos en esa sección) */
export async function getProfilesBySection(
  sectionId: string
): Promise<(Profile & { role: SectionRole['role'] })[]> {
  const rolesRes = await ddb.send(new QueryCommand({
    TableName: TABLE.sectionRoles,
    IndexName: 'sectionId-index',
    KeyConditionExpression: 'sectionId = :sid',
    FilterExpression: 'isActive = :t',
    ExpressionAttributeValues: { ':sid': sectionId, ':t': true },
  }))
  const roles = (rolesRes.Items ?? []) as SectionRole[]
  if (roles.length === 0) return []

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

  return roles
    .map((r) => {
      const profile = profileMap.get(r.profileId)
      return profile ? { ...profile, role: r.role } : null
    })
    .filter(Boolean) as (Profile & { role: SectionRole['role'] })[]
}
