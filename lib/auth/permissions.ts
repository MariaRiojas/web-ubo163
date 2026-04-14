import type { Profile } from '@/lib/db/schema/profiles'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Section } from '@/lib/db/schema/sections'

// ================================================================
// DEFINICIÓN DE PERMISOS
// ================================================================
export type Permission =
  // Jefatura
  | 'company.manage'
  | 'company.view_all'
  | 'company.approve_requests'
  // Sección propia
  | 'section.manage'
  | 'section.view'
  | 'section.edit'
  // Personal
  | 'personnel.view_all'
  | 'personnel.view_section'
  | 'personnel.edit'
  // Guardias
  | 'guards.manage'
  | 'guards.approve'
  | 'guards.reserve'
  // Incidencias
  | 'incidents.manage_all'
  | 'incidents.manage_section'
  | 'incidents.create'
  // Inventario
  | 'inventory.manage'
  | 'inventory.view'
  // ESBAS
  | 'esbas.manage'
  | 'esbas.instruct'
  | 'esbas.view_progress'
  // Contenido
  | 'content.manage'
  | 'content.view'
  // Horas de servicio
  | 'hours.manage'
  | 'hours.verify'
  | 'hours.view_own'
  | 'hours.view_all'
  // Comunicados
  | 'announcements.create'
  | 'announcements.view'
  // Reportes
  | 'reports.generate'
  | 'reports.view_section'
  | 'reports.view_all'
  // Sistema
  | 'system.admin'
  | 'system.manage_users'

export const ALL_PERMISSIONS: Permission[] = [
  'company.manage', 'company.view_all', 'company.approve_requests',
  'section.manage', 'section.view', 'section.edit',
  'personnel.view_all', 'personnel.view_section', 'personnel.edit',
  'guards.manage', 'guards.approve', 'guards.reserve',
  'incidents.manage_all', 'incidents.manage_section', 'incidents.create',
  'inventory.manage', 'inventory.view',
  'esbas.manage', 'esbas.instruct', 'esbas.view_progress',
  'content.manage', 'content.view',
  'hours.manage', 'hours.verify', 'hours.view_own', 'hours.view_all',
  'announcements.create', 'announcements.view',
  'reports.generate', 'reports.view_section', 'reports.view_all',
  'system.admin', 'system.manage_users',
]

// Permisos base que tienen todos los usuarios autenticados
const BASE_PERMISSIONS: Permission[] = [
  'announcements.view',
  'hours.view_own',
  'esbas.view_progress',
  'content.view',
  'inventory.view',
]

type SectionRoleWithSection = SectionRole & { section?: Section | null }

// ================================================================
// RESOLUCIÓN DE PERMISOS (cargo + grado → permisos)
// ================================================================
export function resolvePermissions(
  profile: Profile,
  roles: SectionRoleWithSection[]
): Permission[] {
  const permissions = new Set<Permission>(BASE_PERMISSIONS)

  const activeRoles = roles.filter((r) => r.isActive)

  // ── Primer Jefe → acceso total ────────────────────────────────
  if (activeRoles.some((r) => r.role === 'primer_jefe')) {
    return ALL_PERMISSIONS
  }

  // ── Segundo Jefe → casi todo excepto config sistema ───────────
  if (activeRoles.some((r) => r.role === 'segundo_jefe')) {
    ;(
      [
        'company.view_all',
        'company.approve_requests',
        'personnel.view_all',
        'personnel.edit',
        'guards.manage',
        'guards.approve',
        'incidents.manage_all',
        'hours.view_all',
        'hours.verify',
        'reports.view_all',
        'reports.generate',
        'announcements.create',
        'system.manage_users',
      ] as Permission[]
    ).forEach((p) => permissions.add(p))
  }

  // ── Jefe de Sección → gestión de su sección ───────────────────
  const jefeSecciones = activeRoles.filter((r) => r.role === 'jefe_seccion')
  for (const js of jefeSecciones) {
    ;(
      [
        'section.manage',
        'personnel.view_section',
        'incidents.manage_section',
        'incidents.create',
        'hours.manage',
        'hours.verify',
        'reports.view_section',
        'guards.approve',
      ] as Permission[]
    ).forEach((p) => permissions.add(p))

    // Permisos adicionales según sección específica (Art. 116-117 RIF)
    switch (js.section?.key) {
      case 'maquinas':
        permissions.add('inventory.manage')
        break
      case 'servicios_generales':
        permissions.add('inventory.manage')
        break
      case 'instruccion':
        permissions.add('esbas.manage')
        permissions.add('esbas.instruct')
        break
      case 'prehospitalaria':
        permissions.add('inventory.manage')
        break
      case 'administracion':
        permissions.add('personnel.edit')
        permissions.add('reports.generate')
        permissions.add('personnel.view_all')
        permissions.add('hours.view_all')
        break
      case 'imagen':
        permissions.add('content.manage')
        permissions.add('announcements.create')
        break
    }
  }

  // ── Adjunto de Sección ────────────────────────────────────────
  const adjuntos = activeRoles.filter((r) => r.role === 'adjunto')
  for (const adj of adjuntos) {
    ;(
      [
        'section.view',
        'section.edit',
        'incidents.create',
        'personnel.view_section',
      ] as Permission[]
    ).forEach((p) => permissions.add(p))

    // Adjunto de instrucción puede registrar calificaciones
    if (adj.section?.key === 'instruccion') {
      permissions.add('esbas.instruct')
    }
  }

  // ── Efectivos activos (seccionario en adelante) ───────────────
  const effectiveGrades = [
    'seccionario', 'subteniente', 'teniente', 'capitan',
    'teniente_brigadier', 'brigadier', 'brigadier_mayor', 'brigadier_general',
  ]
  if (effectiveGrades.includes(profile.grade)) {
    permissions.add('guards.reserve')
    permissions.add('incidents.create')
  }

  // ── Aspirantes en curso ───────────────────────────────────────
  // Solo ven ESBAS, comunicados y su progreso (ya incluido en BASE_PERMISSIONS)

  return [...new Set(permissions)]
}

// ================================================================
// HELPERS
// ================================================================
export function hasPermission(
  permissions: Permission[],
  permission: Permission
): boolean {
  return permissions.includes(permission)
}

export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.some((p) => permissions.includes(p))
}
