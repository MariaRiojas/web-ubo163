import { eq, and, ilike, or } from 'drizzle-orm'
import { db } from '../index'
import { profiles, sectionRoles, sections } from '../schema'
import type { Profile } from '../schema/profiles'

/** Perfil completo con roles y secciones asignadas */
export async function getProfileWithRoles(profileId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    with: {
      sectionRoles: {
        where: eq(sectionRoles.isActive, true),
        with: { section: true },
      },
    },
  })
}

/** Perfil por userId de NextAuth */
export async function getProfileByUserId(userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
    with: {
      sectionRoles: {
        where: eq(sectionRoles.isActive, true),
        with: { section: true },
      },
    },
  })
}

/** Directorio de personal activo con búsqueda opcional */
export async function getActiveProfiles(search?: string) {
  return db.query.profiles.findMany({
    where: search
      ? and(
          or(
            ilike(profiles.fullName, `%${search}%`),
            ilike(profiles.dni, `%${search}%`)
          )
        )
      : undefined,
    with: {
      sectionRoles: {
        where: eq(sectionRoles.isActive, true),
        with: { section: true },
      },
    },
    orderBy: profiles.fullName,
  })
}

/** Personal por sección */
export async function getProfilesBySection(sectionId: string) {
  const roles = await db.query.sectionRoles.findMany({
    where: and(
      eq(sectionRoles.sectionId, sectionId),
      eq(sectionRoles.isActive, true)
    ),
    with: { profile: true },
  })
  return roles.map((r) => ({ ...r.profile, role: r.role }))
}
