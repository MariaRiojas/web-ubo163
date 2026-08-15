import type { Profile } from '@/lib/db/schema/profiles'
import type { SectionRole } from '@/lib/db/schema/section-roles'
import type { Section } from '@/lib/db/schema/sections'

// ════════════════════════════════════════════════════════════════════
// PERMISSIONS v2
//
// Modelo granular basado en docs/ARQUITECTURA_MENU.md §8.
// Organizado por dominio funcional:
//
//   company.*        Jefatura y compañía
//   section.*        Sección propia (legacy, se mantiene por compat)
//   area.<sec>.*     Gestión de un área específica (v2)
//   personnel.*      Personal y legajo
//   guard.*          Guardia nocturna con separación por género
//   faena.*          Checklists, incidencias, solicitudes
//   training.*       Capacitación (LMS)
//   inventory.*      Inventario general
//   incidents.*      Compatibilidad con módulo anterior
//   announcements.*  Anuncios con flujo de aprobación
//   hours.*          Jornada voluntaria
//   content.*        Calendario e imagen institucional
//   reports.*        Reportería
//   system.*         Administración del sistema
// ════════════════════════════════════════════════════════════════════

export type Permission =
  // ─── Jefatura y compañía ───
  | 'company.manage'
  | 'company.view_all'
  | 'company.approve_requests'

  // ─── Sección propia (legacy) ───
  | 'section.manage'
  | 'section.view'
  | 'section.edit'

  // ─── Área por sección (v2 · acceso granular) ───
  | 'area.machines.view'          | 'area.machines.manage'
  | 'area.services.view'          | 'area.services.manage'
  | 'area.instruction.view'       | 'area.instruction.manage'
  | 'area.health.view'            | 'area.health.manage'
  | 'area.admin.view'             | 'area.admin.manage'
  | 'area.image.view'             | 'area.image.manage'

  // ─── Personal ───
  | 'personnel.view_all'
  | 'personnel.view_section'
  | 'personnel.edit'
  | 'profile.view_own'
  | 'profile.edit_own'
  | 'profile.view_any'
  | 'profile.edit_any'

  // ─── Guardia nocturna (con género) ───
  | 'guard.reserve_bed'
  | 'guard.view_male'
  | 'guard.view_female'
  | 'guard.manage_male'
  | 'guard.manage_female'
  | 'guard.config_beds_male'
  | 'guard.config_beds_female'
  // Legacy
  | 'guards.manage' | 'guards.approve' | 'guards.reserve'

  // ─── Faena y Servicio ───
  | 'faena.create_incident'
  | 'faena.create_request'
  | 'faena.create_checklist'
  | 'faena.receive_incident_machines'
  | 'faena.receive_incident_services'
  | 'faena.receive_incident_instruction'
  | 'faena.receive_incident_health'
  | 'faena.receive_incident_admin'
  | 'faena.receive_incident_image'
  | 'faena.receive_request_machines'
  | 'faena.receive_request_services'
  | 'faena.receive_request_instruction'
  | 'faena.receive_request_health'
  | 'faena.receive_request_admin'
  | 'faena.receive_request_image'

  // ─── Capacitación (LMS) ───
  | 'training.view_own_progress'
  | 'training.access_esbas'
  | 'training.access_escuela_tecnica'
  | 'training.manage'
  | 'training.issue_certificate'
  | 'training.view_all_progress'

  // ─── Incidencias (compat) ───
  | 'incidents.manage_all'
  | 'incidents.manage_section'
  | 'incidents.create'

  // ─── Inventario ───
  | 'inventory.view'
  | 'inventory.manage'              // compat general
  | 'inventory.manage_section'      // v2: solo ítems de la sección del cargo
  | 'inventory.manage_all'          // v2: todos (solo jefatura)

  // ─── ESBAS (compat) ───
  | 'esbas.manage'
  | 'esbas.instruct'
  | 'esbas.view_progress'

  // ─── Contenido ───
  | 'content.manage'
  | 'content.view'

  // ─── Horas de servicio ───
  | 'hours.manage'
  | 'hours.verify'
  | 'hours.view_own'
  | 'hours.view_all'

  // ─── Anuncios ───
  | 'announcements.view'
  | 'announcements.create'           // legacy
  | 'announcements.create_draft'     // v2: crear borrador (cualquier jefe)
  | 'announcements.publish'          // v2: aprobar y publicar (solo Primer Jefe)

  // ─── Reportes y comando ───
  | 'reports.generate'
  | 'reports.view_section'
  | 'reports.view_all'

  // ─── Sistema ───
  | 'system.admin'
  | 'system.manage_users'


