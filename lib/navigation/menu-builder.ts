/**
 * Builder del menú lateral.
 *
 * Recibe los permisos del usuario y arma el árbol de navegación que
 * corresponde a su rol, siguiendo las 6 capas definidas en
 * docs/ARQUITECTURA_MENU.md §1:
 *
 *   A — Personal          (todos)
 *   B — Faena y Servicio  (efectivos activos)
 *   C — Capacitación      (todos, contenido diferenciado)
 *   D — Área de [Sección] (una por cada cargo de sección que tenga)
 *   E — Comando           (Primer y Segundo Jefe)
 *   F — Administración    (Primer y Segundo Jefe)
 *
 * No hace queries a la BD — trabaja solo con los permisos del JWT.
 * Esto mantiene el sidebar instantáneo en cada navegación.
 */
import type { Permission } from '@/lib/auth/permissions'

// ════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════

export type MenuIcon =
  | 'home' | 'user' | 'moon' | 'megaphone' | 'building'
  | 'clipboard-check' | 'alert-circle' | 'file-text' | 'qr-code'
  | 'book-open' | 'library' | 'graduation-cap'
  | 'truck' | 'wrench' | 'heart-pulse' | 'camera' | 'briefcase'
  | 'radio' | 'chart-bar' | 'chart-line' | 'award' | 'list-checks' | 'users'
  | 'settings' | 'shield' | 'user-cog' | 'bed' | 'calendar'
  | 'package' | 'inbox' | 'send'

export interface MenuItem {
  href: string
  label: string
  icon: MenuIcon
  /** Contador opcional (ej: 3 anuncios sin leer) */
  badge?: number | string
  /** Estilo del badge: 'default' (dorado), 'urgent' (rojo) */
  badgeStyle?: 'default' | 'urgent'
  /** Marcador de "en vivo" (ej. estado de compañía que se actualiza) */
  live?: boolean
}

export interface MenuSection {
  /** Etiqueta visible de la sección (ej: "Personal", "Faena y Servicio") */
  label: string
  /** Si es una sección de área, el sello alfabético a mostrar (MQ, SN, etc.) */
  areaSeal?: string
  /** Si es sección de área, color del sello: 'red' (cargo propio) | 'brass' (transversal) */
  areaSealVariant?: 'red' | 'brass'
  /** Los ítems de navegación dentro de esta sección */
  items: MenuItem[]
}

export interface MenuBuildContext {
  permissions: Permission[]
  /** Grado del efectivo — usado para diferenciación en Capacitación */
  grade: string
  /** Estado/figura del efectivo — afecta qué se muestra */
  status: string
  /** Contadores opcionales para badges (anuncios sin leer, bandeja pendiente, etc.) */
  counts?: {
    unreadAnnouncements?: number
    pendingChecklists?: number
    pendingIncidentsForMe?: number
    pendingRequestsForMe?: number
  }
}

// ════════════════════════════════════════════════════════════════════
// BUILDER PRINCIPAL
// ════════════════════════════════════════════════════════════════════

