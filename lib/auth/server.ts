import { auth } from './index'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, sectionRoles } from '@/lib/db/schema'
import { resolvePermissions, type Permission } from './permissions'
import { redirect } from 'next/navigation'

/**
 * Obtiene la sesión del servidor y verifica autenticación.
 * Redirige a /login si no hay sesión activa.
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

/**
 * Verifica que el usuario tiene un permiso específico.
 * Lanza error si no tiene el permiso — úsalo en Server Actions.
 */
export async function requirePermission(permission: Permission) {
  const session = await requireAuth()

  const permissions = session.user.permissions as Permission[]
  if (!permissions?.includes(permission)) {
    throw new Error(`Sin permiso: ${permission}`)
  }

  return session
}

/**
 * Obtiene el perfil completo con roles desde la BD.
 * Para casos donde necesitas más datos que los del JWT.
 */
export async function getCurrentProfileFull() {
  const session = await requireAuth()
  const profileId = session.user.profileId as string

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

/**
 * Verifica si el usuario pertenece a una sección específica.
 */
export async function requireSectionAccess(sectionKey: string) {
  const session = await requireAuth()
  const permissions = session.user.permissions as Permission[]

  // Comandante/Jefatura tiene acceso a todo
  if (permissions.includes('company.view_all')) return session

  // Verificar si tiene acceso a esa sección específica
  const profileId = session.user.profileId as string
  const role = await db.query.sectionRoles.findFirst({
    where: eq(sectionRoles.profileId, profileId),
    with: {
      section: true,
    },
  })

  if (!role || (role.section as any)?.key !== sectionKey) {
    throw new Error('Sin acceso a esta sección')
  }

  return session
}
