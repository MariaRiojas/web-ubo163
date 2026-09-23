import type { Permission } from '@/lib/auth/permissions'

/**
 * ¿La sesión puede modificar el inventario (crear, editar, borrar, reasignar)?
 *
 * Mismo criterio que la pantalla de inventario (`inventory.manage`), más los
 * permisos amplios de comando. Sin esto, cualquier usuario autenticado —
 * incluidos postulantes — podía escribir el inventario por API.
 */
const WRITE_PERMISSIONS: Permission[] = [
  'inventory.manage',
  'inventory.manage_section',
  'inventory.manage_all',
  'company.manage',
]

export function canWriteInventory(session: unknown): boolean {
  const perms = ((session as any)?.user?.permissions ?? []) as Permission[]
  return WRITE_PERMISSIONS.some((p) => perms.includes(p))
}