export const ALL_PERMISSIONS: Permission[] = [
  'company.manage', 'company.view_all', 'company.approve_requests',
  'section.manage', 'section.view', 'section.edit',
  'area.machines.view', 'area.machines.manage',
  'area.services.view', 'area.services.manage',
  'area.instruction.view', 'area.instruction.manage',
  'area.health.view', 'area.health.manage',
  'area.admin.view', 'area.admin.manage',
  'area.image.view', 'area.image.manage',
  'personnel.view_all', 'personnel.view_section', 'personnel.edit',
  'profile.view_own', 'profile.edit_own', 'profile.view_any', 'profile.edit_any',
  'guard.reserve_bed',
  'guard.view_male', 'guard.view_female',
  'guard.manage_male', 'guard.manage_female',
  'guard.config_beds_male', 'guard.config_beds_female',
  'guards.manage', 'guards.approve', 'guards.reserve',
  'faena.create_incident', 'faena.create_request', 'faena.create_checklist',
  'faena.receive_incident_machines', 'faena.receive_incident_services',
  'faena.receive_incident_instruction', 'faena.receive_incident_health',
  'faena.receive_incident_admin', 'faena.receive_incident_image',
  'faena.receive_request_machines', 'faena.receive_request_services',
  'faena.receive_request_instruction', 'faena.receive_request_health',
  'faena.receive_request_admin', 'faena.receive_request_image',
  'training.view_own_progress', 'training.access_esbas', 'training.access_escuela_tecnica',
  'training.manage', 'training.issue_certificate', 'training.view_all_progress',
  'incidents.manage_all', 'incidents.manage_section', 'incidents.create',
  'inventory.view', 'inventory.manage', 'inventory.manage_section', 'inventory.manage_all',
  'esbas.manage', 'esbas.instruct', 'esbas.view_progress',
  'content.manage', 'content.view',
  'hours.manage', 'hours.verify', 'hours.view_own', 'hours.view_all',
  'announcements.view', 'announcements.create', 'announcements.create_draft', 'announcements.publish',
  'reports.generate', 'reports.view_section', 'reports.view_all',
  'system.admin', 'system.manage_users',
]

// ════════════════════════════════════════════════════════════════════
// BASE — permisos de todo usuario autenticado (postulante en adelante)
// ════════════════════════════════════════════════════════════════════

const BASE_PERMISSIONS: Permission[] = [
  'profile.view_own',
  'profile.edit_own',
  'announcements.view',
  'hours.view_own',
  'esbas.view_progress',
  'training.view_own_progress',
  'content.view',
  'inventory.view',
]

// Permisos adicionales para aspirantes
const ASPIRANTE_PERMISSIONS: Permission[] = [
  'training.access_esbas',
]

// Permisos adicionales para efectivos activos (seccionario en adelante)
const EFFECTIVE_PERMISSIONS: Permission[] = [
  'training.access_esbas',
  'training.access_escuela_tecnica',
  'guard.reserve_bed',
  'guards.reserve',
  'faena.create_incident',
  'faena.create_request',
  'faena.create_checklist',
  'incidents.create',
]

const EFFECTIVE_GRADES = [
  'seccionario',
  'subteniente',
  'teniente',
  'capitan',
  'teniente_brigadier',
  'brigadier',
  'brigadier_mayor',
  'brigadier_general',
]

// Mapa de sección → prefijo de permiso de área
const SECTION_AREA_KEY: Record<string, string> = {
  maquinas: 'area.machines',
  servicios_generales: 'area.services',
  instruccion: 'area.instruction',
  prehospitalaria: 'area.health',
  administracion: 'area.admin',
  imagen: 'area.image',
}

// Mapa de sección → sufijo del permiso de recepción de faena
const SECTION_FAENA_KEY: Record<string, string> = {
  maquinas: 'machines',
  servicios_generales: 'services',
  instruccion: 'instruction',
  prehospitalaria: 'health',
  administracion: 'admin',
  imagen: 'image',
}

type SectionRoleWithSection = SectionRole & { section?: Section | null }