export function buildMenu(ctx: MenuBuildContext): MenuSection[] {
  const has = (p: Permission) => ctx.permissions.includes(p)
  const sections: MenuSection[] = []

  // ─── A · Personal (todos) ───────────────────────────────────────
  const personalItems: MenuItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: 'home' },
    { href: '/perfil', label: 'Mi Perfil', icon: 'user' },
  ]

  // Guardia nocturna — se muestra solo si puede reservar
  if (has('guard.reserve_bed') || has('guards.reserve')) {
    personalItems.push({
      href: '/guardia-nocturna',
      label: 'Mi Guardia Nocturna',
      icon: 'moon',
    })
  }

  personalItems.push({
    href: '/mi-compania',
    label: 'Mi Compañía',
    icon: 'building',
    live: true,
  })

  personalItems.push({
    href: '/comunicados',
    label: 'Anuncios',
    icon: 'megaphone',
    badge: ctx.counts?.unreadAnnouncements,
    badgeStyle: 'default',
  })

  // Checklist del parque motor — ruta libre para efectivos activos (seccionario+).
  const ACTIVE_GRADES = ['seccionario', 'subteniente', 'teniente', 'capitan', 'teniente_brigadier', 'brigadier', 'brigadier_mayor', 'brigadier_general']
  if (ACTIVE_GRADES.includes(ctx.grade) && ctx.status !== 'retirado') {
    personalItems.push({ href: '/parque-motor', label: 'Parque Motor', icon: 'truck' })
  }

  sections.push({ label: 'Personal', items: personalItems })

  // ─── B · Faena y Servicio (efectivos activos) ───────────────────
  if (has('faena.create_incident') || has('faena.create_checklist') || has('faena.create_request')) {
    const faenaItems: MenuItem[] = []

    faenaItems.push({
      href: '/faena',
      label: 'Bandeja de Faena',
      icon: 'clipboard-check',
      badge: ctx.counts?.pendingChecklists,
      badgeStyle: 'urgent',
    })

    if (faenaItems.length > 0) {
      sections.push({ label: 'Faena y Servicio', items: faenaItems })
    }
  }

  // ─── C · Capacitación ──────────────────────────────────────────
  const capItems: MenuItem[] = []

  // Registro de asistencia a instrucción — solo postulantes y aspirantes en formación.
  if (ctx.grade === 'postulante' || ctx.grade === 'aspirante') {
    capItems.push({
      href: '/asistencia-instruccion',
      label: 'Mi Asistencia',
      icon: 'calendar',
    })
  }

  if (has('training.access_esbas') || has('training.access_escuela_tecnica')) {
    capItems.push({
      href: '/capacitacion',
      label: 'Mis cursos',
      icon: 'graduation-cap',
    })
  }

  capItems.push({
    href: '/biblioteca',
    label: 'Biblioteca',
    icon: 'library',
  })

  if (capItems.length > 0) {
    sections.push({ label: 'Capacitación', items: capItems })
  }

  // ─── D · Áreas (una por cada cargo del usuario) ────────────────
  const isJefatura = has('company.manage') || has('company.view_all')

  const areaDefs: {
    label: string
    seal: string
    permission: Permission
    items: MenuItem[]
  }[] = [
    {
      label: 'Área de Máquinas',
      seal: 'MQ',
      permission: 'area.machines.view',
      items: [
        { href: '/areas/maquinas',                          label: 'Tablero',           icon: 'truck' },
        { href: '/areas/maquinas/inventario',               label: 'Inventario',        icon: 'package' },
        { href: '/areas/maquinas/vehiculos',                label: 'Máquina y Gabinetes', icon: 'truck' },
        { href: '/areas/maquinas/bandeja-incidencias',      label: 'Incidencias',       icon: 'alert-circle' },
        { href: '/areas/maquinas/bandeja-solicitudes',      label: 'Solicitudes',       icon: 'inbox' },
        { href: '/areas/maquinas/requerimientos',           label: 'Requerimientos',    icon: 'send' },
      ],
    },
    {
      label: 'Área de Servicios Generales',
      seal: 'SG',
      permission: 'area.services.view',
      items: [
        { href: '/areas/servicios-generales',               label: 'Tablero',           icon: 'wrench' },
        { href: '/areas/servicios-generales/inventario',    label: 'Inventario',        icon: 'package' },
        { href: '/areas/servicios-generales/insumos',       label: 'Insumos',           icon: 'list-checks' },
        { href: '/areas/servicios-generales/bandeja-incidencias', label: 'Incidencias', icon: 'alert-circle' },
        { href: '/areas/servicios-generales/bandeja-solicitudes', label: 'Solicitudes', icon: 'inbox' },
        { href: '/areas/servicios-generales/requerimientos',      label: 'Requerimientos', icon: 'send' },
      ],
    },
    {
      label: 'Área de Instrucción',
      seal: 'IN',
      permission: 'area.instruction.view',
      items: [
        { href: '/areas/instruccion',                       label: 'Tablero',           icon: 'graduation-cap' },
        { href: '/areas/instruccion/aspirantes-y-postulantes', label: 'Aspirantes y Postulantes', icon: 'users' },
        { href: '/areas/instruccion/cursos',                label: 'Formación y Cursos', icon: 'book-open' },
        { href: '/areas/instruccion/biblioteca',            label: 'Biblioteca',        icon: 'library' },
        { href: '/areas/instruccion/bandeja-solicitudes',   label: 'Solicitudes',       icon: 'inbox' },
        { href: '/areas/instruccion/requerimientos',        label: 'Requerimientos',    icon: 'send' },
        { href: '/areas/instruccion/bandeja-incidencias',   label: 'Incidencias',       icon: 'alert-circle' },
      ],
    },
    {
      label: 'Área de Sanidad',
      seal: 'SN',
      permission: 'area.health.view',
      items: [
        { href: '/areas/prehospitalaria',                   label: 'Tablero',           icon: 'heart-pulse' },
        { href: '/areas/prehospitalaria/inventario',        label: 'Inventario',        icon: 'package' },
        { href: '/areas/prehospitalaria/medicamentos',      label: 'Medicamentos',      icon: 'list-checks' },
        { href: '/areas/prehospitalaria/bandeja-incidencias', label: 'Incidencias',     icon: 'alert-circle' },
        { href: '/areas/prehospitalaria/bandeja-solicitudes', label: 'Solicitudes',     icon: 'inbox' },
        { href: '/areas/prehospitalaria/requerimientos',      label: 'Requerimientos',  icon: 'send' },
      ],
    },
    {
      label: 'Área de Administración',
      seal: 'AD',
      permission: 'area.admin.view',
      items: [
        { href: '/areas/administracion',                    label: 'Tablero',           icon: 'briefcase' },
        { href: '/areas/administracion/legajos',            label: 'Legajos',           icon: 'user-cog' },
        { href: '/areas/administracion/bandeja-solicitudes', label: 'Solicitudes',      icon: 'inbox' },
        { href: '/areas/administracion/requerimientos',      label: 'Requerimientos',   icon: 'send' },
        { href: '/areas/administracion/bandeja-incidencias', label: 'Incidencias',      icon: 'alert-circle' },
      ],
    },
    {
      label: 'Área de Imagen',
      seal: 'IM',
      permission: 'area.image.view',
      items: [
        { href: '/areas/imagen',                            label: 'Tablero',           icon: 'camera' },
        { href: '/areas/imagen/contenido-web',              label: 'Contenido Web',     icon: 'file-text' },
        { href: '/areas/imagen/calendario',                 label: 'Calendario',        icon: 'calendar' },
        { href: '/areas/imagen/comunicados',                label: 'Comunicados',       icon: 'send' },
        { href: '/areas/imagen/bandeja-solicitudes',        label: 'Solicitudes',       icon: 'inbox' },
        { href: '/areas/imagen/requerimientos',             label: 'Requerimientos',    icon: 'send' },
        { href: '/areas/imagen/bandeja-incidencias',        label: 'Incidencias',       icon: 'alert-circle' },
      ],
    },
  ]

  for (const area of areaDefs) {
    if (has(area.permission)) {
      sections.push({
        label: area.label,
        areaSeal: area.seal,
        areaSealVariant: isJefatura ? 'brass' : 'red',
        items: area.items,
      })
    }
  }

  // ─── E · Comando (Jefatura) ────────────────────────────────────
  if (has('reports.view_all')) {
    sections.push({
      label: 'Comando',
      items: [
        { href: '/operatividad', label: 'Operatividad', icon: 'radio', live: true },
        { href: '/emergencias',  label: 'Emergencias',  icon: 'chart-line' },
        { href: '/bomberos',     label: 'Personal',     icon: 'users' },
        { href: '/inventario',   label: 'Inventario General', icon: 'package' },
      ],
    })
  }

  // ─── F · Administración del Sistema ────────────────────────────
  const adminItems: MenuItem[] = []

  if (has('personnel.view_all')) {
    adminItems.push({ href: '/personal', label: 'Personal', icon: 'users' })
  }

  // Bitácora de auditoría inmutable — solo Primer Jefe (company.manage)
  if (has('company.manage')) {
    adminItems.push({ href: '/auditoria', label: 'Auditoría', icon: 'shield' })
  }

  if (has('system.manage_users') || has('system.admin')) {
    adminItems.push({
      href: '/configuracion',
      label: 'Configuración',
      icon: 'settings',
    })
  }

  if (adminItems.length > 0) {
    sections.push({ label: 'Administración', items: adminItems })
  }

  return sections
}

/**
 * Determina si una ruta está activa dado el pathname actual.
 * Soporta matching exacto y de prefijo.
 */
export function isMenuItemActive(itemHref: string, pathname: string): boolean {
  if (itemHref === '/dashboard') {
    return pathname === '/' || pathname === '/dashboard'
  }
  return pathname === itemHref || pathname.startsWith(itemHref + '/')
}
