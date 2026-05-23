import { auth } from './index'
import { ddb, TABLE, GetCommand, QueryCommand, BatchGetCommand } from '@/lib/db/dynamodb'
import { getProfileWithRoles } from '@/lib/db/queries/profiles'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Section } from '@/lib/db/schema/sections'
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
 * Obtiene el perfil completo con roles desde DynamoDB.
 * Para casos donde necesitas más datos que los del JWT.
 */
export async function getCurrentProfileFull() {
  const session = await requireAuth()
  const profileId = session.user.profileId as string
  return getProfileWithRoles(profileId)
}

/**
 * Verifica si el usuario pertenece a una sección específica.
 */
export async function requireSectionAccess(sectionKey: string) {
  const session = await requireAuth()
  const permissions = session.user.permissions as Permission[]

  if (permissions.includes('company.view_all')) return session

  const profileId = session.user.profileId as string

  // Cargar roles activos del perfil
  const rolesRes = await ddb.send(new QueryCommand({
    TableName: TABLE.sectionRoles,
    KeyConditionExpression: 'profileId = :pid',
    FilterExpression: 'isActive = :t',
    ExpressionAttributeValues: { ':pid': profileId, ':t': true },
  }))
  const roles = (rolesRes.Items ?? []) as SectionRole[]

  if (roles.length === 0) throw new Error('Sin acceso a esta sección')

  // BatchGet de las secciones de esos roles
  const uniqueSectionIds = [...new Set(roles.map((r) => r.sectionId))]
  const batchRes = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE.sections]: {
        Keys: uniqueSectionIds.map((id) => ({ sectionId: id })),
        ProjectionExpression: 'sectionId, #k',
        ExpressionAttributeNames: { '#k': 'key' },
      },
    },
  }))

  const sectionMap = new Map<string, string>() // sectionId → key
  for (const item of batchRes.Responses?.[TABLE.sections] ?? []) {
    sectionMap.set((item as Section).sectionId, (item as Section).key)
  }

  const hasAccess = roles.some((r) => sectionMap.get(r.sectionId) === sectionKey)
  if (!hasAccess) throw new Error('Sin acceso a esta sección')

  return session
}
