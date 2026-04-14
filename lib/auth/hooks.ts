"use client"

import { useSession } from "next-auth/react"
import type { Permission } from "./permissions"

/**
 * Devuelve el array de permisos del usuario autenticado.
 * En componentes de servidor usar `auth()` directamente.
 *
 * @example
 * const perms = usePermissions()
 * if (perms.includes("reports.view_all")) { ... }
 */
export function usePermissions(): Permission[] {
  const { data: session } = useSession()
  return (session?.user?.permissions as Permission[]) ?? []
}

/**
 * Devuelve los datos del usuario de la sesión actual,
 * con tipos correctos para las propiedades extendidas.
 *
 * @example
 * const user = useUser()
 * console.log(user?.name, user?.grade)
 */
export function useUser() {
  const { data: session, status } = useSession()

  if (!session?.user) return { user: null, status }

  const user = {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    profileId: session.user.profileId as string,
    grade: session.user.grade as string,
    status: session.user.status as string,
    permissions: (session.user.permissions as Permission[]) ?? [],
  }

  return { user, status }
}

/**
 * Helper tipado para chequear un permiso específico.
 *
 * @example
 * const can = useHasPermission("inventory.edit")
 * if (can) <EditButton />
 */
export function useHasPermission(permission: Permission): boolean {
  const perms = usePermissions()
  return perms.includes(permission)
}