// ════════════════════════════════════════════════════════════════════
// RESOLUCIÓN DE PERMISOS
// ════════════════════════════════════════════════════════════════════

export function resolvePermissions(
  profile: Profile,
  roles: SectionRoleWithSection[]
): Permission[] {
  const permissions = new Set<Permission>(BASE_PERMISSIONS)

  // ─── Estado/figura del efectivo ───
  const status = profile.status
  const grade = profile.grade

  // Postulantes y aspirantes
  if (status === 'postulante' || status === 'aspirante_en_curso' || grade === 'aspirante') {
    ASPIRANTE_PERMISSIONS.forEach((p) => permissions.add(p))
  }

  // Efectivos activos (seccionario en adelante)
  if (EFFECTIVE_GRADES.includes(grade)) {
    EFFECTIVE_PERMISSIONS.forEach((p) => permissions.add(p))
  }

  const activeRoles = roles.filter((r) => r.isActive)

  // ─── Primer Jefe → acceso total ───
  if (activeRoles.some((r) => r.role === 'primer_jefe')) {
    return ALL_PERMISSIONS
  }

  // ─── Segundo Jefe → casi todo ───
  if (activeRoles.some((r) => r.role === 'segundo_jefe')) {
    const segundoJefePerms: Permission[] = [
      'company.view_all',
      'company.approve_requests',
      'personnel.view_all',
      'personnel.edit',
      'profile.view_any',
      'profile.edit_any',
      'guards.manage',
      'guards.approve',
      'guard.manage_male',
      'guard.manage_female',
      'guard.config_beds_male',
      'guard.config_beds_female',
      'guard.view_male',
      'guard.view_female',
      'incidents.manage_all',
      'hours.view_all',
      'hours.verify',
      'reports.view_all',
      'reports.generate',
      'announcements.create',
      'announcements.create_draft',
      'system.manage_users',
      'inventory.manage_all',
      'training.view_all_progress',
    ]
    segundoJefePerms.forEach((p) => permissions.add(p))

    // El Segundo Jefe ve todas las áreas (transversal)
    for (const [, areaPrefix] of Object.entries(SECTION_AREA_KEY)) {
      permissions.add(`${areaPrefix}.view` as Permission)
      permissions.add(`${areaPrefix}.manage` as Permission)
    }
    // Recibe incidencias y solicitudes de todas las áreas
    for (const [, faenaKey] of Object.entries(SECTION_FAENA_KEY)) {
      permissions.add(`faena.receive_incident_${faenaKey}` as Permission)
      permissions.add(`faena.receive_request_${faenaKey}` as Permission)
    }
  }

  // ─── Jefe de Sección ───
  const jefeSecciones = activeRoles.filter((r) => r.role === 'jefe_seccion')
  for (const js of jefeSecciones) {
    const base: Permission[] = [
      'section.manage',
      'personnel.view_section',
      'incidents.manage_section',
      'incidents.create',
      'hours.manage',
      'hours.verify',
      'reports.view_section',
      'guards.approve',
      'announcements.create_draft',
    ]
    base.forEach((p) => permissions.add(p))

    const sectionKey = js.section?.key
    if (!sectionKey) continue

    // Permisos de área (v2)
    const areaPrefix = SECTION_AREA_KEY[sectionKey]
    if (areaPrefix) {
      permissions.add(`${areaPrefix}.view` as Permission)
      permissions.add(`${areaPrefix}.manage` as Permission)
    }

    // Recepción de incidencias y solicitudes del área
    const faenaKey = SECTION_FAENA_KEY[sectionKey]
    if (faenaKey) {
      permissions.add(`faena.receive_incident_${faenaKey}` as Permission)
      permissions.add(`faena.receive_request_${faenaKey}` as Permission)
    }

    // Permisos específicos por tipo de sección (Art. 116-117 RIF)
    switch (sectionKey) {
      case 'maquinas':
      case 'servicios_generales':
      case 'prehospitalaria':
        permissions.add('inventory.manage')
        permissions.add('inventory.manage_section')
        break
      case 'instruccion':
        permissions.add('esbas.manage')
        permissions.add('esbas.instruct')
        permissions.add('training.manage')
        permissions.add('training.issue_certificate')
        permissions.add('training.view_all_progress')
        permissions.add('training.access_esbas')
        permissions.add('training.access_escuela_tecnica')
        break
      case 'administracion':
        permissions.add('personnel.edit')
        permissions.add('profile.edit_any')
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

  // ─── Adjunto de Sección ───
  const adjuntos = activeRoles.filter((r) => r.role === 'adjunto')
  for (const adj of adjuntos) {
    const base: Permission[] = [
      'section.view',
      'section.edit',
      'incidents.create',
      'personnel.view_section',
    ]
    base.forEach((p) => permissions.add(p))

    const sectionKey = adj.section?.key
    if (!sectionKey) continue

    // Los adjuntos tienen view del área; manage solo en áreas de inventario crítico
    const areaPrefix = SECTION_AREA_KEY[sectionKey]
    if (areaPrefix) {
      permissions.add(`${areaPrefix}.view` as Permission)
    }

    // Adjunto también recibe las bandejas del área
    const faenaKey = SECTION_FAENA_KEY[sectionKey]
    if (faenaKey) {
      permissions.add(`faena.receive_incident_${faenaKey}` as Permission)
      permissions.add(`faena.receive_request_${faenaKey}` as Permission)
    }

    // Casos especiales
    if (sectionKey === 'instruccion') {
      permissions.add('area.instruction.manage')
      permissions.add('esbas.instruct')
      permissions.add('training.issue_certificate')
      permissions.add('training.access_esbas')
      permissions.add('training.access_escuela_tecnica')
    }
    if (['maquinas', 'servicios_generales', 'prehospitalaria'].includes(sectionKey)) {
      permissions.add('inventory.manage')
      permissions.add('inventory.manage_section')
      permissions.add(`${areaPrefix}.manage` as Permission)
    }
  }

  // ─── Jefes de Guardia Masculina / Femenina ───
  if (activeRoles.some((r) => r.role === 'jefe_guardia_masculina')) {
    ;(
      ['guard.view_male', 'guard.manage_male', 'guard.config_beds_male'] as Permission[]
    ).forEach((p) => permissions.add(p))
  }

  if (activeRoles.some((r) => r.role === 'jefe_guardia_femenina')) {
    ;(
      ['guard.view_female', 'guard.manage_female', 'guard.config_beds_female'] as Permission[]
    ).forEach((p) => permissions.add(p))
  }

  // ─── Visibilidad de guardia por género ───
  // Todo efectivo ve su propio dormitorio según género
  if (profile.gender === 'masculino') {
    permissions.add('guard.view_male')
  } else if (profile.gender === 'femenino') {
    permissions.add('guard.view_female')
  }

  // ─── Todo miembro asignado a una sección ve el área de su sección ───
  for (const r of activeRoles) {
    const sectionKey = r.section?.key
    if (!sectionKey) continue
    const areaPrefix = SECTION_AREA_KEY[sectionKey]
    if (areaPrefix) {
      permissions.add(`${areaPrefix}.view` as Permission)
      // Instrucción: todos los miembros son instructores y pueden gestionar contenido
      if (sectionKey === 'instruccion') {
        permissions.add(`${areaPrefix}.manage` as Permission)
        permissions.add('esbas.instruct')
        permissions.add('training.issue_certificate')
        permissions.add('training.access_esbas')
        permissions.add('training.access_escuela_tecnica')
      }
    }
    permissions.add('section.view')
  }

  return [...new Set(permissions)]
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

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

export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.every((p) => permissions.includes(p))
}

/**
 * Devuelve las claves de sección donde el usuario tiene cargo activo
 * (jefe o adjunto). Útil para el builder de menú.
 */
export function getActiveSectionKeys(roles: SectionRoleWithSection[]): string[] {
  const keys = new Set<string>()
  for (const r of roles) {
    if (!r.isActive) continue
    if (r.role !== 'jefe_seccion' && r.role !== 'adjunto') continue
    const key = r.section?.key
    if (key) keys.add(key)
  }
  return [...keys]
}

/**
 * Devuelve true si el usuario tiene algún cargo en Jefatura (Primer o Segundo Jefe).
 */
export function isJefatura(roles: SectionRoleWithSection[]): boolean {
  return roles.some(
    (r) => r.isActive && (r.role === 'primer_jefe' || r.role === 'segundo_jefe')
  )
}

/**
 * Devuelve true si el usuario es Primer Jefe.
 */
export function isPrimerJefe(roles: SectionRoleWithSection[]): boolean {
  return roles.some((r) => r.isActive && r.role === 'primer_jefe')
}
