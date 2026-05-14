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
      permission: 'area.machines.manage',
      items: [
        { href: '/areas/maquinas',                          label: 'Tablero',           icon: 'truck' },
        { href: '/areas/maquinas/inventario',               label: 'Inventario',        icon: 'package' },
        { href: '/areas/maquinas/vehiculos',                label: 'Vehículos',         icon: 'file-text' },
        { href: '/areas/maquinas/bandeja-incidencias',      label: 'Incidencias',       icon: 'alert-circle' },
        { href: '/areas/maquinas/bandeja-solicitudes',      label: 'Solicitudes',       icon: 'inbox' },
      ],
    },
    {
      label: 'Área de Servicios Generales',
      seal: 'SG',
      permission: 'area.services.manage',
      items: [
        { href: '/areas/servicios-generales',               label: 'Tablero',           icon: 'wrench' },
        { href: '/areas/servicios-generales/inventario',    label: 'Inventario',        icon: 'package' },
        { href: '/areas/servicios-generales/insumos',       label: 'Insumos',           icon: 'list-checks' },
        { href: '/areas/servicios-generales/bandeja-incidencias', label: 'Incidencias', icon: 'alert-circle' },
        { href: '/areas/servicios-generales/bandeja-solicitudes', label: 'Solicitudes', icon: 'inbox' },
      ],
    },
    {
      label: 'Área de Instrucción',
      seal: 'IN',
      permission: 'area.instruction.manage',
      items: [
        { href: '/areas/instruccion',                       label: 'Tablero',           icon: 'graduation-cap' },
        { href: '/areas/instruccion/cursos',                label: 'Cursos',            icon: 'book-open' },
        { href: '/areas/instruccion/progreso',              label: 'Progreso',          icon: 'chart-bar' },
        { href: '/areas/instruccion/bandeja-solicitudes',   label: 'Solicitudes',       icon: 'inbox' },
        { href: '/areas/instruccion/bandeja-incidencias',   label: 'Incidencias',       icon: 'alert-circle' },
      ],
    },
    {
      label: 'Área de Sanidad',
      seal: 'SN',
      permission: 'area.health.manage',
      items: [
        { href: '/areas/prehospitalaria',                   label: 'Tablero',           icon: 'heart-pulse' },
        { href: '/areas/prehospitalaria/inventario',        label: 'Inventario',        icon: 'package' },
        { href: '/areas/prehospitalaria/medicamentos',      label: 'Medicamentos',      icon: 'list-checks' },
        { href: '/areas/prehospitalaria/bandeja-incidencias', label: 'Incidencias',     icon: 'alert-circle' },
        { href: '/areas/prehospitalaria/bandeja-solicitudes', label: 'Solicitudes',     icon: 'inbox' },
      ],
    },
    {
      label: 'Área de Administración',
      seal: 'AD',
      permission: 'area.admin.manage',
      items: [
        { href: '/areas/administracion',                    label: 'Tablero',           icon: 'briefcase' },
        { href: '/areas/administracion/legajos',            label: 'Legajos',           icon: 'user-cog' },
        { href: '/areas/administracion/bandeja-solicitudes', label: 'Solicitudes',      icon: 'inbox' },
        { href: '/areas/administracion/bandeja-incidencias', label: 'Incidencias',      icon: 'alert-circle' },
      ],
    },
    {
      label: 'Área de Imagen',
      seal: 'IM',
      permission: 'area.image.manage',
      items: [
        { href: '/areas/imagen',                            label: 'Tablero',           icon: 'camera' },
        { href: '/areas/imagen/calendario',                 label: 'Calendario',        icon: 'calendar' },
        { href: '/areas/imagen/comunicados',                label: 'Comunicados',       icon: 'send' },
        { href: '/areas/imagen/bandeja-solicitudes',        label: 'Solicitudes',       icon: 'inbox' },
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
        { href: '/estadisticas', label: 'Estadísticas', icon: 'chart-bar' },
        { href: '/partes-emergencia', label: 'Partes de Emergencia', icon: 'file-text' },
        { href: '/bomberos', label: 'Bomberos', icon: 'award' },
        { href: '/asistencias', label: 'Asistencias', icon: 'list-checks' },
        { href: '/analisis', label: 'Análisis', icon: 'chart-line' },
      ],
    })
  }

  // ─── F · Administración del Sistema ────────────────────────────
  const adminItems: MenuItem[] = []

  if (has('personnel.view_all')) {
    adminItems.push({ href: '/personal', label: 'Personal', icon: 'users' })
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
